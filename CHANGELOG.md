# Changelog

## v1.2.2

> **Corrected build:** Wall mounting orientation 0° now maps pitch 0 to the lower image edge, pitch -180 to the upper edge, yaw 0 to the right edge and yaw -180 to the left edge. Vertical mouse, touch, keyboard and button operation is corrected. The Pole/Mast option has been removed.

> **Korrigierter Build:** Bei Wandmontage mit Ausrichtung 0° entspricht Pitch 0 der Bildunterkante, Pitch -180 der Bildoberkante, Yaw 0 der rechten und Yaw -180 der linken Bildkante. Die vertikale Bedienung per Maus, Touch, Tastatur und Schaltflächen wurde korrigiert. Die Option Pole/Mast wurde entfernt.


### English

#### Added
- Static JPG, PNG and WebP sources using `image_url` or an image URL in `url`.
- Temporary local image browsing directly from the card.
- Optional periodic refresh for Home Assistant snapshot files such as `/local/snapshots/last_motion.jpg`.
- Source type selection in the visual editor: Auto, WebRTC/WHEP, video or static image.

#### Changed
- Mounting modes are now applied as a real world-to-sensor 3D transformation in the WebGL projection.
- Left/right always pans around the vertical axis shown in the mounting diagrams.
- Up/down always tilts around the current horizontal axis.
- Down, Up, Wall, Roof/Sloped and Custom installations now affect the rendered dewarping instead of only remapping input values.
- Standard downward mounting remains mathematically identical to previous versions.

#### Fixed
- Wall, upward-facing and sloped mounting modes previously had little or no visible effect.
- Unified mouse, touch, keyboard and on-screen button behavior across all mounting modes.
- Improved source error messages and cleanup when switching to a static image.

### Deutsch

#### Hinzugefügt
- Statische JPG-, PNG- und WebP-Quellen über `image_url` oder eine Bildadresse in `url`.
- Temporäre lokale Bildauswahl direkt aus der Karte.
- Optionale regelmäßige Aktualisierung von Home-Assistant-Snapshot-Dateien wie `/local/snapshots/last_motion.jpg`.
- Auswahl des Quellentyps im visuellen Editor: Automatisch, WebRTC/WHEP, Video oder statisches Bild.

#### Geändert
- Montagelagen werden jetzt als echte 3D-Transformation von Welt- zu Sensorkoordinaten in der WebGL-Projektion angewendet.
- Links/rechts dreht immer um die in den Grafiken dargestellte vertikale Achse.
- Hoch/runter schwenkt immer um die aktuelle horizontale Achse.
- Nach unten, nach oben, Wand, Dach/Schräge und Benutzerdefiniert beeinflussen nun tatsächlich die Entzerrung und nicht nur die Eingabewerte.
- Die normale Montage nach unten bleibt mathematisch unverändert.

#### Behoben
- Wand-, Überkopf- und Schrägmontage hatten zuvor kaum oder keine sichtbare Auswirkung.
- Einheitliches Verhalten für Maus, Touch, Tastatur und Bildschirmtasten in allen Montagelagen.
- Verbesserte Fehlermeldungen und Bereinigung beim Wechsel zu einem statischen Bild.

---

## v1.2.1

# 🇬🇧 English

## 🐞 Fixed

### Mounting-dependent control axes

The mounting modes now affect the actual movement axes instead of only changing control sensitivity.

- **Downward / normal mounting:** Existing control behavior remains unchanged.
- **Upward mounting:** The control axes are rotated by 180° relative to the normal mounting.
- **Wall mounting:** Horizontal movement pans around an axis positioned 90° to the camera's optical axis.
- **Sloped mounting:** The control axes are continuously tilted by the configured mounting angle.
- **Custom mounting:** Mounting pitch, yaw, roll and rotation are combined to transform the control axes.

The same transformation is used for mouse, touch, keyboard and on-screen direction buttons.

## ✨ Added

- Added a separate **Upward** mounting option.
- Renamed the default option to **Downward / normal mounting** for clarity.

