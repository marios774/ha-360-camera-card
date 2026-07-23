# Changelog

## v1.1.3

# 🇬🇧 English

## ✨ New

### Presets

You can now save up to four camera views.

Each preset stores:

- Custom name
- MDI icon
- Yaw
- Pitch
- Roll
- Field of View

Presets can be:

- Created
- Updated
- Deleted

### Improved Card Editor

The Lovelace editor has been expanded and reorganized.

New sections:

- General
- Home Position
- Controls
- Presets

The Home Position can now be configured directly from the visual editor.


### Camera Profiles

Improved support for:

- UniFi AI360
- UniFi G6 Pro 360

Changing the camera profile now correctly updates the related projection parameters.

### User Interface

- New button icons
- Improved control layout
- Better mobile experience
- Cleaner editor layout


### Documentation

The documentation has been redesigned.

New content includes:

- Hero image
- Before/After comparison
- Improved installation guide
- Additional examples
- Extended documentation


## 🐞 Fixed

- Fixed keyboard navigation
- Fixed Home button behavior
- Fixed camera position resetting after using control buttons
- Fixed preset editing and deletion
- Various UI improvements and bug fixes


## 🔄 Compatibility

Existing dashboards remain fully compatible.

No configuration changes are required.


# 🇩🇪 Deutsch

## ✨ Neu

### Presets

Es können jetzt bis zu vier Kamerapositionen gespeichert werden.

Jedes Preset speichert:

- individuellen Namen
- MDI-Symbol
- Yaw
- Pitch
- Roll
- Sichtfeld (FOV)

Presets können:

- gespeichert
- überschrieben
- gelöscht

werden.

### Verbesserter Karteneditor

Der Lovelace-Editor wurde erweitert und übersichtlicher gestaltet.

Neue Bereiche:

- Allgemein
- Home-Position
- Bedienung
- Presets

Die Home-Position kann jetzt direkt im visuellen Editor festgelegt werden.

### Kameraprofile

Verbesserte Unterstützung für:

- UniFi AI360
- UniFi G6 Pro 360

Beim Wechsel des Kameraprofils werden die zugehörigen Projektionsparameter jetzt korrekt übernommen.


### Benutzeroberfläche

- Neue Button-Symbole
- Verbesserte Anordnung der Bedienelemente
- Optimierte Darstellung auf mobilen Geräten
- Übersichtlichere Editoransicht


### Dokumentation

Die Dokumentation wurde vollständig überarbeitet.

Neu enthalten sind:

- Hero-Bild
- Vorher-/Nachher-Vergleich
- Verbesserte Installationsanleitung
- Weitere Beispiele
- Erweiterte Dokumentation


## 🐞 Fehlerbehebungen

- Tastatursteuerung korrigiert
- Verhalten des Home-Buttons verbessert
- Problem behoben, bei dem die Kamera nach der Bedienung über Buttons auf die Home-Position zurücksprang
- Bearbeiten und Löschen von Presets korrigiert
- Verschiedene Verbesserungen und Fehlerkorrekturen der Benutzeroberfläche


## 🔄 Kompatibilität

Bestehende Dashboards bleiben vollständig kompatibel.

Es sind keine Änderungen an bestehenden Konfigurationen erforderlich.

# Changelog

## 1.1.2 — 2026-07-23

### Added
- Preset editor directly inside the camera card
- Name and Home Assistant MDI icon picker for each preset
- Save, overwrite and delete actions
- Up to four browser-local presets
- Preset buttons show only the selected icon
- Empty preset slots are hidden automatically

### Changed
- Removed numbered preset buttons and YAML named preset buttons
- Preset icons replace names and numbers in the camera overlay

## 1.1.1 — 2026-07-23

### Fixed
- Keyboard control now works reliably after focusing the camera view
- Control buttons no longer trigger the Home view through the double-click handler
- Pointer gestures ignore all control buttons

### Changed
- Removed the mini-compass completely
- Left/right controls now use Material Design undo/redo icons

## 1.1.0 — 2026-07-23

### Added
- Visual Lovelace editor for common settings
- Optional mini-compass showing yaw and pitch
- Up to six named YAML view buttons
- Pinch-to-zoom on touch devices
- Double-click/double-tap Home
- Keyboard shortcut `H` for Home
- Generic circular-fisheye profile

### Fixed
- Duplicate values-overlay call during YAML export

### Compatibility
- Existing `custom:unifi-ai360-view-card` configurations continue to work

## 1.0.0 — 2026-07-23
- Initial public release
