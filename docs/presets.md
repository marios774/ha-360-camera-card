# Presets and YAML export

## Home view

The home view is defined by:

```yaml
yaw: 0
pitch: 55
roll: 180
fov: 90
```

The center button, `H` and keyboard key `0` restore these values.

## Local presets

- Short press on `1` or `2`: load
- Long press on `1` or `2`: save

Local presets are stored in the current browser/app using `localStorage`.
Use a different `storage_key` for every camera.

## YAML export

Press `i` to copy the current view:

```yaml
preset_XX:
  yaw: 48
  pitch: 47
  roll: 180
  fov: 82
```

Change the key with:

```yaml
clipboard_preset_name: preset_driveway
```
