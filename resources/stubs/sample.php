<?php

declare(strict_types=1);

// Laravel Tinker (Unofficial) — Quick Start
//
// Shortcuts:
//   Ctrl+R         Run this file
//   Ctrl+Alt+H     Browse execution history
//   Ctrl+Alt+C     Clear output
//   Ctrl+Alt+F     Search output
//
// Using Docker or Sail? Set your runtime in VS Code settings:
//   "laravelTinker.phpCommand": "sail php"
//   "laravelTinker.phpCommand": "docker-compose exec app php"
//
// Every execution is saved to history — restore any past run with one click.

use Illuminate\Support\Collection;

Collection::make([1, 2, 3])->map(fn ($x) => $x * 2)->all();
