var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var mainWindow = null;
var isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL !== void 0;
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "GODSHOP \u2014 Sistema de Gest\xE3o Comercial",
    icon: import_path.default.join(__dirname, "../public/favicon.ico"),
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: "#090d16",
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      mainWindow?.loadFile(import_path.default.join(__dirname, "../dist/index.html"));
    });
  } else {
    mainWindow.loadFile(import_path.default.join(__dirname, "../dist/index.html")).catch(() => {
      mainWindow?.loadURL(devServerUrl);
    });
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(() => {
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.ipcMain.handle("get-app-version", () => import_electron.app.getVersion());
import_electron.ipcMain.handle("open-external", async (_event, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:"))) {
    await import_electron.shell.openExternal(url);
    return true;
  }
  return false;
});
import_electron.ipcMain.handle("print-page", async () => {
  if (mainWindow) {
    mainWindow.webContents.print({ silent: false, printBackground: true });
    return true;
  }
  return false;
});
import_electron.ipcMain.handle("save-file", async (_event, { fileName, dataBase64 }) => {
  try {
    const downloadsPath = import_electron.app.getPath("downloads");
    const filePath = import_path.default.join(downloadsPath, fileName);
    const buffer = Buffer.from(dataBase64.replace(/^data:.*?;base64,/, ""), "base64");
    await import_fs.default.promises.writeFile(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
import_electron.ipcMain.handle("show-notification", (_event, { title, body }) => {
  if (import_electron.Notification.isSupported()) {
    new import_electron.Notification({ title, body, icon: import_path.default.join(__dirname, "../public/favicon.ico") }).show();
    return true;
  }
  return false;
});
