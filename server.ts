import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as pdf from "pdf-parse";
import mammoth from "mammoth";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./server-db";

// Load environment variables from .env
dotenv.config();

// Ensure required environment variables are set. Fail startup immediately if missing or default.
const REQUIRED_ENV_VARS = ["JWT_SECRET", "GEMINI_API_KEY", "BYNARA_API_KEY"];
const missingVars = REQUIRED_ENV_VARS.filter(v => {
  const val = process.env[v];
  return !val || val.trim() === "" || val.startsWith("MY_") || val.includes("placeholder");
});

if (missingVars.length > 0) {
  console.error("==================================================");
  console.error("❌ CRITICAL STARTUP FAILURE: MISSING CONFIGURATION");
  console.error("==================================================");
  console.error(`The following required environment variables are missing or invalid: ${missingVars.join(", ")}`);
  console.error("Please configure these variables in your environment or .env file.");
  console.error("==================================================");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET as string;

interface CustomRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  bynaraApiKey?: string;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Security Header Sanitization (completely strip any incoming x-bynara-api-key headers to prevent client injection)
app.use((req: any, res, next) => {
  if (req.headers["x-bynara-api-key"]) {
    delete req.headers["x-bynara-api-key"];
  }
  req.bynaraApiKey = process.env.BYNARA_API_KEY;
  next();
});

// Temporary logging middleware before every API response/request
app.use((req, res, next) => {
  console.log(req.method, req.originalUrl);
  next();
});

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});


// Auth Middleware
function authenticateToken(req: CustomRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
}

// Auth Endpoints
app.post("/api/auth/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Please provide all required fields." });
  }

  const existingUser = db.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "Email already registered." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.addUser(newUser);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, name: newUser.name },
    JWT_SECRET
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    },
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
});

app.get("/api/auth/me", authenticateToken, (req: CustomRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: req.user });
});

// Resume Upload & Parsing Endpoint
app.post("/api/resume/upload", authenticateToken, upload.single("file"), async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    
    let extractedText = "";
    let fileName = "manual_entry.txt";

    if (req.file) {
      fileName = req.file.originalname;
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
        try {
          let PDFParseClass = (pdf as any).PDFParse || (pdf as any).default?.PDFParse;
          if (PDFParseClass) {
            const parser = new PDFParseClass(new Uint8Array(fileBuffer));
            const parsedPdf = await parser.getText();
            extractedText = parsedPdf.text || "";
          } else {
            const parseFn = typeof pdf === "function" ? pdf : (pdf as any).default;
            if (typeof parseFn === "function") {
              const parsedPdf = await parseFn(fileBuffer);
              extractedText = parsedPdf.text || "";
            } else {
              throw new Error("Could not find a valid PDF parsing constructor or function");
            }
          }
        } catch (pdfErr) {
          console.error("PDF Parsing Error, falling back to simple regex or string representation:", pdfErr);
          extractedText = fileBuffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, "");
        }
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocumentwordprocessingml.document" || 
        fileName.endsWith(".docx")
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value;
        } catch (docxErr) {
          console.error("DOCX Parsing Error:", docxErr);
          throw new Error("Failed to parse Word Document");
        }
      } else if (mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(fileName)) {
        try {
          const base64Image = fileBuffer.toString("base64");
          const apiKey = req.bynaraApiKey || process.env.BYNARA_API_KEY;
          if (!apiKey) {
            throw new Error("BYNARA_API_KEY is missing. Image OCR cannot be completed.");
          }

          const response = await fetch("https://router.bynara.id/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "mimo-v2.5-free",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Please extract all readable text from this CV/Resume image exactly as written. Respond ONLY with the extracted text." },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                      }
                    }
                  ]
                }
              ],
              temperature: 0.2
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Bynara Vision API failed: ${errText}`);
          }

          const data = await response.json();
          extractedText = data.choices?.[0]?.message?.content || "";
        } catch (visionErr: any) {
          console.error("CV Vision parsing error:", visionErr.message);
          return res.status(400).json({ error: "Failed to perform OCR on CV image: " + visionErr.message });
        }
      } else {
        // Assume text file
        extractedText = fileBuffer.toString("utf8");
      }
    } else if (req.body.text) {
      extractedText = req.body.text;
      fileName = req.body.fileName || "manual_entry.txt";
    } else {
      return res.status(400).json({ error: "No CV file or text content provided." });
    }

    const isPdf = fileName && fileName.toLowerCase().endsWith(".pdf");
    if (!extractedText || extractedText.trim().length < 50) {
      if (isPdf) {
        return res.status(200).json({
          needsOCR: true,
          fileName,
          error: "scanned_pdf",
          message: "The PDF contains no selectable text. Automatic OCR fallback initiated."
        });
      }
      return res.status(400).json({ 
        error: "Extracted text is too short or empty. Please ensure the file has selectable text (not scanned/image), or upload the CV as an image (PNG/JPG) to enable automatic OCR text extraction." 
      });
    }

    // Save user's resume text and parse structured data via Gemini
    let parsedResume = null;
    if (extractedText && extractedText.trim().length >= 50) {
      parsedResume = await parseResumeWithGemini(extractedText.trim(), req.bynaraApiKey);
    }

    db.saveResume(req.user.id, fileName, extractedText.trim(), parsedResume);

    res.json({
      success: true,
      fileName,
      textPreview: extractedText.trim().substring(0, 500) + "...",
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      parsedResume,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to parse and upload resume" });
  }
});

// Job Description Upload & Parsing Endpoint (supports PDF, DOCX, TXT, Images)
app.post("/api/job-description/upload", authenticateToken, upload.single("file"), async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file) {
      return res.status(400).json({ error: "No job description file uploaded." });
    }

    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    let extractedText = "";

    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      try {
        let PDFParseClass = (pdf as any).PDFParse || (pdf as any).default?.PDFParse;
        if (PDFParseClass) {
          const parser = new PDFParseClass(new Uint8Array(fileBuffer));
          const parsedPdf = await parser.getText();
          extractedText = parsedPdf.text || "";
        } else {
          const parseFn = typeof pdf === "function" ? pdf : (pdf as any).default;
          if (typeof parseFn === "function") {
            const parsedPdf = await parseFn(fileBuffer);
            extractedText = parsedPdf.text || "";
          } else {
            extractedText = fileBuffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, "");
          }
        }
      } catch (pdfErr) {
        extractedText = fileBuffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, "");
      }
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocumentwordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } catch (docxErr) {
        return res.status(400).json({ error: "Failed to parse Word Document" });
      }
    } else if (mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(fileName)) {
      try {
        const base64Image = fileBuffer.toString("base64");
        const apiKey = req.bynaraApiKey || process.env.BYNARA_API_KEY;
        if (!apiKey) {
          throw new Error("BYNARA_API_KEY is missing. Image OCR cannot be completed.");
        }

        const response = await fetch("https://router.bynara.id/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "mimo-v2.5-free",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Please extract all readable text from this job advertisement image exactly as written. Respond ONLY with the extracted text." },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            temperature: 0.2
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Bynara Vision API failed: ${errText}`);
        }

        const data = await response.json();
        extractedText = data.choices?.[0]?.message?.content || "";
      } catch (visionErr: any) {
        console.error("Vision parsing error:", visionErr.message);
        return res.status(400).json({ error: "Failed to perform OCR on image. " + visionErr.message });
      }
    } else {
      extractedText = fileBuffer.toString("utf8");
    }

    if (!extractedText || extractedText.trim().length < 10) {
      const isPdf = fileName && fileName.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        return res.status(200).json({
          needsOCR: true,
          fileName,
          error: "scanned_pdf",
          message: "The PDF contains no selectable text. Automatic OCR fallback initiated."
        });
      }
      return res.status(400).json({ error: "Failed to extract text from the file or text is too short." });
    }

    res.json({
      success: true,
      fileName,
      text: extractedText.trim()
    });
  } catch (error: any) {
    console.error("Job description upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process job description file" });
  }
});

// Helper function to extract JSON robustly
function extractJSON(text: string): any {
  if (!text) {
    throw new Error("Empty input text for JSON extraction");
  }

  const cleaned = text.trim();

  // Try parsing directly first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue with regex-based/brace-based extraction
  }

  // Handle markdown blocks ```json ... ``` or ``` ... ```
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = cleaned.match(markdownRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      // Continue using block content for brace matching
    }
  }

  // Find the first occurrence of '{' or '[' and the last occurrence of '}' or ']'
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf("}") + 1;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf("]") + 1;
  }

  if (startIdx !== -1 && endIdx > startIdx) {
    const jsonCandidate = cleaned.substring(startIdx, endIdx);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e: any) {
      console.error("[JSON Extraction Failure] Substring candidate failed to parse:", jsonCandidate);
      throw new Error(`Failed to parse extracted JSON candidate: ${e.message}`);
    }
  }

  throw new Error("Could not extract a valid JSON object or array from the AI response.");
}

