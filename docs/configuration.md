# Configuration

## Required

| Option | Description |
|---|---|
| `whep_url` | WHEP endpoint, recommended for go2rtc |
| `url` | Direct browser-compatible video URL; alternative to `whep_url` |

## Common options

| Option | Default | Description |
|---|---:|---|
| `title` | `360° Camera` | Card title |
| `camera_profile` | `generic` | Camera defaults |
| `height` | `520` | Viewer height in pixels |
| `projection` | `hemisphere` | Projection mode |
| `yaw` | `0` | Start rotation |
| `pitch` | `0` | Start tilt |
| `roll` | `0` | Start roll |
| `fov` | `95` | Start field of view |
| `step` | `8` | Button/keyboard step |
| `mirror` | `false` | Mirror fisheye source |
| `rotate` | `0` | Rotate raw source |
| `controls` | `true` | Show controls |
| `keyboard` | `true` | Enable keyboard |
| `muted` | `true` | Mute video |
| `storage_key` | card default | Unique local preset namespace |
| `clipboard_preset_name` | `preset_XX` | YAML key copied by `i` |

## Full example

```yaml
type: custom:ha-360-camera-card
title: Garden
camera_profile: unifi_ai360
whep_url: http://192.0.2.10:1984/api/webrtc?src=ai360
height: 560

fisheye_fov: 180
circle_radius: 0.49
center_x: 0.5
center_y: 0.5

yaw: 0
pitch: 55
roll: 180
fov: 90

pitch_min: 0
pitch_max: 88
step: 8

rotate: 0
mirror: true
control_invert_x: true
control_invert_y: true

storage_key: ai360-garden
clipboard_preset_name: preset_garden

controls: true
keyboard: true
muted: true
```

## Camera mounting (v1.2.0)

The mounting configuration changes the control coordinate system without changing the fisheye calibration.

```yaml
mounting_mode: ceiling       # ceiling, up, wall, roof, custom
mounting_rotation: 0         # 0, 90, 180 or 270
mounting_tilt: 0             # roof mode
mounting_yaw: 0              # custom mode
mounting_pitch: 0            # custom mode
mounting_roll: 0             # custom mode
```

The visual editor provides the recommended way to configure these values.


## Static images (v1.2.2)

```yaml
type: custom:ha-360-camera-card
title: Last motion
source_type: image
image_url: /local/snapshots/last_motion.jpg
image_refresh_interval: 10
camera_profile: unifi_ai360
projection: hemisphere
mounting_mode: wall
```

Files stored below `/config/www/` are available in Home Assistant below `/local/`. The folder button in the card opens a local JPG/PNG/WebP temporarily; browsers cannot write this local file path back into Lovelace YAML.
