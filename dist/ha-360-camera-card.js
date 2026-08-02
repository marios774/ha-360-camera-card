const HA360_VERSION = "1.2.2";

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
  generic_circular_fisheye: {
    projection: "hemisphere",
    fisheye_fov: 180,
    circle_radius: 0.5,
    center_x: 0.5,
    center_y: 0.5,
  },
  unifi_g6_pro_360: {
    projection: "hemisphere",
    fisheye_fov: 180,
    circle_radius: 0.49,
    center_x: 0.5,
    center_y: 0.5,
    roll: 180,
    fov: 25,
    mirror: true,
    wall_calibration: {
      rotation: 0,
      pitch_bottom: 12,
      pitch_top: 167.5,
      yaw_right: -169,
      yaw_left: -11,
      home_pitch: 89.75,
      home_yaw: -90,
      roll: 180,
      fov: 25,
    },
  },
};

class Ha360CameraCard extends HTMLElement {
  setConfig(config) {
    if (!config || (!config.url && !config.whep_url && !config.image_url)) {
      throw new Error("Bitte 'whep_url', 'url' oder 'image_url' konfigurieren.");
    }

    const selectedProfile = CAMERA_PROFILES[config.camera_profile] || CAMERA_PROFILES.generic;

    this.config = {
      title: "360° Camera",
      camera_profile: "generic",
      source_type: "auto",
      image_url: "",
      image_browse: true,
      image_refresh_interval: 0,
      height: 520,
      fov: 95,
      projection: "hemisphere",
      fisheye_fov: 360,
      circle_radius: 0.5,
      center_x: 0.5,
      center_y: 0.5,
      yaw: 0,
      pitch: 0,
      yaw_min: null,
      yaw_max: null,
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
      preset_editor: true,
      max_presets: 4,
      presets: [],
      double_tap_home: true,
      muted: true,
      autoplay: true,
      mounting_mode: "ceiling",
      mounting_rotation: 0,
      mounting_tilt: 0,
      mounting_yaw: 0,
      mounting_pitch: 0,
      mounting_roll: 0,
      ...selectedProfile,
      ...config,
    };

    // G6 Pro 360 wall calibration, orientation 0°. Explicit YAML values
    // always win; only missing values receive the measured defaults.
    if (
      this.config.camera_profile === "unifi_g6_pro_360" &&
      this.config.mounting_mode === "wall" &&
      Number(this.config.mounting_rotation || 0) === 0
    ) {
      const wall = CAMERA_PROFILES.unifi_g6_pro_360.wall_calibration;
      if (config.yaw === undefined) this.config.yaw = wall.home_yaw;
      if (config.pitch === undefined) this.config.pitch = wall.home_pitch;
      if (config.roll === undefined) this.config.roll = wall.roll;
      if (config.fov === undefined) this.config.fov = wall.fov;
      if (config.yaw_min === undefined) this.config.yaw_min = wall.yaw_right;
      if (config.yaw_max === undefined) this.config.yaw_max = wall.yaw_left;
      if (config.pitch_min === undefined) this.config.pitch_min = wall.pitch_bottom;
      if (config.pitch_max === undefined) this.config.pitch_max = wall.pitch_top;
    }

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
    if (this._imageRefreshTimer) clearInterval(this._imageRefreshTimer);
    if (this._objectImageUrl) URL.revokeObjectURL(this._objectImageUrl);
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
          <div class="title">${this._escape(this.config.title)} <span class="version-badge">v${HA360_VERSION}</span></div>
          <div class="status" title="Streamstatus">●</div>
        </div>
        <div class="stage" tabindex="0" aria-label="360 Grad Kameraansicht">
          <canvas></canvas>
          <video playsinline ${this.config.muted ? "muted" : ""}></video>
          <img class="static-source" alt="Statisches 360°-Bild" crossorigin="anonymous">
          ${this.config.image_browse ? `<input class="image-file-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>` : ""}
          <div class="message">Stream wird geladen …</div>
          <div class="values-overlay" aria-live="polite"></div>
          ${this.config.preset_editor ? this._presetEditorHtml() : ""}
          ${this.config.controls ? this._controlsHtml() : ""}
        </div>
      </ha-card>
    `;

    this._injectStyles();
    this._stage = this.querySelector(".stage");
    this._canvas = this.querySelector("canvas");
    this._video = this.querySelector("video");
    this._image = this.querySelector("img.static-source");
    this._imageFileInput = this.querySelector(".image-file-input");
    this._textureSource = this._video;
    this._sourceKind = "video";
    this._message = this.querySelector(".message");
    this._valuesOverlay = this.querySelector(".values-overlay");
    this._status = this.querySelector(".status");
    this._presetEditor = this.querySelector(".preset-editor");
    this._presetNameInput = this.querySelector(".preset-name");
    this._presetIconPicker = this.querySelector("ha-icon-picker.preset-icon");
    this._presetButtons = this.querySelector(".preset-buttons");
    this._permanentPresets = Array.isArray(this.config.presets) ? this.config.presets.slice(0, 4).map(p => ({...p, temporary:false})) : [];
    this._tempPresets = this._readTempPresets();
    this._presets = [...this._permanentPresets, ...this._tempPresets].slice(0, 4);
    this._renderPresetButtons();

    this._bindControls();
    this._initWebGL();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this._stage);
    this._resize();

    try {
      const sourceType = this._resolvedSourceType();
      if (sourceType === "image") {
        await this._loadStaticImage(this.config.image_url || this.config.url);
      } else if (sourceType === "webrtc") {
        await this._startWhep(this._resolveUrl(this.config.whep_url));
      } else {
        this._video.src = this._resolveUrl(this.config.url);
        if (this.config.autoplay) await this._video.play();
      }
    } catch (err) {
      this._setError(`Quelle konnte nicht gestartet werden: ${err.message}`);
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
    this._imageFileInput?.addEventListener("change", (ev) => this._loadLocalImageFile(ev));

    this._animate();
  }

  _controlsHtml() {
    return `
      <div class="pad">
        <button type="button" data-action="up" aria-label="Nach oben"><ha-icon icon="mdi:chevron-up"></ha-icon></button>
        <button type="button" data-action="left" aria-label="Nach links" title="Nach links"><ha-icon icon="mdi:rotate-left"></ha-icon></button>
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht"><ha-icon icon="mdi:home"></ha-icon></button>
        <button type="button" data-action="right" aria-label="Nach rechts" title="Nach rechts"><ha-icon icon="mdi:rotate-right"></ha-icon></button>
        <button type="button" data-action="down" aria-label="Nach unten"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
      </div>
      <div class="presets">
        <div class="preset-buttons" aria-label="Gespeicherte Ansichten"></div>
        ${this.config.image_browse ? `<button type="button" data-action="browse-image" aria-label="Statisches Bild öffnen" title="JPG/PNG öffnen"><ha-icon icon="mdi:image-search-outline"></ha-icon></button>` : ""}
        ${this.config.preset_editor ? `<button type="button" data-action="preset-editor" aria-label="Ansichten verwalten" title="Ansichten verwalten"><ha-icon icon="mdi:square-edit-outline"></ha-icon></button>` : ""}
        <button type="button" data-action="show-values" aria-label="Aktuelle Ansichtswerte" title="Aktuelle Werte anzeigen"><ha-icon icon="mdi:information-outline"></ha-icon></button>
      </div>
      <div class="zoom">
        <button type="button" data-action="zoom-in" aria-label="Vergrößern"><ha-icon icon="mdi:plus"></ha-icon></button>
        <button type="button" data-action="zoom-out" aria-label="Verkleinern"><ha-icon icon="mdi:minus"></ha-icon></button>
      </div>
    `;
  }

  _presetEditorHtml() {
    return `
      <div class="preset-editor" hidden>
        <div class="preset-editor-title">Ansicht speichern</div>
        <label>Name
          <input class="preset-name" type="text" maxlength="24" placeholder="z. B. Einfahrt">
        </label>
        <label>Symbol
          <ha-icon-picker class="preset-icon" value="mdi:camera-marker"></ha-icon-picker>
        </label>
        <div class="preset-editor-actions">
          <button type="button" class="text-button" data-preset-command="save">Speichern</button>
          <button type="button" class="text-button" data-preset-command="overwrite">Überschreiben</button>
          <button type="button" class="text-button danger" data-preset-command="delete">Löschen</button>
        </div>
        <button type="button" class="preset-close" data-preset-command="close" aria-label="Schließen"><ha-icon icon="mdi:close"></ha-icon></button>
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
      .version-badge { font-size: 11px; font-weight: 500; opacity: .55; margin-left: 6px; }
      .status { opacity: .35; font-size: 12px; }
      .status.ok { opacity: 1; }
      .stage {
        position: relative; width: 100%; height: ${Number(this.config.height)}px;
        overflow: hidden; background: #111; outline: none; touch-action: none;
        user-select: none;
      }
      canvas { width: 100%; height: 100%; display: block; }
      video, img.static-source { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .image-file-input { display: none; }
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


      .preset-buttons { display: flex; gap: 8px; }
      .preset-buttons:empty { display: none; }
      .preset-button { position: relative; }
      .preset-button.selected { outline: 2px solid var(--primary-color, #03a9f4); }
      .preset-button .temp-badge { position:absolute; right:-3px; bottom:-3px; --mdc-icon-size:14px; background:#ff9800; border-radius:50%; padding:2px; }
      .preset-editor {
        position: absolute; top: 64px; left: 14px; z-index: 8;
        width: min(330px, calc(100% - 28px)); box-sizing: border-box;
        padding: 16px; border-radius: 14px;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        color: var(--primary-text-color, #212121);
        box-shadow: 0 8px 30px rgba(0,0,0,.35);
        display: grid; gap: 12px;
      }
      .preset-editor[hidden] { display: none; }
      .preset-editor-title { font-size: 16px; font-weight: 600; padding-right: 32px; }
      .preset-editor label { display: grid; gap: 6px; font-size: 13px; }
      .preset-editor input {
        box-sizing: border-box; width: 100%; padding: 10px;
        border: 1px solid var(--divider-color, #ddd); border-radius: 8px;
        color: var(--primary-text-color); background: var(--card-background-color);
      }
      .preset-editor ha-icon-picker { width: 100%; }
      .preset-editor-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .preset-editor .text-button {
        width: auto; height: 38px; padding: 0 14px; border-radius: 19px;
        background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff);
        font-size: 13px;
      }
      .preset-editor .danger { background: var(--error-color, #db4437); }
      .preset-close { position: absolute; top: 8px; right: 8px; background: transparent; color: inherit; }

      ha-icon { --mdc-icon-size: 23px; pointer-events: none; }
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
        display: flex; flex-wrap: wrap; gap: 8px;
        max-width: calc(100% - 105px);
      }
      .presets button.named {
        width: auto; min-width: 42px; padding: 0 12px; border-radius: 22px;
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


  _presetCollectionKey() {
    return `${this.config.storage_key || "unifi-ai360-view-card"}:temp-presets`;
  }

  _readTempPresets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this._presetCollectionKey()) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, Math.min(4, Number(this.config.max_presets || 4))) : [];
    } catch (_) {
      return [];
    }
  }

  _writeTempPresets() {
    localStorage.setItem(this._presetCollectionKey(), JSON.stringify(this._tempPresets));
  }

  _renderPresetButtons() {
    if (!this._presetButtons) return;
    this._presetButtons.innerHTML = this._presets.map((preset, index) => `
      <button type="button" class="preset-button ${this._selectedPresetIndex === index ? "selected" : ""}"
        data-preset-index="${index}" aria-label="${this._escape(preset.name)}" title="${this._escape(preset.name)}">
        <ha-icon icon="${this._escape(preset.icon || "mdi:camera-marker")}"></ha-icon>
        ${preset.temporary ? `<ha-icon class="temp-badge" icon="mdi:clock-outline"></ha-icon>` : ""}
      </button>
    `).join("");
    this._bindPresetButtons();
  }

  _bindPresetButtons() {
    this._presetButtons?.querySelectorAll("[data-preset-index]").forEach((button) => {
      button.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); });
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const index = Number(button.dataset.presetIndex);
        this._selectedPresetIndex = index;
        this._applyStoredPreset(index);
        this._fillPresetEditor(index);
        this._renderPresetButtons();
      });
    });
  }

  _roundViewValue(value) {
    return Number(Number(value || 0).toFixed(3));
  }

  _currentView() {
    return {
      yaw: this._roundViewValue(this._yaw),
      pitch: this._roundViewValue(this._pitch),
      roll: this._roundViewValue(this._roll || 0),
      fov: this._roundViewValue(this._fov),
    };
  }

  _applyStoredPreset(index) {
    const preset = this._presets[index];
    if (!preset) return;
    this._yaw = Number(preset.yaw);
    this._pitch = Number(preset.pitch);
    this._roll = Number(preset.roll || 0);
    this._fov = Number(preset.fov);
    this._fov = Math.min(150, Math.max(25, this._fov));
    this._clampView();
    this._showValuesOverlay(false);
  }

  _fillPresetEditor(index) {
    const preset = this._presets[index];
    if (!preset) return;
    if (this._presetNameInput) this._presetNameInput.value = preset.name || "";
    if (this._presetIconPicker) this._presetIconPicker.value = preset.icon || "mdi:camera-marker";
  }

  _openPresetEditor() {
    if (!this._presetEditor) return;
    this._presetEditor.hidden = false;
    if (this._selectedPresetIndex !== undefined) this._fillPresetEditor(this._selectedPresetIndex);
    this._presetNameInput?.focus();
  }

  _closePresetEditor() {
    if (this._presetEditor) this._presetEditor.hidden = true;
  }

  _presetFormValues() {
    const name = String(this._presetNameInput?.value || "").trim();
    const icon = String(this._presetIconPicker?.value || "mdi:camera-marker").trim() || "mdi:camera-marker";
    return { name, icon };
  }

  _saveNewPreset() {
    const max = Math.min(4, Number(this.config.max_presets || 4));
    if (this._presets.length >= max) {
      this._showToast(`Es können maximal ${max} Ansichten gespeichert werden.`);
      return;
    }
    const { name, icon } = this._presetFormValues();
    if (!name) {
      this._showToast("Bitte einen Namen für die Ansicht eingeben.");
      return;
    }
    const preset = { name, icon, ...this._currentView(), temporary: true };
    this._tempPresets.push(preset);
    this._presets = [...this._permanentPresets, ...this._tempPresets].slice(0, 4);
    this._selectedPresetIndex = this._presets.length - 1;
    this._writeTempPresets();
    this._renderPresetButtons();
    this._closePresetEditor();
    this._showToast(`Ansicht „${name}“ gespeichert.`);
  }

  _overwritePreset() {
    const index = this._selectedPresetIndex;
    if (index === undefined || !this._presets[index]) {
      this._showToast("Bitte zuerst eine gespeicherte Ansicht auswählen.");
      return;
    }
    const { name, icon } = this._presetFormValues();
    if (!name) {
      this._showToast("Bitte einen Namen für die Ansicht eingeben.");
      return;
    }
    const preset = this._presets[index];
    if (!preset.temporary) { this._showToast("Feste YAML-Ansichten können nur im Karteneditor geändert werden."); return; }
    const tempIndex = index - this._permanentPresets.length;
    this._tempPresets[tempIndex] = { name, icon, ...this._currentView(), temporary: true };
    this._presets = [...this._permanentPresets, ...this._tempPresets].slice(0, 4);
    this._writeTempPresets();
    this._renderPresetButtons();
    this._closePresetEditor();
    this._showToast(`Ansicht „${name}“ überschrieben.`);
  }

  _deletePreset() {
    const index = this._selectedPresetIndex;
    if (index === undefined || !this._presets[index]) {
      this._showToast("Bitte zuerst eine gespeicherte Ansicht auswählen.");
      return;
    }
    const preset = this._presets[index];
    if (!preset.temporary) { this._showToast("Feste YAML-Ansichten können nur im Karteneditor gelöscht werden."); return; }
    const name = preset.name;
    const tempIndex = index - this._permanentPresets.length;
    this._tempPresets.splice(tempIndex, 1);
    this._presets = [...this._permanentPresets, ...this._tempPresets].slice(0, 4);
    this._selectedPresetIndex = undefined;
    this._writeTempPresets();
    this._renderPresetButtons();
    if (this._presetNameInput) this._presetNameInput.value = "";
    if (this._presetIconPicker) this._presetIconPicker.value = "mdi:camera-marker";
    this._closePresetEditor();
    this._showToast(`Ansicht „${name}“ gelöscht.`);
  }

  _bindControls() {
    this.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._action(button.dataset.action);
      });
    });

    this.querySelectorAll("[data-preset-command]").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const command = button.dataset.presetCommand;
        if (command === "save") this._saveNewPreset();
        if (command === "overwrite") this._overwritePreset();
        if (command === "delete") this._deletePreset();
        if (command === "close") this._closePresetEditor();
      });
    });
    this._presetIconPicker?.addEventListener("value-changed", (ev) => {
      if (ev.detail?.value) this._presetIconPicker.value = ev.detail.value;
    });

    this._activePointers = new Map();
    this._stage.addEventListener("dblclick", (ev) => {
      if (!this.config.double_tap_home) return;
      if (ev.target.closest?.("button, input, ha-icon-picker, .pad, .presets, .zoom, .preset-editor")) return;
      ev.preventDefault();
      this._action("home");
    });

    this._stage.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest?.("button, input, ha-icon-picker, .pad, .presets, .zoom, .preset-editor")) return;
      this._activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      this._dragging = true;
      this._lastPointer = { x: ev.clientX, y: ev.clientY };
      this._stage.setPointerCapture(ev.pointerId);
      this._stage.focus();
    });

    this._stage.addEventListener("pointermove", (ev) => {
      if (this._activePointers.has(ev.pointerId)) {
        this._activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (this._activePointers.size === 2) {
          const points = [...this._activePointers.values()];
          const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          if (this._lastPinchDistance !== undefined) {
            this._fov -= (distance - this._lastPinchDistance) * 0.12;
            this._fov = Math.min(150, Math.max(25, this._fov));
            this._showValuesOverlay(false);
          }
          this._lastPinchDistance = distance;
          return;
        }
      }
      if (!this._dragging || !this._lastPointer) return;
      const dx = ev.clientX - this._lastPointer.x;
      const dy = ev.clientY - this._lastPointer.y;
      this._lastPointer = { x: ev.clientX, y: ev.clientY };
      const sensitivity = this._fov / Math.max(260, this._stage.clientWidth);
      const wallPointerDirection = String(this.config.mounting_mode || "ceiling") === "wall" ? -1 : 1;
      const horizontal = dx * (this.config.invert_x ? -1 : 1) * wallPointerDirection;
      const vertical = dy * (this.config.invert_y ? -1 : 1)
        * (this.config.projection === "hemisphere" ? 1 : -1);
      const movement = this._transformControlDelta(horizontal, vertical);
      this._yaw += movement.yaw * sensitivity;
      this._pitch += movement.pitch * sensitivity;
      this._clampView();
      this._showValuesOverlay(false);
    });

    const stopDrag = (ev) => {
      this._dragging = false;
      this._lastPointer = null;
      if (ev?.pointerId !== undefined) this._activePointers.delete(ev.pointerId);
      if (this._activePointers.size < 2) this._lastPinchDistance = undefined;
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
      if (!this.config.keyboard) return;
      const editablePath = ev.composedPath?.().some((node) => {
        if (!node) return false;
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true;
        if (node.isContentEditable) return true;
        return [
          "ha-textfield", "ha-selector", "ha-combo-box", "ha-code-editor",
          "ha-icon-picker", "mwc-textfield", "mwc-select", "textarea", "input", "select"
        ].includes(node.localName);
      });
      if (editablePath) return;
      if (ev.key === "Escape") { this._stage?.blur(); return; }
      const active = this.getRootNode()?.activeElement || document.activeElement;
      const stageFocused = active === this._stage || this._stage.matches(":focus-within");
      if (!stageFocused && ev.currentTarget === window) return;
      const map = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        "+": "zoom-in", "=": "zoom-in", "-": "zoom-out", "0": "home",
        "i": "show-values", "I": "show-values", "h": "home", "H": "home"
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
    const projectionY = this.config.projection === "hemisphere" ? 1 : -1;

    let horizontal = 0;
    let vertical = 0;
    if (action === "left") horizontal = -step * cx;
    if (action === "right") horizontal = step * cx;
    if (action === "up") vertical = -step * cy * projectionY;
    if (action === "down") vertical = step * cy * projectionY;

    if (horizontal || vertical) {
      const movement = this._transformControlDelta(horizontal, vertical);
      this._yaw += movement.yaw;
      this._pitch += movement.pitch;
    }

    if (action === "browse-image") this._imageFileInput?.click();
    if (action === "preset-editor") this._openPresetEditor();
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
    ].includes(action)) {
      this._showValuesOverlay(false);
    }
  }

  _mountingAngles() {
    const mode = String(this.config.mounting_mode || "ceiling");
    const baseRotation = Number(this.config.mounting_rotation || 0);

    // World-to-sensor mounting orientation. The established downward-facing
    // mode is the identity transformation and therefore remains unchanged.
    const modes = {
      ceiling: { pitch: 0, yaw: 0, roll: baseRotation },
      down:    { pitch: 0, yaw: 0, roll: baseRotation },
      up:      { pitch: 180, yaw: 0, roll: baseRotation },
      // Wall orientation 0°: pitch 0 samples the lower image edge and
      // pitch -180 samples the upper image edge. Yaw 0 is the right edge;
      // yaw -180 is the left edge. The negative 90° mounting rotation also
      // corrects vertical mouse/button direction without changing controls.
      wall:    { pitch: -90, yaw: 0, roll: baseRotation },
      roof:    { pitch: Number(this.config.mounting_tilt || 0), yaw: 0, roll: baseRotation },
      custom:  {
        pitch: Number(this.config.mounting_pitch || 0),
        yaw: Number(this.config.mounting_yaw || 0),
        roll: baseRotation + Number(this.config.mounting_roll || 0),
      },
    };
    return modes[mode] || modes.ceiling;
  }

  _transformControlDelta(horizontal, vertical) {
    // Controls always operate in world/view coordinates:
    // left/right rotates around the vertical (purple) axis; up/down tilts
    // around the current horizontal (white) axis. The physical mounting is
    // applied later in the shader as a world-to-sensor transformation.
    return { yaw: horizontal, pitch: vertical };
  }

  _resolvedSourceType() {
    const configured = String(this.config.source_type || "auto").toLowerCase();
    if (["image", "video", "webrtc"].includes(configured)) return configured;
    if (this.config.image_url) return "image";
    if (this.config.whep_url) return "webrtc";
    const candidate = String(this.config.url || "").split("?")[0].toLowerCase();
    return /\.(jpe?g|png|webp|gif)$/.test(candidate) ? "image" : "video";
  }

  _cacheBustedImageUrl(url) {
    const resolved = this._resolveUrl(url);
    if (!resolved) return "";
    const separator = resolved.includes("?") ? "&" : "?";
    return `${resolved}${separator}_ha360=${Date.now()}`;
  }

  async _resolveImageUrl(source) {
    if (!source) return "";
    const mediaId = typeof source === "object" ? source.media_content_id : null;
    if (mediaId && mediaId.startsWith("media-source://")) {
      if (!this._hass?.callWS) throw new Error("Home Assistant Media Source kann nicht aufgelöst werden.");
      const resolved = await this._hass.callWS({
        type: "media_source/resolve_media",
        media_content_id: mediaId,
      });
      return resolved?.url || "";
    }
    if (typeof source === "object") return source.url || "";
    return String(source);
  }

  async _loadStaticImage(url, cacheBust = false) {
    if (!url) throw new Error("Keine Bild-URL konfiguriert.");
    this._sourceKind = "image";
    this._textureSource = this._image;
    this._video.pause();
    this._video.removeAttribute("src");
    this._video.srcObject = null;

    const resolvedImageUrl = await this._resolveImageUrl(url);
    const sourceUrl = cacheBust ? this._cacheBustedImageUrl(resolvedImageUrl) : this._resolveUrl(resolvedImageUrl);
    await new Promise((resolve, reject) => {
      this._image.onload = () => resolve();
      this._image.onerror = () => reject(new Error("Bild konnte nicht geladen werden. Prüfe URL, Rechte und CORS."));
      this._image.src = sourceUrl;
    });
    this._message.style.display = "none";
    this._status.classList.add("ok");

    if (this._imageRefreshTimer) clearInterval(this._imageRefreshTimer);
    const seconds = Number(this.config.image_refresh_interval || 0);
    if (seconds > 0 && !String(url).startsWith("blob:")) {
      this._imageRefreshTimer = setInterval(() => {
        this._image.src = this._cacheBustedImageUrl(url);
      }, Math.max(2, seconds) * 1000);
    }
  }

  async _loadLocalImageFile(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      this._showToast("Bitte eine JPG-, PNG- oder WebP-Datei auswählen.");
      return;
    }
    if (this._objectImageUrl) URL.revokeObjectURL(this._objectImageUrl);
    this._objectImageUrl = URL.createObjectURL(file);
    try {
      await this._loadStaticImage(this._objectImageUrl);
      this._showToast(`Bild geöffnet: ${file.name}`);
    } catch (err) {
      this._setError(err.message);
    }
    event.target.value = "";
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

  _persistCurrentView() {
    try {
      localStorage.setItem(
        `${this.config.storage_key || "unifi-ai360-view-card"}:current-view`,
        JSON.stringify(this._currentView())
      );
    } catch (_) {}
  }

  _showValuesOverlay(longDisplay = false) {
    this._persistCurrentView();
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

  _showToast(message) {
    const event = new CustomEvent("hass-notification", {
      bubbles: true, composed: true, detail: { message }
    });
    this.dispatchEvent(event);
  }

  _clampView() {
    const yawMin = Number(this.config.yaw_min);
    const yawMax = Number(this.config.yaw_max);
    if (Number.isFinite(yawMin) && Number.isFinite(yawMax) && yawMin < yawMax) {
      this._yaw = Math.min(yawMax, Math.max(yawMin, this._yaw));
    } else {
      this._yaw = ((this._yaw + 180) % 360 + 360) % 360 - 180;
    }
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
      uniform float u_mount_pitch;
      uniform float u_mount_yaw;
      uniform float u_mount_roll;

      const float PI = 3.141592653589793;

      mat3 rotY(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
      }
      mat3 rotX(float a) {
        float c = cos(a), s = sin(a);
        return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c);
      }
      mat3 rotZ(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c,s,0.0, -s,c,0.0, 0.0,0.0,1.0);
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

        // Convert the world/view ray into the physical sensor coordinate
        // system. This makes ceiling/up/wall/roof/custom mounting modes
        // affect both dewarping and all control axes while preserving the
        // proven standard-down behavior as the identity transformation.
        ray = rotZ(-u_mount_roll) * rotY(-u_mount_yaw) * rotX(-u_mount_pitch) * ray;

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
      "u_fisheye_fov", "u_radius", "u_center", "u_rotate", "u_mirror", "u_projection", "u_mount_pitch", "u_mount_yaw", "u_mount_roll"
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
    const sourceReady = this._sourceKind === "image"
      ? Boolean(this._image?.complete && this._image.naturalWidth > 0)
      : this._video.readyState >= 2;
    if (sourceReady) {
      gl.useProgram(this._program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      try {
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
          gl.UNSIGNED_BYTE, this._textureSource
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
        const mounting = this._mountingAngles();
        gl.uniform1f(this._uniforms.u_mount_pitch, this._deg(mounting.pitch));
        gl.uniform1f(this._uniforms.u_mount_yaw, this._deg(mounting.yaw));
        gl.uniform1f(this._uniforms.u_mount_roll, this._deg(mounting.roll));
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

  static getConfigElement() {
    return document.createElement("ha-360-camera-card-editor");
  }

  static getStubConfig() {
    return {
      title: "360° Camera",
      type: "custom:ha-360-camera-card",
      source_type: "webrtc",
      whep_url: "https://HOME-ASSISTANT-ODER-GO2RTC/api/webrtc?src=ai360",
      height: 520,
      fisheye_fov: 360,
      circle_radius: 0.49,
      pitch_min: 0,
      pitch_max: 89,
      mounting_mode: "ceiling",
      mounting_rotation: 0,
    };
  }
}

class Ha360CameraCardEditor extends HTMLElement {
  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _render() {
    if (!this._config) return;
    const checked = (key, fallback = true) =>
      (this._config[key] === undefined ? fallback : this._config[key]) ? "checked" : "";
    const presets = Array.isArray(this._config.presets) ? this._config.presets.slice(0,4) : [];
    const storageKey = this._config.storage_key || "unifi-ai360-view-card";
    let tempPresets = [];
    try { tempPresets = JSON.parse(localStorage.getItem(`${storageKey}:temp-presets`) || "[]"); } catch (_) {}
    this.innerHTML = `
      <style>
        .editor{display:grid;gap:16px;padding:8px 0}.editor-version{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;background:var(--secondary-background-color)}.editor-version b{font-size:15px}.editor-version span{font-size:12px;opacity:.7}.section{display:grid;gap:12px;padding:14px;border:1px solid var(--divider-color);border-radius:12px}
        h3{margin:0;font-size:15px} label{display:grid;gap:5px;font-size:13px} input,select{box-sizing:border-box;width:100%;padding:10px;border-radius:8px;border:1px solid var(--divider-color);color:var(--primary-text-color);background:var(--card-background-color)}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mounting-preview{display:grid;place-items:center;min-height:105px;padding:12px;border-radius:10px;background:var(--secondary-background-color);font-size:36px}.mounting-preview .camera{display:inline-block;transform:rotate(var(--mount-rotation));transition:transform .2s ease}.mounting-note{font-size:12px;color:var(--secondary-text-color)}.check{display:flex;align-items:center;gap:8px}.check input{width:auto}.preset-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;border:1px solid var(--divider-color);border-radius:10px}.preset-actions{grid-column:1/-1;display:flex;gap:8px}.preset-actions button,.import{padding:8px 12px;border:0;border-radius:8px;cursor:pointer}.danger{background:var(--error-color);color:white} small{color:var(--secondary-text-color)}.tabs{display:flex;gap:6px;border-bottom:1px solid var(--divider-color);padding-bottom:8px}.tab{padding:8px 12px;border:0;border-radius:8px;background:var(--secondary-background-color);color:var(--primary-text-color);cursor:pointer}.tab.active{background:var(--primary-color);color:var(--text-primary-color,#fff)}.tab-panel[hidden]{display:none}.home-actions{display:flex;gap:8px;flex-wrap:wrap}.home-actions button{padding:9px 12px;border:0;border-radius:8px;cursor:pointer}.media-selector-wrap{display:grid;gap:6px}
      </style>
      <div class="editor">
        <div class="editor-version"><b>HA 360 Camera Card</b><span>Version / Build ${HA360_VERSION}</span></div>
        <div class="section"><h3>Allgemein</h3>${this._input("title","Titel")}
          <label>Quellentyp<select data-key="source_type">${[["auto","Automatisch"],["webrtc","WebRTC / WHEP"],["video","Video-URL"],["image","Statisches Bild (JPG/PNG)"]].map(([v,l])=>`<option value="${v}" ${(this._config.source_type||"auto")===v?"selected":""}>${l}</option>`).join("")}</select></label>
          ${this._sourceFields()}
          <label>Kameraprofil<select data-key="camera_profile">${[["generic","Generic"],["unifi_ai360","UniFi AI360"],["unifi_g6_pro_360","UniFi G6 Pro 360"],["generic_circular_fisheye","Generic circular fisheye"]].map(([v,l])=>`<option value="${v}" ${this._config.camera_profile===v?"selected":""}>${l}</option>`).join("")}</select></label>
          ${this._input("storage_key", "Storage Key")}
          <small>Der Storage Key trennt temporäre Ansichten und die aktuelle Home-Übernahme mehrerer Kamerakarten voneinander.</small>
          <div class="grid">${this._number("height","Höhe")}${this._number("step","Schrittweite")}</div></div>
        ${this._mountingSection()}
        <div class="section"><h3>Home & Ansichten</h3>
          <div class="tabs" data-tab-group="views"><button class="tab active" data-tab="home">Home-Position</button><button class="tab" data-tab="presets">Gespeicherte Ansichten</button></div>
          <div class="tab-panel" data-tab-group="views" data-tab-panel="home">
            <small>Diese Werte verwendet die Home-Taste.</small>
            <div class="grid">${this._number("yaw","Yaw")}${this._number("pitch","Pitch")}${this._number("roll","Roll")}${this._number("fov","FOV")}</div>
            <div class="home-actions"><button data-use-current-home>Aktuelle Darstellung als Home übernehmen</button>${this._g6WallCalibrationButton()}</div>
          </div>
          <div class="tab-panel" data-tab-group="views" data-tab-panel="presets" hidden>
            <small>Diese Ansichten werden in der Karten-YAML gespeichert.</small>
            <div id="preset-list">${presets.map((p,i)=>this._presetRow(p,i)).join("")}</div>
            ${presets.length<4?'<button class="import" data-add-preset>Neue feste Ansicht</button>':''}
            ${tempPresets.length?`<h3>Temporäre Ansichten</h3><small>Mit „Übernehmen“ wird die Ansicht fest in der YAML-Konfiguration gespeichert.</small>${tempPresets.map((p,i)=>`<div class="preset-row"><b>${this._escape(p.name||`Ansicht ${i+1}`)}</b><ha-icon icon="${this._escape(p.icon||'mdi:camera-marker')}"></ha-icon><div class="preset-actions"><button data-import-temp="${i}">Übernehmen</button><button class="danger" data-delete-temp="${i}">Verwerfen</button></div></div>`).join('')}`:''}
          </div>
        </div>
        <div class="section"><h3>Darstellung und Bedienung</h3>
          <div class="tabs" data-tab-group="controls"><button class="tab active" data-tab="controls">Bedienung</button><button class="tab" data-tab="geometry">Geometrie & Experten</button></div>
          <div class="tab-panel" data-tab-group="controls" data-tab-panel="controls">
            <label class="check"><input type="checkbox" data-key="controls" ${checked("controls")}>Bedienelemente anzeigen</label>
            <label class="check"><input type="checkbox" data-key="keyboard" ${checked("keyboard")}>Tastatursteuerung</label>
            <label class="check"><input type="checkbox" data-key="preset_editor" ${checked("preset_editor")}>Temporäre Ansicht in der Karte speichern</label>
            <label class="check"><input type="checkbox" data-key="muted" ${checked("muted")}>Stream stummschalten</label>
          </div>
          <div class="tab-panel" data-tab-group="controls" data-tab-panel="geometry" hidden>
            <small>Alle Projektions-, Grenz- und Invertierungswerte. Änderungen wirken direkt auf die Karten-YAML.</small>
            <label>Projektion<select data-key="projection">${[["hemisphere","Hemisphere"],["fisheye","Fisheye"],["flat","Flat"]].map(([v,l])=>`<option value="${v}" ${(this._config.projection||"hemisphere")===v?"selected":""}>${l}</option>`).join("")}</select></label>
            <div class="grid">
              ${this._number("fisheye_fov","Fisheye FOV")}${this._number("circle_radius","Kreisradius")}
              ${this._number("center_x","Mittelpunkt X")}${this._number("center_y","Mittelpunkt Y")}
              ${this._number("rotate","Quellbild drehen")}${this._number("step","Schrittweite")}
              ${this._number("yaw_min","Yaw min")}${this._number("yaw_max","Yaw max")}
              ${this._number("pitch_min","Pitch min")}${this._number("pitch_max","Pitch max")}
            </div>
            <label class="check"><input type="checkbox" data-key="mirror" ${checked("mirror",false)}>Bild spiegeln</label>
            <label class="check"><input type="checkbox" data-key="invert_x" ${checked("invert_x",false)}>Maus/Touch X zusätzlich invertieren</label>
            <label class="check"><input type="checkbox" data-key="invert_y" ${checked("invert_y",false)}>Maus/Touch Y zusätzlich invertieren</label>
            <label class="check"><input type="checkbox" data-key="control_invert_x" ${checked("control_invert_x",true)}>Buttons/Tastatur X invertieren</label>
            <label class="check"><input type="checkbox" data-key="control_invert_y" ${checked("control_invert_y",true)}>Buttons/Tastatur Y invertieren</label>
          </div>
        </div>
      </div>`;
    this.querySelectorAll("[data-key]").forEach(el => {
      el.addEventListener("change", () => this._change(el));
      el.addEventListener("keydown", (event) => event.stopPropagation());
    });
    this.querySelectorAll('[data-preset-field]').forEach(el=>el.addEventListener('change',()=>this._updatePresetField(el)));
    this.querySelectorAll('[data-delete-preset]').forEach(el=>el.addEventListener('click',()=>this._deletePermanentPreset(Number(el.dataset.deletePreset))));
    this.querySelector('[data-add-preset]')?.addEventListener('click',()=>this._addPermanentPreset());
    this.querySelectorAll('[data-import-temp]').forEach(el=>el.addEventListener('click',()=>this._importTempPreset(Number(el.dataset.importTemp),tempPresets)));
    this.querySelectorAll('[data-delete-temp]').forEach(el=>el.addEventListener('click',()=>this._deleteTempPreset(Number(el.dataset.deleteTemp),tempPresets,storageKey)));
    this.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
      const group = button.closest('[data-tab-group]')?.dataset.tabGroup || 'views';
      this._selectTab(group, button.dataset.tab);
    }));
    this.querySelector('[data-use-current-home]')?.addEventListener('click', () => this._useCurrentViewAsHome(storageKey));
    this.querySelector('[data-apply-g6-wall]')?.addEventListener('click', () => this._applyG6WallCalibration());
    this._setupMediaSelector();
  }

  _sourceFields() {
    const type = String(this._config.source_type || "auto");
    if (type === "image") {
      return `<div class="media-selector-wrap"><label>Bild aus Medien auswählen</label><ha-selector class="image-media-selector"></ha-selector></div>
        ${this._input("image_url", "Bild-URL / manueller Pfad")}
        <div class="grid">${this._number("image_refresh_interval", "Aktualisierung (Sek., 0 = aus)")}</div>
        <small>Über die Medienauswahl kannst du Bilder per Maus aus Home Assistants Medienbrowser wählen. Alternativ: /local/snapshots/last_motion.jpg.</small>`;
    }
    if (type === "video") return this._input("url", "Video-URL");
    if (type === "webrtc") return this._input("whep_url", "WHEP-URL");
    return `${this._input("whep_url", "WHEP-URL")}${this._input("image_url", "Alternative Bild-URL")}`;
  }

  _setupMediaSelector() {
    const selector = this.querySelector(".image-media-selector");
    if (!selector) return;
    selector.hass = this._hass;
    selector.selector = { media: { accept: ["image/*"] } };
    selector.value = (typeof this._config.image_url === "object") ? this._config.image_url : undefined;
    selector.addEventListener("value-changed", (event) => {
      const value = event.detail?.value;
      if (!value) return;
      const config = { ...this._config, source_type: "image", image_url: value };
      this._emit(config);
    });
  }

  _selectTab(group, name) {
    this.querySelectorAll(`[data-tab-group="${group}"] [data-tab]`).forEach(button =>
      button.classList.toggle("active", button.dataset.tab === name)
    );
    this.querySelectorAll(`[data-tab-panel][data-tab-group="${group}"]`).forEach(panel => {
      panel.hidden = panel.dataset.tabPanel !== name;
    });
  }

  _useCurrentViewAsHome(storageKey) {
    let view;
    try { view = JSON.parse(localStorage.getItem(`${storageKey}:current-view`) || "null"); } catch (_) {}
    if (!view) return;
    const config = { ...this._config, yaw: Number(view.yaw), pitch: Number(view.pitch), roll: Number(view.roll), fov: Number(view.fov) };
    this._emit(config);
    this._render();
  }

  _g6WallCalibrationButton() {
    if (
      this._config.camera_profile !== "unifi_g6_pro_360" ||
      this._config.mounting_mode !== "wall" ||
      Number(this._config.mounting_rotation || 0) !== 0
    ) return "";
    return '<button data-apply-g6-wall>G6 Pro 360 Wandkalibrierung übernehmen</button>';
  }

  _applyG6WallCalibration() {
    const wall = CAMERA_PROFILES.unifi_g6_pro_360.wall_calibration;
    const config = {
      ...this._config,
      yaw: wall.home_yaw,
      pitch: wall.home_pitch,
      roll: wall.roll,
      fov: wall.fov,
      yaw_min: wall.yaw_right,
      yaw_max: wall.yaw_left,
      pitch_min: wall.pitch_bottom,
      pitch_max: wall.pitch_top,
    };
    this._emit(config);
    this._render();
  }

  _mountingSection() {
    const mode = this._config.mounting_mode || "ceiling";
    const rotation = Number(this._config.mounting_rotation || 0);
    const modes = [
      ["ceiling", "Nach unten / normale Montage"],
      ["up", "Nach oben"],
      ["wall", "Wand"],
      ["roof", "Dach / Schräge (deaktiviert)"],
      ["custom", "Benutzerdefiniert"],
    ];
    const modeFields = mode === "roof"
      ? '<small>Die schräge Montage ist derzeit deaktiviert. Verwende bis zur erneuten Kalibrierung „Benutzerdefiniert“.</small>'
      : mode === "custom"
        ? `<div class="grid">${this._number("mounting_yaw", "Montage-Yaw")}${this._number("mounting_pitch", "Montage-Pitch")}${this._number("mounting_roll", "Montage-Roll")}</div>`
        : "";
    const symbols = { ceiling: "⌄📷", down: "⌄📷", up: "📷⌃", wall: "📷→", roof: "╱📷", custom: "📷" };
    return `<div class="section"><h3>Kameramontage</h3>
      <small>Passt Maus-, Touch-, Tastatur- und Buttonsteuerung an die Einbaulage an. Die Bildkalibrierung bleibt unverändert.</small>
      <label>Installation<select data-key="mounting_mode">${modes.map(([v,l])=>`<option value="${v}" ${mode===v?"selected":""} ${v==="roof"?"disabled":""}>${l}</option>`).join("")}</select></label>
      <label>Drehung<select data-key="mounting_rotation">${[0,90,180,270].map(v=>`<option value="${v}" ${rotation===v?"selected":""}>${v}°</option>`).join("")}</select></label>
      ${modeFields}
      <div class="mounting-preview" data-mounting-preview style="--mount-rotation:${rotation}deg"><span class="camera">${symbols[mode] || "📷"}</span></div>
      <div class="mounting-note">Die Steuerachsen werden entsprechend der optischen Kameraachse gekippt. Die normale Montage nach unten bleibt unverändert.</div>
    </div>`;
  }

  _updateMountingPreview() {
    const preview = this.querySelector("[data-mounting-preview]");
    if (!preview) return;
    preview.style.setProperty("--mount-rotation", `${Number(this._config.mounting_rotation || 0)}deg`);
  }

  _presetRow(preset,index){return `<div class="preset-row"><label>Name<input data-preset-field="name" data-preset-index="${index}" value="${this._escape(preset.name||'')}"></label><label>Symbol<ha-icon-picker data-preset-field="icon" data-preset-index="${index}" value="${this._escape(preset.icon||'mdi:camera-marker')}"></ha-icon-picker></label><label>Yaw<input type="number" step="0.001" data-preset-field="yaw" data-preset-index="${index}" value="${this._round3(preset.yaw??0)}"></label><label>Pitch<input type="number" step="0.001" data-preset-field="pitch" data-preset-index="${index}" value="${this._round3(preset.pitch??0)}"></label><label>Roll<input type="number" step="0.001" data-preset-field="roll" data-preset-index="${index}" value="${this._round3(preset.roll??0)}"></label><label>FOV<input type="number" step="0.001" data-preset-field="fov" data-preset-index="${index}" value="${this._round3(preset.fov??95)}"></label><div class="preset-actions"><button class="danger" data-delete-preset="${index}">Löschen</button></div></div>`}
  _round3(value){return Number(Number(value||0).toFixed(3));}
  _roundedPreset(preset){return {...preset,yaw:this._round3(preset.yaw),pitch:this._round3(preset.pitch),roll:this._round3(preset.roll),fov:this._round3(preset.fov)};}
  _emit(config){this._config=config;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config},bubbles:true,composed:true}));}
  _updatePresetField(el){const config={...this._config,presets:[...(this._config.presets||[])]};const i=Number(el.dataset.presetIndex);config.presets[i]={...config.presets[i]};let v=el.value;if(el.type==='number')v=this._round3(v);config.presets[i][el.dataset.presetField]=v;this._emit(config)}
  _deletePermanentPreset(i){const config={...this._config,presets:[...(this._config.presets||[])]};config.presets.splice(i,1);this._emit(config);this._render()}
  _addPermanentPreset(){const config={...this._config,presets:[...(this._config.presets||[])]};if(config.presets.length>=4)return;config.presets.push(this._roundedPreset({name:`Ansicht ${config.presets.length+1}`,icon:'mdi:camera-marker',yaw:Number(config.yaw||0),pitch:Number(config.pitch||0),roll:Number(config.roll||0),fov:Number(config.fov||95)}));this._emit(config);this._render()}
  _importTempPreset(i,temp){const config={...this._config,presets:[...(this._config.presets||[])]};if(config.presets.length>=4)return;const p=this._roundedPreset({...temp[i]});delete p.temporary;config.presets.push(p);temp.splice(i,1);localStorage.setItem(`${config.storage_key||'unifi-ai360-view-card'}:temp-presets`,JSON.stringify(temp));this._emit(config);this._render()}
  _deleteTempPreset(i,temp,key){temp.splice(i,1);localStorage.setItem(`${key}:temp-presets`,JSON.stringify(temp));this._render()}

  _input(key, label) {
    const raw = this._config[key];
    const value = typeof raw === "object" ? "" : (raw ?? "");
    return `<label>${label}<input data-key="${key}" value="${this._escape(value)}"></label>`;
  }
  _number(key, label) {
    return `<label>${label}<input type="number" data-key="${key}" value="${this._config[key] ?? ""}"></label>`;
  }
  _change(element) {
    const config = { ...this._config };
    let value;
    if (element.type === "checkbox") value = element.checked;
    else if (element.type === "number") value = element.value === "" ? undefined : Number(element.value);
    else if (["mounting_rotation"].includes(element.dataset.key)) value = Number(element.value);
    else value = element.value;
    if (value === undefined || value === "") delete config[element.dataset.key];
    else config[element.dataset.key] = value;
    if (element.dataset.key === "camera_profile") {
      const profile = CAMERA_PROFILES[value] || CAMERA_PROFILES.generic;
      Object.assign(config, profile);
    }
    if (
      config.camera_profile === "unifi_g6_pro_360" &&
      config.mounting_mode === "wall" &&
      Number(config.mounting_rotation || 0) === 0 &&
      ["camera_profile", "mounting_mode", "mounting_rotation"].includes(element.dataset.key)
    ) {
      const wall = CAMERA_PROFILES.unifi_g6_pro_360.wall_calibration;
      Object.assign(config, {
        yaw: wall.home_yaw, pitch: wall.home_pitch, roll: wall.roll, fov: wall.fov,
        yaw_min: wall.yaw_right, yaw_max: wall.yaw_left,
        pitch_min: wall.pitch_bottom, pitch_max: wall.pitch_top,
      });
    }
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config }, bubbles: true, composed: true
    }));
    if (["mounting_mode", "source_type"].includes(element.dataset.key)) this._render();
    else if (element.dataset.key.startsWith("mounting_")) this._updateMountingPreview();
  }
  _escape(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }
}

if (!customElements.get("ha-360-camera-card-editor")) {
  customElements.define("ha-360-camera-card-editor", Ha360CameraCardEditor);
}

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
