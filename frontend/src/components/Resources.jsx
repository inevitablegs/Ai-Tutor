import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  AlertCircle,
  Play,
  ExternalLink,
  Loader2,
  ChevronDown,
  ArrowRight,
  Target,
  Zap,
} from "lucide-react";
import ResultsView from "./ResultsView"; // Adjust the import path
import { getFirebaseIdToken } from "../utils/firebase"; // Adjust the import path
import Model1history from "./Model1history";
import { getCsrfToken } from "../utils/api"; // Adjust the import path
import LoadingScreen from "./LoadingScreen"; // Adjust the import path

function Resources() {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("");
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [activeTab, setActiveTab] = useState("form");
  const [chapterHistory, setChapterHistory] = useState([]);
  const [fromHistory, setFromHistory] = useState(false);

  const gradeOptions = [
    { value: "school", label: "Elementary School", icon: "🎒" },
    { value: "high school", label: "High School", icon: "📚" },
    { value: "college", label: "College", icon: "🎓" },
    { value: "phd", label: "PhD Level", icon: "🔬" },
  ];

  const API_BASE = import.meta.env.VITE_API_BASE;

  const generateChapters = async () => {
    if (loading) return;
    if (!topic.trim() || !grade.trim()) {
      setFormError("Please fill in both the topic and grade.");
      setChapters([]);
      return;
    }

    setLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const firebaseIdToken = await getFirebaseIdToken();

      const res = await axios.post(
        `${API_BASE}/chapters/`,
        { topic, grade },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseIdToken}`, // Include Firebase ID token if needed
          },
        }
      );
      console.log("Response from server:", res.data);

      setChapters(res.data?.data?.chapters || []);
      setError("");
      setFormError("");
      setActiveTab("results");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoResources = async (chapter) => {
    if (!topic?.trim()) return setError("Topic cannot be blank");
    if (!grade?.trim()) return setError("Grade cannot be blank");
    if (!chapter) return setError("Chapter cannot be blank");

    try {
      setError("");
      const idToken = await getFirebaseIdToken();
      const csrfToken = await getCsrfToken();

      const res = await axios.post(
        `${API_BASE}/videos/`,
        { topic, grade, chapter },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`, // Include Firebase ID token if needed
          },
        }
      );

      console.log("Video response:", res.data.data.videos);
      setVideos(res.data?.data?.videos || []);
    } catch (err) {
      const backendMsg = err?.response?.data?.error;
      setError(backendMsg || err.message || "Failed to fetch videos");
      setVideos([]);
    }
  };

  const fetchWebResources = async ({ topic, grade, chapter }) => {
    const csrfToken = await getCsrfToken();
    const idToken = await getFirebaseIdToken();
    const res = await axios.post(
      `${API_BASE}/websites/`,
      { topic, grade, chapter },
      {
        withCredentials: true,
        headers: {
          "X-CSRFToken": csrfToken,
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // Include Firebase ID token if needed
        },
      }
    );

    return res.data?.data?.websites || [];
  };
  const getSelectedGradeOption = () => {
    return gradeOptions.find((option) => option.value === grade);
  };

  useEffect(() => {
    if (fromHistory) {
      const chapterNames = chapterHistory.map((item) => item.name);
      setChapters(chapterNames); // ✅ now chapters is just an array of strings
      console.log("Chapter names:", chapterNames);

      setActiveTab("results");
    }
  }, [fromHistory, chapterHistory]);

  return (
    <div className="min-h-screen p-4">
      {loading && (
        <div className="fixed inset-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <LoadingScreen />
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Enhanced Form Tab */}
        {activeTab === "form" && (
          <div className="space-y-8">
            {/* Main Form Card */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              {/* Animated Header */}
              <div className="relative bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm"></div>
                <div className="relative flex items-center gap-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">
                      Create Your Learning Path
                    </h2>
                    <p className="text-white/90 text-lg mt-1">
                      Generate comprehensive chapter outlines tailored to your
                      level
                    </p>
                  </div>
                </div>
                {/* Floating decoration */}
                <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-4 right-8 w-16 h-16 bg-white/10 rounded-full blur-lg animate-pulse"></div>
              </div>

              {/* Enhanced Form Content */}
              <div className="p-8 space-y-8">
                {/* Topic Input with Enhanced Styling */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    <label className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      What would you like to learn?
                    </label>
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Enter your topic (e.g., Machine Learning, History of Rome, Quantum Physics)"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-4 pl-12 text-lg border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 group-hover:border-blue-300 dark:group-hover:border-blue-400"
                    />
                    <Sparkles className="absolute left-4 top-4 w-6 h-6 text-blue-500 group-focus-within:animate-pulse" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-focus-within:from-blue-500/5 group-focus-within:via-purple-500/5 group-focus-within:to-pink-500/5 transition-all duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Grade Level Select with Enhanced Design */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-500" />
                    <label className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      Choose your academic level
                    </label>
                  </div>
                  <div className="relative group">
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full p-4 pl-12 pr-12 text-lg border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 appearance-none cursor-pointer group-hover:border-purple-300 dark:group-hover:border-purple-400"
                    >
                      <option value="">Select your academic level</option>
                      {gradeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                    <GraduationCap className="absolute left-4 top-4 w-6 h-6 text-purple-500 group-focus-within:animate-pulse" />
                    <ChevronDown className="absolute right-4 top-4 w-6 h-6 text-slate-400 group-focus-within:text-purple-500 transition-colors duration-200" />
                  </div>
                </div>

                {/* Selected Grade Preview */}
                {grade && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 transition-all duration-300">
                    <div
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                        getSelectedGradeOption()?.color ||
                        "from-blue-400 to-purple-500"
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Selected: {getSelectedGradeOption()?.icon}{" "}
                      {getSelectedGradeOption()?.label}
                    </span>
                  </div>
                )}

                {/* Enhanced Error Display */}
                {formError && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl transition-all duration-300">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
                    <p className="text-red-700 dark:text-red-400 font-medium">
                      {formError}
                    </p>
                  </div>
                )}

                {/* Enhanced Generate Button */}
                <button
                  onClick={generateChapters}
                  disabled={loading}
                  className={`w-full font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed scale-100"
                      : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl focus:ring-blue-500/50"
                  } text-white relative overflow-hidden group`}
                >
                  {/* Button background animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>

                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Generating Amazing Chapters...</span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                        <div
                          className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3 relative">
                      <Zap className="w-6 h-6 group-hover:animate-pulse" />
                      <span>Generate Chapters</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Enhanced History Section */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Recent Learning Sessions
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Continue from where you left off
                </p>
              </div>
              <div className="p-6">
                <Model1history
                  setFromHistory={setFromHistory}
                  setChapterHistory={setChapterHistory}
                  loading={loading}
                  setLoading={setLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Results Tab */}
        {activeTab === "results" && (
          <div className="transition-all duration-500 ease-in-out">
            <ResultsView
              chapters={chapters}
              videos={videos}
              websites={websites}
              error={error}
              setError={setError}
              topic={topic}
              fetchVideoResources={fetchVideoResources}
              fetchWebResources={fetchWebResources}
              grade={grade}
              setVideos={setVideos}
              setWebsites={setWebsites}
              fromHistory={fromHistory}
              chapterHistory={chapterHistory}
              onBack={() => setActiveTab("form")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Resources;
