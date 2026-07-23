# go2rtc

Example:

```yaml
api:
  listen: ":1984"
  origin: "*"

streams:
  ai360:
    - rtspx://192.0.2.20:7441/REPLACE_WITH_PRIVATE_TOKEN
```

Card:

```yaml
whep_url: http://192.0.2.10:1984/api/webrtc?src=ai360
```

`rtspx://` is often useful when connecting to UniFi Protect RTSP endpoints.
The camera source must expose the raw circular fisheye image for the virtual
projection to work.

Never publish real RTSP tokens or credentials.
