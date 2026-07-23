const HA360_VERSION = "1.0.0";

const CAMERA_PROFILES = {
  generic: {},
  unifi_ai360: {
    projection: "hemisphere",
    fisheye_fov: 180,
    circle_radius: 0.49,
    center_x: 0.5,
    center_y: 0.5,
    roll: 180,
    mirror: true,
  },
  unifi_g6_pro_360: {
    projection: "hemisphere",
    fisheye_fov: 180,
    circle_radius: 0.49,
    center_x: 0.5,
    center_y: 0.5,
    roll: 180,
    mirror: true,
  },
};

class Ha360CameraCard extends HTMLElement {
  setConfig(config) {
    if (!config || (!config.url && !config.whep_url)) {
      throw new Error("Bitte 'url' oder 'whep_url' konfigurieren.");
    }

    const selectedProfile = CAMERA_PROFILES[config.camera_profile] || CAMERA_PROFILES.generic;

    this.config = {
      title: "360° Camera",
      camera_profile: "generic",
      height: 520,
      fov: 95,
      projection: "hemisphere",
      fisheye_fov: 360,
      circle_radius: 0.5,
      center_x: 0.5,
      center_y: 0.5,
      yaw: 0,
      pitch: 0,
      pitch_min: 0,
      pitch_max: 89,
      step: 8,
      invert_x: false,
      invert_y: false,
      control_invert_x: true,
      control_invert_y: true,
      storage_key: "unifi-ai360-view-card",
      clipboard_preset_name: "preset_XX",
      preset_1: null,
      preset_2: null,
      rotate: 0,
      mirror: false,
      controls: true,
      keyboard: true,
      muted: true,
      autoplay: true,
      ...selectedProfile,
      ...config,
    };

    if (!this._viewInitialized) {
      this._yaw = Number(this.config.yaw);
      this._pitch = Number(this.config.pitch);
      this._roll = Number(this.config.roll || 0);
      this._fov = Number(this.config.fov);
      this._viewInitialized = true;
    }
    this._dragging = false;
    this._lastPointer = null;
    this._raf = null;
    this._pc = null;
    this._resizeObserver = null;
    this._rendered = false;
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
  }

  getCardSize() {
    return Math.max(3, Math.ceil(Number(this.config?.height || 520) / 50));
  }

