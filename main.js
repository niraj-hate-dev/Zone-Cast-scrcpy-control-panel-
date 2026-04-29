const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");

let win = null;
let scrcpyProcess = null;

// 🔹 Function to get correct path in both development and production
function getScrcpyPath() {
  // In development (when running with npm start)
  if (app.isPackaged) {
    // In production (after building)
    return path.join(process.resourcesPath, "scrcpy-win64-v3.3.4");
  } else {
    // In development
    return path.join(__dirname, "scrcpy-win64-v3.3.4");
  }
}

// 🔹 Paths
const SCRCPY_DIR = getScrcpyPath();
const SCRCPY_EXE = path.join(SCRCPY_DIR, "scrcpy.exe");
const ADB_EXE = path.join(SCRCPY_DIR, "adb.exe");

// 🔹 Send logs to renderer
function sendLog(msg) {
  if (win) {
    win.webContents.send("log", msg);
  }
  console.log(msg); // Also log to console for debugging
}

// 🔹 Create main window
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 650,
    minWidth: 1000,
    minHeight: 600,
    icon: path.join(__dirname, "build", "icon.ico"), // Change this to your icon path
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadFile("index.html");
  
  // Open DevTools for debugging (remove in production)
  // win.webContents.openDevTools();

  win.on("closed", () => {
    win = null;
  });
  
  // Log the paths for debugging
  sendLog(`📁 App is packaged: ${app.isPackaged}`);
  sendLog(`📁 SCRCPY_DIR: ${SCRCPY_DIR}`);
  
  // Check if ADB exists
  if (fs.existsSync(ADB_EXE)) {
    sendLog(`✅ ADB found at: ${ADB_EXE}`);
  } else {
    sendLog(`❌ ADB NOT found at: ${ADB_EXE}`);
  }
}

// 🔹 App ready
app.whenReady().then(() => {
  // 🔥 Remove File / Edit / View / Help
  Menu.setApplicationMenu(null);

  createWindow();

  // macOS behavior
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 🔹 Quit app
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ================= IPC =================

// 🔹 Check device
ipcMain.handle("check-device", () => {
  return new Promise(resolve => {
    // Check if ADB exists first
    if (!fs.existsSync(ADB_EXE)) {
      sendLog(`❌ ADB not found at: ${ADB_EXE}`);
      sendLog('📁 Please make sure scrcpy-win64-v3.3.4 folder exists with adb.exe');
      resolve({ status: "error", error: "ADB not found" });
      return;
    }

    exec(`"${ADB_EXE}" devices`, (err, stdout) => {
      if (err) {
        sendLog("❌ ADB execution failed: " + err.message);
        resolve({ status: "error" });
        return;
      }

      const lines = stdout.split("\n").slice(1);
      const device = lines.find(l => l.trim() !== "" && !l.includes("List of devices"));

      if (!device) {
        sendLog("⚠ No device connected");
        resolve({ status: "none" });
        return;
      }

      if (device.includes("unauthorized")) {
        sendLog("⚠ Allow USB debugging on phone");
        resolve({ status: "unauthorized" });
        return;
      }

      sendLog("✅ Device connected");
      resolve({ status: "ready" });
    });
  });
});

// 🔹 Start scrcpy
ipcMain.handle("start-scrcpy", (_, options) => {
  if (scrcpyProcess) return;

  const { bitrate, fps } = options;

  sendLog(`▶ Starting scrcpy | Bitrate: ${bitrate} | FPS: ${fps}`);
  
  // Check if scrcpy.exe exists
  if (!fs.existsSync(SCRCPY_EXE)) {
    sendLog(`❌ scrcpy.exe not found at: ${SCRCPY_EXE}`);
    return;
  }

  scrcpyProcess = spawn(
    SCRCPY_EXE,
    [
      "-m", "1280",
      "--video-bit-rate", bitrate,
      "--max-fps", fps,
      "--video-codec=h264",

    ],
    { cwd: SCRCPY_DIR }
  );

  scrcpyProcess.stdout.on("data", d => {
    const msg = d.toString();
    sendLog(msg);
  });
  
  scrcpyProcess.stderr.on("data", d => {
    const msg = d.toString();
    sendLog(msg);
  });

  scrcpyProcess.on("close", (code) => {
    sendLog(`⏹ scrcpy stopped (exit code: ${code})`);
    scrcpyProcess = null;
  });
});

// 🔹 Stop scrcpy
ipcMain.handle("stop-scrcpy", () => {
  if (scrcpyProcess) {
    scrcpyProcess.kill("SIGINT");
    scrcpyProcess = null;
    sendLog("⛔ Disconnected");
  }
});