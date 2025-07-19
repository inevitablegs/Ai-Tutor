// Scanner.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { uploadPdf, analyzeYoutube } from "../utils/contentScan";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Model2history from "./Model2history";

import { fetchUserPDFList } from "../utils/contentScan";
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  ScanLine,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Brain,
  Zap,
  Target,
  PlayCircle,
  BookOpen,
  Shield,
  Lightbulb,
} from "lucide-react";
import Model2results from "./Model2results";

/**
 * If you're working with Django + CSRF, keep your existing util:
 *   import { getCsrfToken } from "../utils/api";
 * and add an X‑CSRFToken header the same way you already do.
 */

const API_BASE = import.meta.env.VITE_API_BASE;

/**
 * Endpoints (adjust to match your backend):
 *   POST `${API_BASE}/analyze/pdf`   – multipart/form‑data with key `file`
 *   POST `${API_BASE}/analyze/yt`    – JSON { "url": "<YouTube link>" }
 * Your backend should return JSON like { ok: true, data: … } or { error: "…" }.
 */

function Scanner() {
  const [mode, setMode] = useState("pdf"); // "pdf" | "yt"
  const [file, setFile] = useState(null); // File object for PDF
  const [url, setUrl] = useState(""); // YouTube URL
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null); // Backend result
  const [error, setError] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const viewerRef = useRef(null);

  const [activeTab, setActiveTab] = useState("form");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: `Hello! I've analyzed your ${
        mode === "pdf" ? "PDF document" : "YouTube video"
      }. What would you like to know about it?`,
    },
  ]); // "form" | "results"
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // Enhanced mode options with better descriptions and icons
  const modeOptions = [
    {
      value: "pdf",
      label: "PDF Document",
      icon: FileText,
      description: "Transform PDFs into interactive learning experiences",
      placeholder: "Choose a PDF file to analyze",
      gradient: "from-orange-500 via-red-500 to-pink-600",
      emoji: "📄",
      features: [
        "Extract key concepts",
        "Generate summaries",
        "Create study guides",
        "Auto-highlight important text",
      ],
    },
    {
      value: "yt",
      label: "YouTube Video",
      icon: PlayCircle,
      description: "Convert video content into structured knowledge",
      placeholder: "https://www.youtube.com/watch?v=...",
      gradient: "from-red-500 via-pink-500 to-purple-600",
      emoji: "🎥",
      features: [
        "Auto-generate timestamps",
        "Extract transcripts",
        "Create chapter summaries",
        "Generate quiz questions",
      ],
    },
  ];

  const fileUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.zoom(SpecialZoomLevel.ActualSize); // 100% zoom
    }
  }, [fileUrl]);

  const highlightPluginInstance = highlightPlugin();
  const { jumpToHighlightArea, highlightAreas, setHighlightAreas } =
    highlightPluginInstance;

  /* ---------- handlers ---------- */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0] ?? null;
    setFile(selectedFile);
    console.log("Selected file:", selectedFile);
    setError("");
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setError("");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // clear previous inputs so user doesn't accidentally send wrong thing
    setFile(null);
    setUrl("");
    setResponse(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResponse(null);

    try {
      if (mode === "pdf") {
        if (!file) return setError("Please choose a PDF file to analyze.");
        let data = await uploadPdf(file);
        setIsLoading(true);
        setResponse(data);
        setActiveTab("results");
        return;
      }

      if (mode === "yt") {
        if (!url.trim())
          return setError("Please paste a YouTube link to analyze.");
        let data = await analyzeYoutube(url);
        setIsLoading(true);
        console.log("YouTube analysis response:", data);

        setResponse(data);
        setActiveTab("results");
        return;
      }
    } catch (err) {
      console.log(err);
      
      console.error(err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentModeConfig = () => {
    return modeOptions.find((option) => option.value === mode);
  };

  const handleNewScan = () => {
    setActiveTab("form");
    setResponse(null);
    setError("");
    setFile(null);
    setUrl("");
  };

  /* ---------- helpers ---------- */
  const prettyJson = (json) => JSON.stringify(json, null, 2);

  return (
    <div className="min-h-screen  text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: "all 0.3s ease-out",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="relative space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ---------------- TAB 1 : SCANNER FORM ---------------- */}
        {activeTab === "form" && (
          <div
            className={`transition-all duration-1000 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            {/* Enhanced Main Content Card */}
            <div className="bg-gradient-to-br from-gray-800/60 to-slate-900/60 rounded-3xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
              {/* Mode Selection with Enhanced Design */}
              <div className="space-y-6 mb-12">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <Brain className="w-8 h-8 text-blue-400" />
                    Choose Your Content Type
                  </h2>
                  <p className="text-gray-300 text-lg">
                    Select how you'd like to learn today
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div
                        key={option.value}
                        onClick={() => handleModeChange(option.value)}
                        className={`group relative p-8 rounded-3xl border-2 transition-all duration-500 cursor-pointer transform hover:scale-105 backdrop-blur-sm ${
                          mode === option.value
                            ? "border-blue-500 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 shadow-2xl"
                            : "border-gray-600/50 bg-gradient-to-br from-gray-700/40 to-slate-800/40 hover:border-gray-500/70 hover:shadow-xl"
                        }`}
                      >
                        {/* Animated background for selected mode */}
                        {mode === option.value && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-3xl animate-pulse" />
                        )}

                        <div className="relative">
                          <div className="flex items-center gap-4 mb-6">
                            <div
                              className={`w-16 h-16 bg-gradient-to-br ${
                                option.gradient
                              } rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 ${
                                mode === option.value ? "animate-pulse" : ""
                              }`}
                            >
                              <Icon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3
                                className={`text-2xl font-bold ${
                                  mode === option.value
                                    ? "text-blue-100"
                                    : "text-white group-hover:text-blue-100"
                                } transition-colors flex items-center gap-2`}
                              >
                                {option.emoji} {option.label}
                              </h3>
                              <p
                                className={`text-lg ${
                                  mode === option.value
                                    ? "text-blue-200"
                                    : "text-gray-300 group-hover:text-blue-200"
                                } transition-colors`}
                              >
                                {option.description}
                              </p>
                            </div>
                          </div>

                          {/* Feature List */}
                          <div className="space-y-2">
                            {option.features.map((feature, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 text-gray-300"
                              >
                                <CheckCircle
                                  className={`w-4 h-4 ${
                                    mode === option.value
                                      ? "text-blue-400"
                                      : "text-gray-500"
                                  } transition-colors`}
                                />
                                <span className="text-sm">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Notice for Scanner Issues */}
              {mode === "pdf" && (
                <div className="mt-6 p-6 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-400/30 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-3">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">
                        ⚠️ PDF Scanner Notice
                      </p>
                      <p className="text-yellow-200 mt-1">
                        We are currently experiencing performance issues with
                        the PDF Scanner due to RAM limitations after deployment.
                        Large files may load slowly or fail. Please try with
                        smaller files or check back later.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mode === "yt" && (
                <div className="mt-6 p-6 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-400/30 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-3">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">
                        ⚠️ YouTube Transcript Notice
                      </p>
                      <p className="text-yellow-200 mt-1">
                        Due to post-deployment resource constraints, transcript
                        fetching from YouTube videos may be incomplete or
                        delayed. We’re actively working to improve this.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Input Form */}
              <form onSubmit={handleSubmit} className="space-y-8 p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      {mode === "pdf"
                        ? "📄 Upload Your Document"
                        : "🎥 Paste Video URL"}
                    </h3>
                  </div>

                  {mode === "pdf" ? (
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="w-full p-6 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gradient-to-br from-gray-700/50 to-slate-800/50 text-white file:mr-6 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-indigo-600 file:text-white hover:file:from-blue-600 hover:file:to-indigo-700 file:shadow-lg hover:file:shadow-xl file:transition-all backdrop-blur-sm"
                      />
                      <div className="absolute top-6 right-6 text-gray-400 group-hover:text-blue-400 transition-colors">
                        <Upload className="w-6 h-6" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder={getCurrentModeConfig()?.placeholder}
                        value={url || ""}
                        onChange={handleUrlChange}
                        className="w-full p-6 pl-16 border-2 border-gray-600 group-hover:border-blue-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gradient-to-br from-gray-700/50 to-slate-800/50 text-white placeholder-gray-400 text-lg backdrop-blur-sm"
                      />
                      <LinkIcon className="absolute left-6 top-6 w-6 h-6 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                  )}
                </div>

                {/* Enhanced File Info Display */}
                {mode === "pdf" && file && (
                  <div className="p-6 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-2xl border border-emerald-500/30 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">
                          {file.name}
                        </p>
                        <p className="text-emerald-200">
                          📊 Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="ml-auto">
                        <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`group relative w-full font-bold py-6 px-12 rounded-2xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-2xl ${
                      isLoading
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 hover:shadow-3xl"
                    } text-white text-xl border border-blue-400/30`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span>🔄 Analyzing Content...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-4">
                        <Sparkles className="w-8 h-8 group-hover:animate-spin" />
                        <span>✨ Start AI Analysis</span>
                        <Zap className="w-8 h-8 group-hover:animate-pulse" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                  </button>
                </div>
              </form>

              {/* Enhanced Error Display */}
              {error && (
                <div className="mt-8 p-6 bg-gradient-to-r from-red-900/40 to-pink-900/40 border border-red-500/30 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-3">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">
                        ⚠️ Oops! Something went wrong
                      </p>
                      <p className="text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced History Component */}
              <div className="mt-12 p-8  rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-3">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    📚 Your Learning History
                  </h3>
                </div>
                <Model2history />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB 2 : RESULTS ---------------- */}
        {activeTab === "results" && (
          <div className="bg-gradient-to-br from-gray-800/60 to-slate-900/60 rounded-3xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
            <Model2results
              file={file}
              url={url}
              mode={mode}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onNewScan={handleNewScan}
              viewerRef={viewerRef}
              fileUrl={fileUrl}
              response={response}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Scanner;
