const { BrowserWindow, screen, session, app } = require('electron');
const path = require('path');

const ERROR_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1a2e;color:#eee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center}
.container{text-align:center;max-width:600px;padding:2rem}
.icon{font-size:64px;margin-bottom:1rem;opacity:0.6}
h1{font-size:1.5rem;margin-bottom:0.5rem;color:#e94560}
p{color:#aaa;line-height:1.6}
.url{margin-top:1rem;padding:0.75rem 1rem;background:#16213e;border-radius:8px;font-family:monospace;font-size:0.9rem;word-break:break-all;color:#888}
</style>
</head>
<body>
<div class="container">
<div class="icon">⚠</div>
<h1>Page indisponible</h1>
<p>Impossible de charger l'URL.</p>
<div class="url" id="url"></div>
</div>
<script>document.getElementById('url').textContent=decodeURIComponent(location.hash.slice(1))</script>
</body>
</html>
`)}`;

const LOADING_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#0d0d0d;display:flex;align-items:center;justify-content:center}
.spinner{width:48px;height:48px;border:4px solid #333;border-top-color:#0f3460;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="spinner"></div>
</body>
</html>
`)}`;

class WindowManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.windows = [];
    this.refreshTimers = [];
    this.cacheTimers = [];
    this.loadingTimeouts = [];
  }

  assignUrls(numDisplays) {
    const { urls, display_mapping, url_assignment } = this.config;
    const result = [];

    if (display_mapping && display_mapping.length > 0) {
      const displays = screen.getAllDisplays();
      for (let i = 0; i < numDisplays; i++) {
        const display = displays[i];
        const mapped = display_mapping.find(m => m.display_name === (display.label || display.id));
        result.push(mapped ? mapped.url : urls[0]);
      }
      return result;
    }

    switch (url_assignment) {
      case 'sequential': {
        for (let i = 0; i < numDisplays; i++) {
          result.push(urls[Math.min(i, urls.length - 1)]);
        }
        break;
      }
      case 'cycle': {
        for (let i = 0; i < numDisplays; i++) {
          result.push(urls[i % urls.length]);
        }
        break;
      }
      case 'random': {
        for (let i = 0; i < numDisplays; i++) {
          result.push(urls[Math.floor(Math.random() * urls.length)]);
        }
        break;
      }
      default: {
        for (let i = 0; i < numDisplays; i++) {
          result.push(urls[Math.min(i, urls.length - 1)]);
        }
      }
    }

    return result;
  }

  async createWindows() {
    const displays = screen.getAllDisplays();
    const urls = this.assignUrls(displays.length);

    this.logger.info(`Écrans détectés: ${displays.length}`);
    displays.forEach((d, i) => {
      this.logger.info(`  Écran ${i}: ${d.size.width}x${d.size.height} à (${d.bounds.x},${d.bounds.y}) [${d.label || d.id}]`);
    });

    for (let i = 0; i < displays.length; i++) {
      const display = displays[i];
      const url = urls[i];

      this.logger.info(`Création fenêtre ${i} sur écran ${i} → ${url}`);

      let ses = session.defaultSession;
      if (this.config.isolate_sessions) {
        ses = session.fromPartition(`persist:display-${i}`);
      }

      if (this.config.proxy) {
        try {
          await ses.setProxy({
            proxyRules: this.config.proxy,
            proxyBypassRules: this.config.proxy_bypass,
          });
        } catch (err) {
          this.logger.warn(`Proxy non appliqué pour écran ${i}: ${err.message}`);
        }
      }

      const winOptions = {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        frame: this.config.mode === 'kiosk',
        autoHideMenuBar: true,
        resizable: false,
        movable: false,
        closable: false,
        fullscreenable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '..', 'preload.js'),
          session: ses,
        },
      };

      if (this.config.mode === 'kiosk') {
        delete winOptions.x;
        delete winOptions.y;
      }

      const win = new BrowserWindow(winOptions);

      if (this.config.mode === 'kiosk') {
        win.setKiosk(true);
      } else {
        win.setFullScreen(true);
      }

      win.setMenu(null);
      win.setAlwaysOnTop(true, 'screen-saver');

      if (this.config.show_devtools) {
        win.webContents.openDevTools({ mode: 'detach' });
      }

      this._setupWindowEvents(win, i, url);
      this._loadUrlWithTimeout(win, i, url);

      this.windows.push(win);
    }

    this._setupRefreshTimers(urls);
    this._setupCacheClearTimer();

    return this.windows;
  }

  _setupWindowEvents(win, index, url) {
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      this.logger.warn(`Fenêtre ${index} - échec chargement ${validatedURL || url}: ${errorDescription} (${errorCode})`);

      if (this.config.retry_on_error) {
        this._retryLoad(win, index, url, 0);
      } else if (this.config.show_error_page) {
        win.loadURL(`${ERROR_PAGE}#${encodeURIComponent(url)}`);
      }
    });

    win.webContents.on('did-finish-load', () => {
      this.logger.debug(`Fenêtre ${index} - chargée: ${win.webContents.getURL()}`);
    });

    win.on('closed', () => {
      this.logger.info(`Fenêtre ${index} fermée`);
    });
  }

  _loadUrlWithTimeout(win, index, url) {
    win.loadURL(LOADING_PAGE);

    const timeoutMs = this.config.network_timeout_seconds * 1000;
    const timeout = setTimeout(() => {
      if (!win.isDestroyed() && win.webContents.getURL() !== url) {
        this.logger.warn(`Fenêtre ${index} - timeout (${this.config.network_timeout_seconds}s) pour ${url}`);
        if (this.config.show_error_page) {
          win.loadURL(`${ERROR_PAGE}#${encodeURIComponent(url)}`);
        }
      }
    }, timeoutMs);

    this.loadingTimeouts.push(timeout);
    win.loadURL(url);
  }

  async _retryLoad(win, index, url, attempt) {
    const maxRetries = 3;
    const delay = 5000;

    if (attempt >= maxRetries) {
      this.logger.error(`Fenêtre ${index} - échec après ${maxRetries} tentatives pour ${url}`);
      if (this.config.show_error_page) {
        win.loadURL(`${ERROR_PAGE}#${encodeURIComponent(url)}`);
      }
      return;
    }

    this.logger.info(`Fenêtre ${index} - nouvelle tentative (${attempt + 1}/${maxRetries}) dans 5s...`);
    await new Promise(r => setTimeout(r, delay));
    if (win.isDestroyed()) return;

    this._loadUrlWithTimeout(win, index, url);
  }

  _setupRefreshTimers(urls) {
    if (this.config.refresh_interval_minutes <= 0) return;

    const intervalMs = this.config.refresh_interval_minutes * 60 * 1000;
    this.logger.info(`Rafraîchissement toutes les ${this.config.refresh_interval_minutes} minutes`);

    const timer = setInterval(() => {
      this.windows.forEach((win, i) => {
        if (!win.isDestroyed()) {
          const currentUrl = urls[i];
          this.logger.info(`Rafraîchissement fenêtre ${i}: ${currentUrl}`);
          win.loadURL(currentUrl);
        }
      });
    }, intervalMs);

    this.refreshTimers.push(timer);
  }

  _setupCacheClearTimer() {
    if (this.config.clear_cache_interval_minutes <= 0) return;

    const intervalMs = this.config.clear_cache_interval_minutes * 60 * 1000;
    this.logger.info(`Vidage du cache toutes les ${this.config.clear_cache_interval_minutes} minutes`);

    const timer = setInterval(async () => {
      this.logger.info('Vidage périodique du cache');
      try {
        await session.defaultSession.clearCache();
      } catch (err) {
        this.logger.warn(`Échec vidage cache: ${err.message}`);
      }
    }, intervalMs);

    this.cacheTimers.push(timer);
  }

  closeAll() {
    this.refreshTimers.forEach(t => clearInterval(t));
    this.cacheTimers.forEach(t => clearInterval(t));
    this.loadingTimeouts.forEach(t => clearTimeout(t));

    this.windows.forEach(win => {
      if (!win.isDestroyed()) win.close();
    });

    this.windows = [];
    this.refreshTimers = [];
    this.cacheTimers = [];
    this.loadingTimeouts = [];
  }

  getWindows() {
    return this.windows;
  }
}

module.exports = WindowManager;
