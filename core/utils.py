import os
from typing import List, Dict, TypedDict
import time
from datetime import timedelta
from dotenv import load_dotenv
from youtube_search import YoutubeSearch
from tavily import TavilyClient
import google.generativeai as genai
from .yt_processor import YouTubeProcessor
import re 

# Initialize YouTubeProcessor (which includes proxy setup)
yt_processor = YouTubeProcessor()

# Initialize Gemini and Tavily
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# Define type hints
class VideoResource(TypedDict):
    title: str
    url: str
    channel: str
    duration: str

class WebResource(TypedDict):
    title: str
    url: str
    source: str

class ChapterOutput(TypedDict):
    name: str
    youtube_videos: List[VideoResource]
    web_resources: List[WebResource]

def generate_chapter_names(topic: str, grade: str) -> List[str]:
    prompt = f"""
        Generate exactly 10-12 comprehensive chapter names for studying {topic} 
        at {grade} level following these strict guidelines:

        1. Progression Structure:
        - Chapters 1-3: Foundational concepts
        - Chapters 4-6: Core techniques/methods  
        - Chapters 7-8: Advanced applications
        - Chapters 9-10: Cutting-edge extensions

        2. Naming Requirements:
        - Each 5-8 words
        - Include 2-3 key subtopics when possible
        - Use appropriate technical terms for the level
        - Distinct concepts (no overlap)
        - Progress logically

        3. Style:
        - Clear and concise
        - Avoid vague terms like "introduction to"
        - Action-oriented where applicable

        4. Format:
        - ONLY output numbered list
        - No explanations
        - No section headers
        - No additional text

        Example for "Machine Learning (Undergrad)":
        1. Supervised Learning: Regression, Classification, Loss Functions  
        2. Neural Networks: Architectures, Backpropagation, Activation Functions
        ...
        10. Federated Learning: Distributed Training, Privacy Preservation

        Now generate for {topic} at {grade} level:
        1. 
        2. 
        ...
        10.
        """
    
    response = model.generate_content(prompt)
    chapters = []
    
    for line in response.text.split('\n'):
        line = line.strip()
        if line and line[0].isdigit():
            chapter_name = line.split('.', 1)[1].strip()
            chapters.append(chapter_name)
            if len(chapters) == 10:
                break
    
    return chapters


from concurrent.futures import ThreadPoolExecutor
import logging

def get_video_resources(topic: str, grade: str, chapter_name: str) -> List[VideoResource]:
    """
    Fetches relevant YouTube videos and filters them to return only those
    that have an available transcript.
    """
    query = f"{topic} {chapter_name} tutorial for {grade} grade"
    # Fetch a slightly larger pool of initial results to increase chances of finding valid ones
    initial_results = YoutubeSearch(query, max_results=12).to_dict()
    
    if not initial_results:
        return []

    # --- NEW: Check for transcript availability in parallel ---
    valid_videos_with_transcript = []
    
    def check_video(result):
        """Helper function to check a single video and return its data if valid."""
        video_url = f"https://youtube.com{result['url_suffix']}"
        
        # We can also pre-filter by duration here to save API calls
        duration_str = result.get("duration", "0:0")
        try:
            parts = list(map(int, duration_str.split(':')))
            if len(parts) == 2:
                total_seconds = parts[0] * 60 + parts[1]
            elif len(parts) == 3:
                total_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
            else:
                return None # Invalid duration format
            
            # Filter duration: 3 to 90 minutes
            if not (180 <= total_seconds <= 5400):
                return None
        except (ValueError, IndexError):
            return None # Skip if duration parsing fails

        # Now, check for transcript availability (this is the key step)
        if check_transcript_availability(video_url):
            return {
                "title": result["title"],
                "url": video_url,
                "channel": result["channel"],
                "duration": result["duration"],
            }
        return None

    # Use a thread pool to check multiple videos concurrently for speed
    with ThreadPoolExecutor(max_workers=5) as executor:
        # Map the check_video function to each result
        future_results = executor.map(check_video, initial_results)
        
        # Collect non-None results (i.e., videos that are valid)
        for video_data in future_results:
            if video_data:
                valid_videos_with_transcript.append(video_data)

    logging.info(f"Found {len(valid_videos_with_transcript)} videos with available transcripts for query: '{query}'")
    
    # Return the top 4 valid videos
    return valid_videos_with_transcript[:4]


