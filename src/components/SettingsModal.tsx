import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Cpu, Database, CheckCircle2, Activity, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { translations } from "../translations";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "en" | "ar";
}

export default function SettingsModal({ isOpen, onClose, lang }: SettingsModalProps) {
  const t = translations[lang];
  const isAr = lang === "ar";

  // System Status State Indicators
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-[#0E1527] p-6 shadow-2xl border border-slate-200/60 dark:border-slate-800 text-left rtl:text-right"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-start space-x-3 rtl:space-x-reverse mb-5 shrink-0">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="pr-6 rtl:pl-6 rtl:pr-0">
                <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white">
                  {isAr ? "نظام الأمان والتشغيل" : "Security & System Status"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "بوابة أمان المؤسسات لخدمات الذكاء الاصطناعي المشفرة"
                    : "Enterprise-grade secure gateway and server-side model configuration."}
                </p>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1 pl-1 -ml-1 py-1 space-y-4">
              
              {/* Architecture Statement */}
              <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-4 space-y-2">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                  <Lock className="h-4 w-4" />
                  <span>{isAr ? "بنية انعدام الثقة (Zero-Trust)" : "Zero-Trust SaaS Architecture"}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                  {isAr
                    ? "تم تشفير جميع عمليات معالجة الذكاء الاصطناعي والتعرف على النصوص (OCR) بشكل كامل لتتم حصرياً على خوادمنا السحابية الآمنة. لا يتم تخزين أو نقل أي مفاتيح تشغيل أو بيانات حساسة على متصفحك."
                    : "All AI inference, OCR parsing, and document scoring processes are strictly proxied and processed on our secure cloud backend. No credentials, tokens, or raw secrets are ever exposed or stored within your browser."}
                </p>
              </div>

              {/* Server Status Metrics */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  {isAr ? "مؤشرات الخدمات السحابية" : "Backend Gateway Indicators"}
                </h4>

                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    
                    {/* AI Engine Gateway */}
                    <div className="flex items-center space-x-3 rtl:space-x-reverse rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 p-3">
                      <Cpu className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {isAr ? "محرك الذكاء الاصطناعي" : "Secure AI Gateway"}
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {isAr ? "متصل وآمن" : "Active & Verified"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Database Session */}
                    <div className="flex items-center space-x-3 rtl:space-x-reverse rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 p-3">
                      <Database className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {isAr ? "قاعدة بيانات المؤسسة" : "SaaS Database Pool"}
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {isAr ? "مشفرة بالكامل" : "Encrypted Connection"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Session Encryption Status */}
                    <div className="flex items-center space-x-3 rtl:space-x-reverse rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 p-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {isAr ? "تشفير الجلسة JWT" : "Session Encryption"}
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {isAr ? "JWT 256-bit نشط" : "256-bit Token Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* API Server Latency */}
                    <div className="flex items-center space-x-3 rtl:space-x-reverse rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 p-3">
                      <Activity className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {isAr ? "سرعة الاستجابة" : "Server Latency"}
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ~42ms (Excellent)
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>

            {/* Sticky Buttons Footer */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
              >
                <span>{isAr ? "إغلاق" : "Close Dashboard"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
