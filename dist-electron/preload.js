// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  platform: "windows",
  isElectron: true,
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version"),
  saveFile: (fileName, dataBase64) => import_electron.ipcRenderer.invoke("save-file", { fileName, dataBase64 }),
  openExternal: (url) => import_electron.ipcRenderer.invoke("open-external", url),
  printPage: () => import_electron.ipcRenderer.invoke("print-page"),
  showNotification: (title, body) => import_electron.ipcRenderer.invoke("show-notification", { title, body })
});
