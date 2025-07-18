from django.contrib import admin
from django.urls import path, include
from core.api import FirebaseLoginAPI, DashboardAPI, ChapterAPI, VideoResourcesAPI, WebResourcesAPI, PDFQAAPI, QuestionAnswerAPI, UserPDFListAPI, DeletePDFAPI, PDFConversationHistoryAPI, YouTubeQuestionAPI, YouTubeVideoAPI, YouTubeVideoListAPI, YouTubeVideoDeleteAPI, ChapterGenerationHistoryAPI, ChapterResourcesAPI, DeleteChapterGenerationAPI
from django.views.generic import TemplateView
from core.api import get_csrf_token
from core.api import MultiVideoMCQAPI

urlpatterns = [
    # Existing URLs
    path('admin/', admin.site.urls),
    path('api/login/', FirebaseLoginAPI.as_view(), name='api_login'),
    path('api/dashboard/', DashboardAPI.as_view(), name='api_dashboard'),
    
    # Chapter-related URLs
    path('api/chapters/', ChapterAPI.as_view(), name='api_chapters'),
    path('api/chapters/history/', ChapterGenerationHistoryAPI.as_view(), name='api_chapter_history'),
    path('api/chapters/<int:generation_id>/resources/', ChapterResourcesAPI.as_view(), name='api_chapter_resources'),
    path('api/videos/', VideoResourcesAPI.as_view(), name='api_videos'),
    path('api/websites/', WebResourcesAPI.as_view(), name='api_websites'),
    path('api/chapters/<int:generation_id>/', DeleteChapterGenerationAPI.as_view(), name='api_delete_chapter_generation'),
    path("api/generate-multi-mcqs/", MultiVideoMCQAPI.as_view(), name="generate_multi_mcqs"),

    
    # PDF-related URLs
    path('api/process-pdf/', PDFQAAPI.as_view(), name='api_process_pdf'),
    path('api/answer-question/', QuestionAnswerAPI.as_view(), name='api_answer_question'),
    path('api/user/pdfs/', UserPDFListAPI.as_view(), name='api_user_pdfs'),
    path('api/user/pdfs/<int:pdf_id>/', DeletePDFAPI.as_view(), name='api_delete_pdf'),
    path('api/user/pdfs/<int:pdf_id>/conversations/', PDFConversationHistoryAPI.as_view(), name='api_pdf_conversations'),
    
    # YouTube-related URLs
    path('api/process-youtube/', YouTubeVideoAPI.as_view(), name='api_process_youtube'),
    path('api/ask-youtube-question/', YouTubeQuestionAPI.as_view(), name='api_ask_youtube_question'),
    path('api/user/youtube-videos/', YouTubeVideoListAPI.as_view(), name='api_user_youtube_videos'),
    path('api/user/youtube-videos/<int:video_id>/', YouTubeVideoDeleteAPI.as_view(), name='api_delete_youtube_video'),
    
    # CSRF and frontend
    path('api/csrf/', get_csrf_token, name='api_csrf'),
    path('', TemplateView.as_view(template_name='index.html')),
    path('<path:path>', TemplateView.as_view(template_name='index.html')),
]