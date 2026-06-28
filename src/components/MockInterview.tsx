import React, { useState } from "react";
import { Sparkles, MessageSquare, CheckCircle2, RefreshCw, Layers, Award, Send, Star, HelpCircle } from "lucide-react";
import { Language, ResumeState, InterviewQuestion, InterviewSession } from "../types";
import { translations } from "../translations";
import { safeParseJSON } from "../utils";
import LTR from "./LTR";

interface MockInterviewProps {
  lang: Language;
  resume: ResumeState | null;
  selectedModel: string;
  session: InterviewSession | null;
  onStartSession: (session: InterviewSession) => void;
  onUpdateQuestionAnswer: (questionId: string, answer: string, feedback: any) => void;
  onResetSession: () => void;
}

export default function MockInterview({
  lang,
  resume,
  selectedModel,
  session,
  onStartSession,
  onUpdateQuestionAnswer,
  onResetSession,
}: MockInterviewProps) {
  const t = translations[lang];
  const [targetJob, setTargetJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobTitle: targetJob,
          model: selectedModel,
          language: lang,
        }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      const newSession: InterviewSession = {
        id: `int-${Date.now()}`,
        jobTitle: targetJob,
        questions: data.questions,
        currentQuestionIndex: 0,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      onStartSession(newSession);
    } catch (err: any) {
      setError(err.message || "Failed to initiate practice session.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!session || !userAnswer.trim()) return;

    setEvaluating(true);
    setError(null);

    const activeQuestion = session.questions[session.currentQuestionIndex];

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/interview/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: activeQuestion.question,
          userAnswer: userAnswer,
          model: selectedModel,
          language: lang,
        }),
      });

      const feedback = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(feedback.error || "Failed to evaluate response");
      }

      onUpdateQuestionAnswer(activeQuestion.id, userAnswer, feedback);
      setUserAnswer("");
    } catch (err: any) {
      setError(err.message || "Failed to evaluate response. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const calculateAverageScore = () => {
    if (!session) return 0;
    const graded = session.questions.filter((q) => q.feedback);
    if (graded.length === 0) return 0;
    const sum = graded.reduce((acc, q) => acc + (q.feedback?.score || 0), 0);
    return Math.round(sum / graded.length);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {t.interviewHeader}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
          {t.interviewDesc}
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
      ) : !session ? (
        /* Configuration Screen */
        <div className="max-w-xl mx-auto rounded-2xl glass-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {lang === "en" ? "Configure Practice Session" : "إعداد جلسة التدريب"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
              {lang === "en" 
                ? "Enter your target job title. We will scan your resume text and tailor 3 custom interview questions matching typical recruiter demands."
                : "أدخل مسمى الوظيفة التي تتقدم إليها. سنقوم بفحص سيرتك الذاتية وتفصيل ٣ أسئلة مقابلة مخصصة تحاكي الواقع."}
            </p>
          </div>

          <form onSubmit={startSession} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {t.targetJobTitle}
              </label>
              <input
                type="text"
                required
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="e.g. Sales Manager, Full Stack Developer"
                className="w-full rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none transition-all"
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
                  <span>{lang === "en" ? "Reviewing qualifications..." : "جاري مراجعة المؤهلات..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{t.startPractice}</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : session.completed ? (
        /* Completed/Summary Screen */
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="rounded-2xl glass-card p-8 text-center space-y-4 shadow-sm">
            <Award className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto animate-bounce" />
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {t.practiceSummary}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t.congrats}
            </p>

            <div className="inline-flex flex-col items-center justify-center rounded-2xl bg-indigo-500/10 px-8 py-5">
              <span className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                {t.averageScore}
              </span>
              <span className="text-4xl font-extrabold text-indigo-950 dark:text-indigo-100 mt-1">
                <LTR>{calculateAverageScore()}%</LTR>
              </span>
            </div>

            <div className="pt-4">
              <button
                onClick={onResetSession}
                className="rounded-xl glass-input px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                {lang === "en" ? "Practice Again" : "تدرب مرة أخرى"}
              </button>
            </div>
          </div>

          {/* List of answers & feedback */}
          <div className="space-y-5">
            {session.questions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl glass-card p-6 space-y-4 shadow-sm">
                <div className="flex items-start space-x-2 rtl:space-x-reverse border-b border-slate-100/10 pb-3">
                  <HelpCircle className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white" dir="auto">
                    <span className="inline-block [unicode-bidi:isolate] mr-1 rtl:ml-1"><LTR>{idx + 1}</LTR>.</span> {q.question}
                  </p>
                </div>
                <div className="text-xs space-y-1 bg-slate-500/5 p-3 rounded-lg">
                  <span className="font-bold text-slate-500 dark:text-slate-400 block">{t.yourAnswer}:</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium italic" dir="auto">"{q.userAnswer || "—"}"</p>
                </div>
                {q.feedback && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{t.positives}</span>
                      <p className="text-slate-600 dark:text-slate-300" dir="auto">{q.feedback.positives}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block">{t.needsImprovement}</span>
                      <p className="text-slate-600 dark:text-slate-300" dir="auto">{q.feedback.improvements}</p>
                    </div>
                    <div className="md:col-span-2 pt-2 border-t border-slate-100/10 space-y-1 bg-indigo-500/5 p-3 rounded-lg">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 block">{t.suggestedModelAnswer}</span>
                      <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed" dir="auto">{q.feedback.suggestedAnswer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Practice Screen */
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Question Box */}
          <div className="rounded-2xl glass-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100/10 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 [unicode-bidi:isolate]" dir="auto">
                {t.questionLabel.replace("{num}", String(session.currentQuestionIndex + 1)).replace("{total}", String(session.questions.length))}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {t.practiceStarted}
              </span>
            </div>

            <p className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed" dir="auto">
              {session.questions[session.currentQuestionIndex].question}
            </p>

            <div className="mt-4 flex items-start space-x-1.5 rtl:space-x-reverse bg-slate-500/5 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-400 leading-relaxed" dir="auto">
              <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold mr-1 rtl:ml-1">{lang === "en" ? "Focus:" : "محور التركيز:"}</span>
                {session.questions[session.currentQuestionIndex].idealFocus}
              </div>
            </div>
          </div>

          {/* Text Area Input */}
          <div className="rounded-2xl glass-card p-6 shadow-sm flex flex-col min-h-[220px]">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-1.5 rtl:space-x-reverse">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              <span>{t.yourAnswer}</span>
            </h3>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={t.answerPlaceholder}
              disabled={evaluating}
              className="w-full flex-grow rounded-xl glass-input p-4 text-sm text-slate-800 dark:text-slate-100 focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none resize-none transition-all"
            />
            
            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2">{error}</p>
            )}

            <div className="mt-4 flex items-center justify-end space-x-2 rtl:space-x-reverse">
              <button
                onClick={onResetSession}
                className="rounded-xl glass-input px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                {lang === "en" ? "Exit Practice" : "خروج"}
              </button>
              
              <button
                onClick={submitAnswer}
                disabled={evaluating || !userAnswer.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
              >
                {evaluating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>{t.submitAnswer}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
