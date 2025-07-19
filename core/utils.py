import os
from typing import List, Dict, TypedDict
import time
from datetime import timedelta
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_search import YoutubeSearch
from tavily import TavilyClient
import google.generativeai as genai


from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from .yt_processor import YouTubeProcessor

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

def get_video_resources(topic: str, grade: str, chapter_name: str) -> List[VideoResource]:
    query = f"{topic} {chapter_name} tutorial for {grade} grade"
    results = YoutubeSearch(query, max_results=20).to_dict()  # Get more results to filter from
    
    videos = []
    for result in results:
        # Parse duration (format is either MM:SS or HH:MM:SS)
        duration_str = result["duration"]
        duration_parts = duration_str.split(':')
        
        try:
            if len(duration_parts) == 2:  # MM:SS format
                minutes = int(duration_parts[0])
                seconds = int(duration_parts[1])
                total_seconds = minutes * 60 + seconds
            elif len(duration_parts) == 3:  # HH:MM:SS format
                hours = int(duration_parts[0])
                minutes = int(duration_parts[1])
                seconds = int(duration_parts[2])
                total_seconds = hours * 3600 + minutes * 60 + seconds
            else:
                continue  # Skip if duration format is unexpected
            
            # Convert to minutes for comparison
            duration_minutes = total_seconds / 60
            
            # Check if duration is between 3 and 90 minutes
            if 3 <= duration_minutes <= 90:
                videos.append({
                    "title": result["title"],
                    "url": f"https://youtube.com{result['url_suffix']}",
                    "channel": result["channel"],
                    "duration": duration_str,
                    "duration_minutes": round(duration_minutes, 1)  # Added for convenience
                })
                
                # Stop when we have 4 qualifying videos
                if len(videos) >= 4:
                    break
                    
        except (ValueError, IndexError):
            continue  # Skip if duration parsing fails
    
    return videos

def get_web_resources(topic: str, grade: str, chapter_name: str) -> List[WebResource]:
    query = f"{topic} {chapter_name} tutorial OR guide for {grade} grade"
    search_results = tavily.search(query=query, include_raw_content=False, max_results=5)
    
    resources = []
    for result in search_results.get('results', [])[:4]:
        resources.append({
            "title": result.get('title', 'No title available'),
            "url": result.get('url', '#'),
            "source": result.get('url', '').split('/')[2] if '/' in result.get('url', '') else 'Unknown'
        })
    
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

# Initialize Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

def get_video_id(video_url: str) -> str:
    """Extract video ID from a YouTube URL or dict"""
    # Handle accidental dict input
    if isinstance(video_url, dict):
        video_url = video_url.get("url", "")

    if "v=" in video_url:
        return video_url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in video_url:
        return video_url.split("youtu.be/")[1].split("?")[0]
    else:
        return video_url.strip()  # Fallback: assume already ID


def download_youtube_transcript(video_id: str, languages: list = ['en']) -> tuple:
    """Download transcript and return as formatted text with timestamps"""
    try:
        # Try to get transcript in each language until successful
        transcript_list = None
        for lang in languages:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                print(f"Found transcript in language: {lang}")
                break
            except:
                continue
        
        if not transcript_list:
            raise Exception("No transcript available for the video in the specified languages")
        
        # Format the transcript with timestamps
        formatted_transcript = []
        for entry in transcript_list:
            start_time = entry['start']
            text = entry['text']
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
    """Parse transcript text into a list of chunks with text and timestamps"""
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

import re
import json