  disconnectedCallback() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._valuesOverlayTimer) clearTimeout(this._valuesOverlayTimer);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._pc) this._pc.close();
    if (this._video) {
      this._video.pause();
      this._video.srcObject = null;
      this._video.removeAttribute("src");
      this._video.load();
    }
    window.removeEventListener("keydown", this._onKeyDownBound);
  }

  async _render() {
    this._rendered = true;
    this.innerHTML = `
      <ha-card>
        <div class="header">
          <div class="title">${this._escape(this.config.title)}</div>
          <div class="status" title="Streamstatus">●</div>
        </div>
        <div class="stage" tabindex="0" aria-label="360 Grad Kameraansicht">
          <canvas></canvas>
          <video playsinline ${this.config.muted ? "muted" : ""}></video>
          <div class="message">Stream wird geladen …</div>
          <div class="values-overlay" aria-live="polite"></div>
          ${this.config.controls ? this._controlsHtml() : ""}
        </div>
      </ha-card>
    `;

    this._injectStyles();
    this._stage = this.querySelector(".stage");
    this._canvas = this.querySelector("canvas");
    this._video = this.querySelector("video");
    this._message = this.querySelector(".message");
    this._valuesOverlay = this.querySelector(".values-overlay");
    this._status = this.querySelector(".status");

    this._bindControls();
    this._initWebGL();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this._stage);
    this._resize();

    try {
      if (this.config.whep_url) {
        await this._startWhep(this._resolveUrl(this.config.whep_url));
      } else {
        this._video.src = this._resolveUrl(this.config.url);
        if (this.config.autoplay) await this._video.play();
      }
    } catch (err) {
      this._setError(`Stream konnte nicht gestartet werden: ${err.message}`);
    }

    this._video.addEventListener("playing", () => {
      this._message.style.display = "none";
      this._status.classList.add("ok");
    });
    this._video.addEventListener("waiting", () => {
      this._status.classList.remove("ok");
    });
    this._video.addEventListener("error", () => {
      const code = this._video.error?.code;
      this._setError(`Videofehler${code ? ` (Code ${code})` : ""}.`);
    });

    this._animate();
  }

  _controlsHtml() {
    return `
      <div class="pad">
        <button type="button" data-action="up" aria-label="Nach oben">▲</button>
        <button type="button" data-action="left" aria-label="Nach links">◀</button>
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht">●</button>
        <button type="button" data-action="right" aria-label="Nach rechts">▶</button>
        <button type="button" data-action="down" aria-label="Nach unten">▼</button>
      </div>
      <div class="presets">
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht">H</button>
        <button type="button" data-action="preset-1" aria-label="Ansicht 1" title="Antippen: aufrufen · lange drücken: speichern">1</button>
        <button type="button" data-action="preset-2" aria-label="Ansicht 2" title="Antippen: aufrufen · lange drücken: speichern">2</button>
        <button type="button" data-action="show-values" aria-label="Aktuelle Ansichtswerte" title="Aktuelle Werte anzeigen">i</button>
      </div>
      <div class="zoom">
        <button type="button" data-action="zoom-in" aria-label="Vergrößern">＋</button>
        <button type="button" data-action="zoom-out" aria-label="Verkleinern">−</button>
      </div>
    `;
  }

  _injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      ha-card { overflow: hidden; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px 10px;
      }
      .title { font-size: 16px; font-weight: 600; }
      .status { opacity: .35; font-size: 12px; }
      .status.ok { opacity: 1; }
      .stage {
        position: relative; width: 100%; height: ${Number(this.config.height)}px;
        overflow: hidden; background: #111; outline: none; touch-action: none;
        user-select: none;
      }
      canvas { width: 100%; height: 100%; display: block; }
      video { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .message {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        padding: 24px; color: white; background: rgba(0,0,0,.45); text-align: center;
      }
      .values-overlay {
        position: absolute;
        top: 12px;
        right: 12px;
        min-width: 112px;
        padding: 9px 11px;
        border-radius: 10px;
        background: rgba(20,20,20,.72);
        color: white;
        font-size: 12px;
        line-height: 1.45;
        font-variant-numeric: tabular-nums;
        white-space: pre;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity .18s ease, transform .18s ease;
        pointer-events: none;
        backdrop-filter: blur(8px);
        z-index: 3;
      }
      .values-overlay.visible {
        opacity: 1;
        transform: translateY(0);
      }
      button {
        border: 0; border-radius: 50%; width: 42px; height: 42px;
        background: rgba(20,20,20,.65); color: white; font-size: 18px;
        backdrop-filter: blur(8px); cursor: pointer;
      }
      button:active { transform: scale(.94); }
      .pad {
        position: absolute; left: 14px; bottom: 14px;
        display: grid; grid-template-columns: repeat(3, 42px);
        grid-template-rows: repeat(3, 42px); gap: 5px;
      }
      .pad [data-action="up"] { grid-column: 2; grid-row: 1; }
      .pad [data-action="left"] { grid-column: 1; grid-row: 2; }
      .pad [data-action="home"] { grid-column: 2; grid-row: 2; font-size: 13px; }
      .pad [data-action="right"] { grid-column: 3; grid-row: 2; }
      .pad [data-action="down"] { grid-column: 2; grid-row: 3; }
      .presets {
        position: absolute; left: 14px; top: 14px;
        display: flex; gap: 8px;
      }
      .presets button { font-size: 14px; font-weight: 600; }
      .zoom {
        position: absolute; right: 14px; bottom: 14px;
        display: flex; flex-direction: column; gap: 8px;
      }
      @media (max-width: 600px) {
        .stage { height: min(${Number(this.config.height)}px, 62vh); }
        button { width: 38px; height: 38px; }
        .pad { grid-template-columns: repeat(3, 38px); grid-template-rows: repeat(3, 38px); }
      }
    `;
    this.prepend(style);
  }

  _bindControls() {
    this.querySelectorAll("button[data-action]").forEach((button) => {
      let holdTimer = null;
      let longPressed = false;
      button.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        longPressed = false;
        if (button.dataset.action === "preset-1" || button.dataset.action === "preset-2") {
          holdTimer = window.setTimeout(() => {
            longPressed = true;
            this._savePreset(button.dataset.action === "preset-1" ? 1 : 2);
          }, 700);
        }
      });
      const clearHold = () => {
        if (holdTimer) window.clearTimeout(holdTimer);
        holdTimer = null;
      };
      button.addEventListener("pointerup", clearHold);
      button.addEventListener("pointercancel", clearHold);
      button.addEventListener("pointerleave", clearHold);
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!longPressed) this._action(button.dataset.action);
      });
    });

    this._stage.addEventListener("pointerdown", (ev) => {
      this._dragging = true;
      this._lastPointer = { x: ev.clientX, y: ev.clientY };
      this._stage.setPointerCapture(ev.pointerId);
      this._stage.focus();
    });

    this._stage.addEventListener("pointermove", (ev) => {
      if (!this._dragging || !this._lastPointer) return;
      const dx = ev.clientX - this._lastPointer.x;
      const dy = ev.clientY - this._lastPointer.y;
      this._lastPointer = { x: ev.clientX, y: ev.clientY };
      const sensitivity = this._fov / Math.max(260, this._stage.clientWidth);
      this._yaw += dx * sensitivity * (this.config.invert_x ? -1 : 1);
      if (this.config.projection === "hemisphere") {
        this._pitch += dy * sensitivity * (this.config.invert_y ? -1 : 1);
      } else {
        this._pitch += dy * sensitivity * (this.config.invert_y ? 1 : -1);
      }
      this._clampView();
      this._showValuesOverlay(false);
    });

    const stopDrag = () => {
      this._dragging = false;
      this._lastPointer = null;
    };
    this._stage.addEventListener("pointerup", stopDrag);
    this._stage.addEventListener("pointercancel", stopDrag);

    this._stage.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      this._fov += Math.sign(ev.deltaY) * 5;
      this._fov = Math.min(150, Math.max(25, this._fov));
      this._showValuesOverlay(false);
    }, { passive: false });

    this._onKeyDownBound = (ev) => {
      if (!this.config.keyboard || document.activeElement !== this._stage) return;
      const map = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        "+": "zoom-in", "=": "zoom-in", "-": "zoom-out", "0": "home",
        "i": "show-values", "I": "show-values"
      };
      if (map[ev.key]) {
        ev.preventDefault();
        this._action(map[ev.key]);
      }
    };
    window.addEventListener("keydown", this._onKeyDownBound);
  }

  _action(action) {
    const step = Number(this.config.step);
    const cx = this.config.control_invert_x ? -1 : 1;
    const cy = this.config.control_invert_y ? -1 : 1;
    if (action === "left") this._yaw -= step * cx;
    if (action === "right") this._yaw += step * cx;
    if (this.config.projection === "hemisphere") {
      if (action === "up") this._pitch -= step * cy;
      if (action === "down") this._pitch += step * cy;
    } else {
      if (action === "up") this._pitch += step * cy;
      if (action === "down") this._pitch -= step * cy;
    }
    if (action === "preset-1") this._loadPreset(1);
    if (action === "preset-2") this._loadPreset(2);
    if (action === "show-values") this._copyCurrentValuesAsYaml();
    if (action === "zoom-in") this._fov -= 8;
    if (action === "zoom-out") this._fov += 8;
    if (action === "home") {
      this._yaw = Number(this.config.yaw);
      this._pitch = Number(this.config.pitch);
      this._roll = Number(this.config.roll || 0);
      this._fov = Number(this.config.fov);
    }
    this._fov = Math.min(150, Math.max(25, this._fov));
    this._clampView();

    if ([
      "left", "right", "up", "down",
      "zoom-in", "zoom-out", "home",
      "preset-1", "preset-2"
    ].includes(action)) {
      this._showValuesOverlay(false);
    }
  }

  async _copyCurrentValuesAsYaml() {
    const values = {
      yaw: Number(this._yaw.toFixed(1)),
      pitch: Number(this._pitch.toFixed(1)),
      roll: Number((this._roll || 0).toFixed(1)),
      fov: Number(this._fov.toFixed(1)),
    };

    const presetName =
      String(this.config.clipboard_preset_name || "preset_XX")
        .trim()
        .replace(/:\s*$/, "") || "preset_XX";

    const yaml =
`${presetName}:
  yaw: ${values.yaw}
  pitch: ${values.pitch}
  roll: ${values.roll}
  fov: ${values.fov}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(yaml);
      } else {
        this._copyTextFallback(yaml);
      }
      this._showValuesOverlay(true);
      this._showValuesOverlay(true);
        this._showToast(`${presetName} als YAML in die Zwischenablage kopiert.`);
      console.info("UniFi AI 360 View Card – kopiertes YAML:\n" + yaml);
    } catch (err) {
      try {
        this._copyTextFallback(yaml);
        this._showToast(`${presetName} als YAML in die Zwischenablage kopiert.`);
      } catch (fallbackError) {
        this._showToast("Kopieren nicht möglich. Browser-Berechtigung für die Zwischenablage prüfen.");
        console.error("UniFi AI 360 View Card – Zwischenablagefehler", err, fallbackError);
      }
    }
  }

  _showValuesOverlay(longDisplay = false) {
    if (!this._valuesOverlay) return;

    const yaw = Number(this._yaw.toFixed(1));
    const pitch = Number(this._pitch.toFixed(1));
    const roll = Number((this._roll || 0).toFixed(1));
    const fov = Number(this._fov.toFixed(1));

    this._valuesOverlay.textContent =
`yaw: ${yaw}
pitch: ${pitch}
roll: ${roll}
fov: ${fov}`;

    this._valuesOverlay.classList.add("visible");

    if (this._valuesOverlayTimer) {
      clearTimeout(this._valuesOverlayTimer);
    }

    this._valuesOverlayTimer = window.setTimeout(() => {
      this._valuesOverlay?.classList.remove("visible");
    }, longDisplay ? 5000 : 1800);
  }

  _copyTextFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("document.execCommand('copy') ist fehlgeschlagen.");
    }
  }

  _presetStorageKey(number) {
    return `${this.config.storage_key || "unifi-ai360-view-card"}:preset:${number}`;
  }

  _configuredPreset(number) {
    const value = this.config[`preset_${number}`];
    return value && typeof value === "object" ? value : null;
  }

  _loadPreset(number) {
    let preset = null;
    try {
      const stored = localStorage.getItem(this._presetStorageKey(number));
      if (stored) preset = JSON.parse(stored);
    } catch (err) {}
    preset = preset || this._configuredPreset(number);
    if (!preset) {
      this._showToast(`Ansicht ${number} ist noch nicht gespeichert.`);
      return;
    }
    if (preset.yaw !== undefined) this._yaw = Number(preset.yaw);
    if (preset.pitch !== undefined) this._pitch = Number(preset.pitch);
    if (preset.roll !== undefined) this._roll = Number(preset.roll);
    if (preset.fov !== undefined) this._fov = Number(preset.fov);
    this._fov = Math.min(150, Math.max(25, this._fov));
    this._clampView();
  }

  _savePreset(number) {
    const preset = { yaw: this._yaw, pitch: this._pitch, roll: this._roll || 0, fov: this._fov };
    try {
      localStorage.setItem(this._presetStorageKey(number), JSON.stringify(preset));
      this._showToast(`Ansicht ${number} gespeichert.`);
    } catch (err) {
      this._showToast(`Ansicht ${number} konnte nicht gespeichert werden.`);
    }
  }

  _showToast(message) {
    const event = new CustomEvent("hass-notification", {
      bubbles: true, composed: true, detail: { message }
    });
    this.dispatchEvent(event);
  }

  _clampView() {
    this._yaw = ((this._yaw + 180) % 360 + 360) % 360 - 180;
    this._roll = ((this._roll + 180) % 360 + 360) % 360 - 180;
    this._pitch = Math.min(
      Number(this.config.pitch_max),
      Math.max(Number(this.config.pitch_min), this._pitch)
    );
  }

  _initWebGL() {
    const gl = this._canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) throw new Error("WebGL wird von diesem Browser nicht unterstützt.");
    this._gl = gl;

    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_video;
      uniform vec2 u_resolution;
      uniform float u_yaw;
      uniform float u_roll;
      uniform float u_pitch;
      uniform float u_fov;
      uniform float u_fisheye_fov;
      uniform float u_radius;
      uniform vec2 u_center;
      uniform float u_rotate;
      uniform float u_mirror;
      uniform float u_projection;

      const float PI = 3.141592653589793;

      mat3 rotY(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
      }
      mat3 rotX(float a) {
        float c = cos(a), s = sin(a);
        return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c);
      }

      void main() {
        vec2 p = v_uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        float focal = 1.0 / tan(u_fov * 0.5);
        vec3 ray;

        if (u_projection > 1.5) {
          float cr = cos(u_roll), sr = sin(u_roll);
          vec2 pr = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y);
          float az = u_yaw;
          float tilt = u_pitch;
          vec3 forward = normalize(vec3(
            sin(tilt) * cos(az),
            sin(tilt) * sin(az),
            cos(tilt)
          ));
          vec3 right = normalize(vec3(-sin(az), cos(az), 0.0));
          vec3 up = normalize(cross(right, forward));
          ray = normalize(forward * focal + right * pr.x + up * (-pr.y));
        } else {
          ray = normalize(vec3(p.x, -p.y, focal));
          ray = rotY(u_yaw) * rotX(u_pitch) * ray;
        }

        vec2 texUv;

        if (u_projection < 0.5 || u_projection > 1.5) {
          float theta = acos(clamp(ray.z, -1.0, 1.0));
          float maxTheta = u_fisheye_fov * 0.5;
          float r = theta / maxTheta;
          if (r > 1.0) {
            gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0);
            return;
          }
          float phi = atan(ray.y, ray.x) + u_rotate;
          vec2 radial = vec2(cos(phi), sin(phi)) * r * u_radius;
          if (u_mirror > 0.5) radial.x *= -1.0;
          texUv = u_center + radial;
        } else {
          // Already dewarped 16:9 source: digital pan and zoom.
          float zoom = 95.0 / max(25.0, u_fov * 180.0 / PI);
          vec2 offset = vec2(u_yaw / (2.0 * PI), -u_pitch / PI);
          texUv = (v_uv - 0.5) / zoom + 0.5 + offset;
          if (u_mirror > 0.5) texUv.x = 1.0 - texUv.x;
        }

        if (texUv.x < 0.0 || texUv.x > 1.0 || texUv.y < 0.0 || texUv.y > 1.0) {
          gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0);
          return;
        }
        gl_FragColor = texture2D(u_video, texUv);
      }
    `;

    const program = this._createProgram(vertexSource, fragmentSource);
    this._program = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
      gl.STATIC_DRAW
    );

    const pos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    this._uniforms = {};
    [
      "u_video", "u_resolution", "u_yaw", "u_roll", "u_pitch", "u_fov",
      "u_fisheye_fov", "u_radius", "u_center", "u_rotate", "u_mirror", "u_projection"
    ].forEach((name) => {
      this._uniforms[name] = gl.getUniformLocation(program, name);
    });

    this._texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  _createProgram(vertexSource, fragmentSource) {
    const gl = this._gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  }

  _resize() {
    if (!this._canvas || !this._stage || !this._gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(this._stage.clientWidth * dpr));
    const height = Math.max(1, Math.floor(this._stage.clientHeight * dpr));
    if (this._canvas.width !== width || this._canvas.height !== height) {
      this._canvas.width = width;
      this._canvas.height = height;
      this._gl.viewport(0, 0, width, height);
    }
  }

  _animate() {
    const gl = this._gl;
    if (this._video.readyState >= 2) {
      gl.useProgram(this._program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      try {
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
          gl.UNSIGNED_BYTE, this._video
        );
        gl.uniform1i(this._uniforms.u_video, 0);
        gl.uniform2f(this._uniforms.u_resolution, this._canvas.width, this._canvas.height);
        gl.uniform1f(this._uniforms.u_yaw, this._deg(this._yaw));
        gl.uniform1f(this._uniforms.u_roll, this._deg(this._roll || 0));
        gl.uniform1f(this._uniforms.u_pitch, this._deg(this._pitch));
        gl.uniform1f(this._uniforms.u_fov, this._deg(this._fov));
        gl.uniform1f(this._uniforms.u_fisheye_fov, this._deg(Number(this.config.fisheye_fov)));
        gl.uniform1f(this._uniforms.u_radius, Number(this.config.circle_radius));
        gl.uniform2f(
          this._uniforms.u_center,
          Number(this.config.center_x),
          Number(this.config.center_y)
        );
        gl.uniform1f(this._uniforms.u_rotate, this._deg(Number(this.config.rotate)));
        gl.uniform1f(this._uniforms.u_mirror, this.config.mirror ? 1 : 0);
        gl.uniform1f(
          this._uniforms.u_projection,
          this.config.projection === "flat" ? 1 :
          this.config.projection === "hemisphere" ? 2 : 0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } catch (err) {
        this._setError(
          "Der Browser blockiert den Videostream als WebGL-Textur. Prüfe HTTPS, CORS und denselben Ursprung."
        );
      }
    }
    this._raf = requestAnimationFrame(() => this._animate());
  }

  async _startWhep(url) {
    const pc = new RTCPeerConnection({
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });
    this._pc = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    if (!this.config.muted) {
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      this._video.srcObject = stream;
      this._video.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        this._status.classList.remove("ok");
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this._waitForIce(pc);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: pc.localDescription.sdp,
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`WHEP antwortet mit HTTP ${response.status}`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  _waitForIce(pc) {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2500);
      const handler = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          pc.removeEventListener("icegatheringstatechange", handler);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", handler);
    });
  }

  _resolveUrl(url) {
    if (!url) return "";
    if (url.startsWith("/")) return `${window.location.origin}${url}`;
    return url;
  }

  _setError(message) {
    this._message.textContent = message;
    this._message.style.display = "flex";
    this._status.classList.remove("ok");
  }

  _deg(value) {
    return Number(value) * Math.PI / 180;
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  static getStubConfig() {
    return {
      title: "UniFi AI 360",
      type: "custom:unifi-ai360-view-card",
      whep_url: "https://HOME-ASSISTANT-ODER-GO2RTC/api/webrtc?src=ai360",
      height: 520,
      fisheye_fov: 360,
      circle_radius: 0.49,
      pitch_min: 0,
      pitch_max: 89,
    };
  }
}

console.info("UniFi AI 360 View Card v0.2.0");
if (!customElements.get("ha-360-camera-card")) {
  customElements.define("ha-360-camera-card", Ha360CameraCard);
}

// Abwärtskompatibilität mit der bisherigen YAML-Konfiguration.
if (!customElements.get("unifi-ai360-view-card")) {
  customElements.define(
    "unifi-ai360-view-card",
    class UnifiAI360ViewCardLegacy extends Ha360CameraCard {}
  );
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-360-camera-card",
  name: "Home Assistant 360 Camera Card",
  description: "Interactive WebGL viewer for 360° and fisheye camera streams.",
  preview: false,
});
window.customCards.push({
  type: "unifi-ai360-view-card",
  name: "UniFi AI360 View Card (legacy alias)",
  description: "Legacy alias for Home Assistant 360 Camera Card.",
  preview: false,
});

console.info(
  `%c HA 360 CAMERA CARD %c v${HA360_VERSION} `,
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: transparent;"
);
