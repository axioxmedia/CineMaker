# 3D viewport

Three.js is vendored at `static/vendor/three/`.
`index.html` ships an import map so loaders can `import from "three"`.

If you see `Failed to resolve module specifier "three"`, the import map is missing.
The 3D dock hides when you select a non-3D node.
Runtime errors go to the Message log (`CineHost.log("message", ...)`).
