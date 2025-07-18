import React from "react";
import { 
  Brain, 
  Sparkles, 
  BookOpen, 
  Target, 
  Zap, 
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react";

const QuizLoading = () => {
  return (
    <div className="min-h-screen p-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Main Loading Section */}
        <div className="bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900 rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
          <div className=" p-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  AI is Generating Your Quiz
                </h2>
                <p className="text-purple-100 font-medium">
                  Please wait while we analyze your videos and create intelligent questions
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Central Loading Animation */}
            <div className="flex flex-col items-center justify-center space-y-6 mb-8">
              <div className="relative">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full p-1 animate-spin">
                  <div className="bg-gray-800 rounded-full w-20 h-20"></div>
                </div>
                
                {/* Inner brain icon */}
                <div className="relative bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 rounded-full p-5 shadow-lg">
                  <Brain className="w-10 h-10 text-white animate-pulse" />
                </div>
                
                {/* Floating sparkles */}
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-2 animate-bounce">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="absolute -bottom-2 -left-2 bg-gradient-to-r from-pink-400 to-red-500 rounded-full p-2 animate-bounce delay-75">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-100 mb-2">
                  Crafting Your Personalized Quiz
                </h3>
                <p className="text-gray-300 font-medium">
                  Our AI is analyzing video content to create meaningful questions just for you
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="group bg-gradient-to-r from-gray-700 to-slate-800 rounded-xl p-4 border border-gray-600/50 transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2 shadow-lg">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-100">Analyzing Content</h4>
                  </div>
                  <div className="bg-green-500/20 rounded-full p-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <p className="text-gray-300 font-medium text-sm">
                  Processing video transcripts and identifying key learning points
                </p>
              </div>

              <div className="group bg-gradient-to-r from-gray-700 to-slate-800 rounded-xl p-4 border border-gray-600/50 transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2 shadow-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-100">Creating Questions</h4>
                  </div>
                  <div className="bg-blue-500/20 rounded-full p-1">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                </div>
                <p className="text-gray-300 font-medium text-sm">
                  Generating intelligent multiple-choice questions with explanations
                </p>
              </div>

              <div className="group bg-gradient-to-r from-gray-700 to-slate-800 rounded-xl p-4 border border-gray-600/50 transform hover:scale-105 transition-all duration-300 opacity-60">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2 shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-100">Finalizing Quiz</h4>
                  </div>
                  <div className="bg-gray-500/20 rounded-full p-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-300 font-medium text-sm">
                  Preparing your personalized learning experience
                </p>
              </div>
            </div>

            {/* Loading Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl p-3 border border-blue-500/30 text-center">
                <div className="text-xl font-bold text-blue-300 mb-1">AI</div>
                <div className="text-xs text-blue-200 font-medium">Powered</div>
              </div>
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-3 border border-purple-500/30 text-center">
                <div className="text-xl font-bold text-purple-300 mb-1">∞</div>
                <div className="text-xs text-purple-200 font-medium">Possibilities</div>
              </div>
              <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl p-3 border border-emerald-500/30 text-center">
                <div className="text-xl font-bold text-emerald-300 mb-1">100%</div>
                <div className="text-xs text-emerald-200 font-medium">Personalized</div>
              </div>
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl p-3 border border-orange-500/30 text-center">
                <div className="text-xl font-bold text-orange-300 mb-1">⚡</div>
                <div className="text-xs text-orange-200 font-medium">Smart</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizLoading;