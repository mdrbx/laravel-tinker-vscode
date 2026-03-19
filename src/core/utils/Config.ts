import * as vscode from "vscode";

export class Config {
  private static instance: Config | null = null;
  private packageJson: any;
  private playgroundFolder: string;
  private appendOutput: boolean;
  private phpCommand: string;
  private historyEnabled: boolean;
  private historyMaxEntries: number;
  private historyMaxSizeMb: number;
  private extensionId: string;

  private constructor(context: vscode.ExtensionContext) {
    this.packageJson = context.extension.packageJSON;
    this.extensionId = `${this.packageJson.publisher}.${this.packageJson.name}`;

    this.loadConfig();

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("laravelTinker")) {
        this.loadConfig();
      }
    });
  }

  public static init(context: vscode.ExtensionContext): void {
    if (!this.instance) {
      this.instance = new Config(context);
    }
  }

  public static getInstance(): Config {
    if (!this.instance) {
      throw new Error(
        "Config has not been initialized. Call Config.init(context) first.",
      );
    }
    return this.instance;
  }

  private loadConfig(): void {
    const config = vscode.workspace.getConfiguration("laravelTinker");
    this.playgroundFolder = config.get<string>("playgroundFolder", ".tinker");
    this.appendOutput = config.get<boolean>("appendOutput", true);
    this.phpCommand = config.get<string>("phpCommand", "php");
    this.historyEnabled = config.get<boolean>("historyEnabled", true);
    this.historyMaxEntries = config.get<number>("historyMaxEntries", 500);
    this.historyMaxSizeMb = config.get<number>("historyMaxSizeMb", 200);
  }

  public get<T>(key: string): T | undefined {
    const classPropertyValue = (this as any)[key];
    if (classPropertyValue !== undefined) {
      return classPropertyValue;
    }

    const keys = key.split(".");
    let value: any = this.packageJson;

    for (const k of keys) {
      if (value?.[k] !== undefined) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value as T;
  }
}
