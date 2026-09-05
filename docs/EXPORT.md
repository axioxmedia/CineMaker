# Export storefronts

- `exe` — copies game.json + media and the player EXE when frozen. Progress bar is the in-app gold modal.
- `h5` — same pack plus index.html and Play-H5.bat (local static server).

POST /api/export `{ title, dest, platform: "exe"|"h5" }`