def generate_mcqs_from_transcript(transcript_chunks: list, video_id: str) -> tuple:
    """Generate MCQ questions from transcript chunks using Gemini with YouTube links"""
    transcript_with_timestamps = "\n\n".join(
        f"[{chunk['time_range']} (or {int(chunk['start_seconds'])}s)] {chunk['text']}" 
        for chunk in transcript_chunks
    )

    prompt = f"""
    I will provide you with a video transcript that includes timestamps. 
    Please generate 5-6 high quality multiple choice questions (MCQs) based on the key concepts and topics discussed in the video.

    Requirements:
    1. Questions should test understanding of important concepts, not trivial details
    2. Each question must be directly answerable from the transcript
    3. Include 4 plausible options for each question (a, b, c, d)
    4. Mark the correct answer with an asterisk (*)
    5. For each question, include:
       - The original timestamp (HH:MM:SS,mmm)
       - The time in seconds (for YouTube URL timestamp)
       - A clickable YouTube URL with the timestamp (format: https://youtu.be/VIDEO_ID?t=SECONDSs)
    6. Give proper explaination of the why correct answer is correct. And try to not include timestamps in explaination
    7. Format exactly as shown.

    Example format:
    1. What is X?
    a) One
    b) Two
    c) Three*
    d) Four
    Timestamp: [00:01:30,000]
    Seconds: 90
    Watch at: https://youtu.be/VIDEO_ID?t=90s
    Explaination: This is because...
    
    Transcript with timestamps:
    {transcript_with_timestamps}
    """
    try:
        response = model.generate_content(prompt)
        output = response.text.replace("VIDEO_ID", video_id)

        # Parse the text into JSON
        mcq_blocks = re.split(r"\n\d+\.\s", "\n" + output.strip())
        mcq_list = []

        for block in mcq_blocks[1:]:  # First is empty due to split
            lines = block.strip().split('\n')
            question = lines[0].strip()
            options = {}
            correct = ""
            for line in lines:
                match = re.match(r"([a-d])\)\s(.+?)(\*?)$", line.strip())
                if match:
                    opt = match.group(1)
                    text = match.group(2).strip()
                    is_correct = match.group(3) == '*'
                    options[opt] = text
                    if is_correct:
                        correct = opt


            timestamp_line = [l for l in lines if "Timestamp" in l][0]
            seconds_line = [l for l in lines if "Seconds" in l][0]
            url_line = [l for l in lines if "Watch at" in l][0]

            # Find explanation block (everything after "Watch at")
            explanation_index = lines.index(url_line) + 1
            explanation = "\n".join(lines[explanation_index:]).strip()

            mcq_list.append({
                "question": question,
                "options": options,
                "correct_answer": correct,
                "timestamp": timestamp_line.split(":", 1)[1].strip(" []"),
                "seconds": int(seconds_line.split(":")[1].strip()),
                "youtube_url": url_line.split(":", 1)[1].strip(),
                "explanation": explanation
            })

        return output, mcq_list

    except Exception as e:
        print(f"Error generating MCQs: {str(e)}")
        return None, None




def format_seconds_to_srt(seconds: float) -> str:
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = td.microseconds // 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def srt_time_to_seconds(time_str: str) -> float:
    hh_mm_ss, mmm = time_str.split(',')
    hh, mm, ss = hh_mm_ss.split(':')
    return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(mmm)/1000

def parse_transcript(transcript_text: str) -> list:
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
                'time_range': f"{time_str} --> {time_str}"
            })
    return chunks

def get_transcript_chunks_from_youtube(video_url: str, languages: list = ['en', 'hi']) -> list:
    try:
        yt = YouTubeProcessor()
        video_id = yt.extract_video_id(video_url)
        
        # First try manual transcript
        transcript = None
        for lang in languages:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                print(f"[DEBUG] Found manual transcript in {lang}")
                break
            except Exception:
                continue

        # If not found, fallback to auto
        if not transcript:
            try:
                all_transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
                for t in all_transcripts:
                    if t.is_generated and t.language_code in languages:
                        print(f"[DEBUG] Found auto-generated transcript in {t.language_code}")
                        transcript = t.fetch()
                        break
            except Exception as e:
                print(f"[ERROR] Transcript list failed: {e}")

        if not transcript:
            print(f"[ERROR] No transcript found for {video_id}")
            return []

        # Format transcript
        formatted_transcript = []
        for entry in transcript:
            start = entry['start']
            text = entry['text']
            formatted_transcript.append(f"[{format_seconds_to_srt(start)}] {text}")

        full_text = "\n".join(formatted_transcript)
        return parse_transcript(full_text)

    except (NoTranscriptFound, TranscriptsDisabled) as e:
        print(f"[ERROR] Transcript not available: {e}")
        return []
    except Exception as e:
        print(f"[ERROR] Unexpected error: {str(e)}")
        return []
