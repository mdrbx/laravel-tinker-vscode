import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Config } from "../utils/Config";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  scriptPath: string;
  scriptContent: string;
  output: string;
  isError: boolean;
  durationMs: number;
}

interface HistoryDatabase {
  version: 1;
  entries: HistoryEntry[];
}

export class HistoryManager {
  private static instance: HistoryManager | null = null;
  private dbPath: string;
  private config: Config;

  private constructor(context: vscode.ExtensionContext, config: Config) {
    this.config = config;
    const storageDir = context.storageUri.fsPath;
    this.ensureStorageDir(storageDir);
    this.dbPath = path.join(storageDir, "history.json");
  }

  public static init(context: vscode.ExtensionContext, config: Config): void {
    if (!this.instance) {
      this.instance = new HistoryManager(context, config);
    }
  }

  public static getInstance(): HistoryManager {
    if (!this.instance) {
      throw new Error(
        "HistoryManager has not been initialized. Call HistoryManager.init() first.",
      );
    }
    return this.instance;
  }

  private ensureStorageDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private readDb(): HistoryDatabase {
    if (!fs.existsSync(this.dbPath)) {
      return { version: 1, entries: [] };
    }

    try {
      const raw = fs.readFileSync(this.dbPath, "utf8");
      return JSON.parse(raw) as HistoryDatabase;
    } catch {
      return { version: 1, entries: [] };
    }
  }

  private writeDb(db: HistoryDatabase): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(db), "utf8");
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  public addEntry(
    scriptPath: string,
    scriptContent: string,
    output: string,
    isError: boolean,
    durationMs: number,
  ): HistoryEntry {
    const db = this.readDb();

    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      scriptPath,
      scriptContent,
      output,
      isError,
      durationMs,
    };

    db.entries.push(entry);
    this.enforceLimit(db);
    this.writeDb(db);

    return entry;
  }

  public getEntries(): HistoryEntry[] {
    const db = this.readDb();
    return db.entries.slice().reverse();
  }

  public getEntry(id: string): HistoryEntry | undefined {
    const db = this.readDb();
    return db.entries.find((e) => e.id === id);
  }

  public clearHistory(): void {
    this.writeDb({ version: 1, entries: [] });
  }

  public deleteEntry(id: string): void {
    const db = this.readDb();
    db.entries = db.entries.filter((e) => e.id !== id);
    this.writeDb(db);
  }

  private enforceLimit(db: HistoryDatabase): void {
    const maxEntries = this.config.get<number>("historyMaxEntries") || 500;
    const maxSizeBytes = (this.config.get<number>("historyMaxSizeMb") || 200) * 1024 * 1024;

    while (db.entries.length > maxEntries) {
      db.entries.shift();
    }

    let serialized = JSON.stringify(db);
    while (Buffer.byteLength(serialized, "utf8") > maxSizeBytes && db.entries.length > 0) {
      db.entries.shift();
      serialized = JSON.stringify(db);
    }
  }

  public getStats(): { count: number; sizeBytes: number } {
    const db = this.readDb();
    const sizeBytes = fs.existsSync(this.dbPath)
      ? fs.statSync(this.dbPath).size
      : 0;
    return { count: db.entries.length, sizeBytes };
  }
}
