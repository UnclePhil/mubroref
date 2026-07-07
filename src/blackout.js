const { BrowserWindow } = require('electron');

const BLACKOUT_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;color:#333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;overflow:hidden}
.clock{font-size:clamp(3rem,10vw,8rem);font-weight:300;letter-spacing:0.1em;transition:color 1s;user-select:none}
</style>
</head>
<body>
<div class="clock" id="clock"></div>
<script>
var showClock = SHOW_CLOCK_PLACEHOLDER;
function pad(n){return String(n).padStart(2,'0')}
function update(){
  if(!showClock) return;
  var d=new Date();
  document.getElementById('clock').textContent=pad(d.getHours())+':'+pad(d.getMinutes());
}
setInterval(update,1000);
update();
</script>
</body>
</html>
`)}`;

class Blackout {
  constructor(config, logger, windows) {
    this.config = config;
    this.logger = logger;
    this.windows = windows;
    this.timer = null;
    this.inBlackout = false;
  }

  start() {
    this._check();
    this.timer = setInterval(() => this._check(), 30000);
    this.logger.info(`Blackout programmé: ${this.config.blackout_schedule}`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.inBlackout) {
      this._restoreWindows();
    }
  }

  _check() {
    const now = new Date();
    const [startStr, endStr] = this.config.blackout_schedule.split('-');
    const inBlackout = this._isInInterval(now, startStr, endStr);

    if (inBlackout && !this.inBlackout) {
      this.logger.info('Début de la période de blackout');
      this._blackoutWindows();
      this.inBlackout = true;
    } else if (!inBlackout && this.inBlackout) {
      this.logger.info('Fin de la période de blackout');
      this._restoreWindows();
      this.inBlackout = false;
    }
  }

  _isInInterval(now, startStr, endStr) {
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  _blackoutWindows() {
    this.windows.forEach(win => {
      if (!win.isDestroyed()) {
        const page = BLACKOUT_PAGE.replace('SHOW_CLOCK_PLACEHOLDER', this.config.blackout_show_clock ? 'true' : 'false');
        win.loadURL(page);
      }
    });
  }

  _restoreWindows() {
    // windows will be restored on next refresh cycle
    this.logger.info('Fenêtres restaurées après blackout (prochain rafraîchissement)');
  }
}

module.exports = Blackout;