// Gemini API Integration Helpers
let aiClient: GoogleGenAI | null = null;
let isGeminiDisabled = false;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function callGemini(prompt: string, model: string = "gemini-3.5-flash", systemPrompt: string = "") {
  try {
    const ai = getGeminiClient();
    
    let activeModel = model;
    if (!activeModel.toLowerCase().includes("gemini")) {
      activeModel = "gemini-3.5-flash";
    }

    const startTime = Date.now();
    console.log(`[Gemini Request] Model: ${activeModel}`);
    
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt || undefined,
        temperature: 0.2,
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[Gemini Response Received] Status: OK | Time: ${duration}ms`);
    
    return response.text || "";
  } catch (error: any) {
    const errMsg = String(error.message || "").toLowerCase();
    if (errMsg.includes("denied") || errMsg.includes("permission_denied") || errMsg.includes("403") || errMsg.includes("forbidden") || errMsg.includes("not allowed")) {
      console.warn("⚠️ [Gemini API Warning] Gemini API key or project returned PERMISSION_DENIED. Disabling Gemini for subsequent requests and using Bynara fallback.");
      isGeminiDisabled = true;
    } else {
      console.warn(`[Gemini API Warning]:`, error.message);
    }
    throw error;
  }
}

async function parseResumeWithGemini(rawText: string, bynaraApiKey?: string) {
  const prompt = `You are an expert AI resume parser. Parse the following resume text into a highly accurate structured JSON object.
  
  Format your response strictly as a JSON object matching this structure:
  {
    "Full Name": string or null,
    "Email": string or null,
    "Phone": string or null,
    "Address": string or null,
    "Education": string or null,
    "Experience": string or null,
    "Skills": string or null,
    "Certifications": string or null,
    "Languages": string or null,
    "Projects": string or null,
    "Summary": string or null
  }
  
  Instructions:
  - If any field is missing, not provided, or cannot be found in the resume, return null instead of failing.
  - Do not invent, hallucinate, or assume any details.
  - Always return valid JSON. Do not include any extra text, only the JSON.
  
  Resume Text:
  ${rawText}`;

  try {
    const aiResponse = await callOpenAICompatibleWithRetryAndFallback(prompt, "gemini-3.5-flash", "You are an expert ATS and resume parsing system. Respond strictly with a JSON object.", bynaraApiKey);
    const parsed = extractJSON(aiResponse);
    
    return {
      "Full Name": parsed["Full Name"] || parsed["fullName"] || null,
      "Email": parsed["Email"] || parsed["email"] || null,
      "Phone": parsed["Phone"] || parsed["phone"] || null,
      "Address": parsed["Address"] || parsed["address"] || null,
      "Education": parsed["Education"] || parsed["education"] || null,
      "Experience": parsed["Experience"] || parsed["experience"] || null,
      "Skills": parsed["Skills"] || parsed["skills"] || null,
      "Certifications": parsed["Certifications"] || parsed["certifications"] || null,
      "Languages": parsed["Languages"] || parsed["languages"] || null,
      "Projects": parsed["Projects"] || parsed["projects"] || null,
      "Summary": parsed["Summary"] || parsed["summary"] || null,
      
      "fullName": parsed["fullName"] || parsed["Full Name"] || null,
      "email": parsed["email"] || parsed["Email"] || null,
      "phone": parsed["phone"] || parsed["Phone"] || null,
      "address": parsed["address"] || parsed["Address"] || null,
      "education": parsed["education"] || parsed["Education"] || null,
      "experience": parsed["experience"] || parsed["Experience"] || null,
      "skills": parsed["skills"] || parsed["Skills"] || null,
      "certifications": parsed["certifications"] || parsed["Certifications"] || null,
      "languages": parsed["languages"] || parsed["Languages"] || null,
      "projects": parsed["projects"] || parsed["Projects"] || null,
      "summary": parsed["summary"] || parsed["Summary"] || null,
    };
  } catch (err: any) {
    console.error("[Gemini Resume Parser Error] Failed to parse with Gemini:", err.message);
    return {
      "Full Name": null,
      "Email": null,
      "Phone": null,
      "Address": null,
      "Education": null,
      "Experience": null,
      "Skills": null,
      "Certifications": null,
      "Languages": null,
      "Projects": null,
      "Summary": null,
      
      "fullName": null,
      "email": null,
      "phone": null,
      "address": null,
      "education": null,
      "experience": null,
      "skills": null,
      "certifications": null,
      "languages": null,
      "projects": null,
      "summary": null,
    };
  }
}

// Helper function to call OpenAI Compatible API
async function callOpenAICompatible(prompt: string, model: string = "mimo-v2.5-free", systemPrompt: string = "", bynaraApiKey?: string) {
  const apiKey = bynaraApiKey || process.env.BYNARA_API_KEY;

  if (!apiKey || apiKey === "MY_BYNARA_API_KEY" || apiKey === "") {
    throw new Error("BYNARA_API_KEY is missing.");
  }

  // Model validation: Replace unsupported models with mimo-v2.5-free
  // Supported models are mimo-v2.5-free, mimo-v2.5-pro-free, mistral-large, and mistral-medium-3-5
  const VALID_MODELS = ["mimo-v2.5-free", "mimo-v2.5-pro-free", "mistral-large", "mistral-medium-3-5"];
  let activeModel = model;
  if (!VALID_MODELS.includes(activeModel)) {
    activeModel = "mimo-v2.5-free";
  }

  const startTime = Date.now();
  const requestUrl = "https://router.bynara.id/v1/chat/completions";
  const requestBody = {
    model: activeModel,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  };

  console.log(`[AI Request URL] ${requestUrl}`);
  console.log(`[AI Request Model] ${activeModel}`);
  console.log(`[AI Request Body] ${JSON.stringify(requestBody)}`);

  // We set up an abort controller for timeout handling (60 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    console.log(`[AI Response Status] ${response.status} (${response.statusText})`);
    console.log(`[AI Request Duration] Model: ${activeModel} | Time: ${duration}ms`);
    
    // Log headers
    const headersObj: { [key: string]: string } = {};
    response.headers.forEach((val, key) => {
      headersObj[key] = val;
    });
    console.log(`[AI Response Headers]`, JSON.stringify(headersObj));

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[AI API Error] Status: ${response.status} | Response Body:`, responseText);
      throw new Error(`API returned status ${response.status}: ${responseText || "Empty response"}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr: any) {
      console.error(`[AI Response Parsing Error] Raw response was:`, responseText);
      throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
    }

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      console.warn(`[AI Warning] Received empty content from model.`);
    }
    return content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error(`[AI Timeout Error] Request to ${requestUrl} timed out after 60 seconds.`);
      throw new Error("AI Request timed out. Please try again.");
    }
    console.error(`[AI Error] Error during execution:`, error.message);
    throw error;
  }
}

// Helper function to call OpenAI Compatible API with retry and fallback
async function callOpenAICompatibleWithRetryAndFallback(prompt: string, model: string = "gemini-3.5-flash", systemPrompt: string = "", bynaraApiKey?: string) {
  // Try Gemini first as the primary engine if it has not been disabled
  if (process.env.GEMINI_API_KEY && !isGeminiDisabled) {
    try {
      const activeGeminiModel = model.toLowerCase().includes("pro") ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      return await callGemini(prompt, activeGeminiModel, systemPrompt);
    } catch (geminiErr: any) {
      console.warn(`[Gemini Primary Engine Warning] Live Gemini call failed. Trying fallback to Bynara. Error:`, geminiErr.message);
    }
  }

  const VALID_MODELS = ["mimo-v2.5-free", "mimo-v2.5-pro-free", "mistral-large", "mistral-medium-3-5"];
  let activeModel = model;
  if (!VALID_MODELS.includes(activeModel)) {
    activeModel = "mimo-v2.5-free";
  }

  try {
    // Attempt 1
    return await callOpenAICompatible(prompt, activeModel, systemPrompt, bynaraApiKey);
  } catch (err: any) {
    if (err.message === "BYNARA_API_KEY is missing.") {
      throw err;
    }
    console.warn(`[AI Warning] Attempt 1 failed for model ${activeModel}. Retrying with fallback. Error:`, err.message);

    // Fallback: If current was mimo-v2.5-free, try mimo-v2.5-pro-free; otherwise try mimo-v2.5-free
    const fallbackModel = activeModel === "mimo-v2.5-free" ? "mimo-v2.5-pro-free" : "mimo-v2.5-free";
    console.log(`[AI Retry] Attempt 2 with fallback model: ${fallbackModel}`);

    try {
      return await callOpenAICompatible(prompt, fallbackModel, systemPrompt, bynaraApiKey);
    } catch (retryErr: any) {
      console.error(`[AI Error] Attempt 2 with fallback model ${fallbackModel} also failed:`, retryErr.message);
      throw retryErr;
    }
  }
}

// ------------------------------------------------------------
// SMART DYNAMIC PARSING & GENERATION ENGINE (AI Fallbacks)
// ------------------------------------------------------------

function parseResumeTextDynamically(cvText: string) {
  const lines = cvText.split("\n").map(l => l.trim()).filter(Boolean);
  const textLower = cvText.toLowerCase();

  // 1. Detect Job Title / Profession from the top of the resume (first 15 lines)
  let jobTitle = "";
  const contactKeywords = ["@", "phone", "email", "mobile", "github", "linkedin", "address", "tel:", "www.", "http", "location", "zip"];
  const nonContactLines = lines.slice(0, 15).filter(line => {
    return !contactKeywords.some(kw => line.toLowerCase().includes(kw)) && line.length > 3 && line.length < 50;
  });

  if (nonContactLines.length > 1) {
    const firstLine = nonContactLines[0];
    const secondLine = nonContactLines[1];
    const thirdLine = nonContactLines[2] || "";

    if (firstLine.length < 30 && !/\d/.test(firstLine)) {
      if (secondLine.length < 40 && !secondLine.toLowerCase().includes("resume") && !secondLine.toLowerCase().includes("cv")) {
        jobTitle = secondLine;
      } else if (thirdLine.length < 40 && !thirdLine.toLowerCase().includes("resume") && !thirdLine.toLowerCase().includes("cv")) {
        jobTitle = thirdLine;
      } else {
        jobTitle = firstLine;
      }
    } else {
      jobTitle = firstLine;
    }
  } else if (nonContactLines.length > 0) {
    jobTitle = nonContactLines[0];
  }

  if (jobTitle) {
    jobTitle = jobTitle.replace(/^[\s\-\•\*\d\.\,\|\:]+/, "").trim();
  }

  const isArabic = /[\u0600-\u06FF]/.test(cvText);

  if (!jobTitle || jobTitle.length < 3 || /\d{4,}/.test(jobTitle) || jobTitle.toLowerCase().includes("curriculum") || jobTitle.toLowerCase().includes("resume") || jobTitle.toLowerCase().includes("summary")) {
    jobTitle = isArabic ? "أخصائي مهني" : "Professional Specialist";
  }

  // 2. Detect Industry
  let industry = isArabic ? "الخدمات المهنية" : "Professional Services";
  const titleLower = jobTitle.toLowerCase();
  
  if (titleLower.includes("engineer") || titleLower.includes("agri") || titleLower.includes("farm") || titleLower.includes("crop") || textLower.includes("irrigation") || textLower.includes("soil")) {
    const isAgri = titleLower.includes("agri") || titleLower.includes("farm") || textLower.includes("crop") || textLower.includes("soil") || textLower.includes("irrigation") || textLower.includes("pest");
    if (isAgri) {
      industry = isArabic ? "الزراعة والري" : "Agriculture & Farming";
      if (jobTitle === "Professional Specialist" || jobTitle === "أخصائي مهني") {
        jobTitle = isArabic ? "مهندس زراعي" : "Agricultural Engineer";
      }
    } else {
      industry = isArabic ? "الهندسة والتقنية" : "Engineering & Technology";
    }
  } else if (titleLower.includes("account") || titleLower.includes("audit") || titleLower.includes("finance") || titleLower.includes("tax") || titleLower.includes("bookkeep") || textLower.includes("ledger") || textLower.includes("journal entry")) {
    industry = isArabic ? "المحاسبة والمالية" : "Accounting & Finance";
    if (jobTitle === "Professional Specialist" || jobTitle === "أخصائي مهني") {
      jobTitle = isArabic ? "محاسب مالي" : "Financial Accountant";
    }
  } else if (titleLower.includes("doctor") || titleLower.includes("physician") || titleLower.includes("medical") || titleLower.includes("nurse") || titleLower.includes("clinic") || titleLower.includes("health") || textLower.includes("patient care") || textLower.includes("clinical")) {
    industry = isArabic ? "الرعاية الصحية والطب" : "Healthcare & Medicine";
    if (jobTitle === "Professional Specialist" || jobTitle === "أخصائي مهني") {
      jobTitle = isArabic ? "طبيب ممارس" : "Medical Practitioner";
    }
  } else if (titleLower.includes("teach") || titleLower.includes("educat") || titleLower.includes("professor") || titleLower.includes("pedagogy") || titleLower.includes("school") || textLower.includes("curriculum") || textLower.includes("classroom")) {
    industry = isArabic ? "التعليم والتدريس" : "Education & Instruction";
    if (jobTitle === "Professional Specialist" || jobTitle === "أخصائي مهني") {
      jobTitle = isArabic ? "مدرس تربوي" : "Educator";
    }
  } else if (titleLower.includes("software") || titleLower.includes("develop") || titleLower.includes("program") || titleLower.includes("code") || titleLower.includes("web") || titleLower.includes("tech") || textLower.includes("coding") || textLower.includes("frontend")) {
    industry = isArabic ? "هندسة البرمجيات وتقنية المعلومات" : "Software Engineering & IT";
    if (jobTitle === "Professional Specialist" || jobTitle === "أخصائي مهني") {
      jobTitle = isArabic ? "مهندس برمجيات" : "Software Engineer";
    }
  } else if (titleLower.includes("manager") || titleLower.includes("lead") || titleLower.includes("project") || titleLower.includes("director") || textLower.includes("operations") || textLower.includes("strategic planning")) {
    industry = isArabic ? "الإدارة والعمليات" : "Management & Operations";
    if (jobTitle === "Professional Specialist" || jobTitle === "أخصائي مهني") {
      jobTitle = isArabic ? "مدير مشاريع" : "Project Manager";
    }
  }

  // 3. Section-Based Custom Field Extraction
  let skills: string[] = [];
  let softSkills: string[] = [];
  let certifications: string[] = [];
  let languages: string[] = [];
  let education: string[] = [];
  let experience: string[] = [];

  let currentSection = "";
  const sectionHeaders: { [key: string]: string[] } = {
    skills: ["skills", "technical skills", "core competencies", "expertise", "key skills", "professional skills", "المهارات", "مهارات", "القدرات", "الخبرات التقنية", "المهارات الفنية"],
    soft: ["soft skills", "interpersonal skills", "المهارات الشخصية", "المهارات الناعمة", "مهارات التواصل"],
    certs: ["certifications", "licenses", "certificates", "courses", "الشهادات", "الشهادات المهنية", "الدورات والشهادات", "الدورات"],
    lang: ["languages", "language", "اللغات", "اللغة"],
    edu: ["education", "academic", "university", "degree", "التعليم", "الدراسة", "المؤهل", "المؤهلات", "التحصيل الدراسي"],
    exp: ["experience", "employment", "work history", "professional experience", "الخبرة", "الخبرات المهنية", "التاريخ المهني", "الوظائف", "الخبرة العملية"]
  };

  for (const line of lines) {
    const lineCleaned = line.replace(/[:\-\•\*\d]/g, "").trim().toLowerCase();
    
    let foundHeader = false;
    for (const [secKey, keywords] of Object.entries(sectionHeaders)) {
      if (keywords.some(kw => lineCleaned === kw || lineCleaned.startsWith(kw + " ") || lineCleaned.endsWith(" " + kw))) {
        currentSection = secKey;
        foundHeader = true;
        break;
      }
    }

    if (foundHeader) continue;

    if (currentSection && line.length > 2) {
      const cleanedLine = line.replace(/^[\s\-\•\*\d\.\,\|\/]+\s*/, "").trim();
      if (cleanedLine.length < 2) continue;

      if (currentSection === "skills") {
        if (cleanedLine.includes(",") || cleanedLine.includes("|") || cleanedLine.includes("•") || cleanedLine.includes(" - ")) {
          const splitSkills = cleanedLine.split(/[,|•\t]|\s-\s/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 35);
          skills.push(...splitSkills);
        } else if (cleanedLine.length < 35) {
          skills.push(cleanedLine);
        }
      } else if (currentSection === "soft") {
        if (cleanedLine.includes(",") || cleanedLine.includes("|")) {
          softSkills.push(...cleanedLine.split(/[,|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 30));
        } else if (cleanedLine.length < 30) {
          softSkills.push(cleanedLine);
        }
      } else if (currentSection === "certs") {
        if (cleanedLine.length < 60) certifications.push(cleanedLine);
      } else if (currentSection === "lang") {
        if (cleanedLine.includes(",") || cleanedLine.includes("|")) {
          languages.push(...cleanedLine.split(/[,|]/).map(s => s.trim()).filter(Boolean));
        } else if (cleanedLine.length < 30) {
          languages.push(cleanedLine);
        }
      } else if (currentSection === "edu") {
        if (cleanedLine.length < 80) education.push(cleanedLine);
      } else if (currentSection === "exp") {
        if (cleanedLine.length < 150) experience.push(cleanedLine);
      }
    }
  }

  skills = Array.from(new Set(skills)).filter(Boolean);
  softSkills = Array.from(new Set(softSkills)).filter(Boolean);
  certifications = Array.from(new Set(certifications)).filter(Boolean);
  languages = Array.from(new Set(languages)).filter(Boolean);
  education = Array.from(new Set(education)).filter(Boolean);
  experience = Array.from(new Set(experience)).filter(Boolean);

  if (skills.length === 0) {
    const words = cvText.match(/[A-Z][a-zA-Z0-9\#\+]{2,}(?:\s+[A-Z][a-zA-Z0-9\#\+]{2,})*/g) || [];
    const stopWords = ["the", "and", "for", "with", "from", "this", "that", "your", "resume", "summary", "education", "experience", "skills", "english", "arabic", "phone", "email", "date", "gpa", "bachelor", "master", "science", "university", "college", "school", "present", "curriculum", "vitae", "contact", "profile", "hobbies", "interests"];
    const candidateSkills = words.filter(w => {
      const wL = w.toLowerCase();
      return w.length > 3 && w.length < 30 && !stopWords.includes(wL) && !wL.includes("@") && !wL.includes("http");
    });
    skills = Array.from(new Set(candidateSkills)).slice(0, 8);
  }

  if (softSkills.length === 0) {
    softSkills = isArabic 
      ? ["التواصل الفعال", "حل المشكلات", "العمل الجماعي", "إدارة الوقت", "المرونة والقدرة على التكيف"]
      : ["Effective Communication", "Problem Solving", "Teamwork", "Time Management", "Adaptability"];
  }

  if (languages.length === 0) {
    const hasArabic = /[\u0600-\u06FF]/.test(cvText);
    const hasEnglish = /[a-zA-Z]/.test(cvText);
    if (hasArabic) languages.push(isArabic ? "اللغة العربية" : "Arabic");
    if (hasEnglish) languages.push(isArabic ? "اللغة الإنجليزية" : "English");
  }

  return {
    jobTitle,
    industry,
    skills,
    softSkills,
    certifications,
    languages,
    education,
    experience
  };
}

function generateMockATSScore(cvText: string): number {
  const wordCount = cvText.split(/\s+/).filter(Boolean).length;
  let score = 55;

  if (wordCount > 150) score += 10;
  if (wordCount > 350) score += 10;
  if (cvText.includes("@") || cvText.toLowerCase().includes("email")) score += 5;
  if (cvText.match(/\b\d{3,4}\b/)) score += 5;
  if (cvText.toLowerCase().includes("education") || cvText.toLowerCase().includes("التعليم")) score += 5;
  if (cvText.toLowerCase().includes("experience") || cvText.toLowerCase().includes("الخبرة")) score += 5;
  if (cvText.toLowerCase().includes("skills") || cvText.toLowerCase().includes("المهارات")) score += 5;

  return Math.min(score, 94);
}

function getMockAnalysis(cvText: string, lang: 'en' | 'ar' = 'en') {
  const parsed = parseResumeTextDynamically(cvText);
  const score = generateMockATSScore(cvText);
  const wordCount = cvText.split(/\s+/).filter(Boolean).length;

  const title = parsed.jobTitle;
  const industry = parsed.industry;
  const skillsFound = parsed.skills;
  
  let recommendedSkills: string[] = [];
  if (industry.includes("Agriculture") || industry.includes("الزراعة")) {
    recommendedSkills = lang === 'ar'
      ? ["الري بالتنقيط", "إدارة الصوبات", "تصميم شبكات الري", "التخطيط الزراعي", "التحليل الميداني"]
      : ["Drip Irrigation", "Greenhouse Control", "Irrigation Network Design", "Agricultural Planning", "Field Analysis"];
  } else if (industry.includes("Accounting") || industry.includes("المحاسبة")) {
    recommendedSkills = lang === 'ar'
      ? ["إدارة الميزانية", "المعايير الدولية IFRS", "إعداد الإقرارات الضريبية", "التدقيق المالي", "التسوية المحاسبية"]
      : ["Budget Administration", "IFRS Standards", "Tax Declaration", "Financial Auditing", "Account Reconciliation"];
  } else if (industry.includes("Healthcare") || industry.includes("الرعاية")) {
    recommendedSkills = lang === 'ar'
      ? ["التشخيص الطبي السريري", "رعاية المرضى", "طب الطوارئ", "البروتوكولات الطبية", "مكافحة العدوى"]
      : ["Clinical Medical Diagnosis", "Patient Care", "Emergency Medicine", "Medical Protocols", "Infection Control"];
  } else if (industry.includes("Education") || industry.includes("التعليم")) {
    recommendedSkills = lang === 'ar'
      ? ["تطوير المناهج", "التخطيط الدراسي", "إدارة الفصل", "أساليب التدريس الحديثة", "التعليم المتمايز"]
      : ["Curriculum Development", "Lesson Planning", "Classroom Management", "Modern Pedagogy", "Differentiated Instruction"];
  } else if (industry.includes("Software") || industry.includes("البرمجيات")) {
    recommendedSkills = lang === 'ar'
      ? ["بنية الأنظمة", "هندسة البرمجيات", "تصميم واجهات البرمجة", "نظام النشر المستمر", "إدارة قواعد البيانات"]
      : ["System Architecture", "Software Engineering", "API Design", "CI/CD Pipelines", "Database Administration"];
  } else {
    recommendedSkills = lang === 'ar'
      ? ["إدارة المشاريع", "التفكير الاستراتيجي", "القيادة والاتصال", "تطوير العمليات", "إدارة المخاطر"]
      : ["Project Management", "Strategic Thinking", "Leadership & Communication", "Process Development", "Risk Management"];
  }

  const finalSkillsFound = skillsFound.length > 0
    ? skillsFound
    : (lang === 'ar' ? ["التواصل الفعال", "حل المشكلات", "التطوير الذاتي"] : ["Effective Communication", "Problem Solving", "Adaptability"]);

  const finalRecs = recommendedSkills.slice(0, 5);

  const verbCount = Math.max(
    [
      "spearheaded", "designed", "conducted", "managed", "formulated", "implemented", "architected", "directed", "optimized", "pioneered", "established", "executed", "collaborated", "instructed", "developed", "analyzed", "reconciled",
      "قدت", "صممت", "أجريت", "أدرت", "طورت", "نفذت", "حسنت", "أسست", "نسقت", "حللت", "درست", "وجهت"
    ].filter(v => cvText.toLowerCase().includes(v)).length,
    Math.round(wordCount / 50) + 2
  );

  if (lang === 'ar') {
    const summaryText = `تم الكشف تلقائياً عن السيرة الذاتية لـ [${title}] في قطاع [${industry}]. البنية التحتية للنص جيدة بـ ${wordCount} كلمة، غير أن هناك فرصة ممتازة لتعزيز توافقها مع فلاتر ATS المتقدمة للمؤسسات الكبرى عبر إدراج الكلمات المفتاحية التخصصية الموصى بها لمهنتك الحالية.`;
    const mockStrengths = [
      `تحديد المسمى الوظيفي والتوجه المهني بوضوح كـ [${title}].`,
      finalSkillsFound.length > 0 ? `تضمين رائع ومباشر لبعض مهاراتك الأساسية مثل: ${finalSkillsFound.slice(0, 3).join("، ")}.` : "يوجد تحديد كاف للمسؤوليات اليومية والخبرة العملية.",
      "خلو السيرة الذاتية من أي تعقيدات برمجية أو رسومات قد تعيق القراءة الآلية لنظام الـ ATS."
    ];
    const mockWeaknesses = [
      "نقص في الإنجازات والأرقام القابلة للقياس الكمي (مثل تحسين الكفاءة أو توفير الوقت والموارد المادية).",
      "تكرار الصياغات الوصفية السلبية والواجبات الروتينية بدلاً من أفعال الحركة القوية المبنية على النتائج.",
      "الحاجة إلى دمج الكلمات المفتاحية التخصصية للمهنة لرفع فرصة التصنيف العالي بنسبة أعلى."
    ];
    const mockFormattingTips = [
      "حافظ على نقاط تعداد نقطي (Bullet points) موجزة ومباشرة، لا تتجاوز سطرين لكل منها.",
      "تجنب التصاميم المزدوجة ثنائية الأعمدة أو الجداول غير المرئية لحماية البيانات من التداخل أثناء الفحص.",
      "التزم بصيغة تاريخ موحدة للتسلسل الزمني للخبرات العملية."
    ];

    return {
      // New requested schema keys
      overallScore: Math.round(score * 0.96),
      atsScore: score,
      formattingScore: Math.min(score + 4, 94),
      contentScore: Math.max(score - 3, 50),
      summary: summaryText,
      sections: [
        {
          name: "التوافق مع نظام ATS",
          score: score,
          strengths: [mockStrengths[0], mockStrengths[2]],
          weaknesses: [mockWeaknesses[2]],
          priority: "High"
        },
        {
          name: "بنية وتنظيم السيرة الذاتية",
          score: Math.min(score + 4, 96),
          strengths: ["التقسيم والتنظيم الهيكلي واضح ومنظم بشكل يسهل القراءة"],
          weaknesses: [],
          priority: "Low"
        },
        {
          name: "الخبرة المهنية",
          score: Math.max(score - 5, 50),
          strengths: ["التسلسل الزمني للوظائف واضح ومنطقي"],
          weaknesses: [mockWeaknesses[0], mockWeaknesses[1]],
          priority: "High"
        }
      ],
      topImprovements: [
        "إدراج أرقام وإنجازات كمية قابلة للقياس بدلاً من سرد المسؤوليات الوظيفية الروتينية فقط.",
        "تضمين الكلمات المفتاحية التخصصية الموصى بها في مجالك الفني والتقني.",
        "تحسين صياغة الملخص المهني ليركز على القيمة المضافة والإنجازات القوية.",
        "استخدام أفعال حركة قوية ومباشرة لوصف المهام السابقة.",
        "توحيد صيغ وصياغات التواريخ في فترات العمل لتسهيل الفحص الآلي."
      ],
      criticalIssues: [
        "نقص شديد في الأرقام، النسب المئوية، ومؤشرات الأداء الرئيسية (KPIs)."
      ],
      missingSections: ["المشاريع العملية والشخصية", "الشهادات والاعتمادات المهنية والاحترافية"],
      keywordSuggestions: finalRecs,
      estimatedInterviewChance: score >= 80 ? "مرتفعة (70-85%)" : score >= 65 ? "متوسطة (45-65%)" : "منخفضة (15-35%)",
      finalVerdict: "سيرة ذاتية واعدة ومصممة بشكل جيد كلاسيكياً، ولكنها تحتاج لتعزيز الصياغة بلغة الإنجاز والأرقام لتنافس بقوة في سوق العمل المزدحم.",

      // Legacy fields for backward compatibility
      strengths: mockStrengths,
      weaknesses: mockWeaknesses,
      formattingTips: mockFormattingTips,
      actionVerbCount: verbCount,
      skillsFound: finalSkillsFound,
      recommendedSkills: finalRecs
    };
  }

  const summaryText = `Automatically detected profile for [${title}] in the [${industry}] sector. Your resume demonstrates a strong text foundation with ${wordCount} words, but there is an outstanding opportunity to maximize ATS filter compliance by integrating the industry-specific target keywords suggested for your actual profession.`;
  const mockStrengths = [
    `A clear and strong professional heading as [${title}].`,
    finalSkillsFound.length > 0 ? `Direct representation of your key professional competencies: ${finalSkillsFound.slice(0, 3).join(", ")}.` : "Logical hierarchy and clean breakdown of professional activities.",
    "No parsing blockages like active text boxes or hidden graphics that disrupt modern ATS parsers."
  ];
  const mockWeaknesses = [
    "Lack of quantified milestones and business metrics (e.g., efficiency boosts, revenue saved, or team sizes).",
    "Repetitive usage of passive duty descriptions rather than high-impact, outcome-oriented accomplishments.",
    "Under-optimized keyword density for target industry specifications."
  ];
  const mockFormattingTips = [
    "Ensure bullet points are kept to a maximum of 2 lines to maintain reader and machine attention spans.",
    "Avoid multi-column tables, text boxes, or custom icons, which older ATS parsers frequently misalign.",
    "Enforce a strict chronological dates format (e.g., 'Oct 2023 - Present' or '2023 - 2025')."
  ];

  return {
    // New requested schema keys
    overallScore: Math.round(score * 0.96),
    atsScore: score,
    formattingScore: Math.min(score + 4, 94),
    contentScore: Math.max(score - 3, 50),
    summary: summaryText,
    sections: [
      {
        name: "ATS Compatibility",
        score: score,
        strengths: [mockStrengths[0], mockStrengths[2]],
        weaknesses: [mockWeaknesses[2]],
        priority: "High"
      },
      {
        name: "Resume Structure",
        score: Math.min(score + 4, 96),
        strengths: ["Clean and logical layout that maps cleanly in scanner tools"],
        weaknesses: [],
        priority: "Low"
      },
      {
        name: "Work Experience",
        score: Math.max(score - 5, 50),
        strengths: ["Clear breakdown of role chronological timelines"],
        weaknesses: [mockWeaknesses[0], mockWeaknesses[1]],
        priority: "High"
      }
    ],
    topImprovements: [
      "Add quantified achievements and key performance indicators to past positions.",
      "Integrate requested high-value industry terms in your functional sections.",
      "Rewrite your executive summary to highlight your specific business contributions.",
      "Use dynamic action verbs to lead your bullet points.",
      "Standardize your chronological timeline and dates format."
    ],
    criticalIssues: [
      "Lack of metrics, business percentages, and direct work outcome figures."
    ],
    missingSections: ["Projects", "Certifications & Professional Credentials"],
    keywordSuggestions: finalRecs,
    estimatedInterviewChance: score >= 80 ? "High (70-85%)" : score >= 65 ? "Medium (45-65%)" : "Low (15-35%)",
    finalVerdict: "A promising and classically well-designed resume, but needs translation into an achievement-oriented layout to stand out in a competitive talent market.",

    // Legacy fields for backward compatibility
    strengths: mockStrengths,
    weaknesses: mockWeaknesses,
    formattingTips: mockFormattingTips,
    actionVerbCount: verbCount,
    skillsFound: finalSkillsFound,
    recommendedSkills: finalRecs
  };
}

function getMockImprovements(cvText: string, lang: 'en' | 'ar' = 'en') {
  const parsed = parseResumeTextDynamically(cvText);
  const title = parsed.jobTitle;

  if (lang === 'ar') {
    return [
      {
        section: "الملخص المهني",
        originalText: `أنا متخصص كـ ${title} أبحث عن فرصة عمل ممتازة لتطوير مهاراتي ومسيرتي المهنية.`,
        improvedText: `أخصائي مهني متمرس كـ ${title} يتميز بسجل حافل في زيادة الكفاءة التشغيلية بنسبة 20٪ وتحسين جودة تسليم المشاريع. متخصص في تخطيط الاستراتيجيات وتطوير المخرجات بكفاءة عالية.`,
        explanation: "يستبدل العبارات الضعيفة بوصف مهني غني بالخبرة والقدرات الفنية مع إظهار أرقام واضحة تدل على التميز."
      },
      {
        section: "الخبرات المهنية",
        originalText: "كنت مسؤولاً عن المهام اليومية ومتابعة الأعمال والتنسيق مع بقية الفريق.",
        improvedText: "قدت عمليات تنسيق متكاملة وإدارة المهام اليومية مع فريق مكوّن من 10 موظفين، مما ساهم في تقليل الأخطاء الإدارية بنسبة 15٪ وتوفير الوقت والموارد.",
        explanation: "يصوغ المسؤوليات الروتينية باستخدام أفعال حركة قوية ويحدد حجم الفريق ونسبة الكفاءة المكتسبة."
      },
      {
        section: "الإنجازات والمشاريع",
        originalText: "ساعدت في إطلاق وتنفيذ المشاريع والأدوات الجديدة للمؤسسة.",
        improvedText: "ساهمت في هندسة وإدخال نظام عمل مؤتمت بالكامل، مما قلل وقت دورات العمل بمقدار 4 أيام شهرياً ووفر 15 ساعة عمل أسبوعية للفريق.",
        explanation: "يوضح روح المبادرة، وتحسين الكفاءة، ويوفر أدلة رقمية واضحة تدعم جدارة المترشح للوظيفة."
      }
    ];
  }

  return [
    {
      section: "Professional Summary",
      originalText: `I am an experienced ${title} looking for a great opportunity to grow my career.`,
      improvedText: `Result-driven and certified ${title} with a proven track record of optimizing workflow efficiency by 22% and improving project delivery quality. Specialized in strategic planning and resource optimization.`,
      explanation: "Highlights quantifiable metrics and professional competencies instead of generic career goals."
    },
    {
      section: "Professional Experience",
      originalText: "Responsible for daily tasks, supporting operations, and coordinating with other teams.",
      improvedText: "Orchestrated daily operations and managed task delivery workflows for a 12-member team, decreasing administrative turnaround latency by 18%.",
      explanation: "Uses strong action verbs ('Orchestrated', 'Managed') and details the exact scale and outcome metrics."
    },
    {
      section: "Key Achievements",
      originalText: "Helped implement and launch new tools and processes for the team.",
      improvedText: "Pioneered the integration of automated reporting dashboards, reducing close-of-month cycles by 4 days and saving 15 manual labor hours per week.",
      explanation: "Demonstrates proactive process leadership and quantifies the exact operational savings."
    }
  ];
}

function getMockCoverLetter(cvText: string, jobTitle: string, companyName: string, jobDesc: string, lang: 'en' | 'ar' = 'en') {
  const parsed = parseResumeTextDynamically(cvText);
  const company = companyName || (lang === 'ar' ? "الشركة الموقرة" : "the Company");
  const title = jobTitle || parsed.jobTitle;
  
  let candidateName = lang === 'ar' ? "مقدم الطلب" : "Applicant";
  if (cvText) {
    const lines = cvText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 35) {
      candidateName = lines[0];
    }
  }

  const skillsStr = parsed.skills.slice(0, 4).join(", ");
  const skillsStrAr = parsed.skills.slice(0, 4).join("، ");

  let paragraphEn = `With a robust background as a ${parsed.jobTitle} in the ${parsed.industry} sector, I have developed strong competencies in ${skillsStr || "professional workflows"}. In my previous roles, I have applied these skills to drive sustainable resource optimization and deliver high-impact results.`;
  let paragraphAr = `مع خلفية مهنية متينة كـ ${parsed.jobTitle} في قطاع ${parsed.industry}، قمت بتطوير مهارات قوية وممتازة في ${skillsStrAr || "مجالات العمل التخصصية"}. في مهامي السابقة، نجحت في تطبيق هذه القدرات لتحقيق الكفاءة التشغيلية المرجوة وتحقيق أثر إيجابي ملموس للمؤسسة.`;

  if (lang === 'ar') {
    return `التاريخ: ${new Date().toLocaleDateString('ar-EG')}
    
عناية مدير التوظيف الموقر،
شركة ${company}

الموضوع: طلب تقدم لوظيفة ${title}

أكتب إليكم للتعبير عن اهتمامي الشديد بالانضمام إلى فريقكم المتميز لشغل وظيفة ${title}. بعد مراجعتي لمتطلبات الوصف الوظيفي وخلفيتي المهنية، أنا واثق تمامًا من أن مهاراتي وخبراتي تتطابق تمامًا مع متطلبات هذا الدور الوظيفي.

${paragraphAr}

أثار إعجابي بشكل خاص تركيز شركة ${company} على الريادة والتميز، وأود بشدة أن أكون جزءًا من مسيرة نجاحكم. أرفق طيه سيرتي الذاتية لمراجعتكم، وأرحب بفرصة إجراء مقابلة شخصية لمناقشة كيف يمكن لخلفيتي المهنية أن تدعم أهدافكم الطموحة.

نشكركم جزيل الشكر على وقتكم واهتمامكم.

تفضلوا بقبول فائق الاحترام والتقدير،

${candidateName}`;
  }

  return `Date: ${new Date().toLocaleDateString('en-US')}

Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${title} position currently open at ${company}. With a proven track record of driving impactful results and a deep background in key areas outlined in your job specifications, I am highly confident in my ability to make an immediate, positive contribution to your team.

${paragraphEn}

What excites me most about joining ${company} is your reputation for innovation and commitment to industry leadership. I would love the opportunity to leverage my passion and expertise to support your next phase of growth.

Thank you very much for your time and consideration of my candidacy. I have enclosed my resume for your review and look forward to the possibility of discussing how my experience fits your requirements.

Warm regards,

${candidateName}`;
}

function getMockInterviewQuestions(cvText: string, jobTitle: string, lang: 'en' | 'ar' = 'en'): any[] {
  const parsed = parseResumeTextDynamically(cvText);
  const title = jobTitle || parsed.jobTitle;

  if (lang === 'ar') {
    return [
      {
        id: "q-dyn-1",
        question: `بصفتك ${title}، كيف تقوم بإدارة المشاريع أو المهام وتجاوز العقبات غير المتوقعة لضمان التسليم الناجح؟`,
        idealFocus: `ناقش التخطيط الاستراتيجي، توزيع الموارد المتاحة، والتعامل المرن مع المشاكل الطارئة باستخدام أدلة ملموسة.`
      },
      {
        id: "q-dyn-2",
        question: `صف موقفاً واجهت فيه تحدياً تقنياً أو تنظيمياً كبيراً في قطاع ${parsed.industry}. كيف تعاملت معه وما هي النتائج؟`,
        idealFocus: `تحدث عن عملية التشخيص وتحديد جذور المشكلة، والحلول المبتكرة المطبقة، والأثر الرقمي أو العملي لنجاح حلك.`
      },
      {
        id: "q-dyn-3",
        question: `كيف تحافظ على معايير الجودة العالية والامتثال المهني تحت ضغط مواعيد التسليم النهائية؟`,
        idealFocus: `ركز على التدقيق والتحقق المستمر، وترتيب الأولويات، والتنسيق والتعاون الفعال مع زملائك وفريق العمل.`
      }
    ];
  }

  return [
    {
      id: "q-dyn-1",
      question: `As a ${title}, how do you manage complex tasks and overcome unexpected bottlenecks to ensure successful project delivery?`,
      idealFocus: `Discuss strategic planning, resource allocation, and flexible problem-solving with concrete examples.`
    },
    {
      id: "q-dyn-2",
      question: `Describe a scenario where you faced a significant technical or operational challenge in the ${parsed.industry} field. How did you resolve it?`,
      idealFocus: `Explain your diagnostic steps, the innovative solutions you implemented, and the quantifiable positive outcomes.`
    },
    {
      id: "q-dyn-3",
      question: `How do you ensure rigorous quality standards and compliance with professional practices under tight project deadlines?`,
      idealFocus: `Focus on systematic double-checking, prioritization models, and seamless collaboration with key stakeholders.`
    }
  ];
}

function getMockAnswerFeedback(question: string, answer: string, lang: 'en' | 'ar' = 'en') {
  const words = answer.split(/\s+/).filter(Boolean).length;
  let score = 50;
  
  if (words > 10) score += 15;
  if (words > 25) score += 15;
  if (answer.toLowerCase().includes("result") || answer.toLowerCase().includes("achieve") || answer.toLowerCase().includes("نجاح") || answer.toLowerCase().includes("نتيجة") || answer.toLowerCase().includes("هدف")) score += 10;
  if (answer.toLowerCase().includes("team") || answer.toLowerCase().includes("collaborate") || answer.toLowerCase().includes("فريق") || answer.toLowerCase().includes("تعاون") || answer.toLowerCase().includes("زملاء")) score += 5;
  
  score = Math.min(score, 95);

  if (lang === 'ar') {
    return {
      score,
      positives: "إجابة منظمة ومصاغة بشكل مهني، لقد أظهرت مهارة عالية في التعبير واستخدمت مفردات تخصصية واضحة تدل على خبرتك الميدانية.",
      improvements: words < 20 
        ? "إجابتك مختصرة بعض الشيء. توسع بالحديث مستخدماً منهجية STAR (الموقف، المهمة، الإجراء، النتيجة) لتأكيد جدارتك المهنية."
        : "يمكنك تحسين الإجابة أكثر من خلال ربطها بنسبة نجاح مئوية أو رقم إيرادات ملموس يعكس مدى فائدة عملك.",
      suggestedAnswer: "في وظيفتي السابقة كـ [المسمى]، واجهنا تحدي [الموقف]، وكانت مهمتي المحددة هي [المهمة]. قمت فوراً بوضع وتنفيذ [الإجراءات والأدوات]، مما أدى إلى [النتيجة الإيجابية، على سبيل المثال: رفع الكفاءة بنسبة 20٪ وتخفيض الأخطاء]."
    };
  }

  return {
    score,
    positives: "You demonstrated solid industry-specific vocabulary and directly addressed the core question. Clear description of actions taken.",
    improvements: words < 20
      ? "Your response is slightly brief. Expand by detailing a specific project, the challenges encountered, and the exact steps you took."
      : "Incorporate more quantitative data (percentages, revenue, time saved) to make your achievements truly undeniable.",
    suggestedAnswer: "In my previous role, we faced a challenge where [Describe Challenge]. My responsibility was to [Describe Task]. I immediately initiated [Detail specific Actions], which ultimately led to [Describe quantifiable Result, e.g., saving 15 hours per week of manual labor]."
  };
}

function getMockJobMatch(cvText: string, jobDesc: string, lang: 'en' | 'ar' = 'en') {
  const parsed = parseResumeTextDynamically(cvText);
  const textLower = cvText.toLowerCase();
  const descLower = jobDesc.toLowerCase();

  const stopWords = new Set(["the", "and", "for", "with", "from", "this", "that", "your", "resume", "summary", "education", "experience", "skills", "english", "arabic", "phone", "email", "date", "gpa", "bachelor", "master", "science", "university", "college", "school", "present", "we", "are", "looking", "role", "position", "candidate", "company", "team", "work", "join", "our", "must", "have", "requirements", "responsibilities"]);
  
  const matches1 = jobDesc.match(/[A-Z][a-zA-Z0-9\#\+]{2,}(?:\s+[A-Z][a-zA-Z0-9\#\+]{2,})*/g) || [];
  const matches2 = jobDesc.match(/[a-zA-Z0-9\#\+]{4,}/g) || [];
  const potentialKeywords = Array.from(new Set(
    (matches1 as string[]).concat(matches2 as string[])
    .map(w => w.trim())
    .filter(w => w.length > 2 && w.length < 30 && !stopWords.has(w.toLowerCase()) && !/^\d+$/.test(w))
  ));

  const cvSkills = parsed.skills;
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of cvSkills) {
    if (descLower.includes(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const maxKeywordsToCheck = potentialKeywords.slice(0, 15);
  for (const kw of maxKeywordsToCheck) {
    if (textLower.includes(kw.toLowerCase())) {
      if (!matched.some(m => m.toLowerCase() === kw.toLowerCase())) {
        matched.push(kw);
      }
    } else {
      if (!missing.some(m => m.toLowerCase() === kw.toLowerCase()) && !matched.some(m => m.toLowerCase() === kw.toLowerCase())) {
        missing.push(kw);
      }
    }
  }

  const finalMatched = Array.from(new Set(matched)).slice(0, 8);
  const finalMissing = Array.from(new Set(missing)).slice(0, 8);

  const matchedCount = finalMatched.length;
  const totalCount = matchedCount + finalMissing.length;
  
  let score = 55;
  if (totalCount > 0) {
    score = Math.round(50 + (matchedCount / totalCount) * 45);
  }
  score = Math.min(Math.max(score, 45), 98);

  if (lang === 'ar') {
    return {
      matchScore: score,
      matchingKeywords: finalMatched.length > 0 ? finalMatched : ["العمل الجماعي", "مهارات التواصل"],
      missingKeywords: finalMissing.length > 0 ? finalMissing : ["إدارة المشاريع التخصصية", "التخطيط الاستراتيجي"],
      jobFitSummary: `تظهر سيرتك الذاتية توافقًا بنسبة ${score}٪ مع الوصف الوظيفي المقترح لمهنتك كـ ${parsed.jobTitle}. هناك نقاط تقاطع جيدة في المهارات الأساسية المستخرجة، ولكن يتطلب الأمر إبراز المصطلحات الفنية المفقودة لتبدو أكثر ملاءمة للمتطلبات الفريدة للمؤسسة.`,
      improvementSteps: [
        "أضف الكلمات والمهارات المفقودة المحددة أعلاه إلى قسم المهارات في سيرتك الذاتية إذا كنت تتقنها بالفعل.",
        "أعد صياغة الملخص المهني ليتضمن الكلمات الرئيسية الواردة في السطر الأول من الوصف الوظيفي لرفع نسبة تطابق الـ ATS.",
        "استخدم نفس العناوين والمصطلحات الدقيقة الواردة في متطلبات الوظيفة لوصف خبراتك السابقة."
      ]
    };
  }

  return {
    matchScore: score,
    matchingKeywords: finalMatched.length > 0 ? finalMatched : ["Teamwork", "Communication"],
    missingKeywords: finalMissing.length > 0 ? finalMissing : ["Strategic Planning", "Project Management"],
    jobFitSummary: `Your resume shows a ${score}% match with the provided job description for a ${parsed.jobTitle} position. You have robust alignment in key professional skills, but your past accomplishments could be tailored closer to the high-priority deliverables of this specific hiring team.`,
    improvementSteps: [
      "Explicitly weave the missing keywords into your skills section and professional summaries.",
      "Align your past job titles more closely with the terminology of this position (if historically accurate).",
      "Structure your topmost bullet points under your current role to reflect the top three duties listed in the job description."
    ]
  };
}

// ------------------------------------------------------------
// FULL-STACK API ROUTERS WITH EMBEDDED REAL AI OR SMART MOCK
// ------------------------------------------------------------

app.post("/api/resume/analyze", authenticateToken, async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { model, language } = req.body;
    const resume = db.getResume(req.user.id);

    if (!resume) {
      return res.status(400).json({ error: "Please upload your resume first." });
    }

    try {
      const prompt = `You are a world-class ATS Resume Analyzer, HR Director, and Senior Hiring Manager with 20+ years of recruitment experience.
Your goal is to provide an objective, resume-specific evaluation.
Never use fixed scoring.
Never use generic feedback.
Never reuse previous evaluations.
Every uploaded resume must be treated as completely new.

---

SCORING ENGINE
Calculate scores dynamically based on resume quality.
Start from 100.
Subtract points only for real issues.
Deduction Guide Examples:
* Missing phone: -5
* No measurable achievements: -8
* Poor formatting: -10
* Weak summary: -6
* No action verbs: -4
* Missing projects (when relevant): -5
* No certifications (only if valuable for the target field): -3
* Too many grammar issues: -10
* No keywords for ATS: -12
Never invent deductions.
Excellent resumes should score between 90–100.
Average resumes between 70–89.
Weak resumes below 70.
Never force scores into a specific range.

---

FEEDBACK RULES
Mention ONLY issues that actually exist.
Never recommend adding something already present.
Never say "Improve formatting" if formatting is already good.
Never recommend certifications if the role does not require them.
Never recommend projects for senior professionals unless missing is a real weakness.
Never rewrite the resume.
Keep responses concise.
Maximum 350 words total.

---

KEYWORD ANALYSIS
Extract important keywords already present.
Suggest at most 10 missing keywords.
Only suggest keywords relevant to the candidate's career.

---

ACTION PLAN
Generate exactly five actions under "topImprovements".
Sort them by hiring impact.
Do not include low-value advice.

---

INTERVIEW CHANCE
Estimate interview probability using resume quality, ATS compatibility, experience quality, skills relevance, achievements, formatting, grammar, and keyword optimization.
Return only one of these exact values under "estimatedInterviewChance":
* Very Low
* Low
* Moderate
* High
* Very High

---

OUTPUT FORMAT
Return VALID JSON ONLY. Do not include markdown formatting or code block fences (do not wrap in \`\`\`json).
Never explain your reasoning.
Respond strictly with this JSON schema:
{
"overallScore": 0,
"atsScore": 0,
"formattingScore": 0,
"contentScore": 0,
"summary": "",
"strengths": [],
"criticalIssues": [],
"missingSections": [],
"keywordSuggestions": [],
"topImprovements": [],
"estimatedInterviewChance": "Very Low | Low | Moderate | High | Very High",
"finalVerdict": "",
"sections": [
{
"name": "",
"score": 0,
"strengths": [],
"weaknesses": [],
"priority": "High | Medium | Low"
}
]
}

Resume Text to Evaluate:
${resume.rawText}

Language: Please output the evaluation in ${language === 'ar' ? 'Arabic' : 'English'}.
Note: The "sections" list should cover the most relevant 3-7 categories based on evaluation criteria. Make sure all texts are natural and helpful in the requested language.`;

      const aiResponse = await callOpenAICompatibleWithRetryAndFallback(prompt, model, "You are an expert ATS Resume Reviewer and Senior Technical Recruiter. Respond strictly with a JSON object.", req.bynaraApiKey);
      
      try {
        const parsed = extractJSON(aiResponse);
        
        // Enrich parsed object with legacy properties for seamless backward-compatibility
        const legacyStrengths = parsed.strengths || (parsed.sections ? parsed.sections.flatMap((s: any) => s.strengths || []) : []).slice(0, 3);
        const legacyWeaknesses = parsed.weaknesses || (parsed.sections ? parsed.sections.flatMap((s: any) => s.weaknesses || []) : []).slice(0, 3);
        const legacyFormatting = parsed.formattingTips || parsed.topImprovements || [];
        const legacySkills = parsed.skillsFound || parsed.keywordSuggestions || [];
        
        const enriched = {
          ...parsed,
          atsScore: parsed.atsScore || parsed.overallScore || 70,
          summary: parsed.summary || "",
          strengths: legacyStrengths.length > 0 ? legacyStrengths : ["Strong text formatting structure"],
          weaknesses: legacyWeaknesses.length > 0 ? legacyWeaknesses : ["Needs more quantifiable achievements and metrics"],
          formattingTips: legacyFormatting.length > 0 ? legacyFormatting : ["Keep bullets clean and short"],
          actionVerbCount: parsed.actionVerbCount || 12,
          skillsFound: legacySkills,
          recommendedSkills: parsed.keywordSuggestions || legacySkills
        };

        return res.json(enriched);
      } catch (jsonErr: any) {
        console.error("[JSON Parsing Failure] Raw response was:", aiResponse);
        console.error("[JSON Parsing Failure] Error detail:", jsonErr.message);
        return res.json(getMockAnalysis(resume.rawText, language));
      }
    } catch (err: any) {
      console.error("[Analyze AI Error] Failed during live AI call:", err.message);
      return res.json(getMockAnalysis(resume.rawText, language));
    }
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze resume" });
  }
});

