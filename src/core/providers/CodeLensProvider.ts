import { eventBus } from "./../services/EventBus";
import * as vscode from "vscode";
import * as path from "path";

export class CodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChange.event;

  private running = false;

  constructor() {
    eventBus.on("scriptRunning", (state) => {
      this.running = state;
      this._onDidChange.fire();
    });
  }

  provideCodeLenses(
    doc: vscode.TextDocument,
    _tok: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const ws = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!ws) {
      return [];
    }

    const playgroundFolder =
      vscode.workspace
        .getConfiguration("laravelTinker")
        .get<string>("playgroundFolder") ?? ".tinker";

    if (!doc.uri.fsPath.startsWith(path.join(ws.uri.fsPath, playgroundFolder))) {
      return [];
    }

    const range = new vscode.Range(0, 0, 0, 0);
    const lenses = [];

    if (this.running) {
      lenses.push(
        new vscode.CodeLens(range, {
          title: "$(debug-stop) Stop Execution",
          command: "laravelTinker.stopPhpFile",
        }),
      );
    } else {
      lenses.push(
        new vscode.CodeLens(range, {
          title: "$(play) Run (Laravel Tinker)",
          command: "laravelTinker.runPhpFile",
          arguments: [doc.uri],
        }),
      );
      lenses.push(
        new vscode.CodeLens(range, {
          title: "$(history) History",
          command: "laravelTinker.showHistory",
        }),
      );
    }

    return lenses;
  }
}
