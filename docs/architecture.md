# Architecture de MubroRef

## Vue d'ensemble

Application Electron multi-écrans plein écran pour afficher des pages web sur plusieurs moniteurs avec rafraîchissement automatique.

```
main.js
├── src/config.js         → Chargement et validation de la configuration
├── src/logger.js         → Logs console + fichier avec rotation
├── src/window-manager.js → Création/gestion des fenêtres Electron
├── src/blackout.js       → Gestion des périodes d'extinction
└── preload.js            → Pont sécurisé main→renderer
```

## Flux de démarrage

1. `main.js:main()` lit la config via `Config.load()`
2. Crée un `Logger` (console + fichier avec rotation)
3. Vide le cache si `clear_cache_on_start`
4. Crée un `WindowManager` qui :
   - Détecte les écrans via `screen.getAllDisplays()`
   - Assigne les URLs selon la stratégie (`sequential`, `cycle`, `random`, `match_by_name`)
   - Crée une `BrowserWindow` par écran en fullscreen/kiosk
   - Configure proxy, sessions isolées, timeouts, retry automatique
5. Démarre le `Blackout` si un horaire est défini
6. Configure le redémarrage automatique (`auto_restart_hours`)

## Modules

### `src/config.js`
- **DEFAULTS** : valeurs par défaut de toutes les options
- **load(filePath)** : lit et valide le JSON, fusionne avec DEFAULTS
- **validate(config)** : vérifie tous les champs (types, valeurs autorisées, format)
- **getConfigPath()** : cherche le fichier via `--config=` ou `config.json`

### `src/logger.js`
- Écriture console avec couleurs + fichier `logs/app.log`
- Rotation automatique basée sur la taille (`log_max_size_mb`)
- Niveaux : `error`, `warn`, `info`, `debug`
- Gestion silencieuse des erreurs d'écriture fichier

### `src/window-manager.js`
- **assignUrls(numDisplays)** : distribue les URLs sur les écrans
- **createWindows()** : boucle sur les écrans, crée les fenêtres, configure timers
- **Gestion d'erreurs** : page d'erreur personnalisée + retry (3 tentatives, 5s délai)
- **Rafraîchissement** : timer périodique rechargeant chaque URL
- **Cache** : vidage périodique si configuré
- **closeAll()** : nettoie timers et fenêtres

### `src/blackout.js`
- Plage horaire configurable (`HH:MM-HH:MM`, support minuit+)
- Affiche une page noire avec horloge optionnelle
- Vérification toutes les 30 secondes

## Configurations clés

| Option | Défaut | Description |
|--------|--------|-------------|
| `mode` | `fullscreen` | `fullscreen` ou `kiosk` |
| `url_assignment` | `sequential` | `sequential`, `cycle`, `random`, `match_by_name` |
| `refresh_interval_minutes` | 5 | 0 = pas de rafraîchissement |
| `isolate_sessions` | false | Session Electron par écran |
| `auto_restart_hours` | 0 | 0 = pas de redémarrage automatique |
| `quit_hotkey` | `Ctrl+Shift+Q` | Raccourci clavier pour quitter |

## Sécurité
- `nodeIntegration: false`, `contextIsolation: true`
- `preload.js` minimal exposant uniquement `process.platform`
- Fenêtres non redimensionnables, non déplaçables, toujours au premier plan
