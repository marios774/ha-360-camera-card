# Veröffentlichung auf GitHub und Installation über HACS

Diese Anleitung geht davon aus, dass das Repository
`ha-360-camera-card` heißen soll. Der Name ist wichtig, weil HACS nach einer
JavaScript-Datei mit demselben Namen sucht.

## 1. GitHub-Konto und Repository

1. Bei GitHub anmelden.
2. Oben rechts **New repository** wählen.
3. Repository-Name: `ha-360-camera-card`
4. Sichtbarkeit: **Public**
5. README, Lizenz und `.gitignore` nicht automatisch erzeugen, da sie bereits
   im Paket enthalten sind.
6. **Create repository** auswählen.

## 2. Paket lokal entpacken

Das ZIP vollständig entpacken. Im entpackten Ordner müssen direkt Dateien wie
`README.md`, `hacs.json` und `package.json` sichtbar sein.

## 3. Git installieren

Auf macOS genügt häufig:

```bash
git --version
```

Falls macOS die Command Line Tools anbietet, diese installieren.

## 4. Repository initialisieren

Im Terminal in den entpackten Projektordner wechseln:

```bash
cd /PFAD/ZU/ha-360-camera-card
git init
git branch -M main
git add .
git commit -m "Initial release 1.0.0"
git remote add origin https://github.com/DEIN_GITHUB_NAME/ha-360-camera-card.git
git push -u origin main
```

`DEIN_GITHUB_NAME` durch den eigenen GitHub-Namen ersetzen.

GitHub kann beim ersten Push eine Anmeldung über Browser oder Personal Access
Token verlangen.

## 5. Repository-Einstellungen für HACS

Auf der GitHub-Seite des Repositorys rechts neben **About** auf das Zahnrad
klicken.

Beschreibung:

`Interactive WebGL 360° and fisheye camera card for Home Assistant`

Topics:

- `home-assistant`
- `hacs`
- `lovelace`
- `camera`
- `webrtc`
- `go2rtc`
- `fisheye`
- `unifi-protect`

## 6. GitHub Pages aktivieren

1. **Settings → Pages**
2. Unter **Build and deployment** als Source **GitHub Actions** auswählen.
3. Der Workflow `GitHub Pages` veröffentlicht anschließend die Seite.

Die Adresse lautet danach typischerweise:

`https://DEIN_GITHUB_NAME.github.io/ha-360-camera-card/`

## 7. Erstes Release veröffentlichen

Das Release kann automatisch über den enthaltenen Workflow erzeugt werden.

Im Terminal:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Der Workflow führt Build und Tests aus und erzeugt ein GitHub Release mit:

- `ha-360-camera-card.js`
- `ha-360-camera-card.zip`

Prüfung:

1. GitHub öffnen.
2. Bereich **Actions** kontrollieren.
3. Nach erfolgreichem Lauf **Releases** öffnen.
4. Das Release `v1.0.0` sollte vorhanden sein.

## 8. Installation als benutzerdefiniertes HACS-Repository

In Home Assistant:

1. **HACS** öffnen.
2. Menü oben rechts öffnen.
3. **Benutzerdefinierte Repositories** wählen.
4. URL eingeben:

   `https://github.com/DEIN_GITHUB_NAME/ha-360-camera-card`

5. Kategorie **Dashboard** auswählen.
6. Repository hinzufügen.
7. **Home Assistant 360 Camera Card** installieren.
8. Browser-Cache vollständig neu laden.

## 9. Karte verwenden

```yaml
type: custom:ha-360-camera-card
title: AI 360
camera_profile: unifi_ai360
whep_url: http://DEINE_GO2RTC_IP:1984/api/webrtc?src=ai360
height: 560
yaw: 0
pitch: 55
roll: 180
fov: 90
control_invert_x: true
control_invert_y: true
storage_key: ai360-garten
```

Die bisherige Bezeichnung funktioniert weiterhin:

```yaml
type: custom:unifi-ai360-view-card
```

Neue Dokumentation sollte jedoch `custom:ha-360-camera-card` verwenden.

## 10. Eine neue Version veröffentlichen

1. Änderungen in `src/ha-360-camera-card.js` durchführen.
2. Versionsnummer in `package.json`, `CHANGELOG.md` und im Quellcode anpassen.
3. Neu bauen:

```bash
npm install
npm run build
npm test
```

4. Commit und Push:

```bash
git add .
git commit -m "Prepare release 1.0.1"
git push
```

5. Tag setzen:

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions erstellt das Release automatisch.

## 11. Aufnahme in den offiziellen HACS-Katalog

Zunächst sollte das Repository einige Zeit als Custom Repository getestet
werden. Anschließend kann gemäß der aktuellen HACS-Dokumentation ein Antrag
auf Aufnahme als Standard-Repository gestellt werden.

Vorher prüfen:

- Repository ist öffentlich.
- GitHub-Beschreibung ist gesetzt.
- Topics sind gesetzt.
- README enthält Installation und Verwendung.
- `hacs.json` liegt im Stammverzeichnis.
- `dist/ha-360-camera-card.js` existiert.
- Repository und JS-Datei heißen beide `ha-360-camera-card`.
- Releases wurden tatsächlich veröffentlicht; Tags allein reichen für die
  Versionsauswahl in HACS nicht.
