import React, { useState } from "react";
import { Sparkles, Copy, Check, Info, Layers, RefreshCw } from "lucide-react";
import { Language, ResumeState } from "../types";
import { translations } from "../translations";
import { safeParseJSON } from "../utils";

interface SmartRewriterProps {
  lang: Language;
  resume: ResumeState | null;
  selectedModel: string;
  onImprovementSuccess: (improvements: any) => void;
}

export default function SmartRewriter({
  lang,
  resume,
  selectedModel,
  onImprovementSuccess,
}: SmartRewriterProps) {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const generateImprovements = async () => {
    if (!resume) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          language: lang,
        }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate suggestions");
      }

      onImprovementSuccess(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const improvements = resume?.improvements;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            {t.smartRewriterHeader}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {t.smartRewriterDesc}
          </p>
        </div>

        {resume && !loading && (
          <button
            onClick={generateImprovements}
            className="flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 hover:shadow transition-all shrink-0 rtl:space-x-reverse"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{improvements ? (lang === "en" ? "Regenerate Suggestions" : "إعادة صياغة المقترحات") : t.improveButton}</span>
          </button>
        )}
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
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 glass-card rounded-2xl">
          <div className="relative mb-6">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-indigo-950/30 dark:border-t-indigo-400" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500 animate-pulse" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-1">
            {t.improving}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === "en" ? "Applying behavioral economics & active voice optimization..." : "تطبيق علوم الاقتصاد السلوكي وتحسين اللغة النشطة والنتائج..."}
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-6 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 space-y-4">
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={generateImprovements}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            {lang === "en" ? "Retry" : "إعادة المحاولة"}
          </button>
        </div>
      ) : !improvements ? (
        <div className="text-center py-16 glass-card rounded-2xl space-y-4">
          <Sparkles className="mx-auto h-12 w-12 text-indigo-400 animate-pulse" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {lang === "en" ? "Ready for line-by-line rewrite suggestions" : "سيرتك الذاتية جاهزة للاقتراحات المخصصة"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {lang === "en"
              ? "Instantly see how passive or boring bullet points can be transformed into high-impact accomplishments."
              : "اكتشف فورا كيف يمكن تحسين وتغيير جمل السيرة الذاتية الجامدة لتكون إنجازات لافتة لمدراء التوظيف."}
          </p>
          <button
            onClick={generateImprovements}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 animate-bounce cursor-pointer"
          >
            {t.improveButton}
          </button>
        </div>
      ) : (
        /* Improvements Feed List */
        <div className="space-y-6">
          {improvements.map((imp, idx) => (
            <div
              key={idx}
              className="rounded-2xl glass-card shadow-sm transition-all hover:shadow-md overflow-hidden"
            >
              {/* Card Header Tag */}
              <div className="bg-slate-500/5 px-6 py-3 border-b border-slate-100/10 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {imp.section}
                </span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                  {lang === "en" ? `Suggestion #${idx + 1}` : `اقتراح رقم ${idx + 1}`}
                </span>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x rtl:divide-x-reverse divide-slate-100/10">
                
                {/* Original Section */}
                <div className="p-6 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t.originalText}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic line-through decoration-rose-300 dark:decoration-rose-950/60 leading-relaxed font-medium">
                    "{imp.originalText}"
                  </p>
                </div>

                {/* Suggested Rewrite Section */}
                <div className="p-6 space-y-3 bg-indigo-500/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center">
                      <Sparkles className="h-3 w-3 mr-1 rtl:ml-1 shrink-0" />
                      {t.suggestedRewrite}
                    </h4>
                    <button
                      onClick={() => copyToClipboard(imp.improvedText, idx)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      title={t.copySection}
                    >
                      {copiedId === idx ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {imp.improvedText}
                  </p>
                </div>

              </div>

              {/* Explanatory Footer bar */}
              <div className="bg-slate-500/5 px-6 py-4 border-t border-slate-100/10 flex items-start space-x-2 rtl:space-x-reverse">
                <Info className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold mr-1 rtl:ml-1">{t.explanation}</span>
                  {imp.explanation}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
