from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view
from django.http import JsonResponse
from .pdf_processor import PDFProcessor
import os
from django.conf import settings
from .models import UserPDF, PDFConversation, ChapterGeneration
import json
from .firebase_auth import FirebaseAuthentication
from rest_framework.permissions import IsAuthenticated
import traceback
from django.contrib.auth import get_user_model
from .utils import generate_chapter_names  
from .yt_processor import YouTubeProcessor
from .models import UserYouTubeVideo, YouTubeConversation,ChapterResource
from .yt_processor import YouTubeProcessor
from .models import ChapterVideoResource, ChapterWebResource
from .utils import get_video_resources, get_web_resources   
from django.contrib.auth import get_user_model
import cloudinary
import cloudinary.uploader



User = get_user_model()


class FirebaseLoginAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        print("\n=== Received Request ===")
        print("Headers:", request.headers)
        print("Data:", request.data)
        print("Method:", request.method)
        
        firebase_uid = request.headers.get('X-Firebase-UID')
        if not firebase_uid:
            print("!! Missing Firebase UID header")
            return JsonResponse(
                {'error': 'Missing Firebase UID in headers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = request.data.get('email')
        if not email:
            print("!! Missing email in request data")
            return JsonResponse(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ... rest of your existing code ...
        username = request.data.get('username') or email.split('@')[0]
        

        user, created = User.objects.get_or_create(
            firebase_uid=firebase_uid,
            defaults={'email': email, 'username': username}
        )

        if created:
            return JsonResponse({
                'uid': user.firebase_uid,
                'email': user.email,
                'username': user.username,
                'message': 'User created successfully'
            }, status=status.HTTP_201_CREATED)
        
        return JsonResponse({
            'uid': user.firebase_uid,
            'email': user.email,
            'username': user.username,
            'message': 'User already exists'
        }, status=status.HTTP_200_OK)
    


class DashboardAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return JsonResponse({"message": "Dashboard API"}, status=status.HTTP_200_OK)
    
    


class ChapterAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            topic = request.data.get('topic')
            grade = request.data.get('grade')
            
            # Validate inputs
            if not topic or not grade:
                return JsonResponse({'error': 'Topic and grade are required'}, status=400)
            
            # Generate chapters
            chapters = generate_chapter_names(topic, grade)
            
            # Save generation record
            generation = ChapterGeneration.objects.create(
                user=request.user,
                topic=topic,
                grade=grade
            )
            
            # Save chapters without resources
            for i, chapter_name in enumerate(chapters):
                ChapterResource.objects.create(
                    generation=generation,
                    name=chapter_name,
                    position=i
                )
            
            return JsonResponse({
                'status': True,
                'data': {
                    'generation_id': generation.id,
                    'topic': topic,
                    'grade': grade,
                    'chapters': chapters
                }
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
        
@api_view(['GET'])
def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

# core/api.py

class ChapterGenerationHistoryAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        generations = ChapterGeneration.objects.filter(user=request.user).order_by('-created_at')
        data = [{
            'id': gen.id,
            'topic': gen.topic,
            'grade': gen.grade,
            'created_at': gen.created_at,
            'chapter_count': gen.chapters.count()
        } for gen in generations]
        return JsonResponse({'data': data})
    
    
class DeleteChapterGenerationAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, generation_id):
        try:
            generation = ChapterGeneration.objects.get(id=generation_id, user=request.user)
            generation.delete()
            return JsonResponse({
                'status': True,
                'message': 'Chapter generation and all related chapters deleted successfully'
            })
        except ChapterGeneration.DoesNotExist:
            return JsonResponse({
                'status': False,
                'error': 'Chapter generation not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to delete chapter generation'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChapterResourcesAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, generation_id):
        try:
            generation = ChapterGeneration.objects.get(id=generation_id, user=request.user)
            chapters = generation.chapters.all().order_by('position')
            
            data = []
            for chapter in chapters:
                # Check if chapter already has resources
                has_resources = chapter.videos.exists() or chapter.websites.exists()
                
                if not has_resources:
                    # Generate and save resources if none exist
                    videos = get_video_resources(generation.topic, generation.grade, chapter.name)
                    websites = get_web_resources(generation.topic, generation.grade, chapter.name)
                    
                    # Save videos
                    for video in videos[:4]:  # Limit to 4 videos
                        ChapterVideoResource.objects.create(
                            chapter=chapter,
                            title=video['title'],
                            url=video['url'],
                            channel=video['channel'],
                            duration=video['duration']
                        )
                    
                    # Save websites
                    for website in websites[:4]:  # Limit to 4 websites
                        ChapterWebResource.objects.create(
                            chapter=chapter,
                            title=website['title'],
                            url=website['url'],
                            source=website['source']
                        )
                
                # Get all resources (either existing or newly created)
                chapter_data = {
                    'id': chapter.id,
                    'name': chapter.name,
                    'videos': [{
                        'title': v.title,
                        'url': v.url,
                        'channel': v.channel,
                        'duration': v.duration
                    } for v in chapter.videos.all()],
                    'websites': [{
                        'title': w.title,
                        'url': w.url,
                        'source': w.source
                    } for w in chapter.websites.all()]
                }
                data.append(chapter_data)
            
            return JsonResponse({'data': data})
            
        except ChapterGeneration.DoesNotExist:
            return JsonResponse({'error': 'Not found'}, status=404)


from .utils import get_video_resources

class VideoResourcesAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Get topic, grade and chapter from request data
            topic = request.data.get('topic')
            grade = request.data.get('grade')
            chapter = request.data.get('chapter')
            
            # Validate required fields
            if not topic:
                return JsonResponse(
                    {'error': 'Topic is required', 'status': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not grade:
                return JsonResponse(
                    {'error': 'Grade/level is required', 'status': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not chapter:
                return JsonResponse(
                    {'error': 'Chapter name is required', 'status': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get video resources (limited to 4 by the utility function)
            videos = get_video_resources(topic, grade, chapter)
            
            # Return success response with videos
            return JsonResponse({
                'status': True,
                'message': 'Video resources fetched successfully',
                'data': {
                    'topic': topic,
                    'grade': grade,
                    'chapter': chapter,
                    'videos': videos
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Return error response
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to fetch video resources'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            
            
from .utils import get_web_resources  # Make sure this is imported at the top

class WebResourcesAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Get topic, grade and chapter from request data
            topic = request.data.get('topic')
            grade = request.data.get('grade')
            chapter = request.data.get('chapter')
            
            # Validate required fields
            if not topic:
                return JsonResponse(
                    {'error': 'Topic is required', 'status': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not grade:
                return JsonResponse(
                    {'error': 'Grade/level is required', 'status': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not chapter:
                return JsonResponse(
                    {'error': 'Chapter name is required', 'status': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get web resources (limited to 4 by the utility function)
            websites = get_web_resources(topic, grade, chapter)
            
            # Return success response with web resources
            return JsonResponse({
                'status': True,
                'message': 'Web resources fetched successfully',
                'data': {
                    'topic': topic,
                    'grade': grade,
                    'chapter': chapter,
                    'websites': websites
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Return error response
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to fetch web resources'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class PDFQAAPI(APIView):
    parser_classes = [MultiPartParser]
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pdf_file = request.FILES.get('pdf')
        if not pdf_file:
            return JsonResponse(
                {'error': 'No PDF file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # File validation checks
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse(
                {'error': 'Only PDF files are allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if pdf_file.size == 0:
            return JsonResponse(
                {'error': 'Uploaded file is empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if pdf_file.size > MAX_FILE_SIZE:
            return JsonResponse(
                {'error': 'File size exceeds 10MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Ensure file pointer is at start
            pdf_file.seek(0)
            
            processor = PDFProcessor()
            
            # Process the PDF with user ID for Cloudinary organization
            chunks, cloudinary_url, public_id = processor.process_pdf(
                pdf_file,
                user_id=request.user.firebase_uid
            )
            
            # Create unique store name
            store_name = f"book_{request.user.firebase_uid}_{os.path.splitext(pdf_file.name)[0]}"
            processor.create_vector_store(chunks, store_name)
            
            # Save to database
            user_pdf = UserPDF.objects.create(
                user=request.user,
                file_name=pdf_file.name,
                file=public_id,  # Cloudinary public_id
                vector_store=store_name
            )
            
            return JsonResponse({
                'status': True,
                'message': 'PDF processed successfully',
                'data': {
                    'id': user_pdf.id,
                    'file_name': user_pdf.file_name,
                    'cloudinary_url': cloudinary_url,
                    'upload_time': user_pdf.upload_time,
                    'size': pdf_file.size  # Return file size for reference
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()  # Log the full error for debugging
            
            error_message = str(e)
            if "Cloudinary" in error_message:
                error_message = "Failed to upload PDF to cloud storage"
            elif "PyPDF" in error_message:
                error_message = "Failed to process PDF content"
                
            return JsonResponse({
                'status': False,
                'error': error_message,
                'message': 'Failed to process PDF',
                'debug': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                        
class QuestionAnswerAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print("\n=== DEBUG: QuestionAnswerAPI Request ===")
        print("Headers:", request.headers)
        print("User:", request.user)
        print("Request data:", request.data)
        
        pdf_id = request.data.get('pdf_id')
        question = request.data.get('question')
        
        if not pdf_id or not question:
            print("!! DEBUG: Missing pdf_id or question")
            return JsonResponse(
                {'error': 'Both pdf_id and question are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"!! DEBUG: Looking for PDF ID {pdf_id} for user {request.user}")
            user_pdf = UserPDF.objects.get(id=pdf_id, user=request.user)
            print(f"!! DEBUG: Found PDF: {user_pdf.file_name}")
            
            # Verify vector store exists
            vs_path = os.path.join(settings.BASE_DIR, "vectorstores", user_pdf.vector_store)
            print(f"!! DEBUG: Vector store path: {vs_path}")
            
            if not os.path.exists(vs_path):
                print("!! DEBUG: Vector store directory does not exist!")
                return JsonResponse(
                    {'error': 'Vector store not found. Please re-upload the PDF.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            processor = PDFProcessor()
            print("!! DEBUG: Loading vector store...")
            vs = processor.load_vector_store(user_pdf.vector_store)
            print("!! DEBUG: Vector store loaded successfully")
            
            print("!! DEBUG: Generating answer...")
            answer = processor.answer_question(vs, question)
            print("!! DEBUG: Answer generated:", answer)
            
            # Save conversation
            PDFConversation.objects.create(
                pdf=user_pdf,
                question=question,
                answer=json.dumps(answer)
            )
            
            return JsonResponse({
                'status': True,
                'data': answer
            })
            
        except UserPDF.DoesNotExist:
            print("!! DEBUG: PDF not found or doesn't belong to user")
            return JsonResponse({
                'status': False,
                'error': 'PDF not found',
                'message': 'You do not have access to this PDF'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            print(f"!! DEBUG: Unexpected error: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({
                'status': False,
                'error': str(e),
                'traceback': traceback.format_exc(),
                'message': 'Failed to answer question'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class UserPDFListAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pdfs = UserPDF.objects.filter(user=request.user).order_by('-upload_time')
        data = [{
            'id': pdf.id,
            'file_name': pdf.file_name,
            'cloudinary_url': pdf.get_file_url(),  # Use the helper method
            'upload_time': pdf.upload_time,
            'conversation_count': pdf.conversations.count()
        } for pdf in pdfs]
        return JsonResponse({'status': True, 'data': data})
    
class PDFConversationHistoryAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pdf_id):
        try:
            user_pdf = UserPDF.objects.get(id=pdf_id, user=request.user)
            conversations = user_pdf.conversations.all().order_by('-created_at')[:50]
            data = [{
                'question': conv.question,
                'answer': json.loads(conv.answer),
                'created_at': conv.created_at
            } for conv in conversations]
            return JsonResponse({'status': True, 'data': data})
        except UserPDF.DoesNotExist:
            return JsonResponse({
                'status': False,
                'error': 'PDF not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
class DeletePDFAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, pdf_id):
        try:
            user_pdf = UserPDF.objects.get(id=pdf_id, user=request.user)

            # Delete from Cloudinary
            if user_pdf.file:  # This is the CloudinaryField
                try:
                    # Get the public_id from the Cloudinary resource
                    public_id = user_pdf.file.public_id
                    # Destroy using the public_id
                    result = cloudinary.uploader.destroy(
                        public_id,
                        resource_type='raw',
                        invalidate=True  # Optional: purge CDN cache
                    )
                    if result.get('result') == 'ok':
                        print(f"Successfully deleted from Cloudinary: {public_id}")
                    else:
                        print(f"Cloudinary deletion failed: {result.get('result')}")
                except Exception as e:
                    print(f"Error deleting from Cloudinary: {str(e)}")
                    # Continue with deletion even if Cloudinary fails

            # Delete vector store
            vectorstore_path = os.path.join(
                settings.BASE_DIR, 
                "vectorstores", 
                user_pdf.vector_store
            )
            if os.path.exists(vectorstore_path):
                import shutil
                shutil.rmtree(vectorstore_path)

            # Delete database record
            user_pdf.delete()

            return JsonResponse({
                'status': True,
                'message': 'PDF and all related data deleted successfully'
            })

        except UserPDF.DoesNotExist:
            return JsonResponse({
                'status': False,
                'error': 'PDF not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to delete PDF'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)        



class YouTubeVideoAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        video_url = request.data.get('video_url')
        if not video_url:
            return JsonResponse(
                {'error': 'YouTube video URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            processor = YouTubeProcessor()
            
            # Process video
            video_id = processor.extract_video_id(video_url)
            store_name = f"yt_{request.user.firebase_uid}_{video_id}"
            
            # This handles transcript loading and vector store creation
            processing_result = processor.process_video(video_url, store_name)
            
            # Save to database
            user_video = UserYouTubeVideo.objects.create(
                user=request.user,
                video_url=video_url,
                video_id=video_id,
                video_title=processing_result['video_info'].get('title', ''),
                thumbnail_url=processing_result['video_info'].get('thumbnail', ''),
                vector_store=store_name
            )
            
            return JsonResponse({
                'status': True,
                'message': 'YouTube video processed successfully',
                'data': {
                    'id': user_video.id,
                    'video_title': user_video.video_title,
                    'thumbnail_url': user_video.thumbnail_url,
                    'upload_time': user_video.upload_time
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to process YouTube video'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YouTubeQuestionAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        video_id = request.data.get('video_id')
        question = request.data.get('question')
        
        if not video_id or not question:
            return JsonResponse(
                {'error': 'Both video_id and question are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify video belongs to user
            user_video = UserYouTubeVideo.objects.get(id=video_id, user=request.user)
            processor = YouTubeProcessor()
            
            # Load vector store
            vs = processor.load_vector_store(user_video.vector_store)
            
            # Generate answer
            answer = processor.answer_question(vs, question)
            
            # Save conversation
            YouTubeConversation.objects.create(
                video=user_video,
                question=question,
                answer=json.dumps(answer)
            )
            
            return JsonResponse({
                'status': True,
                'data': answer
            })
            
        except UserYouTubeVideo.DoesNotExist:
            return JsonResponse({
                'status': False,
                'error': 'Video not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to answer question'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class YouTubeVideoListAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        videos = UserYouTubeVideo.objects.filter(user=request.user).order_by('-upload_time')
        data = [{
            'id': video.id,
            'video_title': video.video_title,
            'thumbnail_url': video.thumbnail_url,
            'upload_time': video.upload_time,
            'conversation_count': video.conversations.count()
        } for video in videos]
        return JsonResponse({'status': True, 'data': data})

class YouTubeVideoDeleteAPI(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, video_id):
        try:
            user_video = UserYouTubeVideo.objects.get(id=video_id, user=request.user)
            
            # Delete vector store
            vectorstore_path = os.path.join(
                settings.BASE_DIR, 
                "vectorstores", 
                user_video.vector_store
            )
            if os.path.exists(vectorstore_path):
                import shutil
                shutil.rmtree(vectorstore_path)
            
            # Delete database record
            user_video.delete()
            
            return JsonResponse({
                'status': True,
                'message': 'YouTube video and all related data deleted successfully'
            })
            
        except UserYouTubeVideo.DoesNotExist:
            return JsonResponse({
                'status': False,
                'error': 'Video not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return JsonResponse({
                'status': False,
                'error': str(e),
                'message': 'Failed to delete video'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
from concurrent.futures import ThreadPoolExecutor
import json

from django.conf import settings
from .utils import (
    get_video_id,
    download_youtube_transcript,
    parse_transcript,
    generate_mcqs_from_transcript
)


class MultiVideoMCQAPI(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        video_urls = request.data.get("video_urls")
        if not video_urls or len(video_urls) != 4:
            return JsonResponse({"error": "Provide exactly 4 video URLs"}, status=400)

        goal_distribution = [2, 3, 2, 3]

        from .utils import get_transcript_chunks_from_youtube

        def process_video(video_url):
            try:
                # Extract URL from dict if needed
                video_url_str = video_url["url"] if isinstance(video_url, dict) else video_url

                transcript_chunks = get_transcript_chunks_from_youtube(video_url_str)
                if not transcript_chunks:
                    return []

                video_id = get_video_id(video_url_str)
                _, mcqs = generate_mcqs_from_transcript(transcript_chunks, video_id)
                return mcqs or []

            except Exception as e:
                print(f"[ERROR] Processing failed for {video_url}: {str(e)}")
                return []



        with ThreadPoolExecutor(max_workers=4) as executor:
            all_mcqs = list(executor.map(process_video, video_urls))

        # Step 1: Try to assign original goal distribution
        combined_questions = []
        leftovers = []

        for mcqs, goal in zip(all_mcqs, goal_distribution):
            if mcqs:
                to_add = mcqs[:goal]
                combined_questions.extend(to_add)
                if len(mcqs) > goal:
                    leftovers.extend(mcqs[goal:])
            else:
                # This video failed or returned empty
                continue

        # Step 2: Fill remaining questions from leftovers if total < 10
        while len(combined_questions) < 10 and leftovers:
            combined_questions.append(leftovers.pop(0))

        # Step 3: If still not enough, just return what we have
        combined_questions = combined_questions[:10]

        # Save to JSON
        save_path = os.path.join(settings.BASE_DIR, "transcripts", "multi_mcqs.json")
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(combined_questions, f, indent=4)

        return JsonResponse({
            "status": True,
            "total_questions": len(combined_questions),
            "questions": combined_questions,
            "saved_to": "/transcripts/multi_mcqs.json"
        }, status=200)