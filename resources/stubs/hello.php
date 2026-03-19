<?php

use App\Models\User;

// Play with this file to see how it works
// Run it with Ctrl+Alt+R or click "Run (Laravel Tinker)" at the top

$name = 'Laravel Tinker';
$features = [
    'colour-coded output'   => 'readable at a glance',
    'searchable output'     => 'highlights as you type',
    'execution history'     => 'browse and restore past runs',
    'custom PHP runtime'    => 'use sail, docker, or any command',
    'stop on demand'        => 'halt scripts instantly',
    'smart activation'      => 'only in Laravel projects',
];

// Anything returned from the last expression is pretty-printed for you
return [
    'message'  => "Hello from $name!",
    'features' => $features,
    'now'      => now()->toDateTimeString(),
];

// You can also use Eloquent models, like this:
// User::first();