def check_transcript_availability(video_url: str) -> bool:
    """
    Lightweight check to see if a transcript is available for a video
    without processing the full content.
    """
    try:
        video_id = yt_processor.extract_video_id(video_url)
        # get_transcript handles API calls and scraping fallbacks
        transcript, _ = yt_processor.get_transcript(video_id)
        
        if transcript and isinstance(transcript, list) and len(transcript) > 0:
            logging.info(f"Transcript CHECK PASSED for video: {video_url}")
            return True
        else:
            logging.warning(f"Transcript CHECK FAILED for video: {video_url}")
            return False
    except Exception as e:
        logging.error(f"Exception during transcript check for {video_url}: {e}")
        return False


def get_web_resources(topic: str, grade: str, chapter_name: str) -> List[WebResource]:
    """
    Fetches web resources for a given topic, grade, and chapter,
    explicitly excluding results from YouTube.
    """
    # --- CHANGE 1: Add "site:!youtube.com" to the query to exclude YouTube at the source ---
    query = f"{topic} {chapter_name} tutorial OR guide for {grade} grade site:!youtube.com"
    
    # Use Tavily search API
    search_results = tavily.search(query=query, include_raw_content=False, max_results=7) # Fetch a few extra to filter
    
    resources = []
    
    # --- CHANGE 2: Add a fallback filter to ensure no YouTube links slip through ---
    for result in search_results.get('results', []):
        url = result.get('url', '')
        
        # Skip if the URL is from YouTube (case-insensitive check)
        if 'youtube.com' in url.lower() or 'youtu.be' in url.lower():
            continue
            
        resources.append({
            "title": result.get('title', 'No title available'),
            "url": url,
            "source": url.split('/')[2] if url and '/' in url else 'Unknown'
        })
        
        # Ensure we don't return more than 4 results
        if len(resources) >= 4:
            break
            
    return resources

def display_chapters(chapter_names: List[str]):
    print("\nGenerated Chapters:")
    for i, name in enumerate(chapter_names, 1):
        print(f"{i}. {name}")

def display_single_chapter_resources(chapter: ChapterOutput):
    print(f"\nCHAPTER: {chapter['name']}")
    
    print("\nYouTube Videos:")
    for video in chapter["youtube_videos"]:
        print(f"- {video['title']} ({video['duration']})")
        print(f"  URL: {video['url']}")
        print(f"  Channel: {video['channel']}")
    
    print("\nWeb Resources:")
    for resource in chapter["web_resources"]:
        print(f"- {resource['title']}")
        print(f"  URL: {resource['url']}")
        print(f"  Source: {resource['source']}")

def get_video_id(video_url: str) -> str:
    """Extract video ID from a YouTube URL using YouTubeProcessor"""
    return yt_processor.extract_video_id(video_url)

def download_youtube_transcript(video_id: str, languages: list = ['en']) -> tuple:
    """Download transcript using YouTubeProcessor with proxy support"""
    try:
        chunks = yt_processor.load_youtube_transcript(f"https://www.youtube.com/watch?v={video_id}")
        if not chunks:
            return None, None
            
        # Format the transcript with timestamps
        formatted_transcript = []
        for chunk in chunks:
            start_time = chunk.metadata["timestamp"]["start"]
            text = chunk.page_content
            formatted_transcript.append(
                f"[{format_seconds_to_srt(start_time)}] {text}"
            )
        
        return "\n".join(formatted_transcript), video_id
    except Exception as e:
        print(f"Error downloading transcript: {str(e)}")
        return None, None

