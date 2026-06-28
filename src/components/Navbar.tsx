import React from "react";
import { Moon, Sun, Globe, LogOut, LayoutDashboard, User as UserIcon, LogIn, ChevronDown, Settings } from "lucide-react";
import { User, Language, Theme, ActiveTab } from "../types";
import { translations } from "../translations";

interface NavbarProps {
  user: User | null;
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  lang: Language;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const MODELS = [
  { id: "gemini-3.5-flash", name: "جيميني 3.5 فلاش (Gemini 3.5 Flash)" },
  { id: "gemini-3.1-pro-preview", name: "جيميني 3.1 برو (Gemini 3.1 Pro)" },
  { id: "mimo-v2.5-free", name: "ميمو v2.5 مجاني (mimo v2.5 Free)" }
];

export default function Navbar({
  user,
  activeTab,
  onNavigate,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  selectedModel,
  onSelectModel,
  onLogout,
  onOpenSettings
}: NavbarProps) {
  const t = translations[lang];
  const [modelDropdownOpen, setModelDropdownOpen] = React.useState(false);

  const activeModelName = MODELS.find(m => m.id === selectedModel)?.name || "ميمو v2.5 مجاني (mimo v2.5 Free)";

  return (
    <header className="sticky top-0 z-50 w-full glass-nav transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div 
          onClick={() => onNavigate("landing")} 
          className="flex cursor-pointer items-center space-x-8 rtl:space-x-reverse"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-200 dark:shadow-none rtl:mr-4 ltr:ml-4">
            <span className="font-display text-xl font-bold text-white">C</span>
          </div>
          <span className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent dark:from-white dark:to-indigo-200">
            {t.appName}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4 rtl:space-x-reverse">
          
          {/* Model Selector (Only visible for logged in user or on landing demo) */}
          {user && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center space-x-2 rounded-lg glass-input px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <span className="text-xs text-gray-400 dark:text-slate-400 mr-1 rtl:ml-1 rtl:mr-0">{t.modelLabel}:</span>
                <span>{activeModelName}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {modelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setModelDropdownOpen(false)} />
                  <div className="absolute right-0 rtl:left-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-[#0E1527] border border-slate-200/60 dark:border-slate-800 p-1.5 shadow-xl focus:outline-none z-20">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-slate-400 border-b border-gray-100/50 dark:border-slate-800/50 mb-1">
                      {t.selectModel}
                    </div>
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectModel(m.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2 py-2 text-left rtl:text-right text-sm transition-colors cursor-pointer ${
                          selectedModel === m.id
                            ? "bg-indigo-500/10 text-indigo-600 font-semibold dark:bg-indigo-500/20 dark:text-indigo-400"
                            : "text-gray-700 hover:bg-white/40 dark:text-slate-300 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={lang === "en" ? "Settings" : "الإعدادات"}
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={t.language}
          >
            <Globe className="h-5 w-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title={t.theme}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* User Auth Portal / Navigation */}
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
              {activeTab === "landing" ? (
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t.dashboard}</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {/* Avatar / Profile Badge */}
                  <div className="flex items-center space-x-2 rounded-lg glass-input py-1.5 px-3">
                    <UserIcon className="h-4 w-4 text-indigo-500" />
                    <span className="hidden sm:block text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {user.name.split(" ")[0]}
                    </span>
                  </div>
                  
                  {/* Logout */}
                  <button
                    onClick={onLogout}
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors"
                    title={t.logout}
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate("auth")}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>{t.login}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
