import os
import requests
import json

BASE_URL = "http://localhost:8000"

def get_auth_headers(firebase_uid):
    """Generate headers with Firebase UID"""
    return {'X-Firebase-UID': firebase_uid}

def upload_and_process_pdf(pdf_path, firebase_uid):
    """Upload and process a PDF file"""
    print(f"\nUploading and processing PDF: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        return None

    try:
        with open(pdf_path, 'rb') as f:
            files = {'pdf': (os.path.basename(pdf_path), f)}
            headers = get_auth_headers(firebase_uid)
            response = requests.post(
                f"{BASE_URL}/api/process-pdf/",
                files=files,
                headers=headers
            )
        
        if response.status_code == 200:
            data = response.json()
            print("PDF processed successfully!")
            print(f"PDF ID: {data.get('data', {}).get('id')}")
            print(f"File name: {data.get('data', {}).get('file_name')}")
            return data.get('data', {}).get('id')
        else:
            print(f"Error processing PDF: {response.status_code}")
            print(response.json())
            return None
            
    except Exception as e:
        print(f"Error uploading PDF: {str(e)}")
        return None

def list_user_pdfs(firebase_uid):
    """List all PDFs for the authenticated user"""
    try:
        headers = get_auth_headers(firebase_uid)
        response = requests.get(
            f"{BASE_URL}/api/user/pdfs/",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("\nYour PDFs:")
            for idx, pdf in enumerate(data.get('data', []), 1):
                print(f"{idx}. {pdf['file_name']} (ID: {pdf['id']})")
            return data.get('data', [])
        else:
            print(f"Error listing PDFs: {response.status_code}")
            print(response.json())
            return None
            
    except Exception as e:
        print(f"Error listing PDFs: {str(e)}")
        return None

def ask_question(pdf_id, question, firebase_uid):
    """Ask a question about the processed PDF"""
    print(f"\nAsking question: {question}")
    
    try:
        headers = get_auth_headers(firebase_uid)
        response = requests.post(
            f"{BASE_URL}/api/answer-question/",
            json={
                'pdf_id': pdf_id,
                'question': question
            },
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("\nAnswer received:")
            print(json.dumps(data['data'], indent=2))
            return data['data']
        else:
            print(f"Error answering question: {response.status_code}")
            print(response.json())
            return None
            
    except Exception as e:
        print(f"Error asking question: {str(e)}")
        return None

def get_conversation_history(pdf_id, firebase_uid):
    """Get conversation history for a PDF"""
    try:
        headers = get_auth_headers(firebase_uid)
        response = requests.get(
            f"{BASE_URL}/api/user/pdfs/{pdf_id}/conversations/",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("\nConversation history:")
            for conv in data.get('data', []):
                print(f"\nQ: {conv['question']}")
                print(f"A: {conv['answer']['answer'][:100]}...")  # Show first 100 chars
            return data.get('data', [])
        else:
            print(f"Error getting history: {response.status_code}")
            print(response.json())
            return None
            
    except Exception as e:
        print(f"Error getting history: {str(e)}")
        return None

def delete_pdf(pdf_id, firebase_uid):
    """Delete a PDF and its data"""
    confirm = input(f"\nAre you sure you want to delete PDF {pdf_id}? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Deletion cancelled")
        return False
        
    try:
        headers = get_auth_headers(firebase_uid)
        response = requests.delete(
            f"{BASE_URL}/api/user/pdfs/{pdf_id}/",
            headers=headers
        )
        
        if response.status_code == 200:
            print("PDF deleted successfully!")
            return True
        else:
            print(f"Error deleting PDF: {response.status_code}")
            print(response.json())
            return False
            
    except Exception as e:
        print(f"Error deleting PDF: {str(e)}")
        return False

def run_tests():
    print("\n=== PDF Processing and QA Test ===")
    print("This test will:")
    print("1. Upload and process a PDF file")
    print("2. List your PDFs")
    print("3. Ask questions about the content")
    print("4. View conversation history")
    print("5. Delete PDF")

    # Get Firebase UID from user
    firebase_uid = "2IUpOTCYcLfJ1fLY8jItUCw11in1".strip()
    if not firebase_uid:
        print("Using default test UID")
        firebase_uid = "test_uid_123"  # Should match a user in your database

    # Step 1: Process PDF
    pdf_path = r"C:\Users\Lenovo\Desktop\Code For Bharat\Current\AiTutor\book2.pdf".strip()
    if not pdf_path or not os.path.exists(pdf_path):
        print("Using default test PDF")
        pdf_path = "test.pdf"  # Should exist in your directory

    pdf_id = upload_and_process_pdf(pdf_path, firebase_uid)
    if not pdf_id:
        print("Failed to process PDF. Exiting test.")
        return

    # Step 2: List PDFs
    list_user_pdfs(firebase_uid)

    # Step 3: Ask questions
    questions = [
        input("\nEnter first question (or press Enter for default): ").strip() or "What is this document about?",
        input("Enter second question (or press Enter for default): ").strip() or "Summarize the key points"
    ]

    for question in questions:
        ask_question(pdf_id, question, firebase_uid)

    # Step 4: View history
    if input("\nView conversation history? (y/n): ").lower() == 'y':
        get_conversation_history(pdf_id, firebase_uid)

    # Step 5: Delete PDF
    if input("\nDelete this PDF? (y/n): ").lower() == 'y':
        delete_pdf(pdf_id, firebase_uid)

    print("\nTest completed!")

if __name__ == "__main__":
    run_tests()