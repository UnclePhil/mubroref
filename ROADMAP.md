# Roadmap MubroRef

## ✅ Terminé

### Core
- [x] Chargement et validation de la configuration (JSON)
- [x] Logger console + fichier avec rotation
- [x] Création de fenêtres plein écran sur tous les écrans
- [x] Modes fullscreen et kiosk
- [x] Assignation d'URLs : sequential, cycle, random, match_by_name
- [x] Rafraîchissement automatique des pages
- [x] Proxy configurable
- [x] Sessions isolées par écran
- [x] Redémarrage automatique de l'application
- [x] Page d'erreur personnalisée
- [x] Retry automatique (3 tentatives)
- [x] Timeout réseau configurable

### Extras
- [x] Blackout programmé (plage horaire avec horloge)
- [x] Vidage du cache automatique
- [x] Hotkey de sortie configurable (`quit_hotkey`)

## 📝 À faire

### Prioritaire
- [ ] Ajouter une interface de configuration minimale (mode admin)
- [ ] Dashboard avec état des écrans (URL, dernière mise à jour, erreurs)
- [ ] Rechargement individuel par fenêtre (hotkey ou API)

### Améliorations
- [ ] Support du glisser-déposer d'URLs pour assignation visuelle
- [ ] Mode veille automatique (détection d'inactivité)
- [ ] Snapshots périodiques des écrans (logs visuels)
- [ ] Affichage d'une notification en cas d'erreur prolongée
- [ ] Support des fichiers locaux (HTML, images) en plus des URLs
- [ ] Export des logs vers un service distant (syslog, HTTP)

### Technique
- [ ] Tests unitaires (Jest ou similaire)
- [ ] CI/CD avec GitHub Actions
- [ ] Packaging national (AppImage, deb, NSIS)
- [ ] Mise à jour automatique (electron-updater)
- [ ] Signatures de builds (Windows/ macOS)

### Expérience utilisateur
- [ ] Documentation utilisateur complète
- [ ] Outil en ligne de commande pour contrôle à distance (IPC)