app.post("/api/resume/improve", authenticateToken, async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { model, language } = req.body;
    const resume = db.getResume(req.user.id);

    if (!resume) {
      return res.status(400).json({ error: "Please upload your resume first." });
    }

    try {
      const prompt = `Analyze this resume and provide exactly 3 line-by-line / statement-by-statement smart improvements.
      Format your response strictly as a JSON array of objects:
      [
        {
          "section": "Professional Summary or Experience or Skills",
          "originalText": "original passive sentence",
          "improvedText": "enhanced active metrics-driven sentence",
          "explanation": "why this rewrite is stronger"
        }
      ]
      Resume Text:
      ${resume.rawText}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}`;

      const aiResponse = await callOpenAICompatibleWithRetryAndFallback(prompt, model, "You are an expert CV writer. Respond strictly with a JSON array.", req.bynaraApiKey);
      
      try {
        const parsed = extractJSON(aiResponse);
        return res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[JSON Parsing Failure] Raw response was:", aiResponse);
        console.error("[JSON Parsing Failure] Error detail:", jsonErr.message);
        return res.json(getMockImprovements(resume.rawText, language));
      }
    } catch (err: any) {
      console.error("[Improve AI Error] Failed during live AI call:", err.message);
      return res.json(getMockImprovements(resume.rawText, language));
    }
  } catch (error: any) {
    console.error("Improvement Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate improvements" });
  }
});

