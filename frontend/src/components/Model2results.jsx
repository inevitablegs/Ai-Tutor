import React from "react";
import {
  ArrowLeft,
  CheckCircle,
  Link as LinkIcon,
  FileText,
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

  const [question, setQuestion] = useState("");
  const [videoStartTime, setVideoStartTime] = useState(0);

  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: `Hello! I've analyzed your ${
        mode === "pdf" ? "PDF document" : "YouTube video"
      }. What would you like to know about it?`,
    },
  ]);
  console.log(response);

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMessage = { type: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let res;
      if (mode === "pdf") {
        const pdfId = response?.data?.id;
        res = await askPdfQuestion(pdfId, question);
      } else if (mode === "yt") {
        const videoId = response?.data?.id;
        res = await askYoutubeQuestion(videoId, question);
        console.log("Response from YouTube question:", res);
      }

      const aiAnswer = res?.data?.answer || "No response from server.";
      const refs = res?.data?.references || [];

      setMessages((prev) => [
        ...prev,
        { type: "ai", text: aiAnswer },
        ...(refs.length > 0
          ? [{ type: "reference-list", references: refs }]
          : []),
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "⚠️ Error getting answer." },
      ]);
    } finally {
      setIsLoading(false);
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
    <section className="w-auto h-auto bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Analysis Results
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {mode === "pdf" ? `${file?.name}` : "YouTube video analysis"}
            </p>
          </div>
        </div>
        <button
          onClick={onNewScan}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          New Scan
        </button>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex h-[calc(100vh-80px)] min-h-0">
        {/* Left Panel - Chat Section */}
        <div className="flex flex-col h-full w-3/5 min-w-0 border-r border-slate-200 dark:border-slate-700">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                if (msg.type === "reference-list") {
                  return (
                    <div
                      key={index}
                      className="text-sm text-slate-800 dark:text-slate-100"
                    >
                      <div className="mt-3 space-y-2">
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
                            className="block text-blue-600 dark:text-blue-400 hover:underline text-left w-full break-words p-2 rounded bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            {mode === "pdf"
                              ? `🔗 Page ${ref.page}: ${ref.preview.slice(
                                  0,
                                  120
                                )}...`
                              : `⏱️ Timestamp: ${
                                  ref.timestamp.start
                                }s – ${ref.text.slice(0, 120)}...`}
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
                          ? "bg-green-100 dark:bg-green-700"
                          : "bg-slate-100 dark:bg-slate-700"
                      } rounded-lg p-4 max-w-[85%] min-w-0`}
                    >
                      {msg.type === "ai" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 break-words overflow-x-auto">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-900 dark:text-slate-100 break-words">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 max-w-[85%] min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      Thinking...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input */}
          <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question about the content..."
                className="flex-1 min-w-0 p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Content Display */}
        <div className="w-2/5 flex flex-col min-w-0">
          {/* Content Display Area */}
          <div className="flex-1 overflow-hidden min-h-0">
            {mode === "pdf" ? (
              <div className="h-full bg-slate-100 dark:bg-slate-700 overflow-y-auto">
                {file ? (
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <div className="h-full overflow-y-auto bg-white dark:bg-slate-800">
                      <Viewer
                        ref={viewerRef}
                        fileUrl={fileUrl}
                        plugins={[
                          defaultLayoutPluginInstance,
                          highlightPluginInstance,
                        ]}
                        renderLoader={(percentages) => (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                Loading PDF... {Math.round(percentages)}%
                              </div>
                            </div>
                          </div>
                        )}
                        theme={{
                          theme: "auto", // This will auto-detect based on your page theme
                        }}
                      />
                    </div>
                  </Worker>
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 h-full flex items-center justify-center">
                    <div>
                      <svg
                        className="w-12 h-12 mx-auto mb-2 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p>PDF not loaded</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <div className="w-full h-full">
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
                    <div className="text-center text-slate-500 dark:text-slate-400">
                      No video URL provided.
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