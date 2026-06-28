import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Layers,
  Upload,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowRight,
  Info,
  Copy,
  Download,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Briefcase,
  Layers3,
  BookOpen,
  FileCheck2,
  MessageSquare,
  Bookmark,
  FileCode,
  Gauge,
  X,
  Printer
} from "lucide-react";
import { Language, ResumeState } from "../types";
import { translations } from "../translations";
import { safeParseJSON, performPdfOcr, OcrProgress } from "../utils";
import LTR from "./LTR";

interface AtsAnalysisProps {
  lang: Language;
  resume: ResumeState | null;
  selectedModel: string;
  onAnalysisSuccess: (analysis: any) => void;
  onUploadSuccess: (fileName: string, extractedPreview: string, parsedResume?: any) => void;
}

// Arabic localized dictionary for UI precision (respecting constraints to not translate specific technical terms)
const arabicDict = {
  step1Title: "رفع السيرة الذاتية (إلزامي)",
  step1Desc: "قم برفع ملف الـ CV الخاص بك أو الصق النص مباشرة ليبدأ التحليل.",
  supportedFormats: "الصيغ المدعومة: PDF, DOCX, TXT, PNG, JPG, JPEG",
  uploadFileBtn: "رفع ملف",
  pasteTextBtn: "لصق النص",
  fileNameLabel: "اسم الملف",
  fileSizeLabel: "حجم الملف",
  textSuccessLabel: "نجاح استخراج النص",
  step2Title: "معلومات الوظيفة (اختياري)",
  step2Desc: "تحليل الوظيفة (اختياري)",
  step2Helper: "إذا كنت ترغب في تخصيص التحليل لوظيفة معينة، يمكنك إضافة إعلان الوظيفة أو متطلباتها.",
  enableToggle: "تفعيل تحليل الوظيفة",
  pasteJdTitle: "الصق Job Description هنا",
  jdPlaceholder: "أدخل متطلبات الوظيفة أو الوصف الوظيفي هنا لمقارنته مع سيرتك الذاتية...",
  jdHelperText: "يمكنك رفع صورة أو PDF أو لصق نص إعلان الوظيفة.",
  uploadJdBtn: "رفع إعلان الوظيفة",
  step3Title: "بدء التحليل الشامل",
  analyzeBtn: "ابدأ التحليل",
  pastedCvPlaceholder: "الصق النص الكامل للسيرة الذاتية هنا...",
  savePastedCvBtn: "تأكيد وحفظ النص",
  cvSavedSuccess: "تم حفظ نص السيرة الذاتية بنجاح!",
  atsScoreHelp: "قم برفع أحدث نسخة من الـ CV بصيغة PDF أو DOCX للحصول على أفضل النتائج.",
  jobAnalysisHelp: "يساعد الذكاء الاصطناعي على مقارنة الـ CV مع متطلبات الوظيفة وتحسينه بما يناسبها.",
  atsScoreTitleHelp: "يقيس مدى توافق السيرة الذاتية مع أنظمة التوظيف ATS.",
  jobMatchScoreHelp: "يوضح مدى توافق الـ CV مع الوظيفة التي أضفتها.",
  coverLetterHelp: "ينشئ خطاب تقديم مخصص بناءً على الوظيفة.",
  loadingStage1: "جاري استخراج وتحليل السيرة الذاتية الـ CV...",
  loadingStage2: "جاري مطابقة متطلبات الوظيفة الـ Job Description...",
  loadingStage3: "جاري صياغة الـ Cover Letter والـ Interview Questions...",
  atsCompatibilityLabel: "درجة توافق ATS",
  execSummaryLabel: "الملخص التنفيذي",
  strengthsLabel: "نقاط القوة",
  weaknessesLabel: "نقاط الضعف",
  keywordsLabel: "الكلمات المفتاحية",
  improveSkillsLabel: "تحسين المهارات",
  improveExperiencesLabel: "تحسين الخبرات",
  improveSummaryLabel: "تحسين الـ Summary",
  generalSuggestionsLabel: "اقتراحات عامة",
  jobMatchScoreLabel: "Job Match Score",
  matchingSkillsLabel: "Matching Skills",
  missingSkillsLabel: "Missing Skills",
  missingKeywordsLabel: "Missing Keywords",
  recruiterFeedbackLabel: "Recruiter Feedback",
  tailoredSuggestionsLabel: "Tailored Resume Suggestions",
  recommendedKeywordsLabel: "Recommended Keywords",
  interviewQuestionsLabel: "Interview Questions",
  coverLetterLabel: "Cover Letter",
  backToSetup: "تعديل المدخلات وإعادة التحليل",
  starMethodTitle: "نصيحة STAR لتحسين الخبرات",
  starMethodDesc: "أعد صياغة خبراتك السابقة بالتركيز على: الموقف (Situation)، المهمة (Task)، الإجراء المتخذ (Action)، والنتيجة بالأرقام (Result). استخدم أفعالاً قوية مثل 'قاد'، 'طور'، 'حقق'.",
  copySuccess: "تم النسخ بنجاح!",
  downloadSuccess: "بدأ تحميل الملف!"
};

