# FAQ

## The card is not visible

Verify that the resource is loaded as a JavaScript module and hard-refresh the
browser.

## The stream works in go2rtc but not in the card

Open the WHEP endpoint from the same browser/network and verify mixed-content,
CORS and HTTPS restrictions.

## Controls are reversed

Adjust:

```yaml
control_invert_x: true
control_invert_y: true
mirror: true
```

## Presets from one camera appear in another

Assign a unique `storage_key` to every card.

## Can this control the physical PTZ motor?

No. The current card performs virtual PTZ inside a 360° image.