def format_seconds_to_srt(seconds: float) -> str:
    """Convert seconds to SRT time format (HH:MM:SS,mmm)"""
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = td.microseconds // 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def parse_transcript(transcript_text: str) -> list:
    """Parse transcript text into a list of chunks with timestamps"""
    chunks = []
    lines = transcript_text.split('\n')
    
    for line in lines:
        if line.startswith('[') and ']' in line:
            time_part, text = line.split(']', 1)
            time_str = time_part[1:]
            start_time = srt_time_to_seconds(time_str)
            
            chunks.append({
                'text': text.strip(),
                'start': start_time,
                'start_seconds': start_time,
                'time_range': f"{time_str} --> {time_str}"  # Using same time for start/end
            })
    
    return chunks

def srt_time_to_seconds(time_str: str) -> float:
    """Convert SRT time format (HH:MM:SS,mmm) to seconds"""
    hh_mm_ss, mmm = time_str.split(',')
    hh, mm, ss = hh_mm_ss.split(':')
    return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(mmm)/1000

def generate_mcqs_from_transcript(transcript_chunks: list, video_id: str) -> tuple:
    # --- BUG FIX: Validate transcript content before processing ---
    if not transcript_chunks:
        logging.warning(f"Validation failed for video {video_id}: No transcript chunks provided.")
        return "No transcript available for this video.", []

    transcript_with_timestamps = "\n".join(
        f"[{chunk['time_range']}] {chunk['text']}" 
        for chunk in transcript_chunks
    )

    full_text_sample = transcript_with_timestamps.lower()
    if "never gonna give you up" in full_text_sample or len(full_text_sample) < 200:
        logging.error(f"Validation failed for video {video_id}: Transcript appears invalid or is a placeholder.")
        return "Invalid or placeholder transcript found.", []
        
    # --- BUG FIX: New, more robust prompt to ensure timestamp accuracy ---
    prompt = f"""
    Your task is to generate 5 high-quality multiple-choice questions (MCQs) from the provided video transcript.

    Follow this process STRICTLY for EACH question:
    1.  **Identify a Core Concept:** Find a specific, important piece of information in the transcript.
    2.  **Locate Timestamp:** Find the exact timestamp marker (e.g., `[00:01:23,456 --> 00:01:26,789]`) immediately preceding that piece of information. This is the most critical step.
    3.  **Formulate Question:** Create an MCQ that tests understanding of that *specific* concept.
    4.  **Format Output:** Present the question, 4 plausible options (a, b, c, d), the correct answer with an asterisk (*), a clear explanation, and the *exact* timestamp and YouTube link you identified in step 2. Use the start time for the YouTube link.

    **CRITICAL RULE:** The timestamp for each question MUST correspond to the part of the transcript the question is based on. Do not guess or use a random timestamp.

    Example format for a single question:
    1. What is the primary function of a transformer in a neural network?
    a) To perform convolutions
    b) To manage recurrent states
    c) To handle sequential data through self-attention*
    d) To reduce dimensionality
    Timestamp: [00:12:45,123]
    Seconds: 765
    Explanation: The transcript at this moment explains that transformers use the self-attention mechanism to weigh the importance of different words...
    Watch at: https://youtu.be/VIDEO_ID?t=765s

    --- TRANSCRIPT BEGINS ---
    {transcript_with_timestamps}
    --- TRANSCRIPT ENDS ---
    """

    try:
        response = model.generate_content(prompt)
        raw_output = response.text.replace("VIDEO_ID", video_id)

        # --- BUG FIX: Robust regex-based parsing ---
        mcq_blocks = re.split(r'\n(?=\d+\.)', raw_output.strip())
        parsed_mcqs = []

        for block in mcq_blocks:
            if not block.strip(): continue
            
            question_match = re.search(r'^\d+\.\s(.*?)\n', block, re.DOTALL)
            timestamp_match = re.search(r'Timestamp:\s*\[(.*?)(?: -->.*)?\]', block)
            seconds_match = re.search(r'Seconds:\s*(\d+)', block)
            explanation_match = re.search(r'Explanation:\s*(.*?)(?=\nWatch at:|\Z)', block, re.DOTALL)
            watch_at_match = re.search(r'Watch at:\s*(https?://\S+)', block)

            if not all([question_match, timestamp_match, explanation_match, watch_at_match]):
                logging.warning(f"Skipping malformed MCQ block: {block}")
                continue

            question = question_match.group(1).strip()
            timestamp = timestamp_match.group(1).strip()
            explanation = explanation_match.group(1).strip()
            url = watch_at_match.group(1).strip()
            seconds = int(seconds_match.group(1)) if seconds_match else srt_time_to_seconds(timestamp)

            options = {}
            correct_answer = ""
            for opt_match in re.finditer(r'([a-d])\)\s(.*?)(?:\*|\n)', block):
                opt_letter = opt_match.group(1)
                opt_text = opt_match.group(2).strip()
                options[opt_letter] = opt_text
                if '*' in opt_match.group(0):
                    correct_answer = opt_letter

            if not question or not options or not correct_answer:
                logging.warning(f"Skipping block with missing core components: {block}")
                continue

            parsed_mcqs.append({
                "question": question,
                "options": options,
                "correct_answer": correct_answer,
                "timestamp": timestamp,
                "seconds": seconds,
                "youtube_url": url,
                "explanation": explanation
            })
        
        if not parsed_mcqs:
            logging.warning(f"LLM output could not be parsed into any MCQs. Raw output: {raw_output}")
            return raw_output, []

        return raw_output, parsed_mcqs

    except Exception as e:
        logging.error(f"Error generating or parsing MCQs: {e}", exc_info=True)
        return f"An error occurred: {e}", []

