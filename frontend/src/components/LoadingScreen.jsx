import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Brain, 
  Sparkles, 
  Loader2, 
  Target, 
  Zap,
  Lightbulb,
  Cpu
} from "lucide-react";

function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const loadingSteps = [
    { 
      icon: Brain, 
      text: "Initializing AI Learning Engine...", 
      description: "Preparing personalized education algorithms",
      color: "from-blue-500 to-cyan-500" 
    },
    { 
      icon: BookOpen, 
      text: "Analyzing Educational Content...", 
      description: "Processing vast knowledge databases",
      color: "from-purple-500 to-pink-500" 
    },
    { 
      icon: Target, 
      text: "Customizing Learning Path...", 
      description: "Tailoring content to your needs",
      color: "from-emerald-500 to-teal-500" 
    },
    { 
      icon: Sparkles, 
      text: "Generating Smart Resources...", 
      description: "Creating your personalized study materials",
      color: "from-orange-500 to-red-500" 
    },
    { 
      icon: Zap, 
      text: "Finalizing AI Experience...", 
      description: "Almost ready for your learning journey",
      color: "from-indigo-500 to-purple-500" 
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, []);

  const FloatingIcon = ({ icon: Icon, delay, size = "w-6 h-6" }) => (
    <div 
      className={`absolute text-white/30 animate-pulse`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: '3s',
        top: `${Math.random() * 80 + 10}%`,
        left: `${Math.random() * 80 + 10}%`,
      }}
    >
      <Icon className={size} />
    </div>
  );

  return (
    <div className="min-h-screen min-w-screen bg-gradient-to-br from-slate-900/80 via-gray-900/80 to-slate-800/80 backdrop-blur-sm flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <FloatingIcon 
            key={i} 
            icon={[BookOpen, Brain, Lightbulb, Cpu, Sparkles][i % 5]} 
            delay={i * 0.3}
            size={i % 3 === 0 ? "w-8 h-8" : "w-6 h-6"}
          />
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main Loading Container */}
      <div className="relative z-10 bg-gradient-to-br from-gray-800/80 via-slate-800/80 to-gray-900/80 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-gray-700/50 max-w-xl w-full mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-full p-3 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              AI Learning Hub
            </h1>
          </div>
          <p className="text-gray-300 text-sm font-medium">
            Preparing your personalized educational experience
          </p>
        </div>

        {/* Main Loading Animation */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-4">
            {/* Spinning Outer Ring */}
            <div className="w-20 h-20 border-3 border-gray-700 rounded-full animate-spin border-t-transparent">
              <div className={`w-full h-full rounded-full bg-gradient-to-r ${loadingSteps[currentStep].color} p-1`}>
                <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center">
                  {React.createElement(loadingSteps[currentStep].icon, {
                    className: "w-8 h-8 text-white animate-pulse"
                  })}
                </div>
              </div>
            </div>
            
            {/* Pulsing Inner Glow */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${loadingSteps[currentStep].color} opacity-20 animate-ping`}></div>
          </div>
        </div>

        {/* Current Step Info */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-white mb-1">
            {loadingSteps[currentStep].text}
          </h2>
          <p className="text-gray-400 text-sm font-medium">
            {loadingSteps[currentStep].description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-400">Progress</span>
            <span className="text-xs font-bold text-white">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${loadingSteps[currentStep].color} transition-all duration-300 ease-out rounded-full relative`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center space-x-3">
          {loadingSteps.map((step, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index <= currentStep
                  ? `bg-gradient-to-r ${step.color} shadow-lg`
                  : 'bg-gray-600'
              }`}
            >
              {index === currentStep && (
                <div className={`w-full h-full rounded-full bg-gradient-to-r ${step.color} animate-pulse`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Fun Facts */}
        <div className="mt-4 text-center">
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-3 border border-blue-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">AI Fact</span>
            </div>
            <p className="text-gray-300 text-xs">
              Our AI processes over 10 million educational resources to find the perfect content for you!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;