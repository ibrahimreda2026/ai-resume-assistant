import fs from "fs";
import path from "path";

// Define the database path in a secure writable location (Vercel has read-only filesystem except /tmp)
const DB_PATH = process.env.VERCEL 
  ? path.join("/tmp", "enterprise-data.json")
  : path.join(process.cwd(), "enterprise-data.json");

// System Interfaces representing the enterprise SaaS database schema
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Profile {
  userId: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "Starter" | "Professional" | "Executive";
  status: "active" | "canceled" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface Credits {
  userId: string;
  limit: number;
  used: number;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed";
  gateway: "stripe" | "paypal" | "local";
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "credit_purchase" | "subscription_renewal" | "refund";
  description: string;
  amount: number;
  createdAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  rawText: string;
  uploadedAt: string;
  parsedResume?: any;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  userId: string;
  fileName: string;
  rawText: string;
  versionNumber: number;
  createdAt: string;
}

export interface AtsReport {
  id: string;
  userId: string;
  resumeId: string;
  score: number;
  reportJson: any;
  createdAt: string;
}

export interface JobMatch {
  id: string;
  userId: string;
  resumeId: string;
  targetJobTitle: string;
  companyName: string;
  matchScore: number;
  analysisJson: any;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  resumeId: string;
  targetJobTitle: string;
  questionsJson: any;
  answersJson: any; // History of Q&A with feedback
  averageScore: number;
  status: "started" | "completed";
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  ipAddress?: string;
  details: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  subscriptions: Subscription[];
  credits: Credits[];
  payments: Payment[];
  transactions: Transaction[];
  resumes: Resume[];
  resumeVersions: ResumeVersion[];
  atsReports: AtsReport[];
  jobMatches: JobMatch[];
  interviewSessions: InterviewSession[];
  auditLogs: AuditLog[];
}

// Initial seed data for demo environment
const INITIAL_DATABASE: DatabaseSchema = {
  users: [
    {
      id: "demo-user-id",
      name: "John Doe",
      email: "demo@cvify.ai",
      // BCrypt hash of "password123"
      passwordHash: "$2a$10$T1K7.9LwH1iU9i3v6.r.XOfxH7r8eT7w3I9tUvCdfmYpZ4Z/6g7gG",
      createdAt: new Date().toISOString()
    }
  ],
  profiles: [],
  subscriptions: [
    {
      id: "sub-demo-1",
      userId: "demo-user-id",
      plan: "Professional",
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ],
  credits: [
    {
      userId: "demo-user-id",
      limit: 50,
      used: 3,
      updatedAt: new Date().toISOString()
    }
  ],
  payments: [],
  transactions: [],
  resumes: [],
  resumeVersions: [],
  atsReports: [],
  jobMatches: [],
  interviewSessions: [],
  auditLogs: []
};

class EnterpriseDatabase {
  private cache: DatabaseSchema;
  private isWriting: boolean = false;
  private pendingWrite: boolean = false;

  constructor() {
    this.cache = this.loadDatabase();
  }

  /**
   * Reads data from local store file, creates it if missing
   */
  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, "utf8");
        const parsed = JSON.parse(fileContent);
        // Ensure all keys exist
        return {
          users: parsed.users || [],
          profiles: parsed.profiles || [],
          subscriptions: parsed.subscriptions || [],
          credits: parsed.credits || [],
          payments: parsed.payments || [],
          transactions: parsed.transactions || [],
          resumes: parsed.resumes || [],
          resumeVersions: parsed.resumeVersions || [],
          atsReports: parsed.atsReports || [],
          jobMatches: parsed.jobMatches || [],
          interviewSessions: parsed.interviewSessions || [],
          auditLogs: parsed.auditLogs || []
        };
      } else {
        this.saveDatabaseSync(INITIAL_DATABASE);
        return { ...INITIAL_DATABASE };
      }
    } catch (err) {
      console.error("[Database Load Failure] Resetting to fallback schema:", err);
      return { ...INITIAL_DATABASE };
    }
  }

  /**
   * Synchronous write for initialization or critical operations
   */
  private saveDatabaseSync(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error("[Database Sync Write Failure]:", err);
    }
  }

  /**
   * Non-blocking atomic persistent write using temp-file and swap strategy
   */
  private triggerAsyncSave(): void {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }

    this.isWriting = true;
    const tempPath = `${DB_PATH}.tmp`;

    fs.writeFile(tempPath, JSON.stringify(this.cache, null, 2), "utf8", (err) => {
      this.isWriting = false;
      if (err) {
        console.error("[Database Async Write Failure]:", err);
        return;
      }

      fs.rename(tempPath, DB_PATH, (renameErr) => {
        if (renameErr) {
          console.error("[Database Atomic Swap Failure]:", renameErr);
          return;
        }

        if (this.pendingWrite) {
          this.pendingWrite = false;
          this.triggerAsyncSave();
        }
      });
    });
  }

  // --- PUBLIC API CRUDS ---

  // USERS
  public getUsers(): User[] {
    return this.cache.users;
  }

  public addUser(user: User): void {
    this.cache.users.push(user);
    this.triggerAsyncSave();
  }

  // PROFILES
  public getProfile(userId: string): Profile | undefined {
    return this.cache.profiles.find((p) => p.userId === userId);
  }

  public setProfile(profile: Profile): void {
    const idx = this.cache.profiles.findIndex((p) => p.userId === profile.userId);
    if (idx > -1) {
      this.cache.profiles[idx] = profile;
    } else {
      this.cache.profiles.push(profile);
    }
    this.triggerAsyncSave();
  }

  // SUBSCRIPTIONS
  public getSubscription(userId: string): Subscription | undefined {
    return this.cache.subscriptions.find((s) => s.userId === userId && s.status === "active");
  }

  public addSubscription(sub: Subscription): void {
    this.cache.subscriptions.push(sub);
    this.triggerAsyncSave();
  }

  // CREDITS
  public getCredits(userId: string): Credits {
    let cred = this.cache.credits.find((c) => c.userId === userId);
    if (!cred) {
      cred = {
        userId,
        limit: 10, // Default for Starter
        used: 0,
        updatedAt: new Date().toISOString()
      };
      this.cache.credits.push(cred);
      this.triggerAsyncSave();
    }
    return cred;
  }

  public consumeCredit(userId: string, amount: number = 1): boolean {
    const cred = this.getCredits(userId);
    if (cred.used + amount > cred.limit) {
      return false; // Insufficient credits
    }
    cred.used += amount;
    cred.updatedAt = new Date().toISOString();
    this.triggerAsyncSave();
    return true;
  }

  public addCredits(userId: string, amount: number): void {
    const cred = this.getCredits(userId);
    cred.limit += amount;
    cred.updatedAt = new Date().toISOString();
    this.triggerAsyncSave();
  }

  // PAYMENTS
  public getPayments(userId: string): Payment[] {
    return this.cache.payments.filter((p) => p.userId === userId);
  }

  public addPayment(payment: Payment): void {
    this.cache.payments.push(payment);
    this.triggerAsyncSave();
  }

  // TRANSACTIONS
  public getTransactions(userId: string): Transaction[] {
    return this.cache.transactions.filter((t) => t.userId === userId);
  }

  public addTransaction(transaction: Transaction): void {
    this.cache.transactions.push(transaction);
    this.triggerAsyncSave();
  }

  // RESUMES
  public getResume(userId: string): Resume | undefined {
    return this.cache.resumes.find((r) => r.userId === userId);
  }

  public saveResume(userId: string, fileName: string, rawText: string, parsedResume?: any): Resume {
    let res = this.cache.resumes.find((r) => r.userId === userId);
    const now = new Date().toISOString();

    if (res) {
      // Archive current as a version first
      const versionId = `v-${res.id}-${Date.now()}`;
      const existingVersions = this.cache.resumeVersions.filter((v) => v.resumeId === res!.id);
      const nextVersionNum = existingVersions.length + 1;

      const versionRecord: ResumeVersion = {
        id: versionId,
        resumeId: res.id,
        userId: res.userId,
        fileName: res.fileName,
        rawText: res.rawText,
        versionNumber: nextVersionNum,
        createdAt: res.uploadedAt
      };
      this.cache.resumeVersions.push(versionRecord);

      // Update resume
      res.fileName = fileName;
      res.rawText = rawText;
      res.uploadedAt = now;
      res.parsedResume = parsedResume || res.parsedResume;
    } else {
      res = {
        id: `res-${userId}-${Date.now()}`,
        userId,
        fileName,
        rawText,
        uploadedAt: now,
        parsedResume
      };
      this.cache.resumes.push(res);
    }

    this.triggerAsyncSave();
    return res;
  }

  // ATS REPORTS
  public getAtsReports(userId: string): AtsReport[] {
    return this.cache.atsReports.filter((r) => r.userId === userId);
  }

  public addAtsReport(report: AtsReport): void {
    this.cache.atsReports.push(report);
    this.triggerAsyncSave();
  }

  // JOB MATCHES
  public getJobMatches(userId: string): JobMatch[] {
    return this.cache.jobMatches.filter((m) => m.userId === userId);
  }

  public addJobMatch(match: JobMatch): void {
    this.cache.jobMatches.push(match);
    this.triggerAsyncSave();
  }

  // INTERVIEW SESSIONS
  public getInterviewSessions(userId: string): InterviewSession[] {
    return this.cache.interviewSessions.filter((s) => s.userId === userId);
  }

  public saveInterviewSession(session: InterviewSession): void {
    const idx = this.cache.interviewSessions.findIndex((s) => s.id === session.id);
    if (idx > -1) {
      this.cache.interviewSessions[idx] = session;
    } else {
      this.cache.interviewSessions.push(session);
    }
    this.triggerAsyncSave();
  }

  // AUDIT LOGS
  public getAuditLogs(userId?: string): AuditLog[] {
    if (userId) {
      return this.cache.auditLogs.filter((l) => l.userId === userId);
    }
    return this.cache.auditLogs;
  }

  public addAuditLog(action: string, details: string, userId?: string, ipAddress?: string): void {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId,
      action,
      ipAddress,
      details,
      createdAt: new Date().toISOString()
    };
    this.cache.auditLogs.push(log);
    this.triggerAsyncSave();
  }
}

export const db = new EnterpriseDatabase();