def get_transcript_chunks_from_youtube(video_url: str, languages: list = ['en', 'hi']) -> list:
    """Get transcript chunks using YouTubeProcessor with proxy support"""
    try:
        video_id = yt_processor.extract_video_id(video_url)
        chunks = yt_processor.load_youtube_transcript(video_url)
        
        # Format transcript as list of dicts similar to the original format
        formatted_chunks = []
        for chunk in chunks:
            formatted_chunks.append({
                'text': chunk.page_content,
                'start': chunk.metadata['timestamp']['start'],
                'start_seconds': chunk.metadata['timestamp']['start'],
                'time_range': format_seconds_to_srt(chunk.metadata['timestamp']['start']) + 
                              " --> " + 
                              format_seconds_to_srt(chunk.metadata['timestamp']['end'])
            })
        
        return formatted_chunks
    except Exception as e:
        print(f"[ERROR] Failed to get transcript chunks: {str(e)}")
        return []


if __name__ == "__main__":
    print("Study Resource Generator")
    topic = input("Enter your study topic: ").strip() or "Python Programming"
    grade = input("Enter grade/standard level: ").strip() or "high school"
    
    try:
        # First generate all chapter names
        chapter_names = generate_chapter_names(topic, grade)
        display_chapters(chapter_names)
        
        # Ask user which chapter they want resources for
        while True:
            try:
                chapter_num = input("\nEnter chapter number to generate resources for (1-10) or 'q' to quit: ").strip()
                if chapter_num.lower() == 'q':
                    break
                
                chapter_num = int(chapter_num)
                if 1 <= chapter_num <= 10:
                    selected_chapter = chapter_names[chapter_num - 1]
                    print(f"\nGenerating resources for Chapter {chapter_num}: {selected_chapter}...")
                    
                    # Generate resources only for the selected chapter
                    videos = get_video_resources(topic, grade, selected_chapter)
                    websites = get_web_resources(topic, grade, selected_chapter)
                    
                    chapter_output = {
                        "name": selected_chapter,
                        "youtube_videos": videos,
                        "web_resources": websites
                    }
                    
                    display_single_chapter_resources(chapter_output)
                else:
                    print("Please enter a number between 1 and 10.")
            except ValueError:
                print("Please enter a valid number or 'q' to quit.")
                
    except Exception as e:
        print(f"Error: {e}")

# Load environment variables
load_dotenv()
