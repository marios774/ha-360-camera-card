# Roadmap

## Planned

- Visual Lovelace configuration editor
- Named YAML presets and more than two quick-access buttons
- Optional minimap/compass
- Configurable control placement
- Smoother animated view transitions
- Pinch-to-zoom and double-tap home refinements
- More camera profiles after real-device calibration
- Automated browser tests

## Not part of the frontend-only card

Home Assistant backend services such as `ha360.goto_preset` require a separate
custom integration. They cannot be delivered reliably by a standalone
Lovelace JavaScript card. A companion integration may be created later.
