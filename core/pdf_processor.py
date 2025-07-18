import os
import time
import requests
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import re
import hashlib
import json
import tempfile
import cloudinary
import cloudinary.uploader
from django.conf import settings

class PDFProcessor:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = "deepseek-r1-distill-llama-70b"
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )

    def clean_text(self, text: str) -> str:
        lines = text.splitlines()
        cleaned_lines = [line for line in lines if not re.match(r'^[_\W\s]{5,}$', line.strip())]
        return "\n".join(cleaned_lines).strip()

    def generate_text_hash(self, text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()[:8]

    def upload_to_cloudinary(self, file, user_id=None):
        """Upload file to Cloudinary and return secure URL"""
        try:
            upload_result = cloudinary.uploader.upload_large(
    file,
    resource_type='raw',
    folder=f"user_pdfs/{user_id}" if user_id else "user_pdfs",
    unique_filename=True,
    overwrite=False,
    use_filename=True
)

            return upload_result['secure_url'], upload_result['public_id']
        except Exception as e:
            raise Exception(f"Cloudinary upload failed: {str(e)}")

    def process_pdf(self, pdf_file, user_id=None):
        """Process PDF file"""
        print("Processing PDF...")
        
        try:
            # Save to temp file first
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                for chunk in pdf_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name
            
            print(f"Temporarily saved PDF to: {tmp_path}")
            
            # Upload to Cloudinary
            try:
                with open(tmp_path, 'rb') as f:
                    cloudinary_url, public_id = self.upload_to_cloudinary(f, user_id)
                    print(f"PDF uploaded to Cloudinary: {cloudinary_url}")
            except Exception as e:
                raise Exception(f"Cloudinary upload failed: {str(e)}")

            # Process the PDF from temp file
            loader = PyPDFLoader(tmp_path)
            raw_pages = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=200)

            chunks = []
            for page_num, page_doc in enumerate(raw_pages, start=1):
                page_text = self.clean_text(page_doc.page_content)
                page_chunks = text_splitter.split_text(page_text)

                for chunk_num, chunk_text in enumerate(page_chunks, start=1):
                    start_pos = page_text.find(chunk_text)
                    end_pos = start_pos + len(chunk_text)

                    chunks.append(Document(
                        page_content=chunk_text,
                        metadata={
                            "source": cloudinary_url,
                            "page": page_num,
                            "chunk_id": f"p{page_num}c{chunk_num}",
                            "position": {
                                "start": start_pos,
                                "end": end_pos,
                                "length": len(chunk_text)
                            },
                            "preview": chunk_text[:50] + ("..." if len(chunk_text) > 50 else ""),
                            "text_hash": self.generate_text_hash(chunk_text),
                            "page_hash": self.generate_text_hash(page_text),
                            "cloudinary_id": public_id
                        }
                    ))

            print(f"Created {len(chunks)} text chunks from {len(raw_pages)} pages")
            return chunks, cloudinary_url, public_id

        except Exception as e:
            raise Exception(f"PDF processing failed: {str(e)}")
        finally:
            # Clean up temporary file
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.unlink(tmp_path)
                print(f"Removed temporary file: {tmp_path}")

    def create_vector_store(self, chunks, store_name):
        print("Creating embeddings and vector store...")
        vectorstore = FAISS.from_documents(chunks, self.embedding_model)
        print(f"Vector store created with {vectorstore.index.ntotal} embeddings")
        
        # Save to vectorstores directory
        store_path = os.path.join(settings.BASE_DIR, "vectorstores", store_name)
        vectorstore.save_local(store_path)
        print(f"Vector store saved at {store_path}")
        return vectorstore

    def load_vector_store(self, store_name):
        store_path = os.path.join(settings.BASE_DIR, "vectorstores", store_name)
        return FAISS.load_local(
            store_path,
            self.embedding_model,
            allow_dangerous_deserialization=True
        )

    def call_groq_llm(self, prompt):
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": "You are a helpful AI assistant. Your work is to answer the Question given in prompt by strictly taking help of provided Context. Your solution should be accurate and in detail"},
                {"role": "user", "content": prompt}
            ]
        }

        response = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Groq LLM error: {response.status_code} - {response.text}")
        
        return response.json()["choices"][0]["message"]["content"]

    def expand_query_with_llm(self, query):
        prompt = f"""You are an expert assistant. The user query below is too short for accurate search.
So please you answer that query in 10 lines 

Query: {query}

Expanded version:"""
        return self.call_groq_llm(prompt)

    def answer_question(self, vectorstore, question):
        # Step 1: Expand the query
        expanded_query = self.expand_query_with_llm(question)
        
        # Step 2: Semantic search on expanded query
        similar_docs = vectorstore.max_marginal_relevance_search(
            query=expanded_query, 
            k=5, 
            fetch_k=25
        )

        if not similar_docs:
            return {
                "answer": "No relevant context found.",
                "references": [],
                "thinking_process": ""
            }

        # Prepare context for LLM
        full_context = "\n\n".join([doc.page_content for doc in similar_docs])

        # Generate answer with thinking process
        prompt = f"""Analyze the question and provide:
1. Your thinking process (marked with <thinking> tags)
2. A detailed answer based strictly on the context
3. Key points from each relevant chunk
4. Be as detailed as possible

Question: {question}

Context:
{full_context}

Format your response as:
<thinking>Your analytical process here</thinking>
<answer>Your structured answer here</answer>"""
        
        llm_response = self.call_groq_llm(prompt)
        
        # Extract thinking and answer parts
        thinking_process = llm_response.split("<thinking>")[1].split("</thinking>")[0].strip()
        answer = llm_response.split("<answer>")[1].split("</answer>")[0].strip()

        # Prepare structured response
        response = {
            "question": question,
            "expanded_query": expanded_query,
            "thinking_process": thinking_process,
            "answer": answer,
            "references": [
                {
                    "page": doc.metadata["page"],
                    "chunk_id": doc.metadata["chunk_id"],
                    "position": doc.metadata["position"],
                    "text": doc.page_content,
                    "preview": doc.metadata["preview"],
                    "page_hash": doc.metadata["page_hash"],
                    "text_hash": doc.metadata["text_hash"],
                    "cloudinary_id": doc.metadata.get("cloudinary_id", "")
                } for doc in similar_docs
            ],
            "context_hash": self.generate_text_hash(full_context)
        }

        return response