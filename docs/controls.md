# Controls

The card must have keyboard focus before keyboard shortcuts work. Click once
inside the video.

| Key | Function |
|---|---|
| `↑` `↓` `←` `→` | Move view |
| `+` `-` | Zoom |
| `0` | Home |
| `i` | Copy YAML and show values |

Mouse/touch dragging changes the view. The mouse wheel changes zoom.

## Mounting-dependent axes (v1.2.1)

The card transforms all direction input through the selected physical mounting orientation:

- `ceiling` / `down`: normal downward-facing behavior
- `up`: upward-facing camera, axes rotated by 180°
- `wall`: control plane tilted by -90° so vertical operation matches the displayed image
- `roof`: control plane tilted by `mounting_tilt`
- `custom`: uses mounting pitch plus mounting yaw, roll and rotation

Mouse, touch, keyboard and direction buttons use the same transformation.
