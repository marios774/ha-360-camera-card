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
