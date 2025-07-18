import React, { useState, useEffect } from "react";
import { fetchUserPDFList } from "../utils/contentScan";
import { History, FileText, Youtube, Clock, MessageSquare, Sparkles, Trash2, Play, BookOpen } from "lucide-react";
import { deletePdf } from "../utils/contentScan";
import { fetchYouTubeHistory, deleteYoutubeVideo, fetchPDFConversationHistory } from "../utils/contentScan";

// Enhanced scrollbar styles with theme matching
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(71, 85, 105, 0.3);
    border-radius: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #3b82f6, #6366f1, #8b5cf6);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #2563eb, #4f46e5, #7c3aed);
  }
`;

// Inject enhanced styles
if (typeof document !== "undefined") {
  const existingStyle = document.querySelector('style[data-history-styles]');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleElement = document.createElement("style");
  styleElement.setAttribute('data-history-styles', 'true');
  styleElement.textContent = scrollbarStyles;
  document.head.appendChild(styleElement);
}

const Model2history = () => {
  const [activeTab, setActiveTab] = useState("pdf");
  const [pdfHistory, setPdfHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ytHistory, setYtHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Mouse tracking for interactive background
  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch PDF upload history
  useEffect(() => {
    if (activeTab === "pdf") {
      setLoading(true);
      fetchUserPDFList()
        .then((data) => setPdfHistory(data))
        .catch((err) => console.error("Failed to fetch PDF history", err))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const handleDelete = async (pdfId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this PDF?"
    );
    if (!confirmed) return;

    const result = await deletePdf(pdfId);
    if (result.success) {
      setPdfHistory((prev) => prev.filter((pdf) => pdf.id !== pdfId));
      alert("PDF deleted successfully.");
    } else {
      alert("Failed to delete PDF: " + result.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === "pdf") {
      fetchUserPDFList()
        .then((data) => setPdfHistory(data))
        .catch((err) => console.error("Failed to fetch PDF history", err))
        .finally(() => setLoading(false));
    } else if (activeTab === "youtube") {
      fetchYouTubeHistory()
        .then((data) => setYtHistory(data))
        .catch((err) => console.error("Failed to fetch YouTube history", err))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const handleDeleteYT = async (videoId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this YouTube video?"
    );
    if (!confirmed) return;

    try {
      await deleteYoutubeVideo(videoId);
      setYtHistory((prev) => prev.filter((video) => video.id !== videoId));
      alert("YouTube video deleted successfully.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handlePdfClick = (pdf) => {
    alert("Viewing conversation history for PDFs is not available yet.");
  };

  const handleYouTubeClick = (video) => {
    alert("Viewing conversation history for YouTube is not available yet.");
  };

  return (
    <div className="min-h-screen  p-4 sm:p-5 md:p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: 'all 0.3s ease-out'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className={`relative max-w-6xl mx-auto transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-gray-800/60 via-slate-800/60 to-gray-800/60 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700/50 p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">

            <div className="relative">
              <div className="p-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-lg animate-pulse">
                <History className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 rounded-2xl blur opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent mb-2">
                📚 Analysis History
              </h1>
              <p className="text-gray-300 text-lg">
                View your previously analyzed content and conversations
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Toggle Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setActiveTab("pdf")}
            className={`group relative p-4 sm:p-5 md:p-6 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden backdrop-blur-sm ${
              activeTab === "pdf"
                ? "border-blue-500 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-700/20 shadow-2xl"
                : "border-gray-600/50 bg-gradient-to-r from-gray-800/60 to-slate-800/60 hover:border-gray-500/70 hover:shadow-xl"
            }`}
          >
            <div className="relative z-10 flex items-center gap-4">
              <div className={`p-4 rounded-2xl shadow-lg transition-all duration-300 ${
                activeTab === "pdf"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-700 animate-pulse"
                  : "bg-gradient-to-r from-gray-700 to-slate-700 group-hover:from-gray-600 group-hover:to-slate-600"
              }`}>
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-2 transition-colors ${
                  activeTab === "pdf"
                    ? "text-blue-100"
                    : "text-gray-100 group-hover:text-white"
                }`}>
                  📄 PDF Documents
                </h3>
                <p className={`text-sm transition-colors ${
                  activeTab === "pdf"
                    ? "text-blue-200"
                    : "text-gray-400 group-hover:text-gray-300"
                }`}>
                  Previously analyzed documents and textbooks
                </p>
              </div>
            </div>
            {activeTab === "pdf" && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-700/10 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("youtube")}
            className={`group relative p-p-4 sm:p-5 md:p-6 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden backdrop-blur-sm ${
              activeTab === "youtube"
                ? "border-red-500 bg-gradient-to-r from-red-600/20 via-pink-600/20 to-rose-700/20 shadow-2xl"
                : "border-gray-600/50 bg-gradient-to-r from-gray-800/60 to-slate-800/60 hover:border-gray-500/70 hover:shadow-xl"
            }`}
          >
            <div className="relative z-10 flex items-center gap-4">
              <div className={`p-4 rounded-2xl shadow-lg transition-all duration-300 ${
                activeTab === "youtube"
                  ? "bg-gradient-to-r from-red-600 to-pink-600 animate-pulse"
                  : "bg-gradient-to-r from-gray-700 to-slate-700 group-hover:from-gray-600 group-hover:to-slate-600"
              }`}>
                <Youtube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-2 transition-colors ${
                  activeTab === "youtube"
                    ? "text-red-100"
                    : "text-gray-100 group-hover:text-white"
                }`}>
                  🎥 YouTube Videos
                </h3>
                <p className={`text-sm transition-colors ${
                  activeTab === "youtube"
                    ? "text-red-200"
                    : "text-gray-400 group-hover:text-gray-300"
                }`}>
                  Previously analyzed educational videos
                </p>
              </div>
            </div>
            {activeTab === "youtube" && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-pink-600/10 to-rose-700/10 animate-pulse" />
            )}
          </button>
        </div>

        {/* Enhanced Content Area */}
        <div className="bg-gradient-to-r from-gray-800/60 via-slate-800/60 to-gray-800/60 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700/50 p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/30 border-t-blue-500 shadow-lg"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-400/20"></div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-xl font-medium text-gray-300 mb-2">Loading your content...</p>
                <p className="text-gray-500">✨ Preparing your learning history</p>
              </div>
            </div>
          ) : activeTab === "pdf" ? (
            pdfHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mb-8">
                  <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-r from-blue-600/20 to-indigo-700/20 rounded-3xl inline-block">
                    <BookOpen className="w-16 h-16 text-blue-400 animate-pulse" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-3xl blur animate-pulse"></div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">📚 No PDFs Yet</h3>
                <p className="text-gray-400 text-lg mb-2">
                  Upload your first PDF to get started with AI analysis
                </p>
                <p className="text-gray-500">
                  🚀 Experience instant summaries, key insights, and smart Q&A
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    📄 Your PDF Collection ({pdfHistory.length})
                  </h3>
                  <p className="text-gray-400">Click on any document to view conversation history</p>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {pdfHistory.map((pdf, index) => (
                    <div
                      key={pdf.id}
                      onClick={() => handlePdfClick(pdf)}
                      className={`group cursor-pointer p-4 sm:p-5 md:p-6 bg-gradient-to-r from-gray-700/60 to-slate-800/60 backdrop-blur-sm rounded-2xl border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${
                        index % 2 === 0 ? 'hover:from-blue-900/20 hover:to-indigo-900/20' : 'hover:from-purple-900/20 hover:to-pink-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl shadow-lg transition-all duration-300 ${
                              index % 2 === 0 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 group-hover:from-blue-500 group-hover:to-indigo-600' 
                                : 'bg-gradient-to-r from-purple-600 to-pink-700 group-hover:from-purple-500 group-hover:to-pink-600'
                            }`}>
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-lg mb-1 group-hover:text-blue-200 transition-colors truncate">
                                {pdf.file_name}
                              </h4>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {new Date(pdf.upload_time).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  <span>
                                    {pdf.conversation_count} conversation{pdf.conversation_count !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="ml-6 flex flex-col items-end gap-3">
                          <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
                            index % 2 === 0
                              ? 'bg-gradient-to-r from-blue-600/20 to-indigo-700/20 text-blue-300 border border-blue-500/30'
                              : 'bg-gradient-to-r from-purple-600/20 to-pink-700/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            💬 {pdf.conversation_count} chat{pdf.conversation_count !== 1 ? 's' : ''}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(pdf.id);
                            }}
                            className="group/btn flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-red-500/30 hover:border-red-400/50"
                          >
                            <Trash2 className="w-4 h-4 group-hover/btn:animate-pulse" />
                            <span className="text-sm font-medium">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : ytHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-r from-red-600/20 to-pink-700/20 rounded-3xl inline-block">
                  <Youtube className="w-16 h-16 text-red-400 animate-pulse" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-3xl blur animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">🎥 No Videos Yet</h3>
              <p className="text-gray-400 text-lg mb-2">
                Analyze your first YouTube video to get started
              </p>
              <p className="text-gray-500">
                🚀 Get instant summaries, timestamps, and key insights
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  🎥 Your Video Collection ({ytHistory.length})
                </h3>
                <p className="text-gray-400">Click on any video to view conversation history</p>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {ytHistory.map((video, index) => (
                  <div
                    key={video.id}
                    onClick={() => handleYouTubeClick(video)}
                    className={`group cursor-pointer p-4 sm:p-5 md:p-6 bg-gradient-to-r from-gray-700/60 to-slate-800/60 backdrop-blur-sm rounded-2xl border border-gray-600/50 hover:border-red-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${
                      index % 2 === 0 ? 'hover:from-red-900/20 hover:to-pink-900/20' : 'hover:from-orange-900/20 hover:to-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative">
                            <img
                              src={video.thumbnail_url}
                              alt="Video thumbnail"
                              className="w-24 h-16 object-cover rounded-xl shadow-lg border border-gray-600/50"
                            />
                            <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Play className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg mb-1 group-hover:text-red-200 transition-colors line-clamp-2">
                              {video.video_title}
                            </h4>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {new Date(video.upload_time).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                <span>
                                  {video.conversation_count} conversation{video.conversation_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col items-end gap-3">
                        <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
                          index % 2 === 0
                            ? 'bg-gradient-to-r from-red-600/20 to-pink-700/20 text-red-300 border border-red-500/30'
                            : 'bg-gradient-to-r from-orange-600/20 to-red-700/20 text-orange-300 border border-orange-500/30'
                        }`}>
                          💬 {video.conversation_count} chat{video.conversation_count !== 1 ? 's' : ''}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteYT(video.id);
                          }}
                          className="group/btn flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-red-500/30 hover:border-red-400/50"
                        >
                          <Trash2 className="w-4 h-4 group-hover/btn:animate-pulse" />
                          <span className="text-sm font-medium">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Model2history;