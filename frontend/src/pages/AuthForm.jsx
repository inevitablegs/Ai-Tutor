import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../utils/firebase";
import axios from "axios";
import {
  User,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Brain,
  Sparkles,
  ArrowRight,
  Target,
  Users,
  BookOpen,
  Video,
  Globe,
  TestTube,
  Shield,
  TrendingUp,
  CheckCircle,
  Star,
  Heart,
  Coffee,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ───────────── Auth Handlers ─────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const token = await user.getIdToken();
      localStorage.setItem("token", token);

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Register user in Django backend with UID in headers
      await axios.post(
        `${API_BASE}/login/`,
        {
          username: formData.username,
          email: user.email,
        },
        {
          headers: {
            "X-Firebase-Uid": user.uid,
          },
        }
      );

      setIsLogin(true);
    } catch (error) {
      console.error(error);
      alert(`Signup failed: ${error.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { user } = result;

      const signInMethods = await fetchSignInMethodsForEmail(auth, user.email);
      if (signInMethods.length != 1 && signInMethods[0] != "google.com") {
        await axios.post(
          `${API_BASE}/login/`,
          {
            username: user.email,
            email: user.email,
          },
          {
            headers: {
              "X-Firebase-UID": user.uid,
            },
          }
        );
      }
      setIsLogin(true);
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert(`Google login failed: ${error.message}`);
    }
  };

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      text: "AI-Powered Learning",
      color: "text-blue-400",
    },
    {
      icon: <Video className="w-6 h-6" />,
      text: "Smart Video Curation",
      color: "text-purple-400",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      text: "Trusted Resources",
      color: "text-emerald-400",
    },
    {
      icon: <TestTube className="w-6 h-6" />,
      text: "Adaptive Quizzes",
      color: "text-indigo-400",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      text: "Privacy Protected",
      color: "text-teal-400",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      text: "Progress Tracking",
      color: "text-pink-400",
    },
  ];

  const stats = [
    {
      number: "50K+",
      label: "Active Learners",
      icon: <Users className="w-5 h-5" />,
    },
    {
      number: "1M+",
      label: "Chapters Generated",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      number: "99.8%",
      label: "Success Rate",
      icon: <Star className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white">
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-700/5 animate-pulse"></div>
      </div>

      <div className="relative h-screen flex items-center justify-center p-4 overflow-auto">

  <div className={`w-full max-w-[800px] min-h-screen lg:h-[800px] overflow-hidden transition-all duration-1000 rounded-3xl ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>


          {/* Main Container - Horizontal Layout */}
          <div className="bg-gradient-to-br from-gray-800/90 to-slate-900/90 rounded-3xl shadow-2xl overflow-auto backdrop-blur-sm border border-gray-700/50">
            <div className="grid lg:grid-cols-2 min-h-[600px]">


              {/* Left Side - Branding & Features */}
              <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-700/20 p-4 lg:p-6 flex flex-col justify-center relative overflow-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-700/10 animate-pulse"></div>

                <div className="relative z-10">
                  {/* Logo & Brand */}
                  <div className="flex items-center mb-8">
                    <div className="relative">
                      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-4 shadow-2xl border border-blue-400/30 animate-pulse">
                        <Target className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 rounded-2xl blur opacity-30 animate-pulse"></div>
                    </div>
                    <div className="ml-4">
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                        AI Learning Hub
                      </h1>
                      <p className="text-blue-200 text-lg">
                        Learn Smarter, Not Harder
                      </p>
                    </div>
                  </div>

                  {/* Welcome Message */}
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">
                      {isLogin
                        ? "🎓 Welcome Back!"
                        : "🚀 Join the Future of Learning"}
                    </h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      {isLogin
                        ? "Continue your personalized learning journey with AI-powered education tools."
                        : "Transform your education with AI-generated content, smart quizzes, and curated resources."}
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center p-3 bg-gradient-to-r from-gray-700/60 to-slate-800/60 rounded-xl border border-gray-600/50 hover:border-indigo-500/50 transition-all duration-300 backdrop-blur-sm group"
                      >
                        <div
                          className={`${feature.color} mr-3 bg-gray-800/50 rounded-lg p-2 group-hover:animate-pulse`}
                        >
                          {feature.icon}
                        </div>
                        <span className="text-gray-100 font-medium text-sm">
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    {stats.map((stat, index) => (
                      <div
                        key={index}
                        className="text-center p-4 bg-gradient-to-br from-gray-700/60 to-slate-800/60 rounded-xl border border-gray-600/50 backdrop-blur-sm"
                      >
                        <div className="flex justify-center mb-2 text-blue-400">
                          {stat.icon}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {stat.number}
                        </div>
                        <div className="text-gray-300 text-xs">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Auth Form */}
              <div className="p-4 lg:p-6 flex flex-col justify-center">
                <div className="max-w-md mx-auto w-full">
                  {/* Form Header */}
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                      <div
                        className={`bg-gradient-to-r ${
                          isLogin
                            ? "from-blue-600 to-indigo-600"
                            : "from-purple-600 to-pink-600"
                        } rounded-2xl p-3 shadow-lg animate-pulse`}
                      >
                        {isLogin ? (
                          <LogIn className="h-8 w-8 text-white" />
                        ) : (
                          <UserPlus className="h-8 w-8 text-white" />
                        )}
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {isLogin ? "Sign In" : "Create Account"}
                    </h2>
                    <p className="text-gray-400">
                      {isLogin
                        ? "Access your personalized learning dashboard"
                        : "Start your AI-powered learning journey"}
                    </p>
                  </div>

                  {/* Auth Form */}
                  <form
                    className="space-y-6"
                    onSubmit={isLogin ? handleLogin : handleSignup}
                  >
                    {!isLogin && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                          <User className="h-4 w-4 text-blue-400" />
                          <span>Username</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 text-white backdrop-blur-sm"
                          placeholder="Choose a username"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              username: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span>Email</span>
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 text-white backdrop-blur-sm"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-blue-400" />
                        <span>Password</span>
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 text-white backdrop-blur-sm"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="group w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border border-blue-400/30"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Sparkles className="w-5 h-5 group-hover:animate-spin" />
                        {isLogin ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600/50"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-gradient-to-br from-gray-800/90 to-slate-900/90 text-gray-400">
                          or
                        </span>
                      </div>
                    </div>

                    {/* Google Login */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="group w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-red-400/30"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </div>
                    </button>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      className="group w-full bg-transparent border-2 border-gray-600/50 hover:border-indigo-500/50 text-gray-300 hover:text-white py-4 px-6 rounded-xl font-medium text-lg hover:bg-gray-700/20 transition-all duration-300 transform hover:scale-105"
                      onClick={() => setIsLogin(!isLogin)}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Heart className="w-5 h-5 group-hover:animate-pulse" />
                        {isLogin
                          ? "Need an account? Sign up"
                          : "Already have an account? Sign in"}
                      </div>
                    </button>
                  </form>

                  {/* Footer */}
                  <div className="text-center mt-8 pt-6 border-t border-gray-700/50">
                    <div className="flex justify-center items-center gap-2 text-gray-400 text-sm">
                      <Coffee className="w-4 h-4" />
                      <span>Join our community of learners</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
