# CineHost contract (schema 3)

A plugin is a zip. Import it in the running editor. Do not rebuild the app.

    plugin.json
    plugin.js
    README.md

Files go to CineMakerData/plugins.

Lifecycle: CineHost.definePlugin({ id, onLoad, onProjectOpen, onProjectClose, onUnload })
Nodes: registerNodeType + registerExecutor(type, ctx => {})
3D: CineHost.viewport3d.create(dom)
Assets: CineHost.assetUrl(id)  — stored as .aioassets
Disable a user plugin before Uninstall. Bundled plugins cannot be removed.
