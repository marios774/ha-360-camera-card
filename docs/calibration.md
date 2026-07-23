# Calibration

Start with:

```yaml
projection: hemisphere
fisheye_fov: 180
circle_radius: 0.49
center_x: 0.5
center_y: 0.5
rotate: 0
mirror: false
```

## Procedure

1. Set the view to a wide `fov`, for example `110`.
2. Adjust `center_x` until the optical center is horizontally centered.
3. Adjust `center_y` until it is vertically centered.
4. Adjust `circle_radius` until the outer fisheye circle is sampled correctly.
5. Use `rotate` for physical mounting rotation.
6. Use `mirror` if left and right are reversed in the source stream.
7. Set the desired home values for `yaw`, `pitch`, `roll` and `fov`.

Use the `i` button to copy the current values as YAML.
