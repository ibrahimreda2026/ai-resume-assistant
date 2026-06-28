import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Award, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  SearchCode, 
  User as UserIcon, 
  Menu, 
  X, 
  Info, 
  Moon, 
  Sun, 
  Globe 
} from "lucide-react";
import { safeParseJSON } from "./utils";
import Navbar from "./components/Navbar";
import LandingPage from "./components/LandingPage";
import DashboardOverview from "./components/DashboardOverview";
import UploadCV from "./components/UploadCV";
import AtsAnalysis from "./components/AtsAnalysis";
import SmartRewriter from "./components/SmartRewriter";
import CoverLetterBuilder from "./components/CoverLetterBuilder";
import MockInterview from "./components/MockInterview";
import JobMatcher from "./components/JobMatcher";
import { translations } from "./translations";
import { User, Language, Theme, ActiveTab, DashboardSection, ResumeState, InterviewSession } from "./types";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  // Appearance & Localization
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "ar";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Screen Routing
  const [activeTab, setActiveTab] = useState<ActiveTab>("landing");
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // AI Configurations & Application States
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  
  // Quick Stats Mock Tracker (Increments during actions to show beautiful real-time dashboard progress)
  const [lettersCount, setLettersCount] = useState(0);
  const [interviewsCount, setInterviewsCount] = useState(0);

  const t = translations[lang];

  // Apply Theme & Language modifications to HTML root element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (lang === "ar") {
      root.setAttribute("dir", "rtl");
      root.setAttribute("lang", "ar");
      document.title = "CVify AI — مساعد السيرة الذاتية بالذكاء الاصطناعي";
    } else {
      root.setAttribute("dir", "ltr");
      root.setAttribute("lang", "en");
      document.title = "CVify AI — AI Resume Assistant";
    }
    localStorage.setItem("lang", lang);
  }, [lang]);

  // Auth bootstrap on mount
  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await safeParseJSON(response);
          setUser(data.user);
          setActiveTab("dashboard");
        } else {
          // Token expired
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("Auth validation failed:", err);
      }
    };

    bootstrapAuth();
  }, []);

  const handleToggleLang = () => {
    setLang(prev => (prev === "en" ? "ar" : "en"));
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Auth handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const url = authView === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = authView === "login" 
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setActiveTab("dashboard");
      setDashboardSection("overview");
      
      // Clean inputs
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setResume(null);
    setInterviewSession(null);
    setActiveTab("landing");
  };

  // Resume state modifiers
  const handleUploadSuccess = (fileName: string, extractedPreview: string, parsedResume?: any) => {
    setResume({
      fileName,
      rawText: extractedPreview,
      uploadedAt: new Date().toISOString(),
      parsedResume: parsedResume || null,
    });
    setDashboardSection("overview");
  };

  const handleAnalysisSuccess = (analysis: any) => {
    setResume(prev => {
      if (!prev) return null;
      return {
        ...prev,
        analysis,
      };
    });
  };

  const handleImprovementSuccess = (improvements: any) => {
    setResume(prev => {
      if (!prev) return null;
      return {
        ...prev,
        improvements,
      };
    });
  };

  // Sidebar link items
  const sidebarItems = [
    { id: "overview", label: t.tabOverview, icon: LayoutDashboard },
    { id: "upload", label: t.tabUpload, icon: UploadCloud },
    { id: "analyze", label: t.tabAnalyze, icon: Award },
    { id: "improve", label: t.tabImprove, icon: Sparkles },
    { id: "cover-letter", label: t.tabCoverLetter, icon: FileText },
    { id: "interview", label: t.tabInterview, icon: MessageSquare },
    { id: "job-analyzer", label: t.tabJobAnalyzer, icon: SearchCode },
  ];

  return (
    <div className="min-h-screen relative bg-[#F8FAFC] dark:bg-[#0B1020] font-sans antialiased text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300 overflow-x-hidden">
      
      {/* Ambient background glows for Frosted Glass theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[80px] sm:blur-[120px] transition-colors" />
        <div className="absolute bottom-[15%] right-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[80px] sm:blur-[120px] transition-colors" />
        <div className="absolute top-[40%] left-[20%] w-[200px] sm:w-[450px] h-[200px] sm:h-[450px] bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-[60px] sm:blur-[100px] transition-colors" />
      </div>

      {/* Universal Sticky Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          if (tab === "dashboard") setDashboardSection("overview");
        }}
        lang={lang}
        onToggleLang={handleToggleLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content Layout */}
      <main className="flex-grow flex flex-col relative z-10">
        
        {/* LANDING PAGE SCREEN */}
        {activeTab === "landing" && (
          <LandingPage 
            lang={lang} 
            onGetStarted={() => {
              if (user) {
                setActiveTab("dashboard");
                setDashboardSection("overview");
              } else {
                setActiveTab("auth");
                setAuthView("login");
              }
            }} 
          />
        )}

        {/* AUTHENTICATION PORTAL */}
        {activeTab === "auth" && (
          <div className="flex-grow flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-md rounded-2xl glass-card p-8 shadow-xl">
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                  {authView === "login" ? t.loginHeader : t.signupHeader}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                  {authView === "login" 
                    ? (lang === "en" ? "Enter your credentials to manage your CV." : "أدخل بياناتك لإدارة سيرتك الذاتية.")
                    : (lang === "en" ? "Register today to bypass ATS filters." : "سجل اليوم لتخطي فلاتر الـ ATS الذكية.")}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authView === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      {t.fullName}
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none dark:text-slate-200"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    {t.password}
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none dark:text-slate-200"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-500 disabled:opacity-50 dark:shadow-none transition-colors"
                >
                  {authLoading ? (authView === "login" ? t.signingIn : t.signingUp) : (authView === "login" ? t.login : t.signup)}
                </button>
              </form>

              {/* Demo Quick-Fill Button */}
              {authView === "login" && (
                <div className="mt-4 pt-4 border-t border-slate-100/10 dark:border-slate-800/40 text-center">
                  <button
                    onClick={() => {
                      setAuthEmail("demo@cvify.ai");
                      setAuthPassword("password123");
                      setAuthError(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {lang === "en" ? "⚡ Autofill with Demo Account" : "⚡ الملء التلقائي بحساب تجريبي"}
                  </button>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setAuthView(prev => (prev === "login" ? "signup" : "login"));
                    setAuthError(null);
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  {authView === "login" ? t.dontHaveAccount : t.alreadyHaveAccount}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SAAS DASHBOARD CONTROL PANEL */}
        {activeTab === "dashboard" && user && (
          <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
            
            {/* Left Sidebar Navigation: Desktop */}
            <aside className="hidden md:block w-64 shrink-0 space-y-2">
              <div className="rounded-2xl glass-card p-4 space-y-1.5">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setDashboardSection(item.id as DashboardSection)}
                      className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                        dashboardSection === item.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-gray-600 hover:bg-white/40 dark:text-slate-300 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* API Connection Help Note */}
              <div className="rounded-2xl glass-card p-4 flex items-start space-x-2 rtl:space-x-reverse">
                <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {t.demoModeActive}
                </p>
              </div>
            </aside>

            {/* Mobile Sidebar Toggle bar */}
            <div className="md:hidden flex items-center justify-between glass-card border border-slate-100/10 px-4 py-3 shadow-md">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-slate-300"
              >
                <Menu className="h-5 w-5 text-indigo-500" />
                <span>
                  {sidebarItems.find((s) => s.id === dashboardSection)?.label || t.tabOverview}
                </span>
              </button>
              
              {/* Small status item */}
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {lang === "en" ? "Demo Mode" : "وضع العرض"}
              </span>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileSidebarOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-xs md:hidden"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 rtl:right-0 rtl:left-auto w-64 bg-[#F8FAFC]/95 dark:bg-[#161B26]/95 border-r border-slate-100/10 backdrop-blur-xl z-50 p-4 flex flex-col justify-between transition-transform duration-200 shadow-xl md:hidden animate-slide-in">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100/10 pb-4">
                      <span className="font-display text-lg font-bold text-slate-900 dark:text-white">{t.appName}</span>
                      <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setDashboardSection(item.id as DashboardSection);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                              dashboardSection === item.id
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                                : "text-slate-600 hover:bg-indigo-500/5 dark:text-slate-300 dark:hover:bg-indigo-500/10"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Drawer Footer Actions */}
                  <div className="border-t border-slate-100/10 pt-4 space-y-3">
                    <div className="flex justify-around">
                      <button onClick={handleToggleLang} className="p-2 text-gray-500 hover:text-gray-800 dark:text-slate-400">
                        <Globe className="h-5 w-5" />
                      </button>
                      <button onClick={handleToggleTheme} className="p-2 text-gray-500 hover:text-gray-800 dark:text-slate-400">
                        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </button>
                      <button onClick={handleLogout} className="p-2 text-rose-500">
                        <UserIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 leading-relaxed px-2">
                      {t.demoModeActive}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Dashboard Workspace */}
            <div className="flex-grow min-w-0">
              {dashboardSection === "overview" && (
                <DashboardOverview
                  user={user}
                  lang={lang}
                  resume={resume}
                  onNavigateTab={setDashboardSection}
                  lettersCount={lettersCount}
                  interviewsCount={interviewsCount}
                />
              )}

              {dashboardSection === "upload" && (
                <UploadCV
                  lang={lang}
                  resume={resume}
                  onUploadSuccess={handleUploadSuccess}
                />
              )}

              {dashboardSection === "analyze" && (
                <AtsAnalysis
                  lang={lang}
                  resume={resume}
                  selectedModel={selectedModel}
                  onAnalysisSuccess={handleAnalysisSuccess}
                  onUploadSuccess={handleUploadSuccess}
                />
              )}

              {dashboardSection === "improve" && (
                <SmartRewriter
                  lang={lang}
                  resume={resume}
                  selectedModel={selectedModel}
                  onImprovementSuccess={handleImprovementSuccess}
                />
              )}

              {dashboardSection === "cover-letter" && (
                <CoverLetterBuilder
                  lang={lang}
                  resume={resume}
                  selectedModel={selectedModel}
                  onLetterGenerated={() => setLettersCount(prev => prev + 1)}
                />
              )}

              {dashboardSection === "interview" && (
                <MockInterview
                  lang={lang}
                  resume={resume}
                  selectedModel={selectedModel}
                  session={interviewSession}
                  onStartSession={setInterviewSession}
                  onUpdateQuestionAnswer={(qId, ans, feedback) => {
                    setInterviewSession(prev => {
                      if (!prev) return null;
                      const qs = prev.questions.map((q) => {
                        if (q.id === qId) {
                          return { ...q, userAnswer: ans, feedback };
                        }
                        return q;
                      });
                      const nextIndex = prev.currentQuestionIndex + 1;
                      const completed = nextIndex >= prev.questions.length;
                      if (completed) {
                        setInterviewsCount(c => c + 1);
                      }
                      return {
                        ...prev,
                        questions: qs,
                        currentQuestionIndex: completed ? prev.currentQuestionIndex : nextIndex,
                        completed,
                      };
                    });
                  }}
                  onResetSession={() => setInterviewSession(null)}
                />
              )}

              {dashboardSection === "job-analyzer" && (
                <JobMatcher
                  lang={lang}
                  resume={resume}
                  selectedModel={selectedModel}
                />
              )}
            </div>

          </div>
        )}

      </main>

      {/* Aesthetic Footer */}
      <footer className="border-t border-slate-100/10 bg-[#F8FAFC]/80 py-6 dark:bg-[#0B1020]/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center sm:flex sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase">
          <p>{t.appName} AI — {lang === "en" ? "Smart Resume Copilot" : "مساعد السيرة الذاتية الذكي"}</p>
          <p className="mt-2 sm:mt-0">© {new Date().getFullYear()} {t.appName} Corp. {lang === "en" ? "All Rights Reserved" : "جميع الحقوق محفوظة"}</p>
        </div>
      </footer>

      {/* Application Settings Modal rendered at viewport root */}
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        lang={lang} 
      />

    </div>
  );
}
