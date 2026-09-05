# Theme hook

Plugins recolor the shell through CineHost.theme.

```js
CineHost.theme.apply({ "--gold": "#f0d48a", "--bg0": "#08090c" });
CineHost.theme.registerPreset("dusk", { "--gold": "#c9a227" });
CineHost.theme.usePreset("dusk");
CineHost.theme.reset();
```

Tokens: --bg0 --bg1 --bg2 --line --text --muted --gold --gold-2 --teal --rose --ok
