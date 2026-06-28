import React from "react";
import { Sparkles, FileText, CheckCircle2, Award, Briefcase, PlusCircle, RefreshCw, TrendingUp } from "lucide-react";
import { Language, ResumeState, User } from "../types";
import { translations } from "../translations";
import LTR from "./LTR";

interface DashboardOverviewProps {
  user: User;
  lang: Language;
  resume: ResumeState | null;
  onNavigateTab: (tab: any) => void;
  lettersCount: number;
  interviewsCount: number;
}

export default function DashboardOverview({
  user,
  lang,
  resume,
  onNavigateTab,
  lettersCount,
  interviewsCount
}: DashboardOverviewProps) {
  const t = translations[lang];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-indigo-950/85 via-indigo-900/50 to-purple-950/40 backdrop-blur-xl border border-indigo-500/20 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 h-[240px] w-[240px] rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.welcomeBack.replace("{name}", user.name)}
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base max-w-xl font-medium">
              {t.readyToScore}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("upload")}
            className="flex items-center justify-center space-x-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow transition-all w-fit shrink-0 rtl:space-x-reverse cursor-pointer animate-pulse-subtle"
          >
            <PlusCircle className="h-4 w-4 text-indigo-300" />
            <span>{t.tabUpload}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
          {t.quickStats}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: ATS Score */}
          <div className="rounded-xl glass-card p-5 hover:translate-y-[-2px] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.atsScoreLabel}</span>
              <Award className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {resume?.analysis?.atsScore ? <LTR>{resume.analysis.atsScore}%</LTR> : "—"}
              </span>
              {resume?.analysis?.atsScore && (
                <span className={`ml-2 rtl:mr-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  resume.analysis.atsScore >= 80 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                    : resume.analysis.atsScore >= 65 
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" 
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                }`}>
                  {resume.analysis.atsScore >= 85 ? t.scoreExcellent : resume.analysis.atsScore >= 70 ? t.scoreGood : t.scorePoor}
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Cover Letters */}
          <div className="rounded-xl glass-card p-5 hover:translate-y-[-2px] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.lettersGenerated}</span>
              <FileText className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"><LTR>{lettersCount}</LTR></span>
              <span className="ml-1 rtl:mr-1 text-xs text-slate-400 dark:text-slate-500">
                {lang === "en" ? "created" : "تم إنشاؤها"}
              </span>
            </div>
          </div>

          {/* Card 3: Mock Interviews */}
          <div className="rounded-xl glass-card p-5 hover:translate-y-[-2px] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.interviewsCompleted}</span>
              <Briefcase className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"><LTR>{interviewsCount}</LTR></span>
              <span className="ml-1 rtl:mr-1 text-xs text-slate-400 dark:text-slate-500">
                {lang === "en" ? "done" : "مكتملة"}
              </span>
            </div>
          </div>

          {/* Card 4: Action verbs */}
          <div className="rounded-xl glass-card p-5 hover:translate-y-[-2px] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.actionVerbsCount}</span>
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {resume?.analysis?.actionVerbCount ? <LTR>{resume.analysis.actionVerbCount}</LTR> : "—"}
              </span>
              {resume?.analysis?.actionVerbCount && (
                <span className="ml-1 rtl:mr-1 text-xs text-green-600 dark:text-green-400 font-semibold flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5 rtl:ml-0.5" />
                  <LTR>+12%</LTR>
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Active Resume Card */}
      <div className="rounded-2xl glass-card p-6 shadow-md">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-4">
          {t.activeResume}
        </h2>
        {resume ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 glass-input p-5 rounded-xl">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    <LTR>{resume.fileName}</LTR>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400">
                    {lang === "en" ? "Uploaded on " : "تم الرفع بتاريخ "} 
                    <LTR>{new Date(resume.uploadedAt).toLocaleString(lang === "en" ? "en-US" : "ar-EG")}</LTR>
                  </p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <LTR>{resume.rawText.split(/\s+/).filter(Boolean).length}</LTR> {lang === "en" ? "words extracted" : "كلمة مستخرجة"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => onNavigateTab("analyze")}
                  className="rounded-xl glass-input px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  {t.tabAnalyze}
                </button>
                <button
                  onClick={() => onNavigateTab("improve")}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  {t.tabImprove}
                </button>
              </div>
            </div>

            {resume.parsedResume && (
              <div className="mt-6 rounded-xl border border-indigo-100/30 dark:border-slate-800/60 bg-indigo-50/10 dark:bg-slate-950/10 p-5 sm:p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {lang === "en" ? "Gemini Structured CV Breakdown" : "تحليل هيكلي للسيرة الذاتية عبر Gemini"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {lang === "en" ? "Verified structured data parsed instantly by the Gemini AI engine." : "بيانات مهيكلة ومحققة تم استخراجها وتحليلها فورياً بواسطة محرك Gemini الذكي."}
                  </p>
                </div>

                {/* Primary Contact details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-3.5 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">{lang === "en" ? "Full Name" : "الاسم الكامل"}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                      {resume.parsedResume.fullName || resume.parsedResume["Full Name"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-3.5 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">{lang === "en" ? "Email" : "البريد الإلكتروني"}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block select-all">
                      {resume.parsedResume.email || resume.parsedResume["Email"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-3.5 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">{lang === "en" ? "Phone" : "رقم الهاتف"}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                      {resume.parsedResume.phone || resume.parsedResume["Phone"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-3.5 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">{lang === "en" ? "Address" : "العنوان"}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 block line-clamp-1" title={resume.parsedResume.address || resume.parsedResume["Address"] || ""}>
                      {resume.parsedResume.address || resume.parsedResume["Address"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                    </span>
                  </div>
                </div>

                {/* Main Experience & Education Sections */}
                <div className="space-y-5">
                  {(resume.parsedResume.summary || resume.parsedResume["Summary"]) && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {lang === "en" ? "Professional Summary" : "الملخص المهني"}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 whitespace-pre-line">
                        {resume.parsedResume.summary || resume.parsedResume["Summary"]}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        {lang === "en" ? "Experience" : "الخبرات المهنية والعملية"}
                      </h4>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[140px] whitespace-pre-line">
                        {resume.parsedResume.experience || resume.parsedResume["Experience"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />
                        {lang === "en" ? "Education" : "التعليم والتحصيل الأكاديمي"}
                      </h4>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[140px] whitespace-pre-line">
                        {resume.parsedResume.education || resume.parsedResume["Education"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        {lang === "en" ? "Skills" : "المهارات والقدرات"}
                      </h4>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[100px] whitespace-pre-line">
                        {resume.parsedResume.skills || resume.parsedResume["Skills"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {lang === "en" ? "Projects" : "المشاريع والإنجازات"}
                      </h4>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[100px] whitespace-pre-line">
                        {resume.parsedResume.projects || resume.parsedResume["Projects"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />
                        {lang === "en" ? "Certifications" : "الشهادات والدورات"}
                      </h4>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[80px] whitespace-pre-line">
                        {resume.parsedResume.certifications || resume.parsedResume["Certifications"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <h4 className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {lang === "en" ? "Languages" : "اللغات"}
                      </h4>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[80px] whitespace-pre-line">
                        {resume.parsedResume.languages || resume.parsedResume["Languages"] || <span className="text-slate-300 dark:text-slate-700 italic">{lang === "en" ? "Not specified" : "غير محدد"}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl">
            <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {t.noCvUploaded}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              {t.pleaseUploadFirst}
            </p>
            <button
              onClick={() => onNavigateTab("upload")}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors rtl:space-x-reverse cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t.tabUpload}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
