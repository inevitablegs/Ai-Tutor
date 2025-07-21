import React, { useState, useEffect } from "react";
import { 
  FileText, 
  PlayCircle, 
  Loader2, 
  Brain, 
  Sparkles, 
  Zap,
  ScanLine,
  BookOpen,
  Video,
  Target,
  CheckCircle,
  Clock,
  Cpu,
  Eye,
  MessageSquare
} from "lucide-react";

const ScannerLoading = ({ mode, fileName, url }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState("");

  // PDF Analysis Steps
  const pdfSteps = [
    { icon: FileText, text: "Reading PDF structure", color: "text-blue-400" },
    { icon: ScanLine, text: "Extracting text content", color: "text-green-400" },
    { icon: Brain, text: "Analyzing key concepts", color: "text-purple-400" },
    { icon: Target, text: "Identifying main topics", color: "text-yellow-400" },
    { icon: BookOpen, text: "Generating summary", color: "text-indigo-400" },
    { icon: Sparkles, text: "Creating insights", color: "text-pink-400" }
  ];

  // YouTube Analysis Steps
  const youtubeSteps = [
    { icon: PlayCircle, text: "Fetching video metadata", color: "text-red-400" },
    { icon: Video, text: "Processing video content", color: "text-orange-400" },
    { icon: MessageSquare, text: "Extracting transcript", color: "text-green-400" },
    { icon: Brain, text: "Analyzing content flow", color: "text-purple-400" },
    { icon: Clock, text: "Creating timestamps", color: "text-blue-400" },
    { icon: Sparkles, text: "Generating insights", color: "text-pink-400" }
  ];

  const steps = mode === "pdf" ? pdfSteps : youtubeSteps;

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 3;
      });
    }, 200);

    // Step progression
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) return steps.length - 1;
        return prev + 1;
      });
    }, 1500);

    // Dots animation
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearInterval(dotsInterval);
    };
  }, [steps.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto px-6">
        {/* Main Loading Card */}
        <div className="bg-gradient-to-br from-gray-800/80 to-slate-900/80 rounded-2xl shadow-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className={`w-16 h-16 bg-gradient-to-br ${
                mode === "pdf" 
                  ? "from-orange-500 via-red-500 to-pink-600" 
                  : "from-red-500 via-pink-500 to-purple-600"
              } rounded-xl flex items-center justify-center shadow-2xl mb-3 animate-pulse`}>
                {mode === "pdf" ? (
                  <FileText className="w-8 h-8 text-white" />
                ) : (
                  <PlayCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-spin">
                <Loader2 className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === "pdf" ? "📄 Analyzing PDF" : "🎥 Processing Video"}
            </h2>
            <p className="text-gray-300 text-sm mb-3">
              {mode === "pdf" 
                ? "Extracting insights from your document" 
                : "Converting video into structured knowledge"
              }
            </p>
            
            {/* File/URL Info */}
            <div className="bg-gradient-to-r from-gray-700/50 to-slate-800/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-gray-200 font-medium truncate text-sm">
                {mode === "pdf" ? fileName : url}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300">Progress</span>
              <span className="text-sm font-medium text-blue-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Current Step Display */}
          <div className="mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                {React.createElement(steps[currentStep]?.icon || Loader2, {
                  className: "w-5 h-5 text-white"
                })}
              </div>
              <div className="flex-1">
                <p className="text-blue-100 font-semibold text-sm">
                  {steps[currentStep]?.text || "Processing"}
                  <span className="text-blue-400">{dots}</span>
                </p>
              </div>
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
          </div>

          {/* Animated Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerLoading;