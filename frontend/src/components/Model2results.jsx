import React from "react";
import {
  ArrowLeft,
  CheckCircle,
  Link as LinkIcon,
  FileText,
  Brain,
} from "lucide-react";

import YouTube from "react-youtube";
import ReactMarkdown from "react-markdown";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import { useState, useMemo } from "react";
import { askPdfQuestion, askYoutubeQuestion } from "../utils/contentScan"; // Adjust the import path as needed

const API_BASE = import.meta.env.VITE_API_BASE;

function Model2results({
  file,
  url,
  mode,
  isLoading,
  setIsLoading,
  onNewScan,
  viewerRef,
  fileUrl,
  response,
}) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const highlightPluginInstance = highlightPlugin();

  const { jumpToHighlightArea } = highlightPluginInstance;
  const [player, setPlayer] = useState(null);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [thinkingText, setThinkingText] = useState("");
  const fullThinkingText = "Thinking...";

  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: `Hello! I've analyzed your ${
        mode === "pdf" ? "PDF document" : "YouTube video"
      }. What would you like to know about it?`,
    },
  ]);

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMessage = { type: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setIsAnswerLoading(true);

    try {
      let res;
      if (mode === "pdf") {
        const pdfId = response?.data?.id;
        res = await askPdfQuestion(pdfId, question);
      } else if (mode === "yt") {
        const videoId = response?.data?.id;
        res = await askYoutubeQuestion(videoId, question);
      }

      const rawAnswer = res?.data?.answer || "No response from server.";
      const refs = res?.data?.references || [];
      const thinking = res?.data?.thinking_process || "";

      

      const extractTagContent = (tag, text) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
        const matches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push(match[1].trim());
        }
        return matches.length > 0 ? matches.join("\n") : null;
      };

      const answerOnly = extractTagContent("answer", rawAnswer);
      const thinkingText = extractTagContent("think", rawAnswer);

      const newMessages = [];

      // Add thinking message first if it exists
      if (thinking) {
        newMessages.push({ type: "think", text: thinking });
      }

      // Add the answer message
      newMessages.push({ type: "ai", text: answerOnly || rawAnswer });

      // Add references if they exist
      if (refs.length > 0) {
        newMessages.push({ type: "reference-list", references: refs });
      }

      setMessages((prev) => [...prev, ...newMessages]);
    } catch (err) {
      console.error("Error getting answer:", err);
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "⚠️ Error getting answer." },
      ]);
    } finally {
      setIsAnswerLoading(false);
      setQuestion("");
    }
  };

  // Function to extract YouTube video ID from URL
  function getYoutubeVideoId(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === "youtu.be") {
        return urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v");
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Converts timestamp string like "01:30" or "00:01:30" to seconds
  function timeToSeconds(timeStr) {
    const parts = timeStr.split(":").map(Number).reverse();
    return parts.reduce(
      (total, part, index) => total + part * Math.pow(60, index),
      0
    );
  }

  const handleSeek = (timeInSeconds) => {
    if (player) {
      player.seekTo(timeInSeconds, true);
      player.playVideo();
    }
  };

  return (
    <section className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 overflow-hidden">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-4 border-b border-blue-400/20 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-2 shadow-md">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                AI Analysis Results
              </h2>
              <p className="text-blue-100 text-sm font-normal">
                {mode === "pdf" ? `${file?.name}` : "YouTube video analysis"}
              </p>
            </div>
          </div>
          <button
            onClick={onNewScan}
            className="flex items-center gap-2 px-4 py-2 text-blue-100 hover:text-white hover:bg-white/15 transition-all duration-200 rounded-lg backdrop-blur-sm border border-white/20 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            New Scan
          </button>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex h-[calc(100vh-120px)] min-h-0">
        {/* Left Panel - Chat Section */}
        <div className="flex flex-col h-full w-3/5 min-w-0 border-r border-gray-700/50 bg-gradient-to-br from-gray-800 to-slate-800">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-gradient-to-b from-gray-800/50 to-slate-800/50 custom-scrollbar">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                if (msg.type === "reference-list") {
                  return (
                    <div
                      key={index}
                      className="text-sm text-gray-100 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                        <LinkIcon className="w-4 h-4" />
                        <span>References Found</span>
                      </div>
                      <div className="space-y-2">
                        {msg.references.map((ref) => (
                          <button
                            key={ref.chunk_id}
                            onClick={() => {
                              if (mode === "pdf") {
                                jumpToHighlightArea({
                                  pageIndex: ref.page - 2,
                                });
                              } else if (
                                mode === "yt" &&
                                ref.timestamp?.start
                              ) {
                                const startTime =
                                  typeof ref.timestamp.start === "string"
                                    ? timeToSeconds(ref.timestamp.start)
                                    : ref.timestamp.start;

                                handleSeek(startTime);
                              }
                            }}
                            className="block text-left w-full break-words p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 hover:from-indigo-900/60 hover:to-purple-900/60 transition-all duration-300 border border-indigo-500/30 hover:border-indigo-400/50 shadow-lg hover:shadow-xl transform hover:scale-102 backdrop-blur-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                                {mode === "pdf" ? (
                                  <FileText className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-white font-bold text-xs">
                                    ⏱️
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-indigo-200 font-medium text-sm">
                                  {mode === "pdf"
                                    ? `Page ${ref.page}`
                                    : `Timestamp: ${ref.timestamp.start}s`}
                                </div>
                                <div className="text-gray-300 text-sm mt-1 line-clamp-2">
                                  {mode === "pdf"
                                    ? `${ref.preview.slice(0, 120)}...`
                                    : `${ref.text.slice(0, 120)}...`}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className={`flex ${
                      msg.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`${
                        msg.type === "user"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                          : msg.type === "think"
                          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-gray-100 shadow-lg border-blue-400/40 backdrop-blur-sm"
                          : "bg-gradient-to-r from-gray-700 to-slate-700 text-gray-100 shadow-lg"
                      } rounded-2xl p-5 max-w-[85%] min-w-0 border ${
                        msg.type === "user"
                          ? "border-emerald-400/30"
                          : msg.type === "think"
                          ? "border-blue-400/50"
                          : "border-gray-600/50"
                      } ${msg.type === "think" ? "relative" : ""}`}
                    >
                      {msg.type === "think" && (
                        <div className="flex items-center gap-2 mb-3 text-blue-300">
                          <Brain className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            AI Thinking Process
                          </span>
                        </div>
                      )}
                      {msg.type === "ai" || msg.type === "think" ? (
                        <div className="prose prose-sm prose-invert max-w-none break-words overflow-wrap-anywhere whitespace-pre-wrap">
                          <ReactMarkdown
                            components={{
                              p: ({ node, ...props }) => (
                                <p
                                  className={`${
                                    msg.type === "think"
                                      ? "text-gray-200"
                                      : "text-white"
                                  }`}
                                  {...props}
                                />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong
                                  className={
                                    msg.type === "think" ? "text-blue-200" : ""
                                  }
                                  {...props}
                                />
                              ),
                              em: ({ node, ...props }) => (
                                <em
                                  className={
                                    msg.type === "think" ? "text-blue-300" : ""
                                  }
                                  {...props}
                                />
                              ),
                              code: ({ node, inline, ...props }) =>
                                inline ? (
                                  <code
                                    className={`${
                                      msg.type === "think"
                                        ? "text-blue-100 bg-blue-900/30 px-1 rounded"
                                        : ""
                                    }`}
                                    {...props}
                                  />
                                ) : (
                                  <pre
                                    className={`${
                                      msg.type === "think"
                                        ? "bg-blue-900/20 border border-blue-500/30 p-2 rounded"
                                        : ""
                                    }`}
                                  >
                                    <code {...props} />
                                  </pre>
                                ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm font-medium break-words whitespace-pre-wrap overflow-wrap-anywhere">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isAnswerLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-gray-700/40 to-slate-700/40 rounded-2xl p-5 max-w-[85%] min-w-0 backdrop-blur-sm border border-gray-600/30 shadow-inner relative overflow-hidden group">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <span
                          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0s" }}
                        ></span>
                        <span
                          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></span>
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></span>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">
                        Thinking...
                      </p>
                    </div>
                    <div className="absolute top-2 right-3 opacity-30 group-hover:opacity-80 transition duration-300">
                      <button
                        onClick={() => setIsAnswerLoading(false)}
                        className="text-xs text-gray-400 hover:text-gray-200 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input */}
          <div className="flex-shrink-0 p-6 border-t border-gray-700/50 bg-gradient-to-r from-gray-800 to-slate-800">
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                disabled={isAnswerLoading}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question about the content..."
                className="flex-1 min-w-0 p-4 border border-gray-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gradient-to-r from-gray-700 to-slate-700 text-gray-100 placeholder-gray-400 text-sm font-medium backdrop-blur-sm shadow-lg transition-all duration-200 hover:shadow-xl"
              />
              <button
                disabled={isAnswerLoading}
                onClick={handleSend}
                className="flex-shrink-0 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 font-bold border border-blue-400/30"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Content Display */}
        <div className="w-2/5 flex flex-col min-w-0 bg-gradient-to-br from-gray-800 to-slate-800">
          {/* Content Display Area */}
          <div className="flex-1 overflow-hidden min-h-0">
            {mode === "pdf" ? (
              <div className="h-full bg-gradient-to-br from-gray-800 to-slate-800 overflow-y-auto rounded-l-3xl border-l border-gray-700/50">
                {file ? (
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <div className="h-full overflow-y-auto bg-white rounded-l-3xl shadow-2xl">
                      <Viewer
                        ref={viewerRef}
                        fileUrl={fileUrl}
                        plugins={[
                          defaultLayoutPluginInstance,
                          highlightPluginInstance,
                        ]}
                        renderLoader={(percentages) => (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-slate-800">
                            <div className="text-center">
                              <div className="relative mb-4">
                                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full p-4 shadow-lg">
                                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full animate-pulse opacity-30"></div>
                              </div>
                              <div className="text-lg font-bold text-white mb-2">
                                Loading PDF Analysis
                              </div>
                              <div className="text-blue-200 font-medium">
                                {Math.round(percentages)}% complete
                              </div>
                            </div>
                          </div>
                        )}
                        theme={{
                          theme: "auto",
                        }}
                      />
                    </div>
                  </Worker>
                ) : (
                  <div className="text-center text-gray-300 h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-gray-600 to-slate-600 rounded-2xl p-6 shadow-lg backdrop-blur-sm border border-gray-500/30 mb-4">
                        <FileText className="w-12 h-12 mx-auto text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-300">
                        PDF not loaded
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        Please upload a PDF file to analyze
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-gradient-to-br from-gray-800 to-slate-800 flex items-center justify-center rounded-l-3xl border-l border-gray-700/50">
                <div className="w-full h-full rounded-l-3xl overflow-hidden shadow-2xl">
                  {url ? (
                    <YouTube
                      videoId={getYoutubeVideoId(url)}
                      opts={{
                        width: "100%",
                        height: "100%",
                        playerVars: {
                          autoplay: 1,
                        },
                      }}
                      onReady={(e) => setPlayer(e.target)}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="text-center text-gray-300 h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-6 shadow-lg backdrop-blur-sm border border-red-400/30 mb-4">
                          <svg
                            className="w-12 h-12 mx-auto text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 110 5H9m4.5-1.206a11.955 11.955 0 01-2.5 2.5"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-300">
                          No video URL provided
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Please provide a YouTube URL to analyze
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Model2results;
