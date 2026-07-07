const { app, dialog, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const Config = require('./src/config');
const Logger = require('./src/logger');
const WindowManager = require('./src/window-manager');
const Blackout = require('./src/blackout');

let config;
let logger;
let windowManager;
let blackout;
let autoRestartTimer = null;

async function main() {
  const configPath = Config.getConfigPath();
  const isDevTools = process.argv.includes('--devtools');

  try {
    config = Config.load(configPath);
  } catch (err) {
    dialog.showErrorBox(
      'Erreur de configuration',
      `${err.message}\n\nUtilisez --config=/chemin/vers/config.json ou placez config.json dans le dossier de l'application.`
    );
    app.quit();
    return;
  }

  if (isDevTools) {
    config.show_devtools = true;
  }

  logger = new Logger(config);
  logger.info(`═══════════════════════════════════════`);
  logger.info(`MubroRef démarré`);
  logger.info(`Configuration: ${configPath}`);
  logger.info(`Mode: ${config.mode}`);
  logger.info(`URLs: ${config.urls.join(', ')}`);
  logger.info(`Écrans: détection en cours...`);
  logger.info(`Rafraîchissement: ${config.refresh_interval_minutes > 0 ? `toutes les ${config.refresh_interval_minutes} min` : 'désactivé'}`);

  if (config.clear_cache_on_start) {
    try {
      const { session } = require('electron');
      await session.defaultSession.clearCache();
      logger.info('Cache vidé au démarrage');
    } catch (err) {
      logger.warn(`Échec vidage cache: ${err.message}`);
    }
  }

  windowManager = new WindowManager(config, logger);

  try {
    await windowManager.createWindows();
  } catch (err) {
    logger.error(`Erreur création fenêtres: ${err.message}`);
    dialog.showErrorBox('Erreur', `Impossible de créer les fenêtres: ${err.message}`);
    app.quit();
    return;
  }

  if (config.blackout_schedule) {
    blackout = new Blackout(config, logger, windowManager.getWindows());
    blackout.start();
  }

  if (config.auto_restart_hours > 0) {
    const ms = config.auto_restart_hours * 3600000;
    logger.info(`Redémarrage automatique dans ${config.auto_restart_hours}h`);
    autoRestartTimer = setTimeout(() => {
      logger.info('Redémarrage automatique...');
      app.relaunch();
      app.exit(0);
    }, ms);
  }

  logger.info('Application prête');
}

function quitApp() {
  logger?.info('Fermeture demandée par hotkey');
  if (autoRestartTimer) {
    clearTimeout(autoRestartTimer);
    autoRestartTimer = null;
  }
  if (blackout) blackout.stop();
  if (windowManager) windowManager.closeAll();
  if (logger) logger.close();
  app.quit();
}

app.whenReady().then(() => {
  main().then(() => {
    const hotkey = config?.quit_hotkey;
    if (hotkey) {
      const registered = globalShortcut.register(hotkey, quitApp);
      if (registered) {
        logger?.info(`Hotkey de sortie enregistrée: ${hotkey}`);
      } else {
        logger?.warn(`Impossible d'enregistrer la hotkey: ${hotkey}`);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (autoRestartTimer) clearTimeout(autoRestartTimer);
  if (blackout) blackout.stop();
  if (logger) logger.close();
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (windowManager) windowManager.closeAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    main();
  }
});
