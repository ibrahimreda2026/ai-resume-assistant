import React, { useState } from "react";
import { Sparkles, Copy, Check, Download, FileText, Layers, FileSignature } from "lucide-react";
import { Language, ResumeState } from "../types";
import { translations } from "../translations";
import { safeParseJSON } from "../utils";

interface CoverLetterBuilderProps {
  lang: Language;
  resume: ResumeState | null;
  selectedModel: string;
  onLetterGenerated?: () => void;
}

export default function CoverLetterBuilder({
  lang,
  resume,
  selectedModel,
  onLetterGenerated,
}: CoverLetterBuilderProps) {
  const t = translations[lang];
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [letterText, setLetterText] = useState("");
  const [copied, setCopied] = useState(false);

  const generateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) return;

    setLoading(true);
    setError(null);
    setLetterText("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobTitle,
          companyName,
          jobDescription,
          model: selectedModel,
          language: lang,
        }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate cover letter");
      }

      setLetterText(data.letterText);
      onLetterGenerated?.();
    } catch (err: any) {
      setError(err.message || "Failed to draft cover letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = () => {
    const element = document.createElement("a");
    const file = new Blob([letterText], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${companyName.replace(/\s+/g, "_")}_Cover_Letter.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {t.coverLetterHeader}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
          {t.coverLetterDesc}
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
          
          {/* Form Side - 5 cols */}
          <form onSubmit={generateLetter} className="lg:col-span-5 space-y-5 rounded-2xl glass-card p-6 h-fit">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-indigo-600 dark:text-indigo-400 pb-3 border-b border-slate-100/10">
              <FileSignature className="h-5 w-5" />
              <h3 className="font-display text-sm font-bold">{lang === "en" ? "Target Specifications" : "مواصفات الهدف"}</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {t.jobTitle}
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {t.companyName}
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google"
                className="w-full rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {t.jobDescription}
              </label>
              <textarea
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="e.g. We are looking for a developer who loves building outstanding React experiences..."
                className="w-full h-36 rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t.generating}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{t.generateLetter}</span>
                </>
              )}
            </button>
          </form>

          {/* Output Side - 7 cols */}
          <div className="lg:col-span-7 flex flex-col min-h-[460px] rounded-2xl glass-card">
            {loading ? (
              <div className="flex flex-col items-center justify-center flex-grow p-8">
                <div className="relative mb-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400" />
                  <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-1">
                  {t.generating}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs text-center leading-relaxed">
                  {lang === "en" ? "Reviewing qualifications and tailoring professional alignment paragraphs..." : "مراجعة المؤهلات وتفصيل لغة الخطاب لتناسب المتطلبات بدقة..."}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center flex-grow p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            ) : letterText ? (
              <div className="flex flex-col flex-grow">
                 {/* Panel actions */}
                <div className="bg-slate-500/5 px-6 py-3 border-b border-slate-100/10 flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t.yourCoverLetter}
                  </h3>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1 rounded-lg glass-input px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/30 transition-colors cursor-pointer rtl:space-x-reverse"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? t.copied : t.copyLetter}</span>
                    </button>
                    <button
                      onClick={downloadTextFile}
                      className="flex items-center space-x-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer rtl:space-x-reverse"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{t.downloadTxt}</span>
                    </button>
                  </div>
                </div>
                {/* Text display */}
                <div className="p-6 flex-grow overflow-y-auto max-h-[480px]">
                  <pre className="font-sans text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed" dir="auto">
                    {letterText}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-grow p-8 text-center text-gray-400 dark:text-slate-600">
                <FileSignature className="h-12 w-12 mb-3" />
                <p className="text-sm font-semibold mb-1 text-slate-500 dark:text-slate-500">{t.letterPlaceholder}</p>
                <p className="text-xs max-w-xs">{lang === "en" ? "Enter target details and draft a persuasive cover letter tailored in seconds." : "أدخل تفاصيل الوظيفة لتوليد رسالة تغطية احترافية مقنعة خلال ثوانٍ معدودة."}</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
