# Laravel Tinker (Unofficial)

[![Version](https://img.shields.io/badge/version-v1.0.2-8ab4f8?style=flat-square)](https://github.com/mdrbx/laravel-tinker-vscode/releases)
[![License](https://img.shields.io/badge/license-MIT-8ab4f8?style=flat-square)](https://github.com/mdrbx/laravel-tinker-vscode/blob/master/LICENSE)

Run Laravel Tinker scripts directly in VS Code with color-coded output, execution history, and custom PHP runtime support.

> Based on [laravel-runner](https://github.com/ali-raza-saleem/laravel-runner) by Ali Raza Saleem.

---

## Quick Start

1. Open the Command Palette: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
2. Run **Laravel Tinker: Install Playground** — creates a `.tinker/sample.php` file in your project
3. Hit the play button in the editor title bar or press <kbd>Ctrl</kbd> + <kbd>R</kbd>

---

## Features

**Run & stop** — Execute PHP files from a dedicated playground folder. Stop long-running scripts with a single click.

**Custom PHP runtime** — Use `php`, `sail php`, `docker-compose exec app php`, or any command you need. Configure it once in settings.

**Execution history** — Every run is saved to a local JSON database, scoped per workspace. Browse, restore, or delete past executions. Configurable limits (default: 500 entries / 200 MB).

**Color-coded output** — Syntax-highlighted results with error detection. Searchable output with live highlighting.

**IntelliSense** — Real `.php` files, full support from Intelephense, PHP CS Fixer, Copilot, and any other PHP extension.

**Smart activation** — Only loads inside Laravel projects (auto-detects `artisan`).

---

## Settings

All settings are under `laravelTinker.*` in VS Code settings.

| Setting | Default | Description |
|---|---|---|
| `phpCommand` | `php` | PHP command to use. Examples: `sail php`, `docker-compose exec app php` |
| `playgroundFolder` | `.tinker` | Folder inside the project where scripts are executed |
| `appendOutput` | `true` | Keep output from previous runs |
| `historyEnabled` | `true` | Enable execution history |
| `historyMaxEntries` | `500` | Max number of history entries |
| `historyMaxSizeMb` | `200` | Max total history size in MB |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>R</kbd> | Run PHP file |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd> | Clear output |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd> | Focus search bar |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>H</kbd> | Show history |

All shortcuts are customizable via VS Code keybindings.

---

## FAQ

| Question | Answer |
|---|---|
| Will it touch my DB? | Only if your code tells it to. |
| Does it work with Docker/Sail? | Yes. Set `phpCommand` to `sail php` or your Docker command. |
| Where is history stored? | In VS Code's workspace storage, isolated per project. |
| Cross-platform? | macOS, Linux, Windows, WSL, and remote SSH. |

---

## Credits

This extension is a fork of [laravel-runner](https://github.com/ali-raza-saleem/laravel-runner) by [Ali Raza Saleem](https://github.com/ali-raza-saleem), with added execution history, custom runtime support, and UI improvements.

## License

[MIT](LICENSE) — Original copyright Ali Raza Saleem, modifications by mdrbx.
