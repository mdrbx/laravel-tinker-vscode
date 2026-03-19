import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcess } from "child_process";
import { WebviewManager } from "./WebviewManager";
import { HistoryManager } from "./HistoryManager";
import { Config } from "../utils/Config";
import { PathUtils } from "../utils/PathUtils";
import { eventBus } from "./EventBus";

export class TinkerRunner {
  private currentProcess: ChildProcess | null = null;
  private extensionUri: vscode.Uri;
  private webviewManager: WebviewManager;
  private config: Config;
  private pathUtils: PathUtils;
  private tinkerScriptPath: string;
  private stopListenerFor: vscode.Webview | null = null;

  constructor(
    context: vscode.ExtensionContext,
    webviewManager: WebviewManager,
  ) {
    this.extensionUri = context.extensionUri;
    this.webviewManager = webviewManager;

    Config.init(context);
    this.config = Config.getInstance();

    PathUtils.init(this.config);
    this.pathUtils = PathUtils.getInstance();

    this.tinkerScriptPath = this.config.get("customConfig.tinkerScriptPath");
  }

  public runPhpFile(): void {
    if (this.currentProcess) {
      vscode.window.showWarningMessage(
        "Code is running. Please wait or stop the current execution.",
      );
      return;
    }

    const phpFileUri = this.getPhpFileUri();
    const workspaceRoot = this.pathUtils.getWorkspaceRoot(phpFileUri);

    if (!this.canRunPhpFile(workspaceRoot, phpFileUri)) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.document.save();
    } else {
      vscode.window.showInformationMessage("No active editor found.");
    }

    const phpFileRelativePath = path
      .relative(workspaceRoot, phpFileUri.fsPath)
      .replace(/\\/g, "/");
    const tinkerScriptAbsolutePath = path.join(
      this.extensionUri.fsPath,
      this.tinkerScriptPath,
    );

    const phpCommand = this.config.get<string>("phpCommand") || "php";
    const phpCommandParts = phpCommand.split(/\s+/);
    const command = phpCommandParts[0];
    const commandArgs = [
      ...phpCommandParts.slice(1),
      tinkerScriptAbsolutePath,
      phpFileRelativePath,
      workspaceRoot,
    ];

    const scriptContent = this.readFileContent(phpFileUri.fsPath);
    const startTime = Date.now();

    this.currentProcess = this.evalScript(
      command,
      commandArgs,
      workspaceRoot,
      phpFileRelativePath,
      scriptContent,
      startTime,
    );

    eventBus.setRunning(true);
  }

  private readFileContent(filePath: string): string {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  private getPhpFileUri(): vscode.Uri | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === "php") {
      return activeEditor.document.uri;
    }

    vscode.window.showErrorMessage("No PHP file selected to run.");
    return null;
  }

  private canRunPhpFile(
    workspaceRoot: string,
    phpFileUri?: vscode.Uri,
  ): boolean {
    if (!phpFileUri) {
      vscode.window.showErrorMessage("No php file found.");
      return false;
    }

    if (!workspaceRoot) {
      vscode.window.showErrorMessage("No workspace found.");
      return false;
    }

    if (
      !this.pathUtils.fileIsInsideTinkerPlayground(workspaceRoot, phpFileUri)
    ) {
      vscode.window.showErrorMessage(
        "This command can only be run on PHP files inside the playground folder.",
      );
      return false;
    }

    return true;
  }

  private evalScript(
    command: string,
    args: string[],
    cwd: string,
    scriptPath: string,
    scriptContent: string,
    startTime: number,
  ): ChildProcess {
    this.webviewManager.sendScriptStartedMessage();
    this.registerStopExecutionListener();

    const process = spawn(command, args, { cwd });

    let output = "";
    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.on("close", (code) => {
      this.currentProcess = null;
      eventBus.setRunning(false);

      const durationMs = Date.now() - startTime;
      const isError = code !== 0;

      if (isError) {
        this.webviewManager.updateWebView(
          output || `Process exited with code ${code}`,
          true,
          false,
        );
      } else {
        this.webviewManager.updateWebView(output || "null", false, false);
      }

      this.saveToHistory(scriptPath, scriptContent, output, isError, durationMs);
    });

    process.on("error", (err) => {
      const durationMs = Date.now() - startTime;
      const errorOutput = output || `Error running script: ${err.message}`;

      this.webviewManager.updateWebView(errorOutput, true, false);
      this.currentProcess = null;
      eventBus.setRunning(false);
      vscode.window.showErrorMessage(`Error running script: ${err.message}`);

      this.saveToHistory(scriptPath, scriptContent, errorOutput, true, durationMs);
    });

    return process;
  }

  private saveToHistory(
    scriptPath: string,
    scriptContent: string,
    output: string,
    isError: boolean,
    durationMs: number,
  ): void {
    const historyEnabled = this.config.get<boolean>("historyEnabled");
    if (!historyEnabled) {
      return;
    }

    try {
      const history = HistoryManager.getInstance();
      history.addEntry(scriptPath, scriptContent, output, isError, durationMs);
    } catch {
      // Silently fail - history is non-critical
    }
  }

  public registerStopExecutionListener(): void {
    if (!this.webviewManager.outputPanel) {
      this.webviewManager.createOutputPanel();
    }

    const panel = this.webviewManager.outputPanel!;
    const webview = panel.webview;

    if (this.stopListenerFor === webview) {
      return;
    }

    webview.onDidReceiveMessage((message) => {
      if (message.command === "stopExecution") {
        this.stopExecution();
      }
    });

    panel.onDidDispose(() => {
      if (this.stopListenerFor === webview) {
        this.stopListenerFor = null;
      }
    });

    this.stopListenerFor = webview;
  }

  public stopExecution(): void {
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      this.currentProcess = null;
      this.webviewManager.sendScriptKilledMessage();
    }
  }

  public getConfig(): Config {
    return this.config;
  }

  public getPathUtils(): PathUtils {
    return this.pathUtils;
  }
}
