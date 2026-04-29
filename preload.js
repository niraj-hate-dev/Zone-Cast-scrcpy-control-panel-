const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  start: opts => ipcRenderer.invoke("start-scrcpy", opts),
  stop: () => ipcRenderer.invoke("stop-scrcpy"),
  checkDevice: () => ipcRenderer.invoke("check-device"),
  onLog: cb => ipcRenderer.on("log", (_, msg) => cb(msg))
});
