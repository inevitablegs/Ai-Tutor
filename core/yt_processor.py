import os
import re
import json
import hashlib
import logging
import requests
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv
import random
import time
import isodate
from bs4 import BeautifulSoup
import html
import xml.etree.ElementTree as ET

# --- Library Imports ---
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from youtube_transcript_api.proxies import WebshareProxyConfig

# --- LangChain Imports ---
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class YouTubeProcessor:
    def __init__(self):
        load_dotenv()
        self._init_configurations()
        self._init_proxies()

    def _init_configurations(self):
        """Initialize all non-proxy related configurations"""
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = "llama3-70b-8192" # A more recent, capable model
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        self.supported_languages = ['en', 'hi']
        self.max_retries = 2
        self.initial_delay = 1
        logging.info("Core configurations initialized.")

    def _init_proxies(self):
        """Initialize proxy configurations for all network requests."""
        self.webshare_username = os.getenv("WEBSHARE_USERNAME")
        self.webshare_password = os.getenv("WEBSHARE_PASSWORD")
        self.has_proxies = self.webshare_username and self.webshare_password
        
        self.requests_proxies = None
        
        if self.has_proxies:
            logging.info("Proxy credentials found. Initializing with Webshare proxy config.")
            proxy_url = f'http://{self.webshare_username}:{self.webshare_password}@p.webshare.io:80'
            self.requests_proxies = {'http': proxy_url, 'https': proxy_url}
            
            proxy_config = WebshareProxyConfig(
                proxy_username=self.webshare_username,
                proxy_password=self.webshare_password
            )
            self.ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        else:
            logging.warning("PROXY_CONFIG_WARNING: Webshare credentials not set. Using direct connection.")
            self.ytt_api = YouTubeTranscriptApi()

        self.no_proxy_ytt_api = YouTubeTranscriptApi(proxy_config=None)
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
        
    @staticmethod
    def clean_text(text: str) -> str:
        lines = text.splitlines()
        cleaned_lines = [line.strip() for line in lines if line.strip() and not re.match(r'^[_\W\s]{5,}$', line)]
        return " ".join(cleaned_lines)

    @staticmethod
    def generate_text_hash(text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()[:8]

    @staticmethod
    def extract_video_id(video_url: str) -> str:
        patterns = [r'(?:v=|\/v\/|youtu\.be\/|embed\/|\/v\/|\/e\/|watch\?v=|\?v=)([^"&?\/\s]{11})']
        for pattern in patterns:
            match = re.search(pattern, video_url)
            if match: return match.group(1)
        if re.match(r'^[a-zA-Z0-9_-]{11}$', video_url): return video_url
        raise ValueError(f"Could not extract a valid YouTube video ID from URL: {video_url}")
    
    @staticmethod
    def format_timestamp_url(video_url: str, timestamp: float) -> str:
        video_id = YouTubeProcessor.extract_video_id(video_url)
        return f"https://www.youtube.com/watch?v={video_id}&t={int(timestamp)}s"

    def _make_request_with_retry(self, url: str, use_proxy: bool = True) -> Optional[requests.Response]:
        proxies_to_use = self.requests_proxies if use_proxy and self.has_proxies else None
        proxy_msg = "with proxy" if proxies_to_use else "without proxy"
        
        for attempt in range(self.max_retries + 1):
            logging.info(f"Requesting {url[:80]}... (Attempt {attempt+1}, {proxy_msg})")
            try:
                response = requests.get(url, proxies=proxies_to_use, headers=self.headers, timeout=20)
                response.raise_for_status()
                return response
            except Exception as e:
                logging.warning(f"Request attempt {attempt + 1} failed: {e}")
                if attempt >= self.max_retries:
                    logging.error(f"Max retries reached for request ({proxy_msg})")
                else:
                    time.sleep(self.initial_delay * (2 ** attempt))
        return None

    def get_youtube_video_info(self, video_url: str) -> dict:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            logging.warning("YOUTUBE_API_KEY not set, cannot fetch detailed video info.")
            return {}
        
        video_id = self.extract_video_id(video_url)
        endpoint = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id={video_id}&key={api_key}"

        response = self._make_request_with_retry(endpoint, use_proxy=True)
        if not response and self.has_proxies:
            response = self._make_request_with_retry(endpoint, use_proxy=False)

        if not response:
            return {}

        try:
            data = response.json()
            if not data.get("items"): return {}
            item = data["items"][0]
            snippet, content, stats = item.get("snippet", {}), item.get("contentDetails", {}), item.get("statistics", {})
            return {
                "title": snippet.get("title", ""), "description": snippet.get("description", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "duration": self.parse_duration(content.get("duration", "PT0S")),
                "view_count": int(stats.get("viewCount", 0)), "upload_date": snippet.get("publishedAt", "")
            }
        except Exception as e:
            logging.error(f"Error parsing video info JSON: {e}")
            return {}
            
    def parse_duration(self, duration: str) -> int:
        try: return int(isodate.parse_duration(duration).total_seconds())
        except: return 0

    def get_transcript(self, video_id: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
        """Hardened transcript fetcher that ALWAYS returns a List[Dict] on success."""
        
        # --- Stage 1: Attempt with primary API (proxied if configured) ---
        logging.info("Attempt 1: Fetching transcript via primary API client.")
        try:
            transcript_list = self.ytt_api.list(video_id)
            transcript_obj = transcript_list.find_transcript(self.supported_languages)
            lang_code = transcript_obj.language_code
            logging.info(f"API (primary) found '{lang_code}' transcript. Fetching and normalizing...")
            # **CRITICAL FIX**: Convert the FetchedTranscript object to a list of dictionaries
            # This makes the output consistent with the scraper fallback.
            return transcript_obj.fetch().to_raw_data(), lang_code
        except Exception as e:
            error_str = str(e).lower()
            if self.has_proxies and ('proxy' in error_str or 'tunnel' in error_str or '502' in error_str or 'ssl' in error_str):
                logging.warning(f"API (with proxy) failed with a network/proxy error: {e}. Moving to no-proxy API attempt.")
                # --- Stage 2: Attempt with no-proxy API ---
                logging.info("Attempt 2: Fetching transcript via no-proxy API client.")
                try:
                    transcript_list = self.no_proxy_ytt_api.list(video_id)
                    transcript_obj = transcript_list.find_transcript(self.supported_languages)
                    lang_code = transcript_obj.language_code
                    logging.info(f"API (no proxy) found '{lang_code}' transcript. Fetching and normalizing...")
                    return transcript_obj.fetch().to_raw_data(), lang_code
                except Exception as no_proxy_e:
                    logging.warning(f"API (no proxy) also failed: {no_proxy_e}. Proceeding to scraper.")
            else:
                logging.warning(f"API (primary) failed with non-proxy error: {e}. Proceeding to scraper.")
        
        return self._scrape_transcript(video_id)

    def _scrape_transcript(self, video_id: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
        # This function returns List[Dict] by design, matching the fixed `get_transcript` output.
        logging.info("Attempt 3: Starting transcript scraping fallback.")
        transcript_data, lang = self._attempt_scrape_session(video_id, use_proxy=True)
        if transcript_data: return transcript_data, lang
        if self.has_proxies:
            logging.warning("Scraping with proxy failed. Retrying scrape session without proxy.")
            transcript_data, lang = self._attempt_scrape_session(video_id, use_proxy=False)
            if transcript_data: return transcript_data, lang
        logging.error(f"All transcript fetching attempts failed for video {video_id}.")
        return None, None

    def _attempt_scrape_session(self, video_id: str, use_proxy: bool) -> Tuple[Optional[List[Dict]], Optional[str]]:
        # ... (rest of function is robust and correct from previous version)
        page_url = f"https://www.youtube.com/watch?v={video_id}"
        response = self._make_request_with_retry(page_url, use_proxy=use_proxy)
        if not response: return None, None
        try:
            if 'ytInitialPlayerResponse = ' in response.text:
                json_str = response.text.split('ytInitialPlayerResponse = ')[1].split(';var')[0]
                raw_data = json.loads(json_str)
            else:
                 logging.error("Scraping failed: 'ytInitialPlayerResponse' not found.")
                 return None, None
            caption_tracks = raw_data.get("captions", {}).get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])
            for lang_code in self.supported_languages:
                for track in caption_tracks:
                    if track.get("languageCode") == lang_code:
                        transcript_url = track.get("baseUrl")
                        if transcript_url:
                            transcript_response = self._make_request_with_retry(f"{transcript_url}&fmt=json3", use_proxy=use_proxy)
                            if transcript_response:
                                try:
                                    parsed = self._parse_scraped_transcript_json(transcript_response.json())
                                    return parsed, lang_code
                                except json.JSONDecodeError:
                                    parsed = self._parse_scraped_transcript_xml(transcript_response.text)
                                    if parsed: return parsed, lang_code
            return None, None
        except Exception as e:
            logging.error(f"Error during scrape session (proxy={use_proxy}): {e}", exc_info=True)
            return None, None
    
    @staticmethod
    def _parse_scraped_transcript_json(transcript_data: Dict) -> List[Dict]:
        events = transcript_data.get('events', [])
        transcript = []
        for event in events:
            segs = event.get('segs')
            if not segs: continue
            full_text = "".join([seg.get('utf8', '') for seg in segs]).strip()
            if not full_text: continue
            transcript.append({
                'text': full_text, 'start': event.get('tStartMs', 0) / 1000.0,
                'duration': event.get('dDurationMs', 3000) / 1000.0
            })
        return transcript

    @staticmethod
    def _parse_scraped_transcript_xml(xml_text: str) -> List[Dict]:
        try:
            root = ET.fromstring(xml_text)
            transcript = []
            for elem in root.findall('text'):
                text = elem.text or ''; start = float(elem.get('start', 0)); duration = float(elem.get('dur', 3.0))
                transcript.append({'text': html.unescape(text), 'start': start, 'duration': duration})
            return transcript
        except ET.ParseError: return []

    def load_youtube_transcript(self, video_url: str) -> List[Document]:
        video_id = self.extract_video_id(video_url)
        logging.info(f"\nProcessing YouTube video: {video_url}")
        
        video_info = self.get_youtube_video_info(video_url)
        if video_info.get('title'):
            logging.info(f"Video Title: {video_info['title']}")
        
        # This function now receives a consistent List[Dict] format
        transcript, transcript_lang = self.get_transcript(video_id)
        if not transcript:
            raise Exception(f"No transcript available for {video_id}")
        
        # This line will now work correctly every time
        full_text = " ".join([entry['text'] for entry in transcript])
        cleaned_full_text = self.clean_text(full_text)
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=200)
        text_chunks = text_splitter.split_text(cleaned_full_text)
        
        docs = []
        for chunk_num, chunk_text in enumerate(text_chunks, start=1):
            start_pos = cleaned_full_text.find(chunk_text)
            if start_pos == -1: continue # Skip if chunk can't be found
            
            end_pos = start_pos + len(chunk_text)
            
            start_time, end_time = 0.0, 0.0
            
            current_char_offset = 0
            found_start = False
            for entry in transcript:
                entry_len_with_space = len(entry['text']) + 1

                if not found_start and (current_char_offset + entry_len_with_space > start_pos):
                    start_time = entry['start']
                    found_start = True
                
                if found_start and (current_char_offset + entry_len_with_space > end_pos):
                    end_time = entry['start'] + entry.get('duration', 3.0)
                    break
                    
                current_char_offset += entry_len_with_space

            if end_time == 0.0: # If the loop finishes, take the time of the last snippet
                end_time = transcript[-1]['start'] + transcript[-1].get('duration', 3.0)
            
            docs.append(Document(
                page_content=chunk_text,
                metadata={
                    "source": self.format_timestamp_url(video_url, start_time),
                    "thumbnail": video_info.get('thumbnail', ''), "chunk_id": f"c{chunk_num}",
                    "timestamp": {"start": start_time, "end": end_time, "length": end_time - start_time},
                    "preview": chunk_text[:50] + "...",
                    "text_hash": self.generate_text_hash(chunk_text),
                    "video_hash": self.generate_text_hash(full_text),
                    "video_title": video_info.get('title', 'Unknown'),
                    "video_id": video_id, "language": transcript_lang
                }))
        
        logging.info(f"Created {len(docs)} text documents from the transcript.")
        return docs

    def create_vector_store(self, chunks: List[Document], store_name: str) -> FAISS:
        logging.info("Creating embeddings and vector store...")
        vectorstore = FAISS.from_documents(chunks, self.embedding_model)
        logging.info(f"Vector store created with {vectorstore.index.ntotal} embeddings")
        
        store_path = os.path.join("vectorstores", store_name)
        os.makedirs(os.path.dirname(store_path), exist_ok=True)
        vectorstore.save_local(store_path)
        logging.info(f"Vector store saved at {store_path}")
        return vectorstore
    
    def load_vector_store(self, store_name: str) -> FAISS:
        store_path = os.path.join("vectorstores", store_name)
        return FAISS.load_local(
            store_path, self.embedding_model, allow_dangerous_deserialization=True
        )

    def call_groq_llm(self, prompt: str, language: str = 'en') -> str:
        headers = {"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"}
        system_message = {"en": "You are a helpful AI assistant. Answer using the provided context."}.get(language, "en")
        payload = {"model": self.groq_model, "messages": [{"role": "system", "content": system_message}, {"role": "user", "content": prompt}]}
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def expand_query_with_llm(self, query: str, language: str = 'en') -> str:
        prompt = f"""Expand the following user query for better semantic search results, preserving the original intent. Query: {query}"""
        return self.call_groq_llm(prompt, language)

    def answer_question(self, vectorstore: FAISS, question: str) -> Dict:
        question_lang = 'hi' if any('\u0900' <= char <= '\u097F' for char in question) else 'en'
        expanded_query = self.expand_query_with_llm(question, question_lang)
        logging.info(f"Expanded query: '{expanded_query}'")
        
        similar_docs = vectorstore.max_marginal_relevance_search(query=expanded_query, k=5, fetch_k=25)
        if not similar_docs: return {"answer": "No relevant context found.", "references": [], "thinking_process": ""}

        full_context = "\n\n".join([doc.page_content for doc in similar_docs])
        prompt_template = """Analyze the question and provide:
1.  Your thinking process in <thinking> tags.
2.  A detailed answer in English based strictly on the context, citing timestamps.

Question: {question}

Context:
{context}

Format: <thinking>Your analysis</thinking><answer>Your answer</answer>"""
        
        llm_response = self.call_groq_llm(prompt_template.format(question=question, context=full_context), 'en')
        
        try:
            thinking = llm_response.split("<thinking>")[1].split("</thinking>")[0].strip()
            answer = llm_response.split("<answer>")[1].split("</answer>")[0].strip()
        except IndexError:
            thinking, answer = "Model did not follow formatting.", llm_response

        return {
            "question": question, "expanded_query": expanded_query, "thinking_process": thinking, "answer": answer,
            "references": [
                {
                    "source": doc.metadata["source"], "thumbnail": doc.metadata["thumbnail"],
                    "chunk_id": doc.metadata["chunk_id"], "timestamp": doc.metadata["timestamp"],
                    "text": doc.page_content, "preview": doc.metadata["preview"],
                    "video_title": doc.metadata.get("video_title", "Unknown"),
                    "language": doc.metadata.get("language", "en")
                } for doc in similar_docs
            ],
            "context_hash": self.generate_text_hash(full_context), "language": "en"
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





# Previous code:

'''
import os
import re
import json
import hashlib
import logging
import requests
from typing import List, Dict, Optional, Union, Tuple
from datetime import timedelta
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
import os
import requests
from urllib.parse import urlparse, parse_qs



class YouTubeProcessor:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Initialize configurations
        self._init_configurations()
        
        # Initialize proxy settings
        self._init_proxies()
        if not self.has_proxies:
            raise Exception("PROXY_CONFIG_ERROR: Webshare username or password environment variables are NOT SET. Proxies are disabled.")

    
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
    

    def get_youtube_video_info(self, video_url: str) -> dict:
        api_key = os.getenv("YOUTUBE_API_KEY")
        video_id = self.extract_video_id(video_url)
        if not api_key or not video_id:
            return {
                "title": "",
                "description": "",
                "thumbnail": "",
                "duration": 0,
                "view_count": 0,
                "upload_date": ""
            }

        endpoint = (
            f"https://www.googleapis.com/youtube/v3/videos"
            f"?part=snippet,contentDetails,statistics"
            f"&id={video_id}&key={api_key}"
        )

        try:
            response = requests.get(endpoint)
            data = response.json()
            if not data["items"]:
                return {}
            video_data = data["items"][0]

            snippet = video_data.get("snippet", {})
            content = video_data.get("contentDetails", {})
            stats = video_data.get("statistics", {})

            duration_seconds = self.parse_duration(content.get("duration", "PT0S"))

            return {
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "duration": duration_seconds,
                "view_count": int(stats.get("viewCount", 0)),
                "upload_date": snippet.get("publishedAt", "")
            }

        except Exception as e:
            print(f"Error fetching video info: {str(e)}")
            return {}

    # def extract_video_id(self, url: str) -> str:
    #     parsed = urlparse(url)
    #     if parsed.hostname in ["youtu.be"]:
    #         return parsed.path[1:]
    #     if parsed.hostname in ["www.youtube.com", "youtube.com"]:
    #         query = parse_qs(parsed.query)
    #         return query.get("v", [""])[0]
    #     return ""

    def parse_duration(self, duration: str) -> int:
        import isodate
        try:
            return int(isodate.parse_duration(duration).total_seconds())
        except:
            return 0


    def _make_request_with_retry(self, url, max_retries=None, initial_delay=None):
        """Helper method to make requests with retry logic"""
        max_retries = max_retries or self.max_retries
        initial_delay = initial_delay or self.initial_delay
        
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    url,
                    proxies=self.requests_proxies,
                    headers=self.headers,
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
        try:
            # Use instance method with proxy config
            transcript_list = self.ytt_api.list_transcripts(video_id)

            # Try finding an English transcript
            try:
                transcript = transcript_list.find_transcript(['en'])
                print("Found English transcript via API")
                return transcript, 'en'
            except NoTranscriptFound:
                print("No English transcript found.")

            # Try finding a Hindi transcript
            try:
                transcript = transcript_list.find_transcript(['hi'])
                print("Found Hindi transcript via API")
                return transcript, 'hi'
            except NoTranscriptFound:
                print("No Hindi transcript found, checking for auto-generated...")
                for t in transcript_list:
                    if t.language_code == 'hi' and t.is_generated:
                        print("Found auto-generated Hindi transcript")
                        return t, 'hi'
            except Exception as e:
                print(f"Error fetching Hindi transcript: {str(e)}")

        except Exception as e:
            print(f"API failed to list transcripts: {str(e)}")

        # Fallback 2: Scraping
        scraped_transcript = self._scrape_transcript(video_id)
        if scraped_transcript:
            print("Used fallback scraping method.")
            return scraped_transcript, 'en'

        return None, None


    def _scrape_transcript(self, video_id: str) -> Optional[List[Dict]]:
        """Fallback method to scrape transcript if API fails"""
        url = f"https://www.youtube.com/watch?v={video_id}"
        response = self._make_request_with_retry(url)

        if not response or response.status_code != 200:
            print("Failed to fetch YouTube page.")
            return None

        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            initial_data_script = None

            for script in soup.find_all("script"):
                if script.string and 'ytInitialPlayerResponse' in script.string:
                    initial_data_script = script.string
                    break

            if not initial_data_script:
                print("Could not locate ytInitialPlayerResponse in HTML.")
                return None

            json_str = initial_data_script.split('ytInitialPlayerResponse = ')[1].split(';</script>')[0].strip()
            data = json.loads(json_str)

            caption_tracks = (
                data.get("captions", {})
                    .get("playerCaptionsTracklistRenderer", {})
                    .get("captionTracks", [])
            )

            for track in caption_tracks:
                lang_code = track.get("languageCode", "")
                if lang_code in self.supported_languages:
                    transcript_url = track.get("baseUrl")
                    if transcript_url:
                        transcript_response = self._make_request_with_retry(f"{transcript_url}&fmt=json3")
                        if transcript_response and transcript_response.status_code == 200:
                            print(f"Successfully scraped transcript in {lang_code}")
                            return self._parse_scraped_transcript(transcript_response.json())

        except Exception as e:
            print(f"Scraping failed: {str(e)}")

        return None


    def _parse_scraped_transcript(self, transcript_data: Dict) -> List[Dict]:
        """Parse scraped transcript data into standard format"""
        events = transcript_data.get('events', [])
        transcript = []

        for event in events:
            if 'segs' not in event or not isinstance(event['segs'], list):
                continue

            for seg in event['segs']:
                text = seg.get('utf8')
                if not text:
                    continue
                transcript.append({
                    'text': text,
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

'''