app.post("/api/resume/cover-letter", authenticateToken, async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { jobTitle, companyName, jobDescription, model, language } = req.body;
    const resume = db.getResume(req.user.id);

    if (!resume) {
      return res.status(400).json({ error: "Please upload your resume first." });
    }

    try {
      const prompt = `Generate a highly customized and persuasive professional cover letter matching the candidate's resume to this job.
      Candidate Resume:
      ${resume.rawText}
      
      Target Job Title: ${jobTitle}
      Target Company: ${companyName}
      Job Description:
      ${jobDescription}
      
      Language: ${language === 'ar' ? 'Arabic' : 'English'}`;

      const letterText = await callOpenAICompatibleWithRetryAndFallback(prompt, model, "You are an elite career coach. Write a beautifully crafted, formal cover letter.", req.bynaraApiKey);
      return res.json({ letterText });
    } catch (err: any) {
      console.error("[Cover Letter AI Error] Failed during live AI call:", err.message);
      return res.json({ letterText: getMockCoverLetter(resume.rawText, jobTitle, companyName, jobDescription, language) });
    }
  } catch (error: any) {
    console.error("Cover Letter Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate cover letter" });
  }
});

app.post("/api/resume/interview/start", authenticateToken, async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { jobTitle, model, language } = req.body;
    const resume = db.getResume(req.user.id);

    if (!resume) {
      return res.status(400).json({ error: "Please upload your resume first." });
    }

    try {
      const prompt = `Generate exactly 3 specific, tough, yet realistic interview questions based on the candidate's resume and their target job title: ${jobTitle}.
      Format your response strictly as a JSON array of objects:
      [
        {
          "id": "unique-id-string",
          "question": "question text",
          "idealFocus": "what the candidate should focus on in their answer"
        }
      ]
      Candidate Resume:
      ${resume.rawText}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}`;

      const aiResponse = await callOpenAICompatibleWithRetryAndFallback(prompt, model, "You are a senior hiring manager. Respond strictly with JSON.", req.bynaraApiKey);
      
      try {
        const parsed = extractJSON(aiResponse);
        return res.json({ questions: parsed });
      } catch (jsonErr: any) {
        console.error("[JSON Parsing Failure] Raw response was:", aiResponse);
        console.error("[JSON Parsing Failure] Error detail:", jsonErr.message);
        return res.json({ questions: getMockInterviewQuestions(resume.rawText, jobTitle, language) });
      }
    } catch (err: any) {
      console.error("[Interview Start AI Error] Failed during live AI call:", err.message);
      return res.json({ questions: getMockInterviewQuestions(resume.rawText, jobTitle, language) });
    }
  } catch (error: any) {
    console.error("Interview Start Error:", error);
    res.status(500).json({ error: error.message || "Failed to start interview" });
  }
});

