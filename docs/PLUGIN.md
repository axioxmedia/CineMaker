# CineHost contract (schema 2)

A plugin is a zip. Import it in the running editor. Do not rebuild the app.

Zip layout:

    plugin.json
    plugin.js
    README.md

A single wrapper folder is fine. Import button is in the plugin window. Files go to CineMakerData/plugins.

Do not patch player.js or graph.js. Register through CineHost.

Lifecycle: CineHost.definePlugin({ id, onLoad, onProjectOpen, onProjectClose, onUnload })

Nodes: registerNodeType + registerExecutor(type, ctx => {})
Pin kind: exec | bool | int | float | string | array. Exec only to exec.

ctx: node data vars seen ui follow enter media say waitClick playVideo fadeTo saveSlot log time

Also: registerVarType, registerAction, hook(export:before|collectAssets|writeManifest|injectPlayer),
log(kind,msg), time.now/after, inputOn("key"), pluginData(id).get/set

Document version is 2. Keep plugin state in pluginData[yourId].


## schema 3 extras

CineHost.CAPABILITIES
CineHost.registerCategory / listCategories
CineHost.registerInspectorPane
CineHost.registerModelLoader
CineHost.assetUrl(assetId)
CineHost.viewport3d.create(dom)   // shared GLB/glTF/FBX view + studio lights

Imported files are stored as `.aioassets`. Use /api/drive/file/{id}/raw for the payload.
Disable a user plugin before Uninstall. Bundled plugins cannot be removed.
