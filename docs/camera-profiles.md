# Camera profiles

Profiles provide useful initial values. Every profile value can still be
overridden in YAML.

## UniFi AI360

```yaml
camera_profile: unifi_ai360
```

Defaults include hemisphere projection, 180° fisheye field, `roll: 180` and
`mirror: true`.

## UniFi G6 Pro 360

```yaml
camera_profile: unifi_g6_pro_360
```

This is a preliminary profile. Sensor crop and fisheye circle geometry can
differ depending on the exported stream. Calibrate `circle_radius`,
`center_x`, `center_y`, `rotate` and `mirror` if necessary.

## Generic

```yaml
camera_profile: generic
```

Use this for other circular fisheye streams and configure all geometry values
manually.