app.post("/api/resume/interview/evaluate", authenticateToken, async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { question, userAnswer, model, language } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: "Question and answer are required." });
    }

    try {
      const prompt = `Evaluate the candidate's response to the interview question below. Provide a score (0-100), key strengths in their answer, areas for improvement, and a highly polished suggested response.
      Question: ${question}
      Candidate's Answer: ${userAnswer}
      
      Format your response strictly as a JSON object:
      {
        "score": number,
        "positives": "specific positive points",
        "improvements": "specific structural or content recommendations",
        "suggestedAnswer": "an ideal model answer"
      }
      Language: ${language === 'ar' ? 'Arabic' : 'English'}`;

      const aiResponse = await callOpenAICompatibleWithRetryAndFallback(prompt, model, "You are an expert interview coach. Respond strictly with JSON.", req.bynaraApiKey);
      
      try {
        const parsed = extractJSON(aiResponse);
        return res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[JSON Parsing Failure] Raw response was:", aiResponse);
        console.error("[JSON Parsing Failure] Error detail:", jsonErr.message);
        return res.json(getMockAnswerFeedback(question, userAnswer, language));
      }
    } catch (err: any) {
      console.error("[Interview Evaluate AI Error] Failed during live AI call:", err.message);
      return res.json(getMockAnswerFeedback(question, userAnswer, language));
    }
  } catch (error: any) {
    console.error("Evaluation Error:", error);
    res.status(500).json({ error: error.message || "Failed to evaluate answer" });
  }
});

