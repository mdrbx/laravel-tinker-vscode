import * as vscode from "vscode";
import * as path from "path";
import { WebviewManager } from "./core/services/WebviewManager";
import { CodeLensProvider } from "./core/providers/CodeLensProvider";
import { TinkerRunner } from "./core/services/TinkerRunner";
import { HistoryManager, HistoryEntry } from "./core/services/HistoryManager";
import { Config } from "./core/utils/Config";
import { PathUtils } from "./core/utils/PathUtils";

export class ExtensionManager {
  private webviewManager: WebviewManager;
  private tinkerRunner: TinkerRunner;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.webviewManager = new WebviewManager(context);
    this.tinkerRunner = new TinkerRunner(context, this.webviewManager);

    Config.init(context);
    HistoryManager.init(context, Config.getInstance());
  }

  public activate(): void {
    this.registerProviders();
    this.registerCommands();
  }

  private registerProviders(): void {
    const provider = new CodeLensProvider();
    const providerRegistration = vscode.languages.registerCodeLensProvider(
      { language: "php", scheme: "file" },
      provider,
    );
    this.context.subscriptions.push(providerRegistration);
  }

  private registerCommands(): void {
    const commands = [
      vscode.commands.registerCommand("laravelTinker.runPhpFile", () => {
        this.tinkerRunner.runPhpFile();
      }),

      vscode.commands.registerCommand("laravelTinker.stopPhpFile", () => {
        this.tinkerRunner.stopExecution();
      }),

      vscode.commands.registerCommand("laravelTinker.clearOutput", () => {
        if (this.webviewManager.outputPanel) {
          this.webviewManager.outputPanel.webview.postMessage({
            command: "clearOutput",
          });
        } else {
          vscode.window.showInformationMessage("No output to clear.");
        }
      }),

      vscode.commands.registerCommand("laravelTinker.focusSearchBar", () => {
        if (this.webviewManager.outputPanel) {
          this.webviewManager.outputPanel.webview.postMessage({
            command: "focusSearchBar",
          });
        } else {
          vscode.window.showInformationMessage("No output panel open.");
        }
      }),

      vscode.commands.registerCommand("laravelTinker.showHistory", () => {
        this.showHistoryQuickPick();
      }),

      vscode.commands.registerCommand("laravelTinker.clearHistory", async () => {
        const confirm = await vscode.window.showWarningMessage(
          "Clear all execution history?",
          { modal: true },
          "Clear",
        );
        if (confirm === "Clear") {
          HistoryManager.getInstance().clearHistory();
          vscode.window.showInformationMessage("History cleared.");
        }
      }),

      this.registerInstallPlaygroundCommand(),
    ];

    this.context.subscriptions.push(...commands);

    this.registerHistoryWebviewListener();
  }

  private registerHistoryWebviewListener(): void {
    const onPanelCreated = () => {
      if (!this.webviewManager.outputPanel) {
        return;
      }

      this.webviewManager.outputPanel.webview.onDidReceiveMessage((message) => {
        if (message.command === "requestHistory") {
          const entries = HistoryManager.getInstance().getEntries();
          this.webviewManager.sendHistoryEntries(entries);
        }
        if (message.command === "restoreHistoryEntry") {
          const entry = HistoryManager.getInstance().getEntry(message.id);
          if (entry) {
            this.webviewManager.restoreHistoryEntry(entry);
          }
        }
        if (message.command === "deleteHistoryEntry") {
          HistoryManager.getInstance().deleteEntry(message.id);
          const entries = HistoryManager.getInstance().getEntries();
          this.webviewManager.sendHistoryEntries(entries);
        }
        if (message.command === "requestClearHistory") {
          HistoryManager.getInstance().clearHistory();
          this.webviewManager.sendHistoryEntries([]);
        }
      });
    };

    const originalCreate = this.webviewManager.createOutputPanel.bind(this.webviewManager);
    this.webviewManager.createOutputPanel = () => {
      const hadPanel = !!this.webviewManager.outputPanel;
      originalCreate();
      if (!hadPanel) {
        onPanelCreated();
      }
    };
  }

  private async showHistoryQuickPick(): Promise<void> {
    const history = HistoryManager.getInstance();
    const entries = history.getEntries();

    if (entries.length === 0) {
      vscode.window.showInformationMessage("No execution history yet.");
      return;
    }

    const items = entries.map((entry) => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleString();
      const status = entry.isError ? "$(error)" : "$(check)";
      const duration = entry.durationMs < 1000
        ? `${entry.durationMs}ms`
        : `${(entry.durationMs / 1000).toFixed(1)}s`;

      return {
        label: `${status} ${path.basename(entry.scriptPath)}`,
        description: `${duration}`,
        detail: `${timeStr} - ${entry.scriptPath}`,
        entry,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select an execution to restore",
      matchOnDetail: true,
      matchOnDescription: true,
    });

    if (selected) {
      this.webviewManager.restoreHistoryEntry(selected.entry);
    }
  }

  private registerInstallPlaygroundCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
      "laravelTinker.installPlayground",
      async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          vscode.window.showWarningMessage("Open a Laravel project first.");
          return;
        }

        const root = folders[0].uri.fsPath;
        const pathUtils = PathUtils.getInstance();
        if (!pathUtils.isLaravelProjectDir(root)) {
          vscode.window.showWarningMessage(
            "Can only install inside a Laravel project.",
          );
          return;
        }

        const playgroundFolder =
          vscode.workspace
            .getConfiguration("laravelTinker")
            .get<string>("playgroundFolder") ?? ".playground";

        const playgroundPath = path.join(root, playgroundFolder);
        const playgroundUri = vscode.Uri.file(playgroundPath);

        const stubsPath = path.join(
          this.context.extensionPath,
          "resources",
          "stubs",
        );
        const stubsUri = vscode.Uri.file(stubsPath);

        try {
          await vscode.workspace.fs.createDirectory(playgroundUri);

          const entries = await vscode.workspace.fs.readDirectory(stubsUri);

          for (const [name, fileType] of entries) {
            if (fileType !== vscode.FileType.File || !name.endsWith(".php")) {
              continue;
            }

            const src = vscode.Uri.file(path.join(stubsPath, name));
            const dest = vscode.Uri.file(path.join(playgroundPath, name));

            try {
              await vscode.workspace.fs.stat(dest);
            } catch {
              await vscode.workspace.fs.copy(src, dest);
            }
          }

          const helloUri = vscode.Uri.file(
            path.join(playgroundPath, "hello.php"),
          );
          let doc: vscode.TextDocument | undefined;

          try {
            doc = await vscode.workspace.openTextDocument(helloUri);
          } catch {
            const firstStub = entries.find(
              ([n, t]) => t === vscode.FileType.File && n.endsWith(".php"),
            );
            if (firstStub) {
              const fallbackUri = vscode.Uri.file(
                path.join(playgroundPath, firstStub[0]),
              );
              doc = await vscode.workspace.openTextDocument(fallbackUri);
            }
          }

          if (doc) {
            await vscode.window.showTextDocument(doc, { preview: false });
          }

          vscode.window.showInformationMessage(
            `Playground ready at ${playgroundFolder}/hello.php`,
          );
        } catch {
          vscode.window.showErrorMessage(
            "Could not create the playground. Check the console for details.",
          );
        }
      },
    );
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const extensionManager = new ExtensionManager(context);
  extensionManager.activate();
}

export function deactivate(): void {
  //
}
