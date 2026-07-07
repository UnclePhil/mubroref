const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  refresh_interval_minutes: 5,
  mode: 'fullscreen',
  show_devtools: false,
  url_assignment: 'sequential',
  urls: [],
  display_mapping: [],
  clear_cache_on_start: true,
  clear_cache_interval_minutes: 0,
  isolate_sessions: false,
  auto_restart_hours: 0,
  log_level: 'info',
  log_max_files: 5,
  log_max_size_mb: 1,
  retry_on_error: true,
  network_timeout_seconds: 30,
  show_error_page: false,
  proxy: null,
  proxy_bypass: '',
  blackout_schedule: '',
  blackout_show_clock: false,
  quit_hotkey: 'Ctrl+Alt+Q',
};

const VALID_MODES = ['fullscreen', 'kiosk'];
const VALID_LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const VALID_ASSIGNMENTS = ['sequential', 'cycle', 'random', 'match_by_name'];

function validate(config) {
  const errors = [];

  if (!Array.isArray(config.urls) || config.urls.length === 0) {
    errors.push('urls: doit être un tableau non vide d\'URLs');
  }

  config.urls.forEach((url, i) => {
    if (typeof url !== 'string') {
      errors.push(`urls[${i}]: doit être une chaîne de caractères`);
    }
  });

  if (!VALID_MODES.includes(config.mode)) {
    errors.push(`mode: "${config.mode}" invalide. Valeurs acceptées: ${VALID_MODES.join(', ')}`);
  }

  if (!VALID_LOG_LEVELS.includes(config.log_level)) {
    errors.push(`log_level: "${config.log_level}" invalide. Valeurs acceptées: ${VALID_LOG_LEVELS.join(', ')}`);
  }

  if (!VALID_ASSIGNMENTS.includes(config.url_assignment)) {
    errors.push(`url_assignment: "${config.url_assignment}" invalide. Valeurs acceptées: ${VALID_ASSIGNMENTS.join(', ')}`);
  }

  if (typeof config.refresh_interval_minutes !== 'number' || config.refresh_interval_minutes < 0) {
    errors.push('refresh_interval_minutes: doit être un nombre >= 0 (0 = pas de rafraîchissement)');
  }

  if (typeof config.auto_restart_hours !== 'number' || config.auto_restart_hours < 0) {
    errors.push('auto_restart_hours: doit être un nombre >= 0');
  }

  if (config.network_timeout_seconds < 1) {
    errors.push('network_timeout_seconds: doit être >= 1');
  }

  if (config.display_mapping && !Array.isArray(config.display_mapping)) {
    errors.push('display_mapping: doit être un tableau');
  }

  if (config.blackout_schedule && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(config.blackout_schedule)) {
    errors.push('blackout_schedule: format attendu HH:MM-HH:MM (ex: "22:00-06:00")');
  }

  return errors;
}

function load(filePath) {
  let raw;

  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Impossible de lire ${filePath}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Erreur de parsing JSON dans ${filePath}: ${err.message}`);
  }

  const config = { ...DEFAULTS, ...parsed };
  config.__configPath = filePath;

  const errors = validate(config);
  if (errors.length > 0) {
    throw new Error(`Configuration invalide:\n  - ${errors.join('\n  - ')}`);
  }

  return config;
}

function findConfig() {
  const searchPaths = [
    process.argv[2] || null,
    path.join(__dirname, '..', 'config.json'),
    path.join(__dirname, '..', 'config.jsonc'),
  ];

  for (const p of searchPaths) {
    if (p && fs.existsSync(p)) return p;
  }

  return null;
}

function getConfigPath() {
  const cliIndex = process.argv.indexOf('--config');
  if (cliIndex !== -1 && process.argv[cliIndex + 1]) {
    return path.resolve(process.argv[cliIndex + 1]);
  }

  const local = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(local)) return local;

  return local;
}

module.exports = { load, findConfig, getConfigPath, DEFAULTS };