app.post("/api/resume/job-match", authenticateToken, async (req: CustomRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { jobDescription, model, language } = req.body;
    const resume = db.getResume(req.user.id);

    if (!resume) {
      return res.status(400).json({ error: "Please upload your resume first." });
    }

    try {
      const prompt = `Perform a deep match analysis comparing this resume directly to the target job description.
      Resume Text:
      ${resume.rawText}
      
      Job Description:
      ${jobDescription}
      
      Format your response strictly as a JSON object:
      {
        "matchScore": number (0-100),
        "matchingKeywords": ["keyword 1", "keyword 2"],
        "missingKeywords": ["keyword 1", "keyword 2"],
        "jobFitSummary": "detailed fit analysis of the candidate's alignment",
        "improvementSteps": ["step 1", "step 2"]
      }
      Language: ${language === 'ar' ? 'Arabic' : 'English'}`;

      const aiResponse = await callOpenAICompatibleWithRetryAndFallback(prompt, model, "You are an ATS parser expert. Respond strictly with JSON.", req.bynaraApiKey);
      
      try {
        const parsed = extractJSON(aiResponse);
        return res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[JSON Parsing Failure] Raw response was:", aiResponse);
        console.error("[JSON Parsing Failure] Error detail:", jsonErr.message);
        return res.json(getMockJobMatch(resume.rawText, jobDescription, language));
      }
    } catch (err: any) {
      console.error("[Job Match AI Error] Failed during live AI call:", err.message);
      return res.json(getMockJobMatch(resume.rawText, jobDescription, language));
    }
  } catch (error: any) {
    console.error("Job Match Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze job match" });
  }
});

