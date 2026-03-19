import Alpine from "alpinejs";
window.Alpine = Alpine;

import Mark from "mark.js";

import hljs from "highlight.js/lib/core";
import php from "highlight.js/lib/languages/php";
hljs.registerLanguage("php", php);

document.addEventListener("alpine:init", () => {
  Alpine.data("root", () => ({
    init() {
      this.vscode = acquireVsCodeApi();
      document.addEventListener("keydown", (event) =>
        this.handleKeyboardShortcuts(event),
      );
      window.addEventListener("message", (event) =>
        this.handleVSCodeMessages(event),
      );

      this.showSearchBar = false;

      this.$watch("searchText", () => {
        this.debouncedSearch();
      });

      this.debouncedSearch = this.debounce(
        () => this.highlightSearchedText(),
        this.debouncedSearchDelayInMilliSeconds,
      );
    },

    vscode: null,
    codeIsRunning: false,
    stopCodeExecutionButtonVisibility: false,
    showSearchBar: false,
    outputs: [],
    outputElements: [],
    showDetailLogs: false,
    searchText: "",
    debouncedSearch: null,
    debouncedSearchDelayInMilliSeconds: 200,

    // History state
    historyOpen: false,
    historyEntries: [],
    restoredScript: null,
    restoredScriptPath: "",

    toggleHistory() {
      this.historyOpen = !this.historyOpen;
      if (this.historyOpen) {
        this.restoredScript = null;
        this.vscode.postMessage({ command: "requestHistory" });
      }
    },

    restoreEntry(entry) {
      this.historyOpen = false;
      this.restoredScript = entry.scriptContent;
      this.restoredScriptPath = entry.scriptPath;

      this.$nextTick(() => {
        this.addNewOutput(entry.output, entry.isError, false);
      });
    },

    deleteEntry(id) {
      this.vscode.postMessage({ command: "deleteHistoryEntry", id: id });
    },

    clearHistory() {
      this.historyEntries = [];
      this.vscode.postMessage({ command: "requestClearHistory" });
    },

    formatDuration(ms) {
      if (ms < 1000) {
        return ms + "ms";
      }
      return (ms / 1000).toFixed(1) + "s";
    },

    formatTime(isoString) {
      const d = new Date(isoString);
      const pad = (n) => String(n).padStart(2, "0");
      return (
        pad(d.getDate()) + "/" +
        pad(d.getMonth() + 1) + " " +
        pad(d.getHours()) + ":" +
        pad(d.getMinutes()) + ":" +
        pad(d.getSeconds())
      );
    },

    syncOutputElements() {
      this.outputElements = Array.from(
        this.$refs.outputContainer.querySelectorAll(".output-element"),
      );
    },

    handleVSCodeMessages(event) {
      const message = event.data;

      this.stopCodeExecutionButtonVisibility = message.isRunning;

      if (message.command === "scriptStarted") {
        this.stopCodeExecutionButtonVisibility = true;
      }
      if (message.command === "scriptKilled") {
        this.stopCodeExecutionButtonVisibility = false;
      }
      if (message.command === "updateOutput") {
        this.historyOpen = false;
        this.restoredScript = null;
        this.addNewOutput(
          message.content,
          message.isError,
          message.appendOutput,
        );
      }
      if (message.command === "clearOutput") {
        this.clearOutput();
      }
      if (message.command === "focusSearchBar") {
        this.$refs.searchInput.focus();
      }
      if (message.command === "historyList") {
        this.historyEntries = message.entries;
      }
      if (message.command === "restoreHistory") {
        this.historyOpen = false;
        this.restoredScript = message.entry.scriptContent;
        this.restoredScriptPath = message.entry.scriptPath;
        this.$nextTick(() => {
          this.addNewOutput(message.entry.output, message.entry.isError, false);
        });
      }
    },

    handleKeyboardShortcuts(event) {
      if (event.ctrlKey && event.altKey) {
        event.preventDefault();
        const key = event.key.toLowerCase();
        if (key === "c") {
          this.clearOutput();
        }
        if (key === "f") {
          this.$refs.searchInput.focus();
        }
        if (key === "h") {
          this.toggleHistory();
        }
      }
    },

    addNewOutput(content, isError, appendOutput) {
      if (!appendOutput) {
        this.clearOutput();
      }

      const output = {
        content: content,
        isError: isError,
        appendOutput: appendOutput,
      };

      this.showSearchBar = true;

      this.$nextTick(() => {
        this.outputs.push(output);
        this.$nextTick(() => {
          setTimeout(() => {
            this.handleNewOutputAddedEvent();
          }, 0);
        });
      });
    },

    handleNewOutputAddedEvent() {
      this.searchText = "";

      this.syncOutputElements();

      const lastElement = this.outputElements[this.outputElements.length - 1];
      const lastOutput = this.outputs[this.outputs.length - 1];
      lastOutput["element"] = lastElement;

      this.highlightOutput(lastOutput);

      const isFirstElement = this.outputElements.length === 1;
      if (isFirstElement) {
        return;
      }

      this.scrollToOutput(lastOutput);
    },

    clearOutput() {
      this.outputs = [];
      this.outputElements = [];
      this.showSearchBar = false;
      this.searchText = "";
    },

    copyOutput(output) {
      const logText = output.content;

      if (!logText) {
        console.warn("No text to copy");
        return;
      }

      navigator.clipboard
        .writeText(logText)
        .then(() => {
          output.outputCopied = true;

          setTimeout(() => {
            output.outputCopied = false;
          }, 1500);
        })
        .catch((err) => {
          console.error("Clipboard API failed:", err);
        });
    },

    scrollToOutput(output) {
      setTimeout(() => {
        output.element.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },

    highlightOutput(output) {
      hljs.highlightElement(output.element.querySelector("code"), {
        language: "php",
      });
    },

    stopCodeExecution() {
      this.vscode.postMessage({ command: "stopExecution" });
    },

    escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    highlightSearchedText() {
      const outputContainer = this.$refs.outputContainer;
      if (!outputContainer) return;

      const instance = new Mark(outputContainer);

      instance.unmark({
        done: () => {
          if (!this.searchText) return;

          const escapedSearch = this.escapeRegExp(this.searchText);
          const regex = new RegExp(escapedSearch, "gi");

          instance.markRegExp(regex, {
            className: "highlight",
            accuracy: "exactly",
            separateWordSearch: false,
            acrossElements: true,
            done: () => {
              const highlightedElements =
                outputContainer.querySelectorAll(".highlight");
              if (highlightedElements.length > 0) {
                setTimeout(() => {
                  highlightedElements[0].scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 50);
              }
            },
          });
        },
      });
    },

    debounce(func, delay) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    },
  }));
});

// Start Alpine AFTER defining components
Alpine.start();
