const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

// Global exception logging for the main process to capture and display errors visually on screen
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in Main Process:', err);
  try {
    dialog.showErrorBox(
      'خطأ غير متوقع في النظام الرئيسي',
      'حدث خطأ غير متوقع أثناء تشغيل التطبيق:\n' + (err.stack || err.message || String(err))
    );
  } catch (dialogErr) {
    // Fallback if dialog isn't fully ready
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Main Process:', reason);
  try {
    dialog.showErrorBox(
      'خطأ في معالجة طلبات الخلفية',
      'حدث خطأ غامض في النظام المساعد:\n' + String(reason)
    );
  } catch (dialogErr) {}
});

function startServer() {
  if (isDev) {
    // In dev, we usually rely on 'npm run dev' started via concurrently
    console.log('Skipping integrated server start in Dev mode (relying on concurrently)');
  } else {
    console.log('Starting production server directly in Electron Main Process...');
    try {
      // Establish required environment variables
      process.env.USER_DATA_PATH = app.getPath('userData');
      process.env.NODE_ENV = 'production';
      process.env.ELECTRON_RUN = 'true';

      const serverPath = path.join(__dirname, 'dist', 'server.cjs');
      
      // Let's load the compiled Express server bundle
      require(serverPath);
      console.log('Production Express server successfully loaded in same process.');
    } catch (err) {
      console.error('Failed to load server inside main process:', err);
      try {
        dialog.showErrorBox(
          'خطأ في تحميل خادم التطبيق المحلي',
          'حدث خطأ أثناء تشغيل قاعدة البيانات أو خادم التطبيق الداخلي:\n' + (err.stack || err.message || String(err))
        );
      } catch (dialogErr) {}
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev,
    },
    title: "ClinicFlow Medical - نظام إدارة العيادات",
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  Menu.setApplicationMenu(null);

  const getPort = () => {
    return global.serverPort || 3000;
  };
  
  if (isDev) {
    win.webContents.openDevTools();
  }

  // Loaded with the correct port dynamically
  const loadApp = () => {
    const port = getPort();
    const url = 'http://localhost:' + port;
    win.loadURL(url).catch((err) => {
      console.log(`Server not ready on port ${port}, retrying in 1s... Error:`, err);
      setTimeout(loadApp, 1000);
    });
  };
  loadApp();

  // Update logic...
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let windowCreated = false;

app.whenReady().then(() => {
  if (isDev) {
    global.serverPort = 3000;
    createWindow();
    windowCreated = true;
  } else {
    // Set a safety timeout as a fallback so the window is created even if server startup delays exceptionally
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout reached: creating window with fallback port.');
      if (!windowCreated) {
        global.serverPort = 3000;
        createWindow();
        windowCreated = true;
      }
    }, 8000);

    // Register active port listener called from the Express instance
    global.onServerListening = (port) => {
      clearTimeout(safetyTimeout);
      console.log(`Main Process received ServerPort: ${port}`);
      global.serverPort = port;
      if (!windowCreated) {
        createWindow();
        windowCreated = true;
      }
    };

    // Bootstrap Express Server inside direct Main Thread
    startServer();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
