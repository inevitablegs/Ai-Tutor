import React, { useEffect, useState, useContext } from "react";
import {
  fetchChapterGenerationHistory,
  deleteChapterGeneration,
} from "../utils/contentScan";
import { Clock, BookOpen, Calendar, Hash, Trash2 } from "lucide-react";
import { fetchChapterResources } from "../utils/contentScan";

function Model1history( {setFromHistory,setChapterHistory, loading, setLoading} ) {
  const [history, setHistory] = useState([]);
  const loadHistory = async () => {
    try {
      const data = await fetchChapterGenerationHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this generation?"))
      return;
    try {
      await deleteChapterGeneration(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete. Try again.");
    }
  };

  useEffect(() => {
    setTimeout(() => {
    loadHistory();
    }, 1000);
  }, []);

  const handleClick = async (item) => {
     if (loading) return;
    setLoading(true);
    try {
      const resources = await fetchChapterResources(item.id);
      setChapterHistory(resources);
      setFromHistory(true);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch chapter resources:", err);
      alert("Failed to load resources for this chapter. Try again.");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 shadow-2xl border border-blue-400/20">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
              <Clock className="w-8 h-8 text-blue-100" />
            </div>
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Chapter Generation History
              </h2>
              <p className="text-blue-100 text-lg font-medium">
                Discover your previously generated AI-powered chapter outlines
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className=" rounded-3xl overflow-hidden ">
          <div className="p-8">
            {history.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-gray-700 to-slate-800 rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg">
                  <BookOpen className="w-12 h-12 text-blue-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-100 mb-4">
                  No AI Learning History Yet
                </h3>
                <p className="text-gray-400 text-lg font-medium mb-2">
                  Your personalized chapter outlines will appear here
                </p>
                <p className="text-gray-500 text-sm">
                  Generate your first AI-powered chapter outline to get started
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-3 shadow-lg">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      AI-Generated Learning Paths
                    </h3>
                    <p className="text-gray-300 font-medium">
                      Click on any entry to explore curated resources
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-lg text-white px-5 py-2 rounded-full font-bold border border-white/30 ml-auto">
                    {history.length} entries
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleClick(item)}
                      className="group relative bg-gradient-to-br from-gray-700 to-slate-800 hover:from-gray-600 hover:to-slate-700 rounded-2xl p-6 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl border border-gray-600/50 hover:border-indigo-500/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl p-2 shadow-lg">
                              <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-xl text-gray-100 group-hover:text-indigo-300 transition-colors leading-relaxed">
                              {item.topic}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-300 bg-gray-800/50 rounded-xl px-3 py-2">
                              <Calendar className="w-4 h-4 text-emerald-400" />
                              <span className="font-medium">Grade: {item.grade}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300 bg-gray-800/50 rounded-xl px-3 py-2">
                              <Hash className="w-4 h-4 text-blue-400" />
                              <span className="font-medium">{item.chapter_count} chapters</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-gray-400 mt-4 bg-gray-800/30 rounded-xl px-3 py-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                             if (loading) return;
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="flex-shrink-0 p-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-xl transition-all duration-200 border border-red-500/30 hover:border-red-500/50 shadow-lg"
                          title="Delete AI Generation"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/20 rounded-2xl transition-all duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Model1history;