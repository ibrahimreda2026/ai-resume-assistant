import React, { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, ClipboardList } from "lucide-react";
import { Language, ResumeState } from "../types";
import { translations } from "../translations";
import { safeParseJSON, performPdfOcr, OcrProgress } from "../utils";
import LTR from "./LTR";

interface UploadCVProps {
  lang: Language;
  resume: ResumeState | null;
  onUploadSuccess: (fileName: string, extractedText: string, parsedResume?: any) => void;
}

export default function UploadCV({ lang, resume, onUploadSuccess }: UploadCVProps) {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      setError(lang === "en" ? "Unsupported file extension. Please upload .pdf, .docx, or .txt" : "صيغة غير مدعومة. يرجى رفع ملفات .pdf أو .docx أو .txt");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(lang === "en" ? "File size exceeds 5MB limit" : "حجم الملف يتجاوز الحد الأقصى 5 ميجابايت");
      return;
    }

    setError(null);
    setLoading(true);
    setSuccess(false);

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
        throw new Error(data.error || "Failed to process resume");
      }

      if (data.needsOCR) {
        // Automatically perform OCR on every page
        setError(null);
        try {
          const ocrResult = await performPdfOcr(file, token, (prog) => {
            setOcrProgress(prog);
          });
          
          if (ocrResult.confidenceIsLow) {
            setError(lang === "en" 
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

          setSuccess(true);
          onUploadSuccess(file.name, saveData.textPreview || ocrResult.text.substring(0, 500) + "...", saveData.parsedResume);
          
          // Clear states after success
          setTimeout(() => {
            setSuccess(false);
            if (ocrResult.confidenceIsLow) {
              // Keep the low confidence warning visible longer
            } else {
              setError(null);
            }
          }, 4000);
        } catch (ocrErr: any) {
          throw new Error(ocrErr.message || "OCR processing failed.");
        } finally {
          setOcrProgress(null);
        }
      } else {
        setSuccess(true);
        onUploadSuccess(file.name, data.textPreview, data.parsedResume);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleManualSave = async () => {
    if (!pastedText.trim() || pastedText.trim().length < 50) {
      setError(lang === "en" ? "Please enter at least 50 characters." : "يرجى كتابة 50 حرفًا على الأقل.");
      return;
    }

    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: pastedText,
          fileName: lang === "en" ? "pasted_resume.txt" : "السيرة_الذاتية.txt",
        }),
      });

      const data = await safeParseJSON(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to process text");
      }

      setSuccess(true);
      onUploadSuccess(lang === "en" ? "pasted_resume.txt" : "السيرة_الذاتية.txt", pastedText, data.parsedResume);
      setPastedText("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {t.tabUpload}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {lang === "en" 
            ? "Upload your resume file or copy-paste it manually. We support fully semantic parsing to extract exact sections."
            : "قم برفع ملف سيرتك الذاتية أو الصقها يدويًا. نحن ندعم التحليل الدلالي الكامل لاستخراج الأقسام بدقة."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Drag & Drop */}
        <div className="space-y-4">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={triggerFileInput}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer text-center h-[320px] transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/30"
                : "border-slate-200/50 dark:border-slate-800/50 glass-card hover:border-indigo-400 dark:hover:border-indigo-500/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              className="hidden"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,image/*"
            />
            <UploadCloud className={`h-12 w-12 mb-4 transition-transform ${isDragging ? "scale-110 text-indigo-500" : "text-slate-400"}`} />
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-1">
              {t.dragAndDrop}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
              {t.supportedFormats}
            </p>
            <button
              type="button"
              className="rounded-xl glass-input px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            >
              {t.orSelectFile}
            </button>
          </div>

          {/* Feedback banners */}
          {ocrProgress && (
            <div className="space-y-2 rounded-xl bg-violet-500/10 p-4 text-violet-800 dark:text-violet-400">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400 shrink-0" />
                <span className="text-sm font-semibold">
                  {ocrProgress.status === "loading_pdfjs" && (lang === "en" ? "Preparing OCR parser library..." : "جاري تجهيز مكتبة التعرف الضوئي...")}
                  {ocrProgress.status === "rendering_pages" && (lang === "en" ? `Converting page ${ocrProgress.currentPage || 1} of ${ocrProgress.totalPages || 1} to high-resolution scan...` : `جاري تحويل الصفحة ${ocrProgress.currentPage || 1} من ${ocrProgress.totalPages || 1} إلى مسح عالي الدقة...`)}
                  {ocrProgress.status === "performing_ocr" && (lang === "en" ? `Extracting text via OCR: page ${ocrProgress.currentPage || 1} of ${ocrProgress.totalPages || 1}...` : `جاري استخراج النص بالتعرف الضوئي: الصفحة ${ocrProgress.currentPage || 1} من ${ocrProgress.totalPages || 1}...`)}
                  {ocrProgress.status === "completed" && (lang === "en" ? "OCR Extraction Complete!" : "اكتمل استخراج النص بنجاح!")}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-violet-600 dark:bg-violet-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress.percent || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{ocrProgress.percent || 0}%</span>
                <span>{ocrProgress.currentPage && ocrProgress.totalPages ? `${ocrProgress.currentPage} / ${ocrProgress.totalPages}` : ""}</span>
              </div>
            </div>
          )}

          {loading && !ocrProgress && (
            <div className="flex items-center space-x-3 rtl:space-x-reverse rounded-xl bg-indigo-500/10 p-4 text-indigo-800 dark:text-indigo-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
              <span className="text-sm font-medium">{t.uploading}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start space-x-2 rtl:space-x-reverse rounded-xl bg-rose-500/10 p-4 text-rose-800 dark:text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-3 rtl:space-x-reverse rounded-xl bg-green-500/10 p-4 text-green-800 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">{t.uploadSuccess}</span>
            </div>
          )}

          {resume && (
            <div className="rounded-xl glass-input p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <FileText className="h-5 w-5 text-indigo-500" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 dark:text-white"><LTR>{resume.fileName}</LTR></p>
                  <p className="text-slate-400 mt-0.5">{lang === "en" ? "Ready for AI analysis" : "جاهز لتحليل الذكاء الاصطناعي"}</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            </div>
          )}
        </div>

        {/* Right Side: Manual Paste */}
        <div className="flex flex-col h-[320px] rounded-2xl glass-card p-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-3">
            <ClipboardList className="h-5 w-5 text-indigo-500" />
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              {t.pasteManual}
            </h3>
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={t.pastePlaceholder}
            className="w-full flex-grow rounded-xl glass-input p-4 text-sm text-slate-800 dark:text-slate-100 focus:bg-white/50 dark:focus:bg-slate-950/50 focus:outline-none resize-none transition-all"
          />
          <button
            onClick={handleManualSave}
            disabled={loading || !pastedText.trim()}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors cursor-pointer"
          >
            {t.saveText}
          </button>
        </div>

      </div>
    </div>
  );
}
