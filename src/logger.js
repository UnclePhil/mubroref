const fs = require('fs');
const path = require('path');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
};

class Logger {
  constructor(config) {
    this.level = LEVELS[config.log_level] ?? LEVELS.info;
    this.maxFiles = config.log_max_files || 5;
    this.maxSize = (config.log_max_size_mb || 1) * 1024 * 1024;

    const logDir = path.join(path.dirname(config.__configPath || __dirname), 'logs');
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (e) {
        // silently fail - logging to file disabled
      }
    }
    this.logPath = path.join(logDir, 'app.log');
    this._stream = null;
  }

  _getStream() {
    if (!this._stream && this.logPath) {
      try {
        this._stream = fs.createWriteStream(this.logPath, { flags: 'a' });
        this._stream.on('error', () => { this._stream = null; });
      } catch (e) {
        return null;
      }
    }
    return this._stream;
  }

  _rotate() {
    try {
      if (!fs.existsSync(this.logPath)) return;

      const stat = fs.statSync(this.logPath);
      if (stat.size < this.maxSize) return;

      this._stream.end();
      this._stream = null;

      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldPath = `${this.logPath}.${i}`;
        const newPath = `${this.logPath}.${i + 1}`;
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
      }

      if (fs.existsSync(this.logPath)) {
        fs.renameSync(this.logPath, `${this.logPath}.1`);
      }
    } catch (e) {
      // rotation failed silently
    }
  }

  _log(level, ...args) {
    if (LEVELS[level] > this.level) return;

    const timestamp = new Date().toISOString();
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Console avec couleur
    const color = COLORS[level] || '';
    console.log(`${color}${line}${COLORS.reset}`);

    // Fichier
    this._rotate();
    const stream = this._getStream();
    if (stream) {
      stream.write(line + '\n');
    }
  }

  error(...args) { this._log('error', ...args); }
  warn(...args) { this._log('warn', ...args); }
  info(...args) { this._log('info', ...args); }
  debug(...args) { this._log('debug', ...args); }

  close() {
    if (this._stream) {
      this._stream.end();
      this._stream = null;
    }
  }
}

module.exports = Logger;
