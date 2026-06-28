import React from "react";
import { Sparkles, FileText, CheckCircle2, TrendingUp, Users, Shield, ArrowRight, Star, ArrowLeft } from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";

interface LandingPageProps {
  lang: Language;
  onGetStarted: () => void;
}

export default function LandingPage({ lang, onGetStarted }: LandingPageProps) {
  const t = translations[lang];

  return (
    <div className="relative overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1020] transition-colors duration-200">
      
      {/* Decorative ambient blobs */}
      <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20" />
      <div className="absolute top-[40%] -left-40 h-[600px] w-[600px] rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/10" />

      {/* Hero Section */}
      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:px-8">
        <div className="text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 dark:border-indigo-500/20 dark:bg-indigo-950/30 mb-8 animate-pulse">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
              {lang === "en" ? "Version 2.0 Powered by Deep Reasoning AI" : "النسخة 2.0 مدعومة بالذكاء الاصطناعي العميق"}
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white leading-tight">
            <span className="block">{t.tagline.split(" ").slice(0, 3).join(" ")}</span>
            <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent">
              {t.tagline.split(" ").slice(3).join(" ")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 md:text-xl">
            {t.subTagline}
          </p>

          <div className="mt-10 flex justify-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={onGetStarted}
              className="group flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 hover:shadow-indigo-300 dark:shadow-none transition-all duration-200 cursor-pointer"
            >
              <span>{t.getStarted}</span>
              {lang === "en" ? (
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              ) : (
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              )}
            </button>
            
            <a
              href="#features"
              className="flex items-center rounded-xl glass-input px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            >
              {t.exploreFeatures}
            </a>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-20 border-t border-slate-100/10 pt-10 dark:border-slate-800/40 max-w-4xl mx-auto grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <p className="font-display text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">98%</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                {lang === "en" ? "ATS Pass Rate" : "معدل اجتياز الـ ATS"}
              </p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">3x</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                {lang === "en" ? "More Interviews" : "مقابلات أكثر بـ 3 أضعاف"}
              </p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">12k+</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                {lang === "en" ? "Resumes Scored" : "سير ذاتية تم فحصها"}
              </p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">&lt; 30s</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                {lang === "en" ? "Average Run Time" : "متوسط وقت المعالجة"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="bg-indigo-500/[0.01] dark:bg-indigo-950/[0.04] border-t border-b border-slate-100/10 dark:border-slate-800/40 py-24 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
              {lang === "en" ? "Everything You Need to Land Your Next Role" : "كل ما تحتاجه للحصول على عملك التالي"}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              {lang === "en" 
                ? "Stop guessing. Let our AI platform scan, improve, write, and train you for success." 
                : "توقف عن التخمين. دع منصة الذكاء الاصطناعي تفحص وتحسن وتدربك للوصول للنجاح."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-slate-200/50 dark:border-slate-800/50 glass-card p-6 shadow-sm hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
                {t.featAtsTitle}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t.featAtsDesc}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-slate-200/50 dark:border-slate-800/50 glass-card p-6 shadow-sm hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
                {t.featImproveTitle}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t.featImproveDesc}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-slate-200/50 dark:border-slate-800/50 glass-card p-6 shadow-sm hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
                {t.featCoverTitle}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t.featCoverDesc}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-slate-200/50 dark:border-slate-800/50 glass-card p-6 shadow-sm hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
                {t.featInterviewTitle}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t.featInterviewDesc}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
              {t.pricingHeader}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              {t.pricingSub}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            
            {/* Plan 1 */}
            <div className="rounded-2xl glass-card p-8 shadow-sm transition-colors duration-300 hover:border-indigo-500/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.freePlan}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.freeDesc}</p>
              <p className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{t.freePrice}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {lang === "en" ? "/month" : "/شهريًا"}
                </span>
              </p>
              <ul className="mt-8 space-y-4 border-t border-slate-100/10 pt-6 text-sm">
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureResume}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureAts}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureCover}</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="mt-8 w-full rounded-xl glass-input py-2 text-sm font-semibold text-indigo-600 hover:bg-white/50 dark:text-indigo-400 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                {t.choosePlan}
              </button>
            </div>

            {/* Plan 2 */}
            <div className="relative rounded-2xl border-2 border-indigo-600 bg-indigo-500/5 backdrop-blur-md p-8 shadow-lg transition-colors duration-300 hover:border-indigo-500">
              <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white uppercase tracking-wider">
                {lang === "en" ? "Popular" : "الأكثر شعبية"}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.proPlan}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.proDesc}</p>
              <p className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{t.proPrice}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {lang === "en" ? "/month" : "/شهريًا"}
                </span>
              </p>
              <ul className="mt-8 space-y-4 border-t border-slate-100/10 pt-6 text-sm">
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureResumeUnlimited}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureAtsDetailed}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureCoverUnlimited}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureInterviewUnlimited}</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="mt-8 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors cursor-pointer"
              >
                {t.choosePlan}
              </button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-2xl glass-card p-8 shadow-sm transition-colors duration-300 hover:border-indigo-500/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.enterprisePlan}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.enterpriseDesc}</p>
              <p className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{t.enterprisePrice}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {lang === "en" ? "/month" : "/شهريًا"}
                </span>
              </p>
              <ul className="mt-8 space-y-4 border-t border-slate-100/10 pt-6 text-sm">
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureResumeUnlimited}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureAtsDetailed}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{t.planFeatureCoverUnlimited}</span>
                </li>
                <li className="flex items-center space-x-3 rtl:space-x-reverse text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>{lang === "en" ? "1-on-1 Human Recruiter Review" : "مراجعة بشرية شخصية مع خبير توظيف"}</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="mt-8 w-full rounded-xl glass-input py-2 text-sm font-semibold text-indigo-600 hover:bg-white/50 dark:text-indigo-400 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                {t.choosePlan}
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
