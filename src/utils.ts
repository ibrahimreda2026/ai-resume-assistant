/**
 * Safely parses a fetch Response as JSON, verifying the content-type first
 * to avoid throwing cryptic "unexpected token" or "unexpected character" errors.
 */
export async function safeParseJSON(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    console.error("[Non-JSON Response Received]", {
      status: response.status,
      statusText: response.statusText,
      contentType,
      bodyPreview: text.substring(0, 200)
    });
    
    // Check if it's an HTML page or text error
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      throw new Error(`The server returned an HTML error page (Status ${response.status}). This usually indicates a server error or an invalid route.`);
    }
    
    throw new Error(`Expected JSON response but received ${contentType || "unknown content type"} (Status ${response.status}): ${text.substring(0, 150) || "Empty response"}`);
  }

  try {
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text);
  } catch (err: any) {
    console.error("[JSON Parse Failure]", {
      error: err.message,
      bodyPreview: text.substring(0, 200)
    });
    throw new Error(`Failed to parse JSON response: ${err.message}. Response was: ${text.substring(0, 100)}`);
  }
}

export interface OcrProgress {
  status: "loading_pdfjs" | "rendering_pages" | "performing_ocr" | "completed" | "failed";
  currentPage?: number;
  totalPages?: number;
  percent?: number;
}

export async function performPdfOcr(
  file: File,
  token: string | null,
  onProgress: (progress: OcrProgress) => void
): Promise<{ text: string; confidenceIsLow: boolean }> {
  onProgress({ status: "loading_pdfjs" });
  
  // 1. Load PDF.js from a CDN dynamically
  const pdfjsLib = await new Promise<any>((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve((window as any).pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js parsing engine from CDN."));
    document.head.appendChild(script);
  });

  // 2. Read file as ArrayBuffer and load document
  onProgress({ status: "rendering_pages", percent: 5 });
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdfDoc.numPages;

  const pageImages: string[] = [];

  // 3. Render each page to image
  for (let i = 1; i <= totalPages; i++) {
    onProgress({
      status: "rendering_pages",
      currentPage: i,
      totalPages,
      percent: 5 + Math.round((i / totalPages) * 35) // up to 40%
    });

    const page = await pdfDoc.getPage(i);
    // Render at scale 1.2 which provides excellent text clarity for OCR while being lightweight
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D context for canvas rendering.");
    }

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    // Convert to base64 image using JPEG format at 0.70 quality to drastically reduce payload size and prevent proxy body-limit (NetworkError) issues
    const dataUrl = canvas.toDataURL("image/jpeg", 0.70);
    // Extract raw base64 part
    const base64Content = dataUrl.split(",")[1];
    pageImages.push(base64Content);
  }

  // 4. Perform OCR on each page image
  let mergedText = "";
  let lowConfidenceDetected = false;

  for (let i = 0; i < pageImages.length; i++) {
    const pageNum = i + 1;
    onProgress({
      status: "performing_ocr",
      currentPage: pageNum,
      totalPages,
      percent: 40 + Math.round(((i + 1) / totalPages) * 60) // from 40% to 100%
    });

    const response = await fetch("/api/ocr/page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        imageBase64: pageImages[i],
        mimeType: "image/jpeg"
      })
    });

    const data = await safeParseJSON(response);
    if (!response.ok) {
      throw new Error(data.error || `OCR failed on page ${pageNum}`);
    }

    if (data.text) {
      mergedText += `--- Page ${pageNum} ---\n` + data.text + "\n\n";
    }
    if (data.confidenceIsLow) {
      lowConfidenceDetected = true;
    }
  }

  onProgress({ status: "completed", percent: 100 });
  return {
    text: mergedText.trim(),
    confidenceIsLow: lowConfidenceDetected || mergedText.trim().length < 50
  };
}
