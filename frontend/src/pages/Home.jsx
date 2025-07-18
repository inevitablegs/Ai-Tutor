import React, { useState, useEffect } from 'react';
import { Brain, Search, Rocket, Target, Users, BookOpen, Video, Globe, TestTube, Clock, BarChart, Star, ArrowRight, Play, CheckCircle, Sparkles, Upload, Link, Zap, Award, TrendingUp, Shield, Lightbulb, Coffee, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const Home = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
   const navigate = useNavigate();

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleGetStarted = () => {
    navigate("/auth")
  };

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI Chapter Generator",
      description: "Transform any topic into comprehensive, grade-appropriate chapters with visual aids and examples.",
      gradient: "from-blue-500 via-purple-500 to-indigo-600",
      detail: "Smart content generation that adapts to your learning level"
    },
    {
      icon: <Video className="w-8 h-8" />,
      title: "Smart Video Curation",
      description: "AI-powered video selection with automatic summaries, timestamps, and follow-up questions.",
      gradient: "from-red-500 to-pink-600",
      detail: "Never waste time on irrelevant videos again"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Trusted Resource Hub",
      description: "Curated collection of verified educational websites and interactive learning materials.",
      gradient: "from-emerald-500 to-teal-600",
      detail: "Quality-checked resources from top educational institutions"
    },
    {
      icon: <TestTube className="w-8 h-8" />,
      title: "Dynamic Quiz Engine",
      description: "Adaptive assessments that evolve with your learning progress and identify knowledge gaps.",
      gradient: "from-purple-600 via-indigo-600 to-blue-600",
      detail: "Personalized questions that challenge you at the right level"
    }
  ];

  const newFeatures = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "PDF Intelligence",
      description: "Upload textbooks, notes, or papers - AI extracts key concepts and creates instant study materials.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: <Link className="w-6 h-6" />,
      title: "YouTube AI Scanner",
      description: "Paste any educational video link for instant summaries, notes, and comprehension questions.",
      gradient: "from-pink-500 to-rose-600"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Learning",
      description: "Master complex topics in minutes with AI-optimized learning paths and micro-lessons.",
      gradient: "from-yellow-500 to-orange-600"
    }
  ];

  const benefits = [
    { icon: <Target className="w-6 h-6" />, text: "Personalized Learning Journey", color: "text-blue-400" },
    { icon: <Clock className="w-6 h-6" />, text: "24/7 AI Study Companion", color: "text-green-400" },
    { icon: <BookOpen className="w-6 h-6" />, text: "Multi-Board Curriculum Support", color: "text-purple-400" },
    { icon: <Brain className="w-6 h-6" />, text: "Intelligent Content Generation", color: "text-indigo-400" },
    { icon: <TrendingUp className="w-6 h-6" />, text: "Advanced Progress Analytics", color: "text-pink-400" },
    { icon: <Shield className="w-6 h-6" />, text: "Privacy-First Architecture", color: "text-teal-400" }
  ];

  const userTypes = [
    { type: "Students", emoji: "🎓", gradient: "from-blue-500 to-indigo-600", desc: "K-12 & Higher Education" },
    { type: "Teachers", emoji: "👨‍🏫", gradient: "from-emerald-500 to-teal-600", desc: "Lesson Planning & Resources" },
    { type: "Exam Aspirants", emoji: "🏆", gradient: "from-purple-500 to-pink-600", desc: "JEE, NEET, UPSC & More" },
    { type: "Lifelong Learners", emoji: "🌟", gradient: "from-orange-500 to-red-600", desc: "Continuous Skill Development" }
  ];

  const testimonials = [
    {
      name: "Ananya Sharma",
      role: "NEET Aspirant",
      text: "Uploaded my entire biology syllabus PDF - got perfect summaries and practice MCQs instantly!",
      rating: 5,
      image: "👩‍🎓"
    },
    {
      name: "Aditya Kumar",
      role: "Class 10 Student",
      text: "The YouTube scanner is incredible. AI breaks down complex physics videos better than my tutor.",
      rating: 5,
      image: "👨‍🎓"
    },
    {
      name: "Priya Patel",
      role: "Teacher",
      text: "Creating lesson plans is now effortless. My students love the interactive quizzes!",
      rating: 5,
      image: "👩‍🏫"
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Learners", icon: <Users className="w-6 h-6" /> },
    { number: "1M+", label: "Chapters Generated", icon: <BookOpen className="w-6 h-6" /> },
    { number: "500K+", label: "Videos Analyzed", icon: <Video className="w-6 h-6" /> },
    { number: "99.8%", label: "Success Rate", icon: <Award className="w-6 h-6" /> }
  ];


  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: 'all 0.3s ease-out'
          }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-700/20 animate-pulse"></div>
        
        <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            {/* Animated Logo */}
            <div className="flex justify-center items-center mb-8">
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-6 shadow-2xl border border-blue-400/30 animate-bounce">
                  <Target className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 rounded-3xl blur opacity-30 animate-pulse"></div>
              </div>
            </div>
            
            {/* Main Title with Typing Effect */}
            <h1 className="text-7xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent mb-6 animate-pulse">
              AI Learning Hub
            </h1>
            
            <p className="text-3xl text-blue-100 mb-4 font-medium animate-bounce">
              Learn Smarter, Not Harder
            </p>
            
            <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              🔍 Instantly Understand Any Topic - Enter any topic and grade level – our AI generates 
              easy-to-understand chapters, curated videos, helpful websites, and smart quizzes tailored just for you.
            </p>


            {/* Enhanced Get Started Button */}
            <div className="flex justify-center mb-16">
              <button
                onClick={handleGetStarted}
                className="group relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white font-bold px-16 py-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border border-blue-300/30"
              >
                <div className="flex items-center gap-4">
                  <Sparkles className="w-10 h-10 animate-spin" />
                  <span className="text-3xl">Start Learning Now</span>
                  <ArrowRight className="w-10 h-10 group-hover:translate-x-2 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 rounded-3xl blur opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
              </button>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-800/60 to-slate-900/60 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
                  <div className="flex items-center justify-center mb-2 text-blue-400">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-gray-300 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <div className="py-20 bg-gradient-to-br from-gray-800/50 to-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 shadow-lg animate-pulse">
                <Rocket className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-white mb-6">🚀 Revolutionary Features</h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Experience the future of personalized learning with our cutting-edge AI technology
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`group bg-gradient-to-br from-gray-700/80 to-slate-800/80 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 border border-gray-600/50 hover:border-indigo-500/50 cursor-pointer backdrop-blur-sm ${activeFeature === index ? 'ring-2 ring-blue-500' : ''}`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:animate-pulse`}>
                  <div className="text-white group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-indigo-300 transition-colors">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{feature.description}</p>
                <p className="text-sm text-indigo-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity">{feature.detail}</p>
              </div>
            ))}
          </div>

          {/* New Features Highlight */}
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-3xl p-8 border border-indigo-500/30 backdrop-blur-sm">
            <h3 className="text-3xl font-bold text-white mb-8 text-center">🆕 Latest Innovations</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {newFeatures.map((feature, index) => (
                <div key={index} className="flex items-start p-6 bg-gradient-to-br from-gray-800/60 to-slate-900/60 rounded-2xl border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300">
                  <div className={`p-3 bg-gradient-to-r ${feature.gradient} rounded-xl mr-4 flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                    <p className="text-gray-300 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Benefits Section */}
      <div className="py-20 bg-gradient-to-br from-slate-800/50 to-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">✨ Why Students Love Us</h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Discover powerful tools designed to enhance your learning experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center p-6 bg-gradient-to-r from-gray-700/80 to-slate-800/80 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-600/50 hover:border-indigo-500/50 group backdrop-blur-sm">
                <div className={`${benefit.color} mr-6 bg-gray-800 rounded-full p-3 group-hover:animate-pulse`}>
                  {benefit.icon}
                </div>
                <span className="text-gray-100 font-medium text-lg group-hover:text-white transition-colors">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Testimonials Section */}
      <div className="py-20 bg-gradient-to-br from-gray-800/50 to-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">💬 What Our Users Say</h2>
            <p className="text-gray-300 text-lg">Real stories from real students and teachers</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-700/80 to-slate-800/80 rounded-3xl p-8 border border-gray-600/50 hover:border-indigo-500/50 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm">
                <div className="flex items-center mb-6">
                  <div className="text-4xl mr-4">{testimonial.image}</div>
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex text-yellow-400">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Perfect For Section */}
      <div className="py-20 bg-gradient-to-br from-gray-800/50 to-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 shadow-lg animate-pulse">
                <Users className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">🎯 Perfect for Everyone</h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Whether you're a student, teacher, or lifelong learner, AI Tutor adapts to your unique needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {userTypes.map((user, index) => (
              <div key={index} className="group text-center p-8 bg-gradient-to-br from-gray-700/80 to-slate-800/80 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-600/50 hover:border-indigo-500/50 backdrop-blur-sm">
                <div className={`w-20 h-20 bg-gradient-to-br ${user.gradient} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:animate-bounce`}>
                  <div className="text-4xl">{user.emoji}</div>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">{user.type}</h3>
                <p className="text-gray-400 text-sm">{user.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 border-t border-blue-400/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-700/20 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20">
            <h2 className="text-5xl font-bold text-white mb-6">🚀 Start Your Learning Journey</h2>
            <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
              Join 50,000+ students already transforming their education with AI. 
              Experience personalized learning that adapts to your pace and style.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <button 
                onClick={handleGetStarted}
                className="group w-full sm:w-auto bg-white text-indigo-600 px-12 py-6 rounded-2xl text-xl font-bold hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-3">
                  <Sparkles className="w-6 h-6 group-hover:animate-spin" />
                  Start Free Trial
                </div>
              </button>
              
              <button className="group w-full sm:w-auto bg-transparent border-2 border-white text-white px-12 py-6 rounded-2xl text-xl font-bold hover:bg-white hover:text-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                <div className="flex items-center justify-center gap-3">
                  <Heart className="w-6 h-6 group-hover:animate-pulse" />
                  Join Community
                </div>
              </button>
            </div>

            <div className="text-center">
              <div className="flex justify-center items-center gap-4 text-blue-100">
                <Coffee className="w-5 h-5" />
                <span>Join our community of passionate learners</span>
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="py-12 bg-gray-900 text-center border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-3 shadow-lg animate-pulse">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-gray-400 text-xl font-semibold mb-2">
            🎓 AI Tutor - Empowering education with intelligent tools
          </p>
          <p className="text-gray-500 mb-4">
            Discover personalized educational resources powered by advanced AI technology
          </p>
          <div className="flex justify-center items-center gap-4 text-gray-400">
            <Lightbulb className="w-5 h-5" />
            <span>Built with ❤️ for learners worldwide</span>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;