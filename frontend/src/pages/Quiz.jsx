import React, { useState } from "react";
import { useQuiz } from "../contexts/QuizContext";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Brain, 
  PlayCircle,
  Award,
  Target,
  Clock,
  BookOpen,
  ArrowLeft
} from "lucide-react";

const Quiz = () => {
  const navigate = useNavigate();
  const {  
    questions,
    setQuestions,
    userAnswers,
    setUserAnswers,
    current,
    setCurrent,
    showResults,
    setShowResults, 
  } = useQuiz();

  const currentQuestion = questions[current];
  console.log(questions);
  console.log("Current Question:", currentQuestion);

  const handleAnswer = (optionKey) => {
    setUserAnswers({ ...userAnswers, [current]: optionKey });
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  const isCorrect = (index) => {
    return userAnswers[index] === questions[index].correct_answer;
  };

  const calculateScore = () => {
    const correctAnswers = questions.filter((_, index) => isCorrect(index)).length;
    return {
      correct: correctAnswers,
      total: questions.length,
      percentage: Math.round((correctAnswers / questions.length) * 100)
    };
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "from-green-600 to-emerald-700";
    if (percentage >= 60) return "from-yellow-600 to-orange-700";
    return "from-red-600 to-pink-700";
  };

  const getScoreIcon = (percentage) => {
    if (percentage >= 80) return Trophy;
    if (percentage >= 60) return Award;
    return Target;
  };

  const handleGoBack = () => {
    // Reset quiz state
    setShowResults(false);
    setCurrent(0);
    setUserAnswers({});
    // Navigate back to previous page
    navigate(-1);
  };

  return (
    <div className="min-h-screen p-6 overflow-x-hidden bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl border border-blue-400/20">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
              <Brain className="w-8 h-8 text-blue-100" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                AI Quiz Challenge
              </h1>
              <p className="text-blue-100 text-lg font-medium">
                Test your knowledge with AI-generated questions
              </p>
            </div>
          </div>
        </div>

        {!showResults ? (
          <div className="bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-700/50">
            {/* Progress Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 border-b border-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-lg rounded-xl p-2 shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Question {current + 1} of {questions.length}
                    </h2>
                    <p className="text-blue-100 font-medium">
                      Progress: {Math.round(((current + 1) / questions.length) * 100)}%
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-lg text-white px-4 py-2 rounded-full font-bold border border-white/30">
                  {current + 1}/{questions.length}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-white to-blue-100 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Content */}
            <div className="p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-100 mb-6 leading-relaxed">
                  {currentQuestion.question}
                </h3>
                
                <div className="space-y-4">
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleAnswer(key)}
                      className={`group w-full text-left p-5 rounded-2xl transition-all duration-300 transform hover:scale-102 border ${
                        userAnswers[current] === key
                          ? "bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400 text-white shadow-lg"
                          : "bg-gradient-to-r from-gray-700 to-slate-800 hover:from-gray-600 hover:to-slate-700 border-gray-600/50 hover:border-indigo-500/50 text-gray-100 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg ${
                          userAnswers[current] === key
                            ? "bg-white/20 backdrop-blur-lg text-white"
                            : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                        }`}>
                          {key.toUpperCase()}
                        </div>
                        <span className="font-medium text-lg">{value}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrev}
                  disabled={current === 0}
                  className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-500 hover:to-slate-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-gray-500/50"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
                
                <button
                  onClick={handleNext}
                  className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 border border-blue-400/30"
                >
                  {current < questions.length - 1 ? "Next" : "Submit Quiz"}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Go Back Button */}
            <div className="flex justify-start">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center gap-2 text-blue-100 hover:text-white hover:bg-white/15 px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm bg-gradient-to-r from-gray-700 to-slate-800 hover:from-gray-600 hover:to-slate-700 border border-gray-600/50 hover:border-indigo-500/50 font-medium shadow-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                Go Back to Resources
              </button>
            </div>

            {/* Score Display */}
            <div className={`bg-gradient-to-r ${getScoreColor(calculateScore().percentage)} rounded-3xl p-8 text-white shadow-2xl border border-white/20`}>
              <div className="flex items-center gap-6">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
                  {React.createElement(getScoreIcon(calculateScore().percentage), {
                    className: "w-12 h-12 text-white"
                  })}
                </div>
                <div className="flex-1">
                  <h2 className="text-4xl font-bold mb-2">Quiz Complete!</h2>
                  <p className="text-xl font-medium opacity-90">
                    You scored {calculateScore().correct} out of {calculateScore().total} questions
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 text-center shadow-lg">
                  <div className="text-4xl font-bold">{calculateScore().percentage}%</div>
                  <div className="text-lg font-medium opacity-90">Score</div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-700/50">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 border-b border-gray-700/30">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Detailed Results</h3>
                    <p className="text-purple-100 font-medium">
                      Review your answers and learn from explanations
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {questions.map((q, index) => (
                  <div key={index} className="bg-gradient-to-r from-gray-700 to-slate-800 rounded-2xl p-6 border border-gray-600/50 shadow-lg">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg ${
                        isCorrect(index) 
                          ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                          : "bg-gradient-to-br from-red-500 to-pink-600 text-white"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-100 mb-3">
                          {q.question}
                        </h4>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            {isCorrect(index) ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                            <span className={`font-bold ${
                              isCorrect(index) ? "text-green-300" : "text-red-300"
                            }`}>
                              Your Answer: {userAnswers[index]?.toUpperCase() || "None"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="font-semibold text-green-300">
                              Correct Answer: {q.correct_answer.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-600/30">
                          <p className="text-gray-300 italic font-medium">{q.explanation}</p>
                        </div>
                        
                        <div className="mt-4">
                          <a
                            href={q.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 border border-red-400/30"
                          >
                            <PlayCircle className="w-5 h-5" />
                            <span>Watch at {q.timestamp}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;