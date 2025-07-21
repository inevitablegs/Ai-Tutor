// Dashboard.jsx
import React, { useState } from "react";
import {
  LayoutDashboard,
  History,
  ScanBarcode,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Database,
} from "lucide-react";

// 👉 slot in your real screens here
import Resources from "../components/Resources"; // Adjust the import path
import Scanner from "../components/Scanner"; // Adjust the import path

const TAB_CONFIG = [
  { id: "resources", label: "Resources", icon: LayoutDashboard },
  { id: "scanner", label: "Scanner", icon: ScanBarcode },
];


export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("resources");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const CurrentScreen = {
  resources: Resources,
  scanner: Scanner,
}[activeTab];


  const getTabTitle = (tabId) => {
    const tab = TAB_CONFIG.find(t => t.id === tabId);
    return tab ? tab.label : "Dashboard";
  };

  const getTabDescription = (tabId) => {
  const descriptions = {
    resources: "Manage and view your resource collection",
    scanner: "Scan and identify new resources"
  };
  return descriptions[tabId] || "Navigate through your dashboard";
};


  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* ───────────── Sidebar ───────────── */}
      <aside
        className={`bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 transition-all duration-300 ease-in-out border-r border-slate-700
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${sidebarCollapsed ? "w-16" : "w-64"}
          fixed sm:static inset-y-0 z-40 sm:translate-x-0 shadow-xl`}
      >
        {/* Header with logo and collapse button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg">Resource Hub</span>
            </div>
          )}
          
          {/* Mobile close button */}
          <button
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors sm:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
          
          {/* Desktop collapse button */}
          <button
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors hidden sm:block"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation menu */}
        <nav className="mt-6 space-y-2 px-3">
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`group flex items-center w-full px-3 py-3 text-left gap-3 rounded-lg transition-all duration-200
                ${activeTab === id 
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-blue-400 shadow-lg" 
                  : "hover:bg-slate-700/50 text-slate-300 hover:text-white"
                }`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon
                size={20}
                className={`shrink-0 transition-colors ${
                  activeTab === id ? "text-blue-400" : "text-slate-400 group-hover:text-blue-300"
                }`}
              />
              {!sidebarCollapsed && (
                <span className="font-medium">{label}</span>
              )}
              {activeTab === id && (
                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        
      </aside>

      {/* ───────────── Main Content Area ───────────── */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-w-0">
       

        {/* Main Content */}
        <main className="flex-1 bg-gradient-to-br from-slate-900 via-gray-900 to-black  overflow-y-auto">
          <div className="">
            {CurrentScreen ? (
              <CurrentScreen />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <X className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Tab Not Found
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  The requested tab could not be found. Please select a valid option from the sidebar.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}