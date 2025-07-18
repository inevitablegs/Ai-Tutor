# test.py

import requests
import json
from pprint import pprint

BASE_URL = "http://localhost:8000"
MULTI_MCQ_API = f"{BASE_URL}/api/generate-multi-mcqs/"

TEST_VIDEO_URLS = [
    "https://youtube.com/watch?v=4dwsSz_fNSQ&pp=ygV8QUkgUm9ib3RpY3MgYW5kIEFJIENvbnRyb2wgU3lzdGVtczogIFBhdGggUGxhbm5pbmcsIFNlbnNvciBGdXNpb24sIFJlaW5mb3JjZW1lbnQgTGVhcm5pbmcgQ29udHJvbCB0dXRvcmlhbCBmb3IgY29sbGVnZSBncmFkZQ%3D%3D"
] * 4  # repeat same video 4 times for test

def test_generate_mcqs_from_multiple_videos():
    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "video_urls": TEST_VIDEO_URLS
    }

    print("▶ Sending request to generate MCQs from 4 videos...")
    res = requests.post(MULTI_MCQ_API, headers=headers, json=payload)

    print("\n=== Response ===")
    print(f"Status Code: {res.status_code}")
    
    try:
        data = res.json()
        pprint(data)
    except Exception as e:
        print("[ERROR] Failed to parse JSON:")
        print(res.text)
        return

    if res.status_code == 200 and data.get("status"):
        print("\n✅ MCQs generated successfully!")
        print(f"Total Questions: {data.get('total_questions', 0)}")

        for i, q in enumerate(data["questions"], 1):
            print(f"\n{i}. {q['question']}")
            for opt, text in q['options'].items():
                mark = "*" if opt == q['correct_answer'] else ""
                print(f"   {opt}) {text} {mark}")
            print(f"   Watch at: {q['youtube_url']}")
            print(f"   Explanation: {q['explanation']}")
    else:
        print("\n❌ Failed to generate MCQs.")
        if "questions" in data and not data["questions"]:
            print("[INFO] Empty MCQ list returned.")
        elif "error" in data:
            print("[ERROR]", data["error"])
        elif "traceback" in data:
            print("[DEBUG] Traceback Info:")
            print(data["traceback"])
        else:
            print("[DEBUG] Full response:")
            pprint(data)

if __name__ == "__main__":
    test_generate_mcqs_from_multiple_videos()
