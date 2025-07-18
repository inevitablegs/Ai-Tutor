import React, { useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Play,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  Clock,
  Target,
} from "lucide-react";
import { generateMultiVideoMCQs } from "../utils/contentScan";
import { useNavigate } from "react-router-dom";
import { useQuiz } from "../contexts/QuizContext";
import QuizLoading from "./QuizLoading";

function ResultsView({
  chapters,
  videos,
  websites,
  error,
  topic,
  grade,
  fromHistory,
  setError,
  fetchVideoResources,
  fetchWebResources,
  setVideos,
  setWebsites,
  activeTab,
  setActiveTab,
  chapterHistory,
  onBack,
}) {
  const [loading, setLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showQuizNotice, setShowQuizNotice] = useState(false);

  const navigate = useNavigate();
  const { setQuestions, setUserAnswers, setCurrent, setShowResults } =
    useQuiz();
  const handleChapterClick = async (chapter) => {
    if (!chapter) return setError("Chapter cannot be blank");

    // Reset previous resources and error
    setVideos([]);
    setWebsites([]);
    setError("");

    // Get the index of the clicked chapter
    const chapterIndex = chapters.findIndex(
      (ch) => ch.toLowerCase().trim() === chapter.toLowerCase().trim()
    );

    if (chapterIndex === -1) {
      return setError("Chapter not found in list.");
    }

    // Apply your logic here
    if (fromHistory) {
      const historyItem = chapterHistory[chapterIndex];

      if (historyItem) {
        setVideos(historyItem.videos || []);
        setWebsites(historyItem.websites || []);
      } else {
        setError("No history found for this chapter.");
      }
    } else {
      if (!topic?.trim()) return setError("Topic cannot be blank");
      if (!grade?.trim()) return setError("Grade cannot be blank");

      try {
        setLoading(true);
        await fetchVideoResources(chapter);
        const websitesArr = await fetchWebResources({ topic, grade, chapter });
        setWebsites(websitesArr);
      } catch (err) {
        const backendMsg = err?.response?.data?.error;
        setError(backendMsg || err.message || "Failed to fetch resources");
        setVideos([]);
        setWebsites([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGenerateQuiz = async () => {
    setShowQuizNotice(true);
    // console.log("Generating quiz for these videos:", videos);
    // setQuizLoading(true); // start loading

    // try {
    //   const res = await generateMultiVideoMCQs(videos);
    //   if (res.error) {
    //     setError(res.error);
    //   } else {
    //     console.log("Quiz generated successfully:", res);
    //     setQuestions(res.questions);
    //     setUserAnswers({});
    //     setCurrent(0);
    //     navigate("/quiz");
    //   }
    // } catch (err) {
    //   setError(err.message || "Failed to generate quiz");
    // } finally {
    //   setQuizLoading(false); // stop loading
    // }
  };

  return (
    <div className="min-h-screen p-6 overflow-x-hidden">
      {quizLoading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <QuizLoading />
        </div>
      )}
      {showQuizNotice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="max-w-lg w-full bg-gradient-to-br from-yellow-900 to-orange-900 border border-yellow-500/30 rounded-3xl p-8 shadow-2xl text-white space-y-6 relative">
            <button
              onClick={() => setShowQuizNotice(false)}
              className="absolute top-3 right-4 text-yellow-300 hover:text-white text-lg font-bold"
            >
              ✖
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-yellow-600 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-yellow-200">
                  ⚠️ Quiz Generation Unavailable
                </h2>
                <p className="text-yellow-100 mt-1">
                  Due to memory limits on the current server deployment, quiz
                  generation is temporarily disabled. We're working on
                  optimizing resources. Please check back soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl border border-blue-400/20">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white hover:bg-white/15 px-4 py-2 rounded-xl transition-all duration-200 mb-6 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to input
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
              <Target className="w-8 h-8 text-blue-100" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                AI Learning Hub
              </h1>
              <p className="text-blue-100 text-lg font-medium">
                Discover personalized educational resources powered by AI
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-r from-red-900/40 to-pink-900/40 border border-red-500/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 rounded-full p-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-red-300">Error Detected</h3>
                <p className="text-red-200 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generated Chapters */}
        {chapters.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-700/50">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 border-b border-gray-700/30">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white">
                    AI-Generated Chapters
                  </h2>
                  <p className="text-blue-100 font-medium">
                    Click on any chapter to explore AI-curated resources
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-lg text-white px-5 py-2 rounded-full font-bold border border-white/30">
                  {chapters.length} chapters
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chapters.map((chapter, i) => (
                  <div
                    key={i}
                    onClick={() => handleChapterClick(chapter)}
                    className="group relative bg-gradient-to-br from-gray-700 to-slate-800 hover:from-gray-600 hover:to-slate-700 rounded-2xl p-6 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border border-gray-600/50 hover:border-indigo-500/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-gray-100 font-bold group-hover:text-indigo-300 transition-colors leading-relaxed overflow-hidden text-ellipsis break-words">
                          {chapter}
                        </h3>
                        <div className="flex items-center gap-2 mt-3 text-gray-400">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium">
                            Click to explore
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/20 rounded-2xl transition-all duration-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-gradient-to-br from-gray-800 to-slate-900 rounded-3xl shadow-2xl border border-gray-700/50 p-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full p-6 shadow-lg">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full animate-pulse opacity-30" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-100 mb-2">
                  AI is Processing Resources
                </h3>
                <p className="text-gray-400 font-medium">
                  Our AI is curating the best personalized learning materials
                  for you...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resources Grid */}
        {(videos.length > 0 || websites.length > 0) && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Videos Section */}
              {videos.length > 0 && (
                <div className="bg-gradient-to-br from-gray-800 to-red-900/20 rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-pink-700 p-6 border-b border-gray-700/30">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
                        <Play className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white">
                          AI-Curated Videos
                        </h3>
                        <p className="text-red-100 font-medium">
                          Personalized video content for visual learning
                        </p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-lg text-white px-5 py-2 rounded-full font-bold border border-white/30">
                        {videos.length} videos
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {videos.map((v, i) => (
                      <a
                        key={i}
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 p-5 bg-gradient-to-r from-gray-700 to-red-900/20 hover:from-red-900/20 hover:to-pink-900/20 rounded-2xl border border-gray-600/50 hover:border-pink-500/50 transition-all duration-300 transform hover:scale-102 hover:shadow-lg"
                      >
                        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-100 font-bold group-hover:text-red-300 transition-colors overflow-hidden text-ellipsis break-words">
                            {v.title}
                          </h4>
                          <p className="text-gray-400 text-sm mt-1 font-medium">
                            Click to watch AI-recommended video
                          </p>
                        </div>
                        <div className="flex-shrink-0 bg-gray-600 rounded-full p-2 shadow-sm group-hover:shadow-md transition-shadow border border-gray-500/50">
                          <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Websites Section */}
              {websites.length > 0 && (
                <div className="bg-gradient-to-br from-gray-800 to-emerald-900/20 rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 border-b border-gray-700/30">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
                        <ExternalLink className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white">
                          AI-Selected Resources
                        </h3>
                        <p className="text-emerald-100 font-medium">
                          Intelligent reading materials and references
                        </p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-lg text-white px-5 py-2 rounded-full font-bold border border-white/30">
                        {websites.length} sites
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {websites.map((w, i) => (
                      <a
                        key={i}
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 p-5 bg-gradient-to-r from-gray-700 to-emerald-900/20 hover:from-emerald-900/20 hover:to-teal-900/20 rounded-2xl border border-gray-600/50 hover:border-teal-500/50 transition-all duration-300 transform hover:scale-102 hover:shadow-lg"
                      >
                        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <ExternalLink className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-100 font-bold group-hover:text-emerald-300 transition-colors overflow-hidden text-ellipsis break-words">
                            {w.title}
                          </h4>
                          <p className="text-gray-400 text-sm mt-1 font-medium">
                            Click to visit AI-recommended website
                          </p>
                        </div>
                        <div className="flex-shrink-0 bg-gray-600 rounded-full p-2 shadow-sm group-hover:shadow-md transition-shadow border border-gray-500/50">
                          <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generate Quiz Button */}
            {videos.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={handleGenerateQuiz}
                  className="group relative bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold px-10 py-5 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border border-purple-300/30"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-lg">Generate AI Quiz</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsView;
