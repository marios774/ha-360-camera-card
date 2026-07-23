# Home Assistant 360 Camera Card

Interactive WebGL card for 360° and fisheye camera streams in Home Assistant.

Displaying a fisheye or UniFi 360 camera as a distorted panoramic image
<img width="300" height="300" alt="Ist" src="https://github.com/user-attachments/assets/d011fea7-2c63-4e52-b397-0ec10f2090d4" />

A corrected camera image with the ability to change the viewing angle and zoom, and a feature to save user views 
<img width="300" height="300" alt="Soll" src="https://github.com/user-attachments/assets/0cab273b-eb59-4fa6-bade-290dd9b2c1b1" />

The first tested camera is the **UniFi AI360**. A preliminary profile for the
**UniFi G6 Pro 360** is included. Generic circular fisheye streams can also be
calibrated manually.

> This is a community project and is not affiliated with Ubiquiti or Home Assistant.

## Features

- Virtual pan, tilt, roll and zoom without moving the physical camera
- Hemisphere/fisheye projection
- WHEP/WebRTC streaming through go2rtc
- Mouse, touch and keyboard control
- Home position and two locally stored views
- Current `yaw`, `pitch`, `roll` and `fov` overlay
- One-click YAML export to the clipboard
- Camera profiles
- HACS-compatible distribution
- Legacy compatibility with `custom:unifi-ai360-view-card`

## Quick start

```yaml
type: custom:ha-360-camera-card
title: AI 360
camera_profile: unifi_ai360
whep_url: http://HOME_ASSISTANT_OR_GO2RTC:1984/api/webrtc?src=ai360
height: 560

yaw: 0
pitch: 55
roll: 180
fov: 90

control_invert_x: true
control_invert_y: true
storage_key: ai360-garden

controls: true
keyboard: true
muted: true
```

## go2rtc example

```yaml
streams:
  ai360:
    - rtspx://UNIFI_PROTECT_IP:7441/RTSP_STREAM_TOKEN

  g6_pro_360:
    - rtspx://UNIFI_PROTECT_IP:7441/SECOND_RTSP_STREAM_TOKEN
```

Do not publish real stream tokens, passwords or private IP configuration in a
public GitHub repository.

## Controls

| Input | Action |
|---|---|
| Arrow keys / on-screen arrows | Change view |
| `+` / `-` | Zoom |
| `0` or `H` | Home view |
| Button `1` / `2` | Load preset |
| Hold button `1` / `2` | Store current view locally |
| `i` | Copy current view as YAML |
| Mouse drag / touch drag | Move view |
| Mouse wheel | Zoom |

The copied YAML has this form:

```yaml
preset_XX:
  yaw: 48
  pitch: 47
  roll: 180
  fov: 82
```

## Installation

- [HACS custom repository](docs/installation.md#hacs)
- [Manual installation](docs/installation.md#manual-installation)
- [Publishing your own GitHub repository](PUBLISHING-DE.md)

## Documentation

- [Configuration](docs/configuration.md)
- [Camera profiles](docs/camera-profiles.md)
- [Calibration](docs/calibration.md)
- [Presets and YAML export](docs/presets.md)
- [Keyboard, mouse and touch](docs/controls.md)
- [go2rtc](docs/go2rtc.md)
- [FAQ](docs/faq.md)
- [Roadmap](ROADMAP.md)

## Security

WHEP URLs, RTSP tokens and camera credentials should never be committed to the
repository. Use placeholders in examples and keep the real values only in your
private Home Assistant configuration.

## License

MIT


## Version 1.1

### Named views

```yaml
named_presets:
  Garage:
    yaw: 48
    pitch: 47
    roll: 180
    fov: 82

  Driveway:
    yaw: -65
    pitch: 51
    roll: 180
    fov: 74
```

Up to six named buttons are shown. The local quick presets `1` and `2` remain available.

### Mini-compass and gestures

```yaml
minimap: true
double_tap_home: true
```

Two-finger pinch changes the field of view. Double-click or double-tap restores the configured home view. A visual Lovelace editor is available for the common settings.
