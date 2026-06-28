import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb, Layers, SearchCode, ListChecks } from "lucide-react";
import { Language, ResumeState } from "../types";
import { translations } from "../translations";
import { safeParseJSON } from "../utils";
import LTR from "./LTR";

interface JobMatcherProps {
  lang: Language;
  resume: ResumeState | null;
  selectedModel: string;
}

export default function JobMatcher({
  lang,
  resume,
  selectedModel,
}: JobMatcherProps) {
  const t = translations[lang];
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any | null>(null);

  const analyzeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) return;

    setLoading(true);
    setError(null);
    setMatchData(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/job-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobDescription,
          model: selectedModel,
          language: lang,
        }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze match");
      }

      setMatchData(data);
    } catch (err: any) {
      setError(err.message || "Failed to parse job description. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-900/30 dark:bg-green-950/20";
    if (score >= 60) return "text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-900/30 dark:bg-amber-950/20";
    return "text-rose-600 border-rose-200 bg-rose-50 dark:text-rose-400 dark:border-rose-900/30 dark:bg-rose-950/20";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {t.tabJobAnalyzer}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
          {t.matcherDesc}
        </p>
      </div>

      {!resume ? (
        <div className="text-center py-16 border border-dashed border-slate-200/50 dark:border-slate-800/40 rounded-2xl bg-indigo-500/[0.01] dark:bg-indigo-950/[0.02]">
          <Layers className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            {t.noCvUploaded}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            {t.pleaseUploadFirst}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Side - 5 cols */}
          <form onSubmit={analyzeMatch} className="lg:col-span-5 space-y-5 rounded-2xl glass-card p-6 h-fit">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-indigo-600 dark:text-indigo-400 pb-3 border-b border-slate-100/10">
              <SearchCode className="h-5 w-5" />
              <h3 className="font-display text-sm font-bold">{lang === "en" ? "Job Description" : "الوصف الوظيفي"}</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {lang === "en" ? "Paste Job Requirements" : "الصق متطلبات الوظيفة"}
              </label>
              <textarea
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder={lang === "en" ? "Paste the full text of the job listing here..." : "الصق النص الكامل لإعلان الوظيفة هنا..."}
                className="w-full h-64 rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none resize-none transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center space-x-1.5 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t.comparing}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{t.compareButton}</span>
                </>
              )}
            </button>
          </form>

          {/* Result Side - 7 cols */}
          <div className="lg:col-span-7 flex flex-col min-h-[420px] rounded-2xl glass-card">
            {loading ? (
              <div className="flex flex-col items-center justify-center flex-grow p-8">
                <div className="relative mb-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400" />
                  <SearchCode className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-1">
                  {t.comparing}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs text-center leading-relaxed">
                  {lang === "en" ? "Parsing keyword vectors and analyzing skills compatibility..." : "جاري تحليل توافق المهارات ومطابقة المتجهات اللغوية..."}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            ) : matchData ? (
              <div className="p-6 space-y-6 overflow-y-auto max-h-[520px]">
                
                {/* Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.matchScore}
                    </h3>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      <LTR>{matchData.matchScore}%</LTR> {lang === "en" ? "Match" : "تطابق"}
                    </p>
                  </div>
                  <div className={`rounded-xl border py-2 px-4 text-xs font-bold ${getScoreColorClass(matchData.matchScore)}`}>
                    {matchData.matchScore >= 80 
                      ? t.scoreExcellent 
                      : matchData.matchScore >= 60 
                        ? t.scoreGood 
                        : t.scorePoor}
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <h4 className="font-display text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {t.jobFitSummaryLabel}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium" dir="auto">
                    {matchData.jobFitSummary}
                  </p>
                </div>

                {/* Keywords comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block mb-3 [unicode-bidi:isolate]" dir="auto">
                      {t.matchingKeywordsLabel.replace("{count}", String(matchData.matchingKeywords.length))}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {matchData.matchingKeywords.map((k: string, idx: number) => (
                        <span key={idx} className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                    <span className="font-bold text-xs text-amber-600 dark:text-amber-400 block mb-3 [unicode-bidi:isolate]" dir="auto">
                      {t.missingKeywordsLabel.replace("{count}", String(matchData.missingKeywords.length))}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {matchData.missingKeywords.map((k: string, idx: number) => (
                        <span key={idx} className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-750 dark:text-amber-400">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="pt-2 border-t border-gray-50 dark:border-slate-800 space-y-3">
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {t.improvementStepsLabel}
                  </h4>
                  <ul className="space-y-2">
                    {matchData.improvementSteps.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2 rtl:space-x-reverse text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-indigo-500 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-grow p-8 text-center text-gray-400 dark:text-slate-600">
                <ListChecks className="h-12 w-12 mb-3 animate-pulse" />
                <p className="text-sm font-semibold mb-1 text-slate-500 dark:text-slate-500">{lang === "en" ? "Ready for match analysis" : "جاهز لتحليل المطابقة"}</p>
                <p className="text-xs max-w-xs">{lang === "en" ? "Paste a target job description and see matching score, missing keywords, and actions instantly." : "الصق متطلبات الوظيفة واكتشف درجة التوافق، المهارات المفقودة، والخطوات المطلوبة فوراً."}</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