## 🔄 Compatibility

The default downward-facing mounting keeps the previous behavior. Existing configurations using `mounting_mode: ceiling` remain compatible.

---

# 🇩🇪 Deutsch

## 🐞 Fehlerbehebungen

### Von der Montagelage abhängige Steuerachsen

Die Montagearten wirken sich jetzt auf die tatsächlichen Bewegungsachsen aus und verändern nicht mehr lediglich die Empfindlichkeit der Bedienung.

- **Nach unten / normale Montage:** Das bisherige Bedienverhalten bleibt unverändert.
- **Nach oben:** Die Steuerachsen werden gegenüber der normalen Montage um 180° gedreht.
- **Wandmontage:** Die horizontale Bewegung schwenkt um eine Achse, die 90° zur optischen Kameraachse liegt.
- **Schräge Montage:** Die Steuerachsen werden stufenlos um den eingestellten Montagewinkel gekippt.
- **Benutzerdefiniert:** Montage-Pitch, -Yaw, -Roll und Drehung werden gemeinsam zur Transformation der Steuerachsen verwendet.

Dieselbe Transformation gilt für Maus, Touch, Tastatur und die Richtungstasten auf der Karte.

## ✨ Neu

- Separate Montageoption **Nach oben** ergänzt.
- Die Standardoption wurde zur besseren Verständlichkeit in **Nach unten / normale Montage** umbenannt.

## 🔄 Kompatibilität

Bei der normalen, nach unten gerichteten Montage bleibt das bisherige Verhalten erhalten. Bestehende Konfigurationen mit `mounting_mode: ceiling` bleiben kompatibel.

---

## v1.2.0

# 🇬🇧 English

## ✨ New

### Smart Camera Installation

The visual card editor now includes a dedicated **Camera mounting** section. The card can adapt its controls to the physical installation of the camera.

Available installation modes:

- Ceiling / overhead
- Wall
- Roof / sloped surface
- Custom

Depending on the selected mode, the editor provides:

- Camera rotation: 0°, 90°, 180° or 270°
- Tilt angle for sloped mounting
- Custom mounting yaw, pitch and roll
- A visual mounting preview

The selected installation affects:

- Mouse dragging
- Touch gestures
- Keyboard navigation
- Direction buttons

Camera calibration and the selected camera profile remain independent from the mounting configuration.

## 🔄 Compatibility

Existing configurations remain compatible. Cards without mounting settings use the default ceiling installation with 0° rotation.

The existing `control_invert_x` and `control_invert_y` options continue to work for advanced or legacy configurations.

---

# 🇩🇪 Deutsch

## ✨ Neu

### Intelligente Kameramontage

Der visuelle Karteneditor enthält jetzt einen eigenen Bereich **Kameramontage**. Die Karte kann ihre Bedienung an die tatsächliche Einbaulage der Kamera anpassen.

Verfügbare Montagearten:

- Decke / über Kopf
- Wand
- Dach / schräge Fläche
- Benutzerdefiniert

Abhängig von der gewählten Montageart stehen folgende Einstellungen zur Verfügung:

- Kameradrehung: 0°, 90°, 180° oder 270°
- Neigungswinkel bei schräger Montage
- Benutzerdefinierter Montage-Yaw, -Pitch und -Roll
- Visuelle Montagevorschau

Die gewählte Einbaulage beeinflusst:

- Maussteuerung
- Touch-Gesten
- Tastatursteuerung
- Richtungstasten

Die Kamerakalibrierung und das gewählte Kameraprofil bleiben von der Montagekonfiguration getrennt.

## 🔄 Kompatibilität

Bestehende Konfigurationen bleiben kompatibel. Karten ohne Montageeinstellungen verwenden standardmäßig Deckenmontage mit 0° Drehung.

Die vorhandenen Optionen `control_invert_x` und `control_invert_y` funktionieren für erweiterte oder ältere Konfigurationen weiterhin.

---
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
