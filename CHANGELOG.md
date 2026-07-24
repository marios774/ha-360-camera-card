# Changelog

All notable changes to this project will be documented in this file.

---

# v1.2.0

## 🇬🇧 English

### ✨ New Features

#### Camera Installation

A completely new installation concept has been introduced.

Instead of manually configuring control inversion, users can now simply select how the camera is mounted.

Supported installation types:

- Ceiling
- Wall
- Sloped roof
- Pole
- Custom

#### Automatic Control Orientation

Mouse, touch, keyboard and on-screen controls are automatically adapted to the selected installation type.

No manual inversion settings are required anymore.

#### Installation Settings

New configuration options:

- Mounting mode
- Rotation (0°, 90°, 180°, 270°)
- Roof tilt angle
- Custom yaw, pitch and roll

#### Visual Editor

The Lovelace editor now includes a dedicated **Camera Installation** section for easy configuration.

---

### 🚀 Improvements

- Improved camera orientation handling
- Better control behavior for non-standard installations
- Cleaner editor layout
- Improved configuration structure

---

### 🐞 Fixed

- Improved control consistency
- Better handling of camera orientation
- Minor UI improvements
- Various bug fixes

---

### 🔄 Compatibility

This release is fully backwards compatible.

Existing dashboards continue to work without any configuration changes.

---

## 🇩🇪 Deutsch

### ✨ Neue Funktionen

#### Kameramontage

Es wurde ein komplett neues Montagekonzept eingeführt.

Anstatt Maus- oder Touchsteuerung manuell invertieren zu müssen, kann jetzt einfach die tatsächliche Montagelage der Kamera ausgewählt werden.

Unterstützte Montagearten:

- Decke
- Wand
- Schräger Dachüberstand
- Mast
- Benutzerdefiniert

#### Automatische Bedienung

Maus-, Touch-, Tastatur- und Bildschirmsteuerung passen sich automatisch an die gewählte Montageart an.

Eine manuelle Invertierung ist nicht mehr erforderlich.

#### Montageeinstellungen

Neue Konfigurationsmöglichkeiten:

- Montageart
- Drehung (0°, 90°, 180°, 270°)
- Dachneigung
- Benutzerdefinierte Yaw-, Pitch- und Roll-Werte

#### Visueller Editor

Der Lovelace-Editor besitzt jetzt einen eigenen Bereich **Kameramontage**, über den alle Einstellungen komfortabel vorgenommen werden können.

---

### 🚀 Verbesserungen

- Verbesserte Behandlung der Kamerarichtung
- Optimierte Bedienung bei ungewöhnlichen Montagepositionen
- Übersichtlichere Editorstruktur
- Verbesserte Konfigurationslogik

---

### 🐞 Fehlerbehebungen

- Konsistentere Bedienung
- Verbesserte Behandlung der Kameraposition
- Kleinere Verbesserungen der Benutzeroberfläche
- Diverse Fehlerkorrekturen

---

### 🔄 Kompatibilität

Diese Version ist vollständig abwärtskompatibel.

Bestehende Dashboards funktionieren ohne Änderungen.

---

# v1.1.3

## 🇬🇧 English

### ✨ New Features

#### Presets

You can now save up to four camera views.

Each preset stores:

- Custom name
- MDI icon
- Yaw
- Pitch
- Roll
- Field of View (FOV)

Presets can be created, updated and deleted.

#### Improved Card Editor

The Lovelace editor has been expanded and reorganized.

New sections:

- General
- Home Position
- Controls
- Presets

#### Camera Profiles

Improved support for:

- UniFi AI360
- UniFi G6 Pro 360

Changing the camera profile now correctly updates the related projection parameters.

#### User Interface

- New button icons
- Improved control layout
- Better mobile support
- Cleaner editor

#### Documentation

The documentation has been redesigned with:

- Hero image
- Before/After comparison
- Better installation guide
- Additional examples

---

### 🐞 Fixed

- Fixed keyboard navigation
- Fixed Home button behavior
- Fixed camera position resetting after using control buttons
- Fixed preset editing
- Various UI improvements

---

### 🔄 Compatibility

Fully backwards compatible.

---

## 🇩🇪 Deutsch

### ✨ Neue Funktionen

#### Presets

Es können jetzt bis zu vier Kamerapositionen gespeichert werden.

Jedes Preset speichert:

- Namen
- MDI-Symbol
- Yaw
- Pitch
- Roll
- Sichtfeld (FOV)

#### Verbesserter Karteneditor

Der Lovelace-Editor wurde erweitert.

Neue Bereiche:

- Allgemein
- Home-Position
- Bedienung
- Presets

#### Kameraprofile

Verbesserte Unterstützung für:

- UniFi AI360
- UniFi G6 Pro 360

Beim Wechsel des Kameraprofils werden jetzt automatisch die passenden Projektionsparameter übernommen.

#### Benutzeroberfläche

- Neue Button-Symbole
- Verbesserte Bedienung
- Optimierte mobile Darstellung
- Übersichtlichere Editoransicht

#### Dokumentation

Neue Dokumentation mit:

- Hero-Bild
- Vorher-/Nachher-Vergleich
- Verbesserter Installationsanleitung
- Zusätzlichen Beispielen

---

### 🐞 Fehlerbehebungen

- Tastatursteuerung korrigiert
- Verhalten des Home-Buttons verbessert
- Kamera springt nicht mehr unerwartet zurück
- Presets können korrekt bearbeitet werden
- Diverse Fehlerkorrekturen

---

### 🔄 Kompatibilität

Vollständig abwärtskompatibel.

---

# v1.1.2

## 🇬🇧 English

### ✨ New Features

- Added preset management
- Save, overwrite and delete presets
- Support for custom icons
- Maximum of four presets

## 🇩🇪 Deutsch

### ✨ Neue Funktionen

- Preset-Verwaltung hinzugefügt
- Presets speichern, überschreiben und löschen
- Unterstützung für individuelle MDI-Symbole
- Maximal vier Presets

---

# v1.1.1

## 🇬🇧 English

### ✨ Improvements

- Improved keyboard support
- Improved Home button behavior
- Updated button icons
- Removed compass

## 🇩🇪 Deutsch

### ✨ Verbesserungen

- Verbesserte Tastatursteuerung
- Home-Button überarbeitet
- Neue Button-Symbole
- Kompass entfernt

---

# v1.1.0

## 🇬🇧 English

### ✨ New Features

- Visual editor
- Home position
- Keyboard navigation
- Better touch controls

## 🇩🇪 Deutsch

### ✨ Neue Funktionen

- Visueller Editor
- Home-Position
- Tastatursteuerung
- Verbesserte Touch-Bedienung

---

# v1.0.1

## 🇬🇧 English

### Initial public release

- WebGL renderer
- WebRTC / WHEP support
- UniFi AI360 support
- Hemisphere projection
- Mouse and touch controls
- Home Assistant integration
- HACS support

## 🇩🇪 Deutsch

### Erste öffentliche Version

- WebGL-Renderer
- WebRTC-/WHEP-Unterstützung
- Unterstützung der UniFi AI360
- Hemisphären-Projektion
- Maus- und Touchsteuerung
- Home-Assistant-Integration
- HACS-Unterstützung