// Endpoint to perform OCR on a single page base64 image
app.post("/api/ocr/page", authenticateToken, async (req: CustomRequest, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 content." });
    }

    const apiKey = req.bynaraApiKey || process.env.BYNARA_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "BYNARA_API_KEY is missing. OCR cannot be completed." });
    }

    // Call the reliable Bynara Vision API (mimo-v2.5-free) to perform OCR
    const response = await fetch("https://router.bynara.id/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-free",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Please perform OCR and extract all readable text from this document image exactly as written. Preserve the layout and reading order. Support both English and Arabic. Respond ONLY with the extracted text." 
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `OCR generation failed: ${errText}` });
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    // Check if the output has low confidence or is extremely short/empty
    const confidenceIsLow = !extractedText || extractedText.trim().length < 20;

    res.json({
      text: extractedText,
      confidenceIsLow
    });
  } catch (error: any) {
    console.error("OCR API error:", error);
    res.status(500).json({ error: error.message || "Failed to perform OCR" });
  }
});

// Catch-all for unmatched API routes to ensure they always return JSON instead of HTML/SPA fallbacks
app.all(/^\/api(\/.*)?$/, (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.baseUrl || req.path}` });
});

// Global Express Error Handler to catch synchronous/asynchronous errors and guarantee JSON responses
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Express Global Error Handler]", err);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected server error occurred."
  });
});

// Endpoint to test Bynara API key validity
app.post("/api/settings/test-key", async (req: any, res) => {
  try {
    const apiKey = req.headers["x-bynara-api-key"] || process.env.BYNARA_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing API key." });
    }
    
    const response = await fetch("https://router.bynara.id/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-free",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return res.json({ success: true });
    } else {
      const errText = await response.text();
      return res.status(400).json({ error: errText || "Invalid key" });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Configure Vite middleware and static routes
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Express + Vite server booted on port ${PORT}`);
  });
}

// Global Process Event Handlers to prevent server crashes and provide detailed logs
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection] Promise:", promise, "Reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception] Error details:", error.message, error.stack);
});

if (!process.env.VERCEL) {
  startServer();
}

export default app;
