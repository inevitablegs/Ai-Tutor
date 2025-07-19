import os
import re
import json
import hashlib
import logging
import requests
from typing import List, Dict, Optional, Union, Tuple
from datetime import timedelta
from yt_dlp import YoutubeDL
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from youtube_transcript_api.proxies import WebshareProxyConfig
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import random
import time
from http.cookiejar import MozillaCookieJar

# Disable yt-dlp logger to suppress ffmpeg warnings
logging.getLogger('yt_dlp').setLevel(logging.ERROR)

class YouTubeProcessor:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Initialize configurations
        self._init_configurations()
        
        # Initialize proxy settings
        self._init_proxies()

    def _init_configurations(self):
        """Initialize all non-proxy related configurations"""
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = "deepseek-r1-distill-llama-70b"
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        self.supported_languages = ['en', 'hi']  # English and Hindi (English first)
        self.max_retries = 3
        self.initial_delay = 1

    def _init_proxies(self):
        """Initialize all proxy-related configurations"""
        self.webshare_username = os.getenv("WEBSHARE_USERNAME")
        self.webshare_password = os.getenv("WEBSHARE_PASSWORD")
        self.has_proxies = self.webshare_username and self.webshare_password
        
        # Configuration for requests library
        self.requests_proxies = {
            'http': f'http://{self.webshare_username}:{self.webshare_password}@p.webshare.io:80',
            'https': f'http://{self.webshare_username}:{self.webshare_password}@p.webshare.io:80',
        } if self.has_proxies else None
        
        # Configuration for YouTubeTranscriptApi
        self.ytt_proxy_config = WebshareProxyConfig(
            proxy_username=self.webshare_username,
            proxy_password=self.webshare_password
        ) if self.has_proxies else None
        
        # Headers to mimic browser
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
        }
        
        # Initialize YouTubeTranscriptApi with correct proxy config
        self.ytt_api = YouTubeTranscriptApi(proxy_config=self.ytt_proxy_config)

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
        patterns = [
    r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|youtu\.be\/)([^"&?\/\s]{11}))',
    r'youtube\.com\/watch\?v=([^"&?\/\s]{11})',
    r'youtu\.be\/([^"&?\/\s]{11})'
]
        
        for pattern in patterns:
            match = re.search(pattern, video_url)
            if match:
                return match.group(1)
        
        return video_url  # Return as-is if no pattern matches (might already be an ID)
    
    @staticmethod
    def format_timestamp_url(video_url: str, timestamp: float) -> str:
        """Format URL with timestamp parameter"""
        video_id = YouTubeProcessor.extract_video_id(video_url)
        return f"https://www.youtube.com/watch?v={video_id}&t={int(timestamp)}s"

    def _load_cookies_header(self, cookiefile_path: str = "www.youtube.com_cookies.txt") -> str:
        """Load cookies.txt into a Cookie header"""
        cj = MozillaCookieJar()
        cj.load(cookiefile_path, ignore_discard=True, ignore_expires=True)
        return "; ".join([f"{cookie.name}={cookie.value}" for cookie in cj])
        

    def get_youtube_video_info(self, video_url: str) -> Dict:
        """Get YouTube video metadata using yt-dlp with retry logic"""
        ydl_opts = {
    'quiet': True,
    'skip_download': True,
    'extract_flat': True,
    'cookiefile': 'www.youtube.com_cookies.txt',  # <-- Add this
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

    def _make_request_with_retry(self, url, max_retries=None, initial_delay=None):
        """Helper method to make requests with retry logic"""
        max_retries = max_retries or self.max_retries
        initial_delay = initial_delay or self.initial_delay
        
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                cookies_header = self._load_cookies_header()
                headers_with_cookies = {**self.headers, "Cookie": cookies_header}
                
                response = requests.get(
                    url,
                    proxies=self.requests_proxies,
                    headers=headers_with_cookies,
                    timeout=30
                )

                if response.status_code == 200:
                    return response
                elif response.status_code == 429:  # Too Many Requests
                    delay *= (2 + random.random())  # Exponential backoff with jitter
                    time.sleep(delay)
                else:
                    return None
            except Exception as e:
                print(f"Request failed (attempt {attempt + 1}): {str(e)}")
                delay *= (2 + random.random())
                time.sleep(delay)
        
        return None

    def get_transcript(self, video_id: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
        """Get transcript with multiple fallback strategies"""
        # First try standard API with proxies
        try:
            transcript = self.ytt_api.get_transcript(video_id, languages=['en'])
            print("Found English transcript via API")
            return transcript, 'en'
        except Exception as e:
            print(f"API failed for English transcript: {str(e)}")
        
        # Fallback 1: Try Hindi transcript
        try:
            transcript = self.ytt_api.get_transcript(video_id, languages=['hi'])
            print("Found Hindi transcript via API")
            return transcript, 'hi'
        except NoTranscriptFound:
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                for t in transcript_list:
                    if t.language_code == 'hi' and t.is_generated:
                        print("Found auto-generated Hindi transcript")
                        return t.fetch(), 'hi'
            except Exception as e:
                print(f"Couldn't find Hindi transcript: {str(e)}")
        except Exception as e:
            print(f"Error fetching Hindi transcript: {str(e)}")
        
        # Fallback 2: Try scraping
        scraped_transcript = self._scrape_transcript(video_id)
        if scraped_transcript:
            return scraped_transcript, 'en'
        
        return None, None

    def _scrape_transcript(self, video_id: str) -> Optional[List[Dict]]:
        """Fallback method to scrape transcript if API fails"""
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        response = self._make_request_with_retry(url)
        if not response or response.status_code != 200:
            return None
        
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            script_tags = soup.find_all('script')
            
            # Look for transcript data in script tags
            for script in script_tags:
                if 'captionTracks' in str(script):
                    # This is a simplified parser - actual implementation may need adjustment
                    data = json.loads(script.string.split('ytInitialPlayerResponse = ')[1].split(';')[0])
                    caption_tracks = data.get('captions', {}).get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])
                    
                    for track in caption_tracks:
                        if track.get('languageCode') in self.supported_languages:
                            transcript_url = track.get('baseUrl')
                            if transcript_url:
                                transcript_response = self._make_request_with_retry(f"{transcript_url}&fmt=json3")
                                if transcript_response:
                                    return self._parse_scraped_transcript(transcript_response.json())
        except Exception as e:
            print(f"Scraping failed: {str(e)}")
        
        return None

    def _parse_scraped_transcript(self, transcript_data: Dict) -> List[Dict]:
        """Parse scraped transcript data into standard format"""
        events = transcript_data.get('events', [])
        transcript = []
        
        for event in events:
            if 'segs' in event:
                for seg in event['segs']:
                    if seg.get('utf8'):
                        transcript.append({
                            'text': seg['utf8'],
                            'start': event.get('tStartMs', 0) / 1000,
                            'duration': event.get('dDurationMs', 3000) / 1000
                        })
        
        return transcript
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

from dotenv import load_dotenv
load_dotenv()
