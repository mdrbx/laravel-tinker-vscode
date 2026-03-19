import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { Config } from "../utils/Config";

export class WebviewManager {
  public outputPanel: vscode.WebviewPanel | null = null;
  private extensionUri: vscode.Uri;
  private cachedHtml: string | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.extensionUri = context.extensionUri;
  }

  public updateWebView(
    content: string,
    isError: boolean = false,
    isRunning: boolean = false,
  ): void {
    this.createOutputPanel();
    const appendOutput = Config.getInstance().get<boolean>("appendOutput");

    this.outputPanel.webview.postMessage({
      command: "updateOutput",
      content,
      isError,
      isRunning,
      appendOutput,
    });
  }

  public sendScriptStartedMessage(): void {
    this.createOutputPanel();
    this.outputPanel.webview.postMessage({ command: "scriptStarted" });
  }

  public sendScriptKilledMessage(): void {
    this.createOutputPanel();
    this.outputPanel.webview.postMessage({ command: "scriptKilled" });
  }

  public sendHistoryEntries(entries: any[]): void {
    this.createOutputPanel();
    this.outputPanel.webview.postMessage({
      command: "historyList",
      entries,
    });
  }

  public restoreHistoryEntry(entry: any): void {
    this.createOutputPanel();
    this.outputPanel.webview.postMessage({
      command: "restoreHistory",
      entry,
    });
  }

  public createOutputPanel(): void {
    if (!this.outputPanel) {
      this.outputPanel = vscode.window.createWebviewPanel(
        "laravelTinkerOutput",
        "Laravel Tinker: Output",
        {
          viewColumn: vscode.ViewColumn.Beside,
          preserveFocus: true,
        },
        { enableScripts: true },
      );

      this.outputPanel.webview.html = this.getContent(this.outputPanel.webview);

      this.outputPanel.onDidDispose(() => {
        this.outputPanel = null;
        this.cachedHtml = null;
      });
    }
  }

  private getContent(webview: vscode.Webview): string {
    if (this.cachedHtml) {
      return this.cachedHtml;
    }

    const getResourceUri = (filePath: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, filePath));

    const htmlPath = path.join(
      this.extensionUri.fsPath,
      "resources/html",
      "index.html",
    );

    this.cachedHtml = fs
      .readFileSync(htmlPath, "utf8")
      .replace(
        /\{\{appJsUri\}\}/g,
        getResourceUri("dist/app.min.js").toString(),
      )
      .replace(
        /\{\{appCssUri\}\}/g,
        getResourceUri("dist/app.min.css").toString(),
      )
      .replace(
        /\{\{highlightCssUri\}\}/g,
        getResourceUri("assets/css/atom-one-dark.min.css").toString(),
      );

    return this.cachedHtml;
  }
}