export default function AtsAnalysis({
  lang,
  resume,
  selectedModel,
  onAnalysisSuccess,
  onUploadSuccess,
}: AtsAnalysisProps) {
  const t = translations[lang];

  // Steps UI states
  const [cvInputMode, setCvInputMode] = useState<"upload" | "paste" | null>(null);
  const [pastedCvText, setPastedCvText] = useState("");
  const [cvUploadLoading, setCvUploadLoading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [cvFileSize, setCvFileSize] = useState<string | null>(null);
  const [cvOcrProgress, setCvOcrProgress] = useState<OcrProgress | null>(null);

  // Step 2 Job Description states
  const [enableJobAnalysis, setEnableJobAnalysis] = useState(false);
  const [jdInputMode, setJdInputMode] = useState<"upload" | "paste">("paste");
  const [jobDescription, setJobDescription] = useState("");
  const [jdUploadLoading, setJdUploadLoading] = useState(false);
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [jdUploadError, setJdUploadError] = useState<string | null>(null);
  const [jdOcrProgress, setJdOcrProgress] = useState<OcrProgress | null>(null);

  // Analysis Loader states
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Combined Results states
  const [jobMatchData, setJobMatchData] = useState<any | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<any[] | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    fileName: string;
    type: "txt" | "docx" | "pdf" | "print" | "cover_letter";
  }>({
    isOpen: false,
    title: "",
    content: "",
    fileName: "",
    type: "txt"
  });

  // Help System states
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    atsScore: false,
    execSummary: false,
    recommendations: false,
    skills: false,
    experience: false,
    keywords: false,
    jobMatch: false,
    interview: false,
    coverLetter: false,
    downloadCenter: false,
  });

  // Animated stages for upload/analysis progress
  const [uploadProgressStage, setUploadProgressStage] = useState(0);
  const stages = [
    "Uploading CV & Documents... (جاري رفع الملفات والتحقق منها)",
    "Extracting Resume Text... (جاري استخراج النصوص والمحتوى بدقة)",
    "Running Intelligent OCR... (جاري تشغيل الـ OCR وقراءة الصور والملفات)",
    "Preparing AI Context Models... (جاري تحضير مدخلات ومقاييس التحليل)",
    "Analyzing Resume Compliance... (جاري تحليل الـ CV ومطابقة معايير ATS)",
    "Generating Insights & Recommendations... (جاري صياغة التقرير وخطاب التقديم)"
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setUploadProgressStage(0);
      interval = setInterval(() => {
        setUploadProgressStage((prev) => {
          if (prev < stages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1800);
    } else {
      setUploadProgressStage(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  // Scroll anchor Refs for results navigation
  const atsScoreRef = useRef<HTMLDivElement>(null);
  const execSummaryRef = useRef<HTMLDivElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const keywordsRef = useRef<HTMLDivElement>(null);
  const jobMatchRef = useRef<HTMLDivElement>(null);
  const interviewRef = useRef<HTMLDivElement>(null);
  const coverLetterRef = useRef<HTMLDivElement>(null);
  const downloadCenterRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // File Input Refs
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Help text
  const toggleHelp = (sectionId: string) => {
    setActiveHelp(activeHelp === sectionId ? null : sectionId);
  };

  // Upload CV handler
  const handleCvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setCvUploadError(lang === "en" ? "File size exceeds 5MB limit" : "حجم الملف يتجاوز الحد الأقصى 5 ميجابايت");
      return;
    }

    setCvUploadError(null);
    setCvUploadLoading(true);
    setCvFileSize(`${(file.size / 1024).toFixed(0)} KB`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      if (data.needsOCR) {
        setCvUploadError(null);
        try {
          const ocrResult = await performPdfOcr(file, token, (prog) => {
            setCvOcrProgress(prog);
          });
          
          if (ocrResult.confidenceIsLow) {
            setCvUploadError(lang === "en" 
              ? "Warning: The scanned text quality appears low. Some details might not be parsed perfectly." 
              : "تنبيه: جودة النص المستخرج من المسح الضوئي تبدو منخفضة. قد لا يتم تحليل بعض التفاصيل بدقة."
            );
          }

          // Save the merged OCR text by uploading it as manual text
          const saveResponse = await fetch("/api/resume/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: ocrResult.text,
              fileName: file.name,
            }),
          });

          const saveData = await safeParseJSON(saveResponse);
          if (!saveResponse.ok) {
            throw new Error(saveData.error || "Failed to save OCR-extracted resume text.");
          }

          onUploadSuccess(file.name, saveData.textPreview || ocrResult.text.substring(0, 500) + "...", saveData.parsedResume);
          setCvInputMode(null);
        } catch (ocrErr: any) {
          throw new Error(ocrErr.message || "OCR processing failed.");
        } finally {
          setCvOcrProgress(null);
        }
      } else {
        onUploadSuccess(file.name, data.textPreview, data.parsedResume);
        setCvInputMode(null);
      }
    } catch (err: any) {
      setCvUploadError(err.message || "An error occurred while uploading.");
    } finally {
      setCvUploadLoading(false);
    }
  };

  // Paste CV text handler
  const handleSavePastedCv = async () => {
    if (!pastedCvText.trim() || pastedCvText.trim().length < 50) {
      setCvUploadError(lang === "en" ? "Please enter at least 50 characters." : "يرجى كتابة 50 حرفًا على الأقل.");
      return;
    }

    setCvUploadError(null);
    setCvUploadLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: pastedCvText,
          fileName: lang === "en" ? "pasted_resume.txt" : "السيرة_الذاتية.txt",
        }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to process text CV");
      }

      onUploadSuccess(lang === "en" ? "pasted_resume.txt" : "السيرة_الذاتية.txt", data.textPreview, data.parsedResume);
      setCvInputMode(null);
      setCvFileSize(`${(pastedCvText.length / 1024).toFixed(1)} KB`);
    } catch (err: any) {
      setCvUploadError(err.message || "Failed to save text.");
    } finally {
      setCvUploadLoading(false);
    }
  };

  // Upload Job Description handler
  const handleJdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setJdUploadError(lang === "en" ? "File size exceeds 5MB limit" : "حجم الملف يتجاوز الحد الأقصى 5 ميجابايت");
      return;
    }

    setJdUploadError(null);
    setJdUploadLoading(true);
    setJdFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/job-description/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse file");
      }

      if (data.needsOCR) {
        setJdUploadError(null);
        try {
          const ocrResult = await performPdfOcr(file, token, (prog) => {
            setJdOcrProgress(prog);
          });
          
          if (ocrResult.confidenceIsLow) {
            setJdUploadError(lang === "en" 
              ? "Warning: The scanned text quality appears low. Some details might not be parsed perfectly." 
              : "تنبيه: جودة النص المستخرج من المسح الضوئي تبدو منخفضة. قد لا يتم تحليل بعض التفاصيل بدقة."
            );
          }

          setJobDescription(ocrResult.text);
        } catch (ocrErr: any) {
          throw new Error(ocrErr.message || "OCR processing failed for job description.");
        } finally {
          setJdOcrProgress(null);
        }
      } else {
        setJobDescription(data.text);
      }
    } catch (err: any) {
      setJdUploadError(err.message || "An error occurred while uploading.");
    } finally {
      setJdUploadLoading(false);
    }
  };

  // Run comprehensive analyses in parallel
  const triggerComprehensiveAnalysis = async () => {
    if (!resume) return;

    setLoading(true);
    setError(null);
    setLoadingPhase(1);

    try {
      const token = localStorage.getItem("token");

      // Phase 1: General ATS analysis
      const p1 = fetch("/api/resume/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          language: lang,
        }),
      }).then(res => res.json().then(data => {
        if (!res.ok) throw new Error(data.error || "ATS analysis failed");
        return data;
      }));

      // Phase 2: If JD analysis is enabled
      let p2 = Promise.resolve(null);
      let p3 = Promise.resolve(null);
      let p4 = Promise.resolve(null);

      if (enableJobAnalysis && jobDescription.trim()) {
        setLoadingPhase(2);
        p2 = fetch("/api/resume/job-match", {
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
        }).then(res => res.json().then(data => {
          if (!res.ok) throw new Error(data.error || "Job match failed");
          return data;
        }));

        setLoadingPhase(3);
        p3 = fetch("/api/resume/cover-letter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobTitle: "Target Position",
            companyName: "Target Company",
            jobDescription,
            model: selectedModel,
            language: lang,
          }),
        }).then(res => res.json().then(data => {
          if (!res.ok) throw new Error(data.error || "Cover letter failed");
          return data.letterText;
        }));

        p4 = fetch("/api/resume/interview/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobTitle: "Target Position",
            model: selectedModel,
            language: lang,
          }),
        }).then(res => res.json().then(data => {
          if (!res.ok) throw new Error(data.error || "Interview questions failed");
          return data.questions;
        }));
      }

      // Execute all in parallel for supreme speed!
      const [atsResult, matchResult, coverLetterResult, interviewResult] = await Promise.all([
        p1,
        p2,
        p3,
        p4
      ]);

      onAnalysisSuccess(atsResult);
      if (matchResult) setJobMatchData(matchResult);
      if (coverLetterResult) setCoverLetterData(coverLetterResult);
      if (interviewResult) setInterviewData(interviewResult);

    } catch (err: any) {
      setError(err.message || "Failed to complete analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 70) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    return "text-rose-500 border-rose-500/20 bg-rose-500/5";
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadTextFile = (text: string, fileName: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getFullAnalysisText = () => {
    if (!analysis) return "";
    let text = `=== AI RESUME ASSISTANT REPORT ===\n\n`;
    text += `ATS SCORE: ${analysis.atsScore}/100\n`;
    text += `EXECUTIVE SUMMARY:\n${analysis.summary}\n\n`;
    if (analysis.strengths) {
      text += `STRENGTHS:\n${analysis.strengths.join("\n")}\n\n`;
    }
    if (analysis.weaknesses) {
      text += `WEAKNESSES:\n${analysis.weaknesses.join("\n")}\n\n`;
    }
    if (analysis.skillsFound) {
      text += `SKILLS FOUND:\n${analysis.skillsFound.join(", ")}\n\n`;
    }
    if (analysis.recommendedSkills) {
      text += `RECOMMENDED SKILLS:\n${analysis.recommendedSkills.join(", ")}\n\n`;
    }
    if (enableJobAnalysis && jobMatchData) {
      text += `JOB MATCH SCORE: ${jobMatchData.matchScore}%\n`;
      text += `JOB FIT SUMMARY:\n${jobMatchData.jobFitSummary}\n\n`;
      text += `MATCHING KEYWORDS:\n${(jobMatchData.matchingKeywords || []).join(", ")}\n\n`;
      text += `MISSING KEYWORDS:\n${(jobMatchData.missingKeywords || []).join(", ")}\n\n`;
    }
    if (coverLetterData) {
      text += `COVER LETTER:\n${coverLetterData}\n\n`;
    }
    return text;
  };

  const analysis = resume?.analysis;

  return (
    <div className="space-y-8 animate-fade-in text-right" dir="rtl">
      
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100/10 pb-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            <span>AI Resume Assistant — مساعد الـ CV الذكي</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            قم بفحص توافق سيرتك الذاتية مع معايير الـ ATS ومطابقتها مع متطلبات الوظائف المحددة خطوة بخطوة.
          </p>
        </div>
      </div>

      {/* GUIDED EXPERIENCE PROGRESS INDICATOR */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100/10 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 items-center justify-between gap-6">
          {[
            { step: "١", name: "رفع الـ CV", desc: "إلزامي للمتابعة", active: !resume && !loading && !analysis, done: !!resume },
            { step: "٢", name: "معلومات الوظيفة", desc: "اختياري ومرن", active: !!resume && !loading && !analysis, done: !!resume && (enableJobAnalysis ? !!jobDescription.trim() : true) },
            { step: "٣", name: "التحليل الذكي", desc: "معالجة بالـ AI", active: loading, done: !loading && !!analysis },
            { step: "٤", name: "النتائج والتقارير", desc: "الملخص ودرجة ATS", active: !loading && !!analysis, done: false }
          ].map((item, idx) => {
            const isCurrent = item.active;
            const isCompleted = item.done;
            return (
              <div key={idx} className="flex items-center gap-3 relative">
                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCurrent 
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 scale-110 shadow-md" 
                    : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {isCompleted ? "✓" : item.step}
                </div>
                <div className="text-right">
                  <p className={`text-xs font-extrabold transition-colors duration-300 ${isCurrent ? "text-indigo-600 dark:text-indigo-400" : isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HELP SYSTEM CARD - Top persistent or togglable info */}
      {activeHelp && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-700 dark:text-indigo-300 flex items-start gap-3 transition-all">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">مساعدة إرشادية:</p>
            <p className="font-medium">
              {activeHelp === "step1" && arabicDict.atsScoreHelp}
              {activeHelp === "step2" && arabicDict.jobAnalysisHelp}
              {activeHelp === "atsScore" && arabicDict.atsScoreTitleHelp}
              {activeHelp === "jobMatch" && arabicDict.jobMatchScoreHelp}
              {activeHelp === "coverLetter" && arabicDict.coverLetterHelp}
            </p>
          </div>
        </div>
      )}

      {/* MAIN SCREEN: SETUP & STEPS */}
      {!analysis && !loading && (
        <div className="grid grid-cols-1 gap-8">
          
          {/* STEP 1 CARD */}
          <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  ١
                </span>
                <div>
                  <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white">
                    {arabicDict.step1Title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {arabicDict.step1Desc}
                  </p>
                </div>
              </div>
              <button onClick={() => toggleHelp("step1")} className="text-slate-400 hover:text-indigo-500 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1 Interaction Area */}
            <div className="mt-6">
              {!resume ? (
                <div className="space-y-4">
                  {/* SMART EMPTY STATE ILLUSTRATION */}
                  <div className="flex flex-col items-center justify-center text-center p-5 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-2xl border border-indigo-500/10 mb-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
                      <FileCheck2 className="h-6 w-6 text-indigo-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-white">لم يتم تحليل أي سيرة ذاتية بعد</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                      ابدأ برفع الـ CV الخاص بك لتحصل على فحص <LTR>ATS</LTR> شامل والمهارات والأسئلة المقترحة فوراً.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => { setCvInputMode("upload"); setCvUploadError(null); }}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all ${
                        cvInputMode === "upload"
                          ? "border-indigo-500 bg-indigo-500/[0.02]"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20"
                      }`}
                    >
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{arabicDict.uploadFileBtn}</span>
                      <span className="text-[10px] text-slate-400 mt-1">{arabicDict.supportedFormats}</span>
                    </button>

                    <button
                      onClick={() => { setCvInputMode("paste"); setCvUploadError(null); }}
                      className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all ${
                        cvInputMode === "paste"
                          ? "border-indigo-500 bg-indigo-500/[0.02]"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20"
                      }`}
                    >
                      <FileText className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{arabicDict.pasteTextBtn}</span>
                      <span className="text-[10px] text-slate-400 mt-1">نسخ ولصق مباشر للـ CV</span>
                    </button>
                  </div>

                  {/* Manual paste area */}
                  {cvInputMode === "paste" && (
                    <div className="space-y-3 pt-2">
                      <textarea
                        value={pastedCvText}
                        onChange={(e) => setPastedCvText(e.target.value)}
                        placeholder={arabicDict.pastedCvPlaceholder}
                        className="w-full h-48 rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none resize-none text-right"
                        dir="rtl"
                      />
                      <button
                        onClick={handleSavePastedCv}
                        disabled={cvUploadLoading}
                        className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        {cvUploadLoading ? "جاري الحفظ..." : arabicDict.savePastedCvBtn}
                      </button>
                    </div>
                  )}

                  {/* File Upload Selector */}
                  {cvInputMode === "upload" && (
                    <div className="pt-2">
                      <input
                        type="file"
                        ref={cvFileInputRef}
                        onChange={handleCvFileChange}
                        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,image/*"
                        className="hidden"
                      />
                      <div
                        onClick={() => cvFileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-all"
                      >
                        <Upload className="mx-auto h-8 w-8 text-indigo-500 mb-2 animate-bounce" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">انقر هنا لتحديد ملف الـ CV الخاص بك</p>
                        <p className="text-[10px] text-slate-400 mt-1">الحد الأقصى للحجم 5 ميجابايت</p>
                      </div>
                    </div>
                  )}

                  {cvOcrProgress && (
                    <div className="space-y-2 rounded-xl bg-violet-500/10 p-4 text-violet-800 dark:text-violet-400 mt-2" dir="rtl">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400 shrink-0" />
                        <span className="text-xs font-bold">
                          {cvOcrProgress.status === "loading_pdfjs" && "جاري تهيئة مكتبة استخراج النصوص..."}
                          {cvOcrProgress.status === "rendering_pages" && `جاري تحويل صفحة الـ PDF رقم ${cvOcrProgress.currentPage || 1} من ${cvOcrProgress.totalPages || 1} إلى مسح رقمي عالي الدقة...`}
                          {cvOcrProgress.status === "performing_ocr" && `جاري تشغيل التعرف الضوئي OCR لاستخراج الكلمات: صفحة ${cvOcrProgress.currentPage || 1} من ${cvOcrProgress.totalPages || 1}...`}
                          {cvOcrProgress.status === "completed" && "اكتمل استخراج النصوص بنجاح!"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-violet-600 dark:bg-violet-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${cvOcrProgress.percent || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <span>{cvOcrProgress.percent || 0}%</span>
                        <span>{cvOcrProgress.currentPage && cvOcrProgress.totalPages ? `${cvOcrProgress.currentPage} / ${cvOcrProgress.totalPages}` : ""}</span>
                      </div>
                    </div>
                  )}

                  {cvUploadLoading && !cvOcrProgress && (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 animate-pulse" dir="rtl">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري الرفع واستخراج نصوص السيرة الذاتية...</span>
                    </div>
                  )}

                  {cvUploadError && (
                    <p className="text-xs text-rose-500 font-bold mt-2">{cvUploadError}</p>
                  )}
                </div>
              ) : (
                /* Success indicators for Uploaded CV */
                <div className="rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>تم الكشف عن السيرة الذاتية الـ CV وجاهزة للتحليل</span>
                    </div>
                    <button
                      onClick={() => onUploadSuccess("", "")}
                      className="text-xs font-semibold text-rose-500 hover:underline"
                    >
                      حذف وإعادة رفع
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-t border-slate-100/10">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{arabicDict.fileNameLabel}: <strong className="text-slate-800 dark:text-slate-200">{resume.fileName}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{arabicDict.fileSizeLabel}: <strong className="text-slate-800 dark:text-slate-200">{cvFileSize || "120 KB"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{arabicDict.textSuccessLabel}: <strong className="text-slate-800 dark:text-slate-200">نعم (✔)</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2 CARD */}
          <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  ٢
                </span>
                <div>
                  <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{arabicDict.step2Title}</span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded font-bold">اختياري</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {arabicDict.step2Helper}
                  </p>
                </div>
              </div>
              <button onClick={() => toggleHelp("step2")} className="text-slate-400 hover:text-indigo-500 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Collapsed Toggle switch */}
            <div className="mt-5 pt-4 border-t border-slate-100/5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{arabicDict.enableToggle}</span>
              <button
                onClick={() => setEnableJobAnalysis(!enableJobAnalysis)}
                className="text-indigo-600 dark:text-indigo-400 focus:outline-none transition-transform"
              >
                {enableJobAnalysis ? (
                  <ToggleRight className="h-10 w-10 text-indigo-500" />
                ) : (
                  <ToggleLeft className="h-10 w-10 text-slate-400" />
                )}
              </button>
            </div>

            {/* Collapsed Content */}
            {enableJobAnalysis && (
              <div className="mt-5 pt-4 border-t border-slate-100/10 space-y-4 animate-slide-down">
                
                {/* Mode Selector for Job description */}
                <div className="flex gap-4 border-b border-slate-100/10 pb-3">
                  <button
                    type="button"
                    onClick={() => setJdInputMode("paste")}
                    className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
                      jdInputMode === "paste"
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-400"
                    }`}
                  >
                    الصق النص مباشرة
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdInputMode("upload")}
                    className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
                      jdInputMode === "upload"
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-400"
                    }`}
                  >
                    رفع ملف (يدعم الصور والـ PDF)
                  </button>
                </div>

                {jdInputMode === "paste" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {arabicDict.pasteJdTitle}
                    </label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder={arabicDict.jdPlaceholder}
                      className="w-full h-36 rounded-xl glass-input p-3 text-sm focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none resize-none text-right"
                      dir="rtl"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={jdFileInputRef}
                      onChange={handleJdFileChange}
                      accept=".pdf,.docx,.txt,image/*"
                      className="hidden"
                    />
                    <div
                      onClick={() => jdFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-all"
                    >
                      <Upload className="mx-auto h-7 w-7 text-indigo-500 mb-1.5" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">رفع صورة إعلان الوظيفة أو ملف متطلباتها</p>
                      <p className="text-[10px] text-slate-400 mt-1">يدعم PDF, DOCX, TXT أو صور (PNG, JPG, JPEG) لتشغيل الـ OCR</p>
                    </div>

                    {jdOcrProgress && (
                      <div className="space-y-2 rounded-xl bg-violet-500/10 p-4 text-violet-800 dark:text-violet-400 mt-2" dir="rtl">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400 shrink-0" />
                          <span className="text-xs font-bold">
                            {jdOcrProgress.status === "loading_pdfjs" && "جاري تهيئة مكتبة استخراج النصوص..."}
                            {jdOcrProgress.status === "rendering_pages" && `جاري تحويل صفحة الـ PDF رقم ${jdOcrProgress.currentPage || 1} من ${jdOcrProgress.totalPages || 1} إلى مسح رقمي عالي الدقة...`}
                            {jdOcrProgress.status === "performing_ocr" && `جاري تشغيل التعرف الضوئي OCR لاستخراج الكلمات: صفحة ${jdOcrProgress.currentPage || 1} من ${jdOcrProgress.totalPages || 1}...`}
                            {jdOcrProgress.status === "completed" && "اكتمل استخراج النصوص بنجاح!"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-violet-600 dark:bg-violet-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${jdOcrProgress.percent || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          <span>{jdOcrProgress.percent || 0}%</span>
                          <span>{jdOcrProgress.currentPage && jdOcrProgress.totalPages ? `${jdOcrProgress.currentPage} / ${jdOcrProgress.totalPages}` : ""}</span>
                        </div>
                      </div>
                    )}

                    {jdFileName && !jdOcrProgress && (
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100/10">
                        <span>📄 {jdFileName}</span>
                        {jdUploadLoading && <span className="text-indigo-500 animate-pulse">جاري فحص الـ OCR والتحويل...</span>}
                      </div>
                    )}
                  </div>
                )}

                {jdUploadError && (
                  <p className="text-xs text-rose-500 font-bold mt-1">{jdUploadError}</p>
                )}

                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold italic">
                  * {arabicDict.jdHelperText}
                </p>
              </div>
            )}
          </div>

          {/* STEP 3 - SUBMIT ANALYSIS */}
          <div className="flex justify-center pt-4">
            <button
              onClick={triggerComprehensiveAnalysis}
              disabled={!resume}
              className="w-full sm:w-80 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-base font-extrabold text-white shadow hover:bg-indigo-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span>{arabicDict.analyzeBtn}</span>
            </button>
          </div>

        </div>
      )}

      {/* ANALYSIS LOADER SCREEN with premium multi-step state and progress bar */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-[#0E1527] border border-slate-100/10 rounded-2xl p-8 space-y-8 shadow-md">
          <div className="relative">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-indigo-950/40 dark:border-t-indigo-400" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-indigo-500 animate-pulse" />
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              جاري معالجة التحليل بالذكاء الاصطناعي الـ <LTR>AI</LTR>...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed font-semibold">
              يقوم النظام الآن بمقارنة المعايير، مراجعة النحو والـ <LTR>Keywords</LTR> اللغوية لتحديد المهارات واستخراج التقرير الشامل.
            </p>
          </div>

          {/* Premium Animated Progress Bar */}
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              <span>{Math.round(((uploadProgressStage + 1) / stages.length) * 100)}%</span>
              <span>{stages[uploadProgressStage]}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((uploadProgressStage + 1) / stages.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step indicators of loader */}
          <div className="w-full max-w-md space-y-3 pt-6 border-t border-slate-100/10 text-right" dir="rtl">
            {stages.map((stageName, idx) => {
              const isActive = uploadProgressStage === idx;
              const isPast = uploadProgressStage > idx;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs font-bold transition-all duration-300">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    isActive 
                      ? "bg-indigo-600 text-white animate-pulse" 
                      : isPast 
                        ? "bg-emerald-500 text-white" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {isPast ? "✓" : idx + 1}
                  </span>
                  <span className={isActive ? "text-indigo-600 dark:text-indigo-400" : isPast ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                    {stageName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ERROR SCREEN */}
      {error && !loading && (
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-6 text-rose-850 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <h3 className="font-bold text-sm">فشل تشغيل التحليل</h3>
              <p className="text-xs mt-1 text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          </div>
          <button
            onClick={triggerComprehensiveAnalysis}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* COMPREHENSIVE OUTPUT RESULTS */}
      {analysis && !loading && (
        <div className="space-y-8 animate-fade-in pb-16">
          
          {/* Top Back Action & AI Transparency Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100/10">
            <div className="text-xs font-bold text-slate-500">
              طراز الذكاء الاصطناعي المستخدم: <strong className="text-indigo-500"><LTR>{selectedModel}</LTR></strong>
            </div>
            <button
              onClick={() => {
                onAnalysisSuccess(null);
                setJobMatchData(null);
                setCoverLetterData(null);
                setInterviewData(null);
              }}
              className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 hover:underline bg-indigo-500/10 px-4 py-2 rounded-xl transition-all"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{arabicDict.backToSetup}</span>
            </button>
          </div>

          {/* AI TRANSPARENCY NOTICE */}
          <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.02] p-4 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold">تنبيه الشفافية للذكاء الاصطناعي (AI Transparency):</p>
              <p className="font-medium leading-relaxed">
                هذا التحليل تم إنشاؤه بالكامل بواسطة تقنيات الذكاء الاصطناعي الـ <LTR>AI</LTR>. ننصحك دائماً بمراجعة وتعديل الاقتراحات بدقة وتأكيد ملاءمتها لخبراتك قبل التقديم الرسمي.
              </p>
            </div>
          </div>

          {/* STICKY RESULTS NAVIGATION BAR */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0E1527]/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 py-3 px-4 overflow-x-auto flex gap-2.5 no-scrollbar shadow-md rounded-2xl">
            <button onClick={() => scrollToSection(atsScoreRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-indigo-600 text-white whitespace-nowrap shadow-sm transition-all hover:opacity-90">
              درجة <LTR>ATS</LTR>
            </button>
            <button onClick={() => scrollToSection(execSummaryRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
              الملخص التنفيذي
            </button>
            <button onClick={() => scrollToSection(recommendationsRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
              التوصيات والأولويات
            </button>
            <button onClick={() => scrollToSection(skillsRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
              المهارات والكلمات
            </button>
            <button onClick={() => scrollToSection(experienceRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
              تحسين الخبرات والـ <LTR>STAR</LTR>
            </button>
            {enableJobAnalysis && jobMatchData && (
              <>
                <button onClick={() => scrollToSection(jobMatchRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
                  مطابقة الوظيفة
                </button>
                <button onClick={() => scrollToSection(interviewRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
                  الأسئلة المقترحة
                </button>
                <button onClick={() => scrollToSection(coverLetterRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 transition-all">
                  خطاب التقديم
                </button>
              </>
            )}
            <button onClick={() => scrollToSection(downloadCenterRef)} className="text-[11px] font-extrabold px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap hover:bg-emerald-500/20 transition-all">
              مركز التحميل
            </button>
          </div>

          {/* PRIORITY LAYOUT SECTION 1: ATS & RECRUITER SCORE DASHBOARD */}
          <div ref={atsScoreRef} className="scroll-mt-24 transition-all duration-300 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Overall Score */}
              <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.02] p-5 shadow-sm text-center relative flex flex-col items-center justify-between min-h-[160px] hover:border-indigo-500/30 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">{lang === 'ar' ? 'التقييم الشامل' : 'Overall Score'}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{lang === 'ar' ? 'رأي خبير التوظيف العام' : 'Unified recruiter expert rating'}</p>
                </div>
                <div className="my-3 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  <LTR>{analysis.overallScore || Math.round(analysis.atsScore * 0.98)}</LTR>
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold ${getScoreColor(analysis.overallScore || analysis.atsScore)}`}>
                  {(analysis.overallScore || analysis.atsScore) >= 85 ? (lang === 'ar' ? 'ممتاز' : 'Excellent') : (analysis.overallScore || analysis.atsScore) >= 70 ? (lang === 'ar' ? 'جيد جداً' : 'Good') : (lang === 'ar' ? 'يحتاج تحسين' : 'Needs Work')}
                </span>
              </div>

              {/* ATS Score */}
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.02] p-5 shadow-sm text-center relative flex flex-col items-center justify-between min-h-[160px] hover:border-emerald-500/30 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">{lang === 'ar' ? 'درجة معيار الـ ATS' : 'ATS Score'}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{lang === 'ar' ? 'التوافق الآلي للأنظمة' : 'Machine compatibility matching'}</p>
                </div>
                <div className="my-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  <LTR>{analysis.atsScore}</LTR>
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold ${getScoreColor(analysis.atsScore)}`}>
                  {analysis.atsScore >= 85 ? (lang === 'ar' ? 'تطابق مميز' : 'Strong Match') : analysis.atsScore >= 70 ? (lang === 'ar' ? 'مقبول للفرز' : 'Passable') : (lang === 'ar' ? 'تطابق ضعيف' : 'Low Match')}
                </span>
              </div>

              {/* Formatting Score */}
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.02] p-5 shadow-sm text-center relative flex flex-col items-center justify-between min-h-[160px] hover:border-amber-500/30 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">{lang === 'ar' ? 'درجة التنسيق' : 'Formatting Score'}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{lang === 'ar' ? 'التصميم وسهولة القراءة' : 'Layout, dates & scan-ability'}</p>
                </div>
                <div className="my-3 text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  <LTR>{analysis.formattingScore || 85}</LTR>
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold ${getScoreColor(analysis.formattingScore || 85)}`}>
                  {(analysis.formattingScore || 85) >= 85 ? (lang === 'ar' ? 'منظم وبسيط' : 'Clean & Pro') : (lang === 'ar' ? 'تنسيق تقليدي' : 'Standard')}
                </span>
              </div>

              {/* Content Quality Score */}
              <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.02] p-5 shadow-sm text-center relative flex flex-col items-center justify-between min-h-[160px] hover:border-rose-500/30 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">{lang === 'ar' ? 'جودة المحتوى' : 'Content Score'}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{lang === 'ar' ? 'أفعال الحركة وقيمة الإنجاز' : 'Action verbs & quantifiers'}</p>
                </div>
                <div className="my-3 text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  <LTR>{analysis.contentScore || 80}</LTR>
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold ${getScoreColor(analysis.contentScore || 80)}`}>
                  {(analysis.contentScore || 80) >= 85 ? (lang === 'ar' ? 'صياغة ممتازة' : 'Strong Verbs') : (lang === 'ar' ? 'بحاجة لمقاييس' : 'Needs Metrics')}
                </span>
              </div>

            </div>

            {/* Final Verdict & Interview Probability */}
            {(analysis.finalVerdict || analysis.estimatedInterviewChance) && (
              <div className="rounded-2xl border border-indigo-500/10 bg-slate-50 dark:bg-slate-900/40 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 transition-all hover:border-indigo-500/20">
                <div className="space-y-1.5 text-right flex-1">
                  <h4 className="text-xs font-extrabold text-indigo-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>{lang === 'ar' ? 'القرار النهائي لخبير التوظيف' : 'Expert Recruiter Final Verdict'}</span>
                  </h4>
                  <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                    {analysis.finalVerdict}
                  </p>
                </div>
                {analysis.estimatedInterviewChance && (
                  <div className="shrink-0 bg-indigo-500/10 px-5 py-3 rounded-xl border border-indigo-500/15 text-center min-w-[160px]">
                    <span className="text-[10px] font-bold text-indigo-500 block uppercase tracking-wider">{lang === 'ar' ? 'فرصة الاستدعاء للمقابلة' : 'Response Probability'}</span>
                    <span className="text-base md:text-lg font-extrabold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                      {analysis.estimatedInterviewChance}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Critical Warnings Panel */}
            {((analysis.criticalIssues && analysis.criticalIssues.length > 0) || (analysis.missingSections && analysis.missingSections.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Critical Issues */}
                {analysis.criticalIssues && analysis.criticalIssues.length > 0 && (
                  <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.01] p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-extrabold text-rose-500 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{lang === 'ar' ? 'مشاكل حرجة يجب إصلاحها' : 'Critical Issues to Fix'}</span>
                    </h4>
                    <ul className="space-y-2">
                      {analysis.criticalIssues.map((issue: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Sections */}
                {analysis.missingSections && analysis.missingSections.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.01] p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-extrabold text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{lang === 'ar' ? 'أقسام مفقودة وموصى بها' : 'Recommended Missing Sections'}</span>
                    </h4>
                    <ul className="space-y-2">
                      {analysis.missingSections.map((sec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span>{sec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}

            {/* Category Breakdown list */}
            {analysis.sections && analysis.sections.length > 0 && (
              <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100/5 pb-3">
                  <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'التقييم التفصيلي لأقسام السيرة الذاتية' : 'Section-by-Section Score & Evaluation'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'ar' ? 'مراجعة دقيقة ومستقلة لكل قسم مع نقاط القوة والضعف المكتشفة' : 'Detailed feedback on each individual resume section'}
                  </p>
                </div>
                <div className="space-y-4">
                  {analysis.sections.map((sec: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100/5 bg-slate-50/50 dark:bg-slate-900/20 space-y-3 hover:border-indigo-500/10 transition-all">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{sec.name}</span>
                          {sec.priority && (
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                              sec.priority === "High" ? "bg-rose-500/10 text-rose-500" :
                              sec.priority === "Medium" ? "bg-amber-500/10 text-amber-500" :
                              "bg-slate-500/10 text-slate-500"
                            }`}>
                              {lang === 'ar' ? (sec.priority === "High" ? "أولوية قصوى" : sec.priority === "Medium" ? "أولوية متوسطة" : "أولوية منخفضة") : sec.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 md:w-32 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${sec.score}%` }} />
                          </div>
                          <span className="text-xs font-extrabold text-indigo-500 min-w-[28px] text-left"><LTR>{sec.score}%</LTR></span>
                        </div>
                      </div>

                      {/* Strengths and Weaknesses inside Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                        {sec.strengths && sec.strengths.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-emerald-500 block">✓ {lang === 'ar' ? 'نقاط القوة:' : 'Strengths:'}</span>
                            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                              {sec.strengths.map((s: string, sIdx: number) => (
                                <li key={sIdx}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {sec.weaknesses && sec.weaknesses.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-rose-500 block">✗ {lang === 'ar' ? 'نقاط الضعف:' : 'Weaknesses:'}</span>
                            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                              {sec.weaknesses.map((w: string, wIdx: number) => (
                                <li key={wIdx}>• {w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(!sec.weaknesses || sec.weaknesses.length === 0) && (
                          <div className="text-[11px] text-emerald-600/80 font-bold col-span-2">
                            {lang === 'ar' ? 'لم يتم العثور على أي مشاكل في هذا القسم.' : 'No issues found in this section.'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* PRIORITY LAYOUT SECTION 2: EXECUTIVE SUMMARY */}
          <div ref={execSummaryRef} className="scroll-mt-24 transition-all duration-300">
            <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm relative">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100/5 pb-3">
                <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                  <div>
                    <h3 className="font-display text-base font-extrabold">{arabicDict.execSummaryLabel}</h3>
                    <p className="text-[10px] text-slate-400">رؤية سريعة وخلاصة السيرة الذاتية المهنية</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(analysis.summary, "summary")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="نسخ الملخص"
                  >
                    <Copy className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                  </button>
                  <button
                    onClick={() => toggleSection("execSummary")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    {collapsedSections.execSummary ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {!collapsedSections.execSummary && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                  {analysis.summary}
                </p>
              )}
            </div>
          </div>

          {/* PRIORITY LAYOUT SECTION 3: SMART RECOMMENDATIONS & IMPACT LEVEL */}
          <div ref={recommendationsRef} className="scroll-mt-24 transition-all duration-300">
            <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100/5 pb-3">
                <div className="flex items-center gap-2.5 text-amber-500">
                  <Lightbulb className="h-5 w-5" />
                  <div>
                    <h3 className="font-display text-base font-extrabold">التوصيات الذكية وترتيب الأولويات</h3>
                    <p className="text-[10px] text-slate-400">توصيات مقسمة حسب مستوى التأثير والجاهزية</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSection("recommendations")}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  {collapsedSections.recommendations ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!collapsedSections.recommendations && (
                <div className="space-y-6">
                  {/* HIGH PRIORITY */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                        <span>★★★★★</span>
                        <span>أولوية قصوى (تأثير مرتفع جداً)</span>
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.weaknesses && analysis.weaknesses.map((w: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/[0.02] border border-rose-500/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* MEDIUM PRIORITY */}
                  <div className="space-y-3 pt-4 border-t border-slate-100/5">
                    <div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        <span>★★★★</span>
                        <span>أولوية متوسطة (تأثير ملحوظ)</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {analysis.recommendedSkills && analysis.recommendedSkills.map((s: string, idx: number) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* OPTIONAL PRIORITY */}
                  <div className="space-y-3 pt-4 border-t border-slate-100/5">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                        <span>★★</span>
                        <span>تحسينات اختيارية وتنسيق عام</span>
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.formattingTips && analysis.formattingTips.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/[0.02] border border-indigo-500/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          <Check className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* HIGH-IMPACT TIMELINE ACTION PLAN */}
                  {analysis.topImprovements && analysis.topImprovements.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-100/5">
                      <div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg">
                          <span>🎯</span>
                          <span>{lang === 'ar' ? 'خطة عمل التحسين الفوري (مرتبة حسب الأثر)' : 'Immediate Action Plan (Sorted by Impact)'}</span>
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {analysis.topImprovements.slice(0, 5).map((act: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100/5 hover:border-indigo-500/20 transition-all">
                            <span className="flex items-center justify-center h-5.5 w-5.5 rounded-full bg-indigo-500/10 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                              {act}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PRIORITY LAYOUT SECTION 4: SKILLS & KEYWORDS FOUND */}
          <div ref={skillsRef} className="scroll-mt-24 transition-all duration-300">
            <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100/5 pb-3">
                <div className="flex items-center gap-2.5 text-indigo-500">
                  <BookOpen className="h-5 w-5" />
                  <div>
                    <h3 className="font-display text-base font-extrabold">الكلمات المفتاحية والمهارات المكتشفة</h3>
                    <p className="text-[10px] text-slate-400">المهارات المستخرجة من الـ <LTR>CV</LTR> الخاص بك</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSection("skills")}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  {collapsedSections.skills ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!collapsedSections.skills && (
                <div className="flex flex-wrap gap-2.5">
                  {analysis.skillsFound && analysis.skillsFound.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-xl bg-indigo-500/10 px-4 py-2 text-xs font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span>{s}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRIORITY LAYOUT SECTION 5: EXPERIENCE & STAR METHOD OPTIMIZATION */}
          <div ref={experienceRef} className="scroll-mt-24 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Executive Summary improvement */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm relative space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100/5 pb-2.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <FileCheck2 className="h-5 w-5" />
                    <div>
                      <h4 className="font-display text-sm font-extrabold">{arabicDict.improveSummaryLabel}</h4>
                      <p className="text-[10px] text-slate-400">مقارنة وتعديل الملخص المهني بالذكاء الاصطناعي</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(analysis.summary, "suggestedSummary")}
                    className="text-xs text-indigo-500 hover:underline flex items-center gap-1.5 bg-indigo-500/15 px-3 py-1.5 rounded-lg font-bold"
                  >
                    {copiedSection === "suggestedSummary" ? "تم نسخ الـ Summary!" : <><Copy className="h-3.5 w-3.5" /> <span>نسخ المقترح</span></>}
                  </button>
                </div>
                
                <div className="space-y-3.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">الـ Summary الحالي في سيرتك الذاتية:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{resume?.rawText.split("\n")[0]?.substring(0, 150)}..."</p>
                  </div>
                  
                  <div className="p-4 bg-indigo-500/[0.03] rounded-xl border border-indigo-500/15">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 block mb-2">الـ Summary المحسّن المقترح بواسطة الذكاء الاصطناعي:</span>
                    <p className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed font-bold">
                      {analysis.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Experience Optimizer Card */}
              <div className="lg:col-span-1 rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Briefcase className="h-5 w-5" />
                    <h4 className="font-display text-sm font-extrabold">{arabicDict.improveExperiencesLabel}</h4>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{arabicDict.starMethodTitle}</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    {arabicDict.starMethodDesc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/5 text-xs text-slate-400 font-semibold italic">
                  * ننصح بإدراج الأرقام والنسب المئوية مثل (زيادة المبيعات بنسبة ٢٠٪).
                </div>
              </div>

            </div>
          </div>

          {/* PRIORITY LAYOUT SECTION 6: JOB MATCH ANALYSIS */}
          {enableJobAnalysis && jobMatchData && (
            <div ref={jobMatchRef} className="scroll-mt-24 transition-all duration-300 space-y-6">
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-emerald-500" />
                  <span>نتائج مطابقة الوظيفة — <LTR>Job Match Analysis</LTR></span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  تحليل مخصص وتفصيلي يربط مهاراتك بشكل تفاعلي مع متطلبات الوصف الوظيفي المرفق.
                </p>
              </div>

              {/* Match Score Gauge & Fit Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Score Gauge */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm flex flex-col items-center justify-center text-center relative">
                  <button
                    onClick={() => toggleHelp("jobMatch")}
                    className="absolute top-4 left-4 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>

                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-emerald-500" />
                    <span><LTR>{arabicDict.jobMatchScoreLabel}</LTR></span>
                  </h3>

                  <div className="relative flex items-center justify-center mb-5">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        className="text-slate-100 dark:text-slate-800"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="54"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className={`transition-all duration-1000 ${
                          jobMatchData.matchScore >= 80 ? "text-emerald-500" : jobMatchData.matchScore >= 60 ? "text-amber-500" : "text-rose-500"
                        }`}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 54}
                        strokeDashoffset={2 * Math.PI * 54 * (1 - jobMatchData.matchScore / 100)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="54"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        <LTR>{jobMatchData.matchScore}%</LTR>
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">
                        نسبة المطابقة
                      </span>
                    </div>
                  </div>

                  <div className={`w-full rounded-xl border py-2 px-4 text-xs font-extrabold ${getScoreColor(jobMatchData.matchScore)}`}>
                    {jobMatchData.matchScore >= 80 ? "تطابق ممتاز" : jobMatchData.matchScore >= 60 ? "تطابق متوسط" : "تطابق منخفض"}
                  </div>
                </div>

                {/* Recruiter Evaluation Report */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-3 border-b border-slate-100/5 pb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-display text-base font-extrabold">{arabicDict.recruiterFeedbackLabel} — رأي مسؤول التوظيف</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    {jobMatchData.jobFitSummary}
                  </p>
                </div>

              </div>

              {/* MATCHING & MISSING SKILLS / KEYWORDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Matching Skills */}
                <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-500 mb-4 border-b border-slate-100/5 pb-3">
                    <Check className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-display text-sm font-extrabold">{arabicDict.matchingSkillsLabel}</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {jobMatchData.matchingKeywords && jobMatchData.matchingKeywords.map((k: string, idx: number) => (
                      <span key={idx} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Skills / Keywords */}
                <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-500 mb-4 border-b border-slate-100/5 pb-3">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <h4 className="font-display text-sm font-extrabold">{arabicDict.missingKeywordsLabel}</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {jobMatchData.missingKeywords && jobMatchData.missingKeywords.map((k: string, idx: number) => (
                      <span key={idx} className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* TAILORED RESUME SUGGESTIONS */}
              <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-500 mb-4 border-b border-slate-100/5 pb-3">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  <h4 className="font-display text-sm font-extrabold">{arabicDict.tailoredSuggestionsLabel}</h4>
                </div>
                <ul className="space-y-3">
                  {jobMatchData.improvementSteps && jobMatchData.improvementSteps.map((step: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* PRIORITY LAYOUT SECTION 7: INTERVIEW QUESTIONS */}
          {enableJobAnalysis && interviewData && (
            <div ref={interviewRef} className="scroll-mt-24 transition-all duration-300">
              <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100/5 pb-3">
                  <div className="flex items-center gap-2 text-indigo-500">
                    <MessageSquare className="h-5 w-5 text-indigo-500" />
                    <h4 className="font-display text-sm font-extrabold">{arabicDict.interviewQuestionsLabel} (أسئلة الـ <LTR>Interview</LTR> المقترحة)</h4>
                  </div>
                  <button
                    onClick={() => toggleSection("interview")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    {collapsedSections.interview ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedSections.interview && (
                  <div className="grid grid-cols-1 gap-4">
                    {interviewData.map((q: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/35 border border-slate-100/10 rounded-xl space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-600 font-bold text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-relaxed">{q.question}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white/50 dark:bg-slate-950/20 p-2 rounded-lg leading-relaxed">
                          💡 <strong>محور التركيز المقترح:</strong> {q.idealFocus}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRIORITY LAYOUT SECTION 8: COVER LETTER */}
          {enableJobAnalysis && coverLetterData && (
            <div ref={coverLetterRef} className="scroll-mt-24 transition-all duration-300">
              <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm relative space-y-4">
                <button
                  onClick={() => toggleHelp("coverLetter")}
                  className="absolute top-4 left-4 text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>

                <div className="flex justify-between items-center border-b border-slate-100/5 pb-3">
                  <div className="flex items-center gap-2 text-indigo-500">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    <h4 className="font-display text-sm font-extrabold">{arabicDict.coverLetterLabel} (خطاب التقديم المخصص)</h4>
                  </div>
                  <button
                    onClick={() => toggleSection("coverLetter")}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    {collapsedSections.coverLetter ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedSections.coverLetter && (
                  <>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border border-slate-100/10 rounded-xl space-y-3 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {coverLetterData}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => copyToClipboard(coverLetterData, "coverLetterText")}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all"
                      >
                        <Copy className="h-4 w-4" />
                        <span>{copiedSection === "coverLetterText" ? "تم نسخ الـ Cover Letter!" : "نسخ الـ Cover Letter"}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          if (coverLetterData) {
                            setDownloadModalData({
                              isOpen: true,
                              title: "تحميل خطاب التقديم (Cover Letter)",
                              content: coverLetterData,
                              fileName: "Cover_Letter.txt",
                              type: "cover_letter"
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-indigo-500 transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>تحميل بصيغة <LTR>TXT</LTR></span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* PRIORITY LAYOUT SECTION 9: DOWNLOAD CENTER */}
          <div ref={downloadCenterRef} className="scroll-mt-24 transition-all duration-300">
            <div className="rounded-2xl border border-slate-100/10 bg-white dark:bg-[#0E1527] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 text-emerald-500 border-b border-slate-100/5 pb-3">
                <Download className="h-5 w-5" />
                <div>
                  <h3 className="font-display text-base font-extrabold">مركز تحميل وحفظ التقارير — Download Center</h3>
                  <p className="text-[10px] text-slate-400">احفظ كل تحليلات ومخرجات السيرة الذاتية بضغطة زر واحدة</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <button
                  onClick={() => {
                    const fullText = getFullAnalysisText();
                    setDownloadModalData({
                      isOpen: true,
                      title: "تنزيل تقرير تحليل السيرة الذاتية بصيغة TXT",
                      content: fullText,
                      fileName: "AI_Resume_Analysis_Report.txt",
                      type: "txt"
                    });
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all gap-2"
                >
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <span>تحميل <LTR>TXT</LTR></span>
                </button>

                <button
                  onClick={() => {
                    const fullText = getFullAnalysisText();
                    setDownloadModalData({
                      isOpen: true,
                      title: "تنزيل تقرير تحليل السيرة الذاتية بصيغة DOCX",
                      content: fullText,
                      fileName: "AI_Resume_Analysis_Report.docx",
                      type: "docx"
                    });
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all gap-2"
                >
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <span>تحميل <LTR>DOCX</LTR></span>
                </button>

                <button
                  onClick={() => {
                    const fullText = getFullAnalysisText();
                    setDownloadModalData({
                      isOpen: true,
                      title: "تحميل التقرير كـ PDF أو طباعته",
                      content: fullText,
                      fileName: "AI_Resume_Analysis_Report.pdf",
                      type: "pdf"
                    });
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all gap-2"
                >
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <span>تحميل <LTR>PDF</LTR> / طباعة</span>
                </button>

                <button
                  onClick={() => {
                    const fullText = getFullAnalysisText();
                    copyToClipboard(fullText, "allReport");
                    setDownloadModalData({
                      isOpen: true,
                      title: "تم نسخ التقرير كاملاً بنجاح!",
                      content: fullText,
                      fileName: "AI_Resume_Analysis_Report.txt",
                      type: "txt"
                    });
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all gap-2"
                >
                  <Copy className="h-5 w-5 text-indigo-500" />
                  <span>{copiedSection === "allReport" ? "تم نسخ التقرير!" : "نسخ التقرير كاملاً"}</span>
                </button>

                <button
                  onClick={() => {
                    const fullText = getFullAnalysisText();
                    setDownloadModalData({
                      isOpen: true,
                      title: "طباعة فورية للتقرير",
                      content: fullText,
                      fileName: "AI_Resume_Analysis_Report.pdf",
                      type: "print"
                    });
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all gap-2"
                >
                  <Printer className="h-5 w-5 text-indigo-500" />
                  <span>طباعة فورية</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Upgraded Helper Dialog Modal for Iframe download/print support */}
      {downloadModalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-[#0E1527] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-indigo-500">
                <Info className="h-5 w-5" />
                <h4 className="font-display font-extrabold text-base text-slate-800 dark:text-slate-100">
                  {downloadModalData.title}
                </h4>
              </div>
              <button
                onClick={() => setDownloadModalData(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-right flex-1">
              {/* Informative Help Banner for Iframe sandboxing constraint */}
              <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] text-xs text-amber-800 dark:text-amber-400 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>تنبيه هام للتحميل والطباعة (Preview Mode Notice)</span>
                </div>
                <p>
                  نظرًا لقيود المتصفح الأمنية داخل نوافذ المعاينة المصغرة (iFrame)، قد يتم تعطيل تنزيل الملفات أو فتح الطباعة بشكل تلقائي.
                </p>
                <p className="font-bold text-indigo-600 dark:text-indigo-400">
                  💡 الحلول السريعة المتاحة الآن:
                </p>
                <ul className="list-disc list-inside space-y-1 pr-1 font-medium">
                  <li>اضغط على زر <strong className="text-indigo-600 dark:text-indigo-400">"نسخ النص كاملاً"</strong> بالأسفل، وقم بلصقه في برنامج Word أو Notepad لحفظه فوراً!</li>
                  <li>أو قم بفتح الموقع في علامة تبويب كاملة مستقلة (عبر الرابط الموجود في أعلى يمين نافذة المعاينة) وستتمكن من تنزيل التقارير وطباعتها بنقرة واحدة!</li>
                </ul>
              </div>

              {/* Text Area Content Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">معاينة محتوى التقرير:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(downloadModalData.content);
                      setCopiedSection("modalCopy");
                      setTimeout(() => setCopiedSection(null), 2000);
                    }}
                    className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedSection === "modalCopy" ? "تم نسخ النص!" : "نسخ هذا النص"}</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border border-slate-100/10 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto" dir="ltr">
                  {downloadModalData.content}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setDownloadModalData(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                إغلاق
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(downloadModalData.content);
                  setCopiedSection("modalCopy");
                  setTimeout(() => setCopiedSection(null), 2000);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span>{copiedSection === "modalCopy" ? "تم النسخ!" : "نسخ النص كاملاً"}</span>
              </button>

              {downloadModalData.type !== "print" && downloadModalData.type !== "pdf" && (
                <button
                  onClick={() => {
                    downloadTextFile(downloadModalData.content, downloadModalData.fileName);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>تنزيل الملف</span>
                </button>
              )}

              {(downloadModalData.type === "print" || downloadModalData.type === "pdf") && (
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>فتح الطباعة الافتراضية</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
