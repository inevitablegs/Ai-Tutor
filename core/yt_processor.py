import os
import re
import json
import hashlib
import logging
from typing import List, Dict, Optional, Union, Tuple
from yt_dlp import YoutubeDL
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai
import requests
from youtube_transcript_api.proxies import WebshareProxyConfig
from datetime import timedelta

# Disable yt-dlp logger to suppress ffmpeg warnings
logging.getLogger('yt_dlp').setLevel(logging.ERROR)

class YouTubeProcessor:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Proxy configuration
        self.webshare_username = os.getenv("WEBSHARE_USERNAME")
        self.webshare_password = os.getenv("WEBSHARE_PASSWORD")
        self.proxy_config = WebshareProxyConfig(
            proxy_username=self.webshare_username,
            proxy_password=self.webshare_password
        ) if self.webshare_username and self.webshare_password else None
        
        # Initialize YouTubeTranscriptApi with proxy
        self.ytt_api = YouTubeTranscriptApi(proxy_config=self.proxy_config)
        
        # Other configurations
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = "deepseek-r1-distill-llama-70b"
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        self.supported_languages = ['en', 'hi']  # English and Hindi (English first)

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean text by removing empty or whitespace-only lines"""
        lines = text.splitlines()
        cleaned_lines = [line for line in lines if not re.match(r'^[_\W\s]{5,}$', line.strip())]
        return "\n".join(cleaned_lines).strip()

    @staticmethod
    def generate_text_hash(text: str) -> str:
        """Generate a short hash for text content"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()[:8]

    @staticmethod
    def extract_video_id(video_url: str) -> str:
        """Extract YouTube video ID from URL"""
        # Handle youtu.be URLs
        if "youtu.be/" in video_url:
            return video_url.split("youtu.be/")[1].split("?")[0].split("/")[0]
        
        # Handle standard YouTube URLs
        if "v=" in video_url:
            return video_url.split("v=")[1].split("&")[0]
        
        # If no pattern matches, return the original string (assuming it's just the ID)
        return video_url

    @staticmethod
    def get_youtube_video_info(video_url: str) -> Dict:
        """Get YouTube video metadata using yt-dlp"""
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'extract_flat': True,
        }
        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return {
                    "title": info.get('title', ''),
                    "description": info.get('description', ''),
                    "thumbnail": info.get('thumbnail', ''),
                    "duration": info.get('duration', 0),
                    "view_count": info.get('view_count', 0),
                    "upload_date": info.get('upload_date', '')
                }
        except Exception as e:
            print(f"Warning: Couldn't get video info - {str(e)}")
            return {
                "title": "",
                "description": "",
                "thumbnail": ""
            }

    @staticmethod
    def format_timestamp_url(video_url: str, timestamp: float) -> str:
        """Format URL with timestamp parameter"""
        video_id = YouTubeProcessor.extract_video_id(video_url)
        return f"https://www.youtube.com/watch?v={video_id}&t={int(timestamp)}s"

    @staticmethod
    def format_seconds_to_srt(seconds: float) -> str:
        """Convert seconds to SRT time format (HH:MM:SS,mmm)"""
        td = timedelta(seconds=seconds)
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = td.microseconds // 1000
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

    @staticmethod
    def srt_time_to_seconds(time_str: str) -> float:
        """Convert SRT time format (HH:MM:SS,mmm) to seconds"""
        hh_mm_ss, mmm = time_str.split(',')
        hh, mm, ss = hh_mm_ss.split(':')
        return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(mmm)/1000

    def get_transcript(self, video_id: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
        """Get transcript with preference for English, then Hindi (including auto-generated), then None"""
        # First try to get English transcript (manual or auto-generated)
        try:
            transcript = self.ytt_api.get_transcript(video_id, languages=['en'])
            print("Found English transcript")
            return transcript, 'en'
        except Exception as e:
            print(f"Couldn't find English transcript: {str(e)}")
        
        # If English not available, try Hindi (including auto-generated)
        try:
            # First try manual Hindi transcript
            transcript = self.ytt_api.get_transcript(video_id, languages=['hi'])
            print("Found manual Hindi transcript")
            return transcript, 'hi'
        except NoTranscriptFound:
            # If no manual Hindi transcript, try auto-generated Hindi
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                for t in transcript_list:
                    if t.language_code == 'hi' and t.is_generated:
                        print("Found auto-generated Hindi transcript")
                        return t.fetch(), 'hi'
            except Exception as e:
                print(f"Couldn't find Hindi transcript (manual or auto-generated): {str(e)}")
        except Exception as e:
            print(f"Error while fetching Hindi transcript: {str(e)}")
        
        # If neither is available, return None
        return None, None

    def load_youtube_transcript(self, video_url: str) -> List[Document]:
        """Load and process YouTube transcript into chunks with timestamps"""
        video_id = self.extract_video_id(video_url)
        print(f"\nProcessing YouTube video: {video_url}")
        
        # Get video metadata
        video_info = self.get_youtube_video_info(video_url)
        if video_info.get('title'):
            print(f"Video Title: {video_info['title']}")
        
        # Get transcript with language preference
        transcript, transcript_lang = self.get_transcript(video_id)
        if not transcript:
            raise Exception(f"No transcript available in supported languages: {self.supported_languages}")
        
        # Process transcript into chunks with metadata
        full_text = " ".join([entry['text'] for entry in transcript])
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=200)
        text_chunks = text_splitter.split_text(self.clean_text(full_text))
        
        chunks = []
        for chunk_num, chunk_text in enumerate(text_chunks, start=1):
            # Map chunk to timestamp range
            start_pos = full_text.find(chunk_text)
            end_pos = start_pos + len(chunk_text)
            
            start_time = 0
            end_time = 0
            current_pos = 0
            matched_entries = []
            
            for entry in transcript:
                entry_end = current_pos + len(entry['text']) + 1  # +1 for space
                if current_pos <= end_pos and entry_end >= start_pos:
                    matched_entries.append(entry)
                current_pos = entry_end
            
            if matched_entries:
                start_time = matched_entries[0]['start']
                end_time = matched_entries[-1]['start'] + matched_entries[-1]['duration']
            
            chunks.append(Document(
                page_content=chunk_text,
                metadata={
                    "source": self.format_timestamp_url(video_url, start_time),
                    "thumbnail": video_info.get('thumbnail', ''),
                    "chunk_id": f"c{chunk_num}",
                    "timestamp": {
                        "start": start_time,
                        "end": end_time,
                        "length": end_time - start_time
                    },
                    "preview": chunk_text[:50] + ("..." if len(chunk_text) > 50 else ""),
                    "text_hash": self.generate_text_hash(chunk_text),
                    "video_hash": self.generate_text_hash(full_text),
                    "video_title": video_info.get('title', 'Unknown'),
                    "video_id": video_id,
                    "language": transcript_lang
                }
            ))
        
        print(f"Created {len(chunks)} text chunks from YouTube video")
        return chunks

    def create_vector_store(self, chunks: List[Document], store_name: str) -> FAISS:
        """Create and save FAISS vector store from document chunks"""
        print("Creating embeddings and vector store...")
        vectorstore = FAISS.from_documents(chunks, self.embedding_model)
        print(f"Vector store created with {vectorstore.index.ntotal} embeddings")
        
        # Save to specified path
        store_path = os.path.join("vectorstores", store_name)
        os.makedirs(os.path.dirname(store_path), exist_ok=True)
        vectorstore.save_local(store_path)
        print(f"Vector store saved at {store_path}")
        return vectorstore

    def load_vector_store(self, store_name: str) -> FAISS:
        """Load existing vector store from disk"""
        store_path = os.path.join("vectorstores", store_name)
        return FAISS.load_local(
            store_path,
            self.embedding_model,
            allow_dangerous_deserialization=True
        )

    def call_groq_llm(self, prompt: str, language: str = 'en') -> str:
        """Call Groq LLM API with the given prompt"""
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        
        system_message = {
            "en": "You are a helpful AI assistant. Answer questions using the provided context.",
            "hi": "आप एक सहायक AI सहायक हैं। प्रदान किए गए संदर्भ का उपयोग करके प्रश्नों का उत्तर दें।"
        }.get(language, "en")
        
        payload = {
            "model": self.groq_model,
            "messages": [
                {
                    "role": "system", 
                    "content": system_message
                },
                {"role": "user", "content": prompt}
            ]
        }

        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions", 
                json=payload, 
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            raise Exception(f"Groq LLM error: {str(e)}")

    def expand_query_with_llm(self, query: str, language: str = 'en') -> str:
        """Expand short queries for better semantic search"""
        prompt_templates = {
            'en': """You are an expert assistant. The user query below is too short for accurate search.
Please expand it into a more detailed version while preserving the original intent.

Original Query: {query}

Expanded Version:""",
            'hi': """आप एक विशेषज्ञ सहायक हैं। नीचे दिया गया उपयोगकर्ता प्रश्न सटीक खोज के लिए बहुत छोटा है।
कृपया इसे मूल इरादे को संरक्षित करते हुए अधिक विस्तृत संस्करण में विस्तारित करें।

मूल प्रश्न: {query}

विस्तारित संस्करण:"""
        }
        
        prompt = prompt_templates.get(language, 'en').format(query=query)
        return self.call_groq_llm(prompt, language)

    def answer_question(self, vectorstore: FAISS, question: str) -> Dict:
        """Answer question using vector store context"""
        # Detect language of the question
        question_lang = 'hi' if any('\u0900' <= char <= '\u097F' for char in question) else 'en'
        
        # Expand the query
        expanded_query = self.expand_query_with_llm(question, question_lang)
        
        # Semantic search
        similar_docs = vectorstore.max_marginal_relevance_search(
            query=expanded_query, 
            k=5, 
            fetch_k=25
        )

        if not similar_docs:
            return {
                "answer": "No relevant context found in the video.",
                "references": [],
                "thinking_process": ""
            }

        # Prepare context
        full_context = "\n\n".join([doc.page_content for doc in similar_docs])
        
        # Generate answer (always in English)
        prompt_template = """Analyze the question and provide:
1. Your thinking process (marked with <thinking> tags)
2. A detailed answer in English based strictly on the context
3. Key points from each relevant chunk
4. Include timestamps where this information appears in the video

Question: {question}

Context:
{context}

IMPORTANT: Your answer must be in English, even if the context is in another language.

Format your response as:
<thinking>Your analytical process here</thinking>
<answer>Your structured answer in English here</answer>"""
        
        llm_response = self.call_groq_llm(
            prompt_template.format(question=question, context=full_context),
            'en'
        )
        
        # Extract response parts
        thinking_process = ""
        answer = ""
        try:
            thinking_process = llm_response.split("<thinking>")[1].split("</thinking>")[0].strip()
            answer = llm_response.split("<answer>")[1].split("</answer>")[0].strip()
        except:
            thinking_process = "The model did not provide a separate thinking process."
            answer = llm_response

        return {
            "question": question,
            "expanded_query": expanded_query,
            "thinking_process": thinking_process,
            "answer": answer,
            "references": [
                {
                    "source": doc.metadata["source"],
                    "thumbnail": doc.metadata["thumbnail"],
                    "chunk_id": doc.metadata["chunk_id"],
                    "timestamp": doc.metadata["timestamp"],
                    "text": doc.page_content,
                    "preview": doc.metadata["preview"],
                    "video_title": doc.metadata.get("video_title", "Unknown"),
                    "language": doc.metadata.get("language", "en")
                } for doc in similar_docs
            ],
            "context_hash": self.generate_text_hash(full_context),
            "language": "en"
        }

    def process_video(self, video_url: str, store_name: str) -> Dict:
        """Full processing pipeline for a YouTube video"""
        chunks = self.load_youtube_transcript(video_url)
        vectorstore = self.create_vector_store(chunks, store_name)
        video_info = self.get_youtube_video_info(video_url)
        
        return {
            "vectorstore": vectorstore,
            "video_info": video_info,
            "chunks": chunks,
            "store_name": store_name
        }

# Load environment variables at module level
from dotenv import load_dotenv
load_dotenv()
