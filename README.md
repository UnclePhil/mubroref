# MubroRef

Application Electron multi-écrans plein écran pour afficher des pages web sur plusieurs moniteurs avec rafraîchissement automatique.

## Installation

```bash
npm install
```

## Configuration

Copie et édite le fichier de configuration :

```bash
cp config.example.json config.json
```

Configure les URLs, le mode d'affichage et la fréquence de rafraîchissement dans `config.json`.

### Options principales

| Option | Défaut | Description |
|--------|--------|-------------|
| `urls` | `[]` | Liste des URLs à afficher |
| `mode` | `fullscreen` | `fullscreen` ou `kiosk` |
| `url_assignment` | `sequential` | `sequential`, `cycle`, `random`, `match_by_name` |
| `refresh_interval_minutes` | `5` | Intervalle de rafraîchissement (0 = désactivé) |
| `blackout_schedule` | `""` | Plage horaire d'extinction (ex: `"22:00-06:00"`) |
| `quit_hotkey` | `Ctrl+Alt+Q` | Raccourci clavier pour quitter l'application |

## Utilisation

```bash
npm start            # Mode normal
npm run start:dev    # Mode développement (devtools)
```

### Raccourcis

- `Ctrl+Alt+Q` — Quitter l'application (configurable dans `config.json`)

## Build

```bash
npm run dist:linux   # Linux (AppImage + deb)
npm run dist:win     # Windows (NSIS)
```

## Structure

```
mubroref/
├── main.js              # Point d'entrée Electron
├── preload.js           # Pont sécurisé main → renderer
├── config.example.json  # Template de configuration
├── src/
│   ├── config.js        # Chargement et validation
│   ├── logger.js        # Logs console + fichier
│   ├── window-manager.js # Gestion des fenêtres
│   └── blackout.js      # Blackout programmé
├── docs/
│   └── architecture.md  # Documentation technique
└── assets/
```
