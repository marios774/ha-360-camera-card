var d="1.1.1",u={generic:{},unifi_ai360:{projection:"hemisphere",fisheye_fov:180,circle_radius:.49,center_x:.5,center_y:.5,roll:180,mirror:!0},generic_circular_fisheye:{projection:"hemisphere",fisheye_fov:180,circle_radius:.5,center_x:.5,center_y:.5},unifi_g6_pro_360:{projection:"hemisphere",fisheye_fov:180,circle_radius:.49,center_x:.5,center_y:.5,roll:180,mirror:!0}},c=class extends HTMLElement{setConfig(e){if(!e||!e.url&&!e.whep_url)throw new Error("Bitte 'url' oder 'whep_url' konfigurieren.");let t=u[e.camera_profile]||u.generic;this.config={title:"360\xB0 Camera",camera_profile:"generic",height:520,fov:95,projection:"hemisphere",fisheye_fov:360,circle_radius:.5,center_x:.5,center_y:.5,yaw:0,pitch:0,pitch_min:0,pitch_max:89,step:8,invert_x:!1,invert_y:!1,control_invert_x:!0,control_invert_y:!0,storage_key:"unifi-ai360-view-card",clipboard_preset_name:"preset_XX",preset_1:null,preset_2:null,rotate:0,mirror:!1,controls:!0,keyboard:!0,named_presets:{},double_tap_home:!0,muted:!0,autoplay:!0,...t,...e},this._viewInitialized||(this._yaw=Number(this.config.yaw),this._pitch=Number(this.config.pitch),this._roll=Number(this.config.roll||0),this._fov=Number(this.config.fov),this._viewInitialized=!0),this._dragging=!1,this._lastPointer=null,this._raf=null,this._pc=null,this._resizeObserver=null,this._rendered=!1,this._hass=null}set hass(e){this._hass=e,this._rendered||this._render()}getCardSize(){return Math.max(3,Math.ceil(Number(this.config?.height||520)/50))}disconnectedCallback(){this._raf&&cancelAnimationFrame(this._raf),this._valuesOverlayTimer&&clearTimeout(this._valuesOverlayTimer),this._resizeObserver&&this._resizeObserver.disconnect(),this._pc&&this._pc.close(),this._video&&(this._video.pause(),this._video.srcObject=null,this._video.removeAttribute("src"),this._video.load()),window.removeEventListener("keydown",this._onKeyDownBound)}async _render(){this._rendered=!0,this.innerHTML=`
      <ha-card>
        <div class="header">
          <div class="title">${this._escape(this.config.title)}</div>
          <div class="status" title="Streamstatus">\u25CF</div>
        </div>
        <div class="stage" tabindex="0" aria-label="360 Grad Kameraansicht">
          <canvas></canvas>
          <video playsinline ${this.config.muted?"muted":""}></video>
          <div class="message">Stream wird geladen \u2026</div>
          <div class="values-overlay" aria-live="polite"></div>
          ${this.config.controls?this._controlsHtml():""}
        </div>
      </ha-card>
    `,this._injectStyles(),this._stage=this.querySelector(".stage"),this._canvas=this.querySelector("canvas"),this._video=this.querySelector("video"),this._message=this.querySelector(".message"),this._valuesOverlay=this.querySelector(".values-overlay"),this._status=this.querySelector(".status"),this._bindControls(),this._initWebGL(),this._resizeObserver=new ResizeObserver(()=>this._resize()),this._resizeObserver.observe(this._stage),this._resize();try{this.config.whep_url?await this._startWhep(this._resolveUrl(this.config.whep_url)):(this._video.src=this._resolveUrl(this.config.url),this.config.autoplay&&await this._video.play())}catch(e){this._setError(`Stream konnte nicht gestartet werden: ${e.message}`)}this._video.addEventListener("playing",()=>{this._message.style.display="none",this._status.classList.add("ok")}),this._video.addEventListener("waiting",()=>{this._status.classList.remove("ok")}),this._video.addEventListener("error",()=>{let e=this._video.error?.code;this._setError(`Videofehler${e?` (Code ${e})`:""}.`)}),this._animate()}_controlsHtml(){return`
      <div class="pad">
        <button type="button" data-action="up" aria-label="Nach oben">\u25B2</button>
        <button type="button" data-action="left" aria-label="Nach links" title="Nach links"><ha-icon icon="mdi:undo"></ha-icon></button>
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht">\u25CF</button>
        <button type="button" data-action="right" aria-label="Nach rechts" title="Nach rechts"><ha-icon icon="mdi:redo"></ha-icon></button>
        <button type="button" data-action="down" aria-label="Nach unten">\u25BC</button>
      </div>
      <div class="presets">
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht">H</button>
        <button type="button" data-action="preset-1" aria-label="Ansicht 1" title="Antippen: aufrufen \xB7 lange dr\xFCcken: speichern">1</button>
        <button type="button" data-action="preset-2" aria-label="Ansicht 2" title="Antippen: aufrufen \xB7 lange dr\xFCcken: speichern">2</button>
        ${this._namedPresetButtonsHtml()}
        <button type="button" data-action="show-values" aria-label="Aktuelle Ansichtswerte" title="Aktuelle Werte anzeigen">i</button>
      </div>
      <div class="zoom">
        <button type="button" data-action="zoom-in" aria-label="Vergr\xF6\xDFern">\uFF0B</button>
        <button type="button" data-action="zoom-out" aria-label="Verkleinern">\u2212</button>
      </div>
    `}_injectStyles(){let e=document.createElement("style");e.textContent=`
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
    `,this.prepend(e)}_namedPresetButtonsHtml(){return Object.keys(this.config.named_presets||{}).slice(0,6).map(e=>`<button type="button" class="named" data-preset-name="${this._escape(e)}" title="Ansicht ${this._escape(e)}">${this._escape(e)}</button>`).join("")}_loadNamedPreset(e){let t=this.config.named_presets?.[e];!t||typeof t!="object"||(t.yaw!==void 0&&(this._yaw=Number(t.yaw)),t.pitch!==void 0&&(this._pitch=Number(t.pitch)),t.roll!==void 0&&(this._roll=Number(t.roll)),t.fov!==void 0&&(this._fov=Number(t.fov)),this._fov=Math.min(150,Math.max(25,this._fov)),this._clampView(),this._showValuesOverlay(!0))}_bindControls(){this.querySelectorAll("button[data-preset-name]").forEach(t=>{t.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation(),this._loadNamedPreset(t.dataset.presetName)})}),this.querySelectorAll("button[data-action]").forEach(t=>{let i=null,r=!1;t.addEventListener("pointerdown",a=>{a.preventDefault(),a.stopPropagation(),r=!1,(t.dataset.action==="preset-1"||t.dataset.action==="preset-2")&&(i=window.setTimeout(()=>{r=!0,this._savePreset(t.dataset.action==="preset-1"?1:2)},700))});let s=()=>{i&&window.clearTimeout(i),i=null};t.addEventListener("pointerup",s),t.addEventListener("pointercancel",s),t.addEventListener("pointerleave",s),t.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),r||this._action(t.dataset.action)})}),this._activePointers=new Map,this._stage.addEventListener("dblclick",t=>{this.config.double_tap_home&&(t.target.closest?.("button, .pad, .presets, .zoom")||(t.preventDefault(),this._action("home")))}),this._stage.addEventListener("pointerdown",t=>{t.target.closest?.("button, .pad, .presets, .zoom")||(this._activePointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this._dragging=!0,this._lastPointer={x:t.clientX,y:t.clientY},this._stage.setPointerCapture(t.pointerId),this._stage.focus())}),this._stage.addEventListener("pointermove",t=>{if(this._activePointers.has(t.pointerId)&&(this._activePointers.set(t.pointerId,{x:t.clientX,y:t.clientY}),this._activePointers.size===2)){let a=[...this._activePointers.values()],o=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);this._lastPinchDistance!==void 0&&(this._fov-=(o-this._lastPinchDistance)*.12,this._fov=Math.min(150,Math.max(25,this._fov)),this._showValuesOverlay(!1)),this._lastPinchDistance=o;return}if(!this._dragging||!this._lastPointer)return;let i=t.clientX-this._lastPointer.x,r=t.clientY-this._lastPointer.y;this._lastPointer={x:t.clientX,y:t.clientY};let s=this._fov/Math.max(260,this._stage.clientWidth);this._yaw+=i*s*(this.config.invert_x?-1:1),this.config.projection==="hemisphere"?this._pitch+=r*s*(this.config.invert_y?-1:1):this._pitch+=r*s*(this.config.invert_y?1:-1),this._clampView(),this._showValuesOverlay(!1)});let e=t=>{this._dragging=!1,this._lastPointer=null,t?.pointerId!==void 0&&this._activePointers.delete(t.pointerId),this._activePointers.size<2&&(this._lastPinchDistance=void 0)};this._stage.addEventListener("pointerup",e),this._stage.addEventListener("pointercancel",e),this._stage.addEventListener("wheel",t=>{t.preventDefault(),this._fov+=Math.sign(t.deltaY)*5,this._fov=Math.min(150,Math.max(25,this._fov)),this._showValuesOverlay(!1)},{passive:!1}),this._onKeyDownBound=t=>{if(!this.config.keyboard||!((this.getRootNode()?.activeElement||document.activeElement)===this._stage||this._stage.matches(":focus-within"))&&t.currentTarget===window)return;let s={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right","+":"zoom-in","=":"zoom-in","-":"zoom-out",0:"home",i:"show-values",I:"show-values",h:"home",H:"home"};s[t.key]&&(t.preventDefault(),this._action(s[t.key]))},window.addEventListener("keydown",this._onKeyDownBound)}_action(e){let t=Number(this.config.step),i=this.config.control_invert_x?-1:1,r=this.config.control_invert_y?-1:1;e==="left"&&(this._yaw-=t*i),e==="right"&&(this._yaw+=t*i),this.config.projection==="hemisphere"?(e==="up"&&(this._pitch-=t*r),e==="down"&&(this._pitch+=t*r)):(e==="up"&&(this._pitch+=t*r),e==="down"&&(this._pitch-=t*r)),e==="preset-1"&&this._loadPreset(1),e==="preset-2"&&this._loadPreset(2),e==="show-values"&&this._copyCurrentValuesAsYaml(),e==="zoom-in"&&(this._fov-=8),e==="zoom-out"&&(this._fov+=8),e==="home"&&(this._yaw=Number(this.config.yaw),this._pitch=Number(this.config.pitch),this._roll=Number(this.config.roll||0),this._fov=Number(this.config.fov)),this._fov=Math.min(150,Math.max(25,this._fov)),this._clampView(),["left","right","up","down","zoom-in","zoom-out","home","preset-1","preset-2"].includes(e)&&this._showValuesOverlay(!1)}async _copyCurrentValuesAsYaml(){let e={yaw:Number(this._yaw.toFixed(1)),pitch:Number(this._pitch.toFixed(1)),roll:Number((this._roll||0).toFixed(1)),fov:Number(this._fov.toFixed(1))},t=String(this.config.clipboard_preset_name||"preset_XX").trim().replace(/:\s*$/,"")||"preset_XX",i=`${t}:
  yaw: ${e.yaw}
  pitch: ${e.pitch}
  roll: ${e.roll}
  fov: ${e.fov}`;try{navigator.clipboard&&window.isSecureContext?await navigator.clipboard.writeText(i):this._copyTextFallback(i),this._showValuesOverlay(!0),this._showToast(`${t} als YAML in die Zwischenablage kopiert.`),console.info(`UniFi AI 360 View Card \u2013 kopiertes YAML:
`+i)}catch(r){try{this._copyTextFallback(i),this._showToast(`${t} als YAML in die Zwischenablage kopiert.`)}catch(s){this._showToast("Kopieren nicht m\xF6glich. Browser-Berechtigung f\xFCr die Zwischenablage pr\xFCfen."),console.error("UniFi AI 360 View Card \u2013 Zwischenablagefehler",r,s)}}}_showValuesOverlay(e=!1){if(!this._valuesOverlay)return;let t=Number(this._yaw.toFixed(1)),i=Number(this._pitch.toFixed(1)),r=Number((this._roll||0).toFixed(1)),s=Number(this._fov.toFixed(1));this._valuesOverlay.textContent=`yaw: ${t}
pitch: ${i}
roll: ${r}
fov: ${s}`,this._valuesOverlay.classList.add("visible"),this._valuesOverlayTimer&&clearTimeout(this._valuesOverlayTimer),this._valuesOverlayTimer=window.setTimeout(()=>{this._valuesOverlay?.classList.remove("visible")},e?5e3:1800)}_copyTextFallback(e){let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.left="-9999px",t.style.top="0",document.body.appendChild(t),t.focus(),t.select();let i=document.execCommand("copy");if(document.body.removeChild(t),!i)throw new Error("document.execCommand('copy') ist fehlgeschlagen.")}_presetStorageKey(e){return`${this.config.storage_key||"unifi-ai360-view-card"}:preset:${e}`}_configuredPreset(e){let t=this.config[`preset_${e}`];return t&&typeof t=="object"?t:null}_loadPreset(e){let t=null;try{let i=localStorage.getItem(this._presetStorageKey(e));i&&(t=JSON.parse(i))}catch{}if(t=t||this._configuredPreset(e),!t){this._showToast(`Ansicht ${e} ist noch nicht gespeichert.`);return}t.yaw!==void 0&&(this._yaw=Number(t.yaw)),t.pitch!==void 0&&(this._pitch=Number(t.pitch)),t.roll!==void 0&&(this._roll=Number(t.roll)),t.fov!==void 0&&(this._fov=Number(t.fov)),this._fov=Math.min(150,Math.max(25,this._fov)),this._clampView()}_savePreset(e){let t={yaw:this._yaw,pitch:this._pitch,roll:this._roll||0,fov:this._fov};try{localStorage.setItem(this._presetStorageKey(e),JSON.stringify(t)),this._showToast(`Ansicht ${e} gespeichert.`)}catch{this._showToast(`Ansicht ${e} konnte nicht gespeichert werden.`)}}_showToast(e){let t=new CustomEvent("hass-notification",{bubbles:!0,composed:!0,detail:{message:e}});this.dispatchEvent(t)}_clampView(){this._yaw=((this._yaw+180)%360+360)%360-180,this._roll=((this._roll+180)%360+360)%360-180,this._pitch=Math.min(Number(this.config.pitch_max),Math.max(Number(this.config.pitch_min),this._pitch))}_initWebGL(){let e=this._canvas.getContext("webgl",{antialias:!0,alpha:!1});if(!e)throw new Error("WebGL wird von diesem Browser nicht unterst\xFCtzt.");this._gl=e;let r=this._createProgram(`
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `,`
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
    `);this._program=r,e.useProgram(r);let s=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let a=e.getAttribLocation(r,"a_position");e.enableVertexAttribArray(a),e.vertexAttribPointer(a,2,e.FLOAT,!1,0,0),this._uniforms={},["u_video","u_resolution","u_yaw","u_roll","u_pitch","u_fov","u_fisheye_fov","u_radius","u_center","u_rotate","u_mirror","u_projection"].forEach(o=>{this._uniforms[o]=e.getUniformLocation(r,o)}),this._texture=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this._texture),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)}_createProgram(e,t){let i=this._gl,r=(a,o)=>{let n=i.createShader(a);if(i.shaderSource(n,o),i.compileShader(n),!i.getShaderParameter(n,i.COMPILE_STATUS))throw new Error(i.getShaderInfoLog(n));return n},s=i.createProgram();if(i.attachShader(s,r(i.VERTEX_SHADER,e)),i.attachShader(s,r(i.FRAGMENT_SHADER,t)),i.linkProgram(s),!i.getProgramParameter(s,i.LINK_STATUS))throw new Error(i.getProgramInfoLog(s));return s}_resize(){if(!this._canvas||!this._stage||!this._gl)return;let e=Math.min(window.devicePixelRatio||1,2),t=Math.max(1,Math.floor(this._stage.clientWidth*e)),i=Math.max(1,Math.floor(this._stage.clientHeight*e));(this._canvas.width!==t||this._canvas.height!==i)&&(this._canvas.width=t,this._canvas.height=i,this._gl.viewport(0,0,t,i))}_animate(){let e=this._gl;if(this._video.readyState>=2){e.useProgram(this._program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this._texture);try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,this._video),e.uniform1i(this._uniforms.u_video,0),e.uniform2f(this._uniforms.u_resolution,this._canvas.width,this._canvas.height),e.uniform1f(this._uniforms.u_yaw,this._deg(this._yaw)),e.uniform1f(this._uniforms.u_roll,this._deg(this._roll||0)),e.uniform1f(this._uniforms.u_pitch,this._deg(this._pitch)),e.uniform1f(this._uniforms.u_fov,this._deg(this._fov)),e.uniform1f(this._uniforms.u_fisheye_fov,this._deg(Number(this.config.fisheye_fov))),e.uniform1f(this._uniforms.u_radius,Number(this.config.circle_radius)),e.uniform2f(this._uniforms.u_center,Number(this.config.center_x),Number(this.config.center_y)),e.uniform1f(this._uniforms.u_rotate,this._deg(Number(this.config.rotate))),e.uniform1f(this._uniforms.u_mirror,this.config.mirror?1:0),e.uniform1f(this._uniforms.u_projection,this.config.projection==="flat"?1:this.config.projection==="hemisphere"?2:0),e.drawArrays(e.TRIANGLES,0,6)}catch{this._setError("Der Browser blockiert den Videostream als WebGL-Textur. Pr\xFCfe HTTPS, CORS und denselben Ursprung.")}}this._raf=requestAnimationFrame(()=>this._animate())}async _startWhep(e){let t=new RTCPeerConnection({bundlePolicy:"max-bundle",rtcpMuxPolicy:"require"});this._pc=t,t.addTransceiver("video",{direction:"recvonly"}),this.config.muted||t.addTransceiver("audio",{direction:"recvonly"}),t.ontrack=a=>{let o=a.streams?.[0]||new MediaStream([a.track]);this._video.srcObject=o,this._video.play().catch(()=>{})},t.onconnectionstatechange=()=>{["failed","closed","disconnected"].includes(t.connectionState)&&this._status.classList.remove("ok")};let i=await t.createOffer();await t.setLocalDescription(i),await this._waitForIce(t);let r=await fetch(e,{method:"POST",headers:{"Content-Type":"application/sdp"},body:t.localDescription.sdp,credentials:"same-origin"});if(!r.ok)throw new Error(`WHEP antwortet mit HTTP ${r.status}`);let s=await r.text();await t.setRemoteDescription({type:"answer",sdp:s})}_waitForIce(e){return e.iceGatheringState==="complete"?Promise.resolve():new Promise(t=>{let i=setTimeout(t,2500),r=()=>{e.iceGatheringState==="complete"&&(clearTimeout(i),e.removeEventListener("icegatheringstatechange",r),t())};e.addEventListener("icegatheringstatechange",r)})}_resolveUrl(e){return e?e.startsWith("/")?`${window.location.origin}${e}`:e:""}_setError(e){this._message.textContent=e,this._message.style.display="flex",this._status.classList.remove("ok")}_deg(e){return Number(e)*Math.PI/180}_escape(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}static getConfigElement(){return document.createElement("ha-360-camera-card-editor")}static getStubConfig(){return{title:"360\xB0 Camera",type:"custom:ha-360-camera-card",whep_url:"https://HOME-ASSISTANT-ODER-GO2RTC/api/webrtc?src=ai360",height:520,fisheye_fov:360,circle_radius:.49,pitch_min:0,pitch_max:89}}};console.info("UniFi AI 360 View Card v0.2.0");var l=class extends HTMLElement{set hass(e){this._hass=e}setConfig(e){this._config={...e},this._render()}_render(){if(!this._config)return;let e=(t,i=!0)=>(this._config[t]===void 0?i:this._config[t])?"checked":"";this.innerHTML=`
      <style>
        .editor { display: grid; gap: 12px; padding: 8px 0; }
        label { display: grid; gap: 5px; font-size: 13px; }
        input, select {
          box-sizing: border-box; width: 100%; padding: 10px; border-radius: 8px;
          border: 1px solid var(--divider-color); color: var(--primary-text-color);
          background: var(--card-background-color);
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .check { display: flex; align-items: center; gap: 8px; }
        .check input { width: auto; }
        small { color: var(--secondary-text-color); }
      </style>
      <div class="editor">
        ${this._input("title","Titel")}
        ${this._input("whep_url","WHEP-URL")}
        <label>Kameraprofil
          <select data-key="camera_profile">
            ${[["generic","Generic"],["unifi_ai360","UniFi AI360"],["unifi_g6_pro_360","UniFi G6 Pro 360"],["generic_circular_fisheye","Generic circular fisheye"]].map(([t,i])=>`<option value="${t}" ${this._config.camera_profile===t?"selected":""}>${i}</option>`).join("")}
          </select>
        </label>
        <div class="grid">
          ${this._number("height","H\xF6he")}
          ${this._number("fov","FOV")}
          ${this._number("yaw","Yaw")}
          ${this._number("pitch","Pitch")}
          ${this._number("roll","Roll")}
          ${this._number("step","Schrittweite")}
        </div>
        <label class="check"><input type="checkbox" data-key="controls" ${e("controls")}>Bedienelemente anzeigen</label>
        <label class="check"><input type="checkbox" data-key="keyboard" ${e("keyboard")}>Tastatursteuerung</label>
        <label class="check"><input type="checkbox" data-key="mirror" ${e("mirror",!1)}>Bild spiegeln</label>
        <label class="check"><input type="checkbox" data-key="muted" ${e("muted")}>Stream stummschalten</label>
        <small>Erweiterte Fisheye-Kalibrierung und benannte Ansichten bleiben im YAML-Editor verf\xFCgbar.</small>
      </div>`,this.querySelectorAll("[data-key]").forEach(t=>{t.addEventListener("change",()=>this._change(t)),t.tagName==="INPUT"&&t.type!=="checkbox"&&t.addEventListener("input",()=>this._change(t))})}_input(e,t){return`<label>${t}<input data-key="${e}" value="${this._escape(this._config[e]??"")}"></label>`}_number(e,t){return`<label>${t}<input type="number" data-key="${e}" value="${this._config[e]??""}"></label>`}_change(e){let t={...this._config},i;e.type==="checkbox"?i=e.checked:e.type==="number"?i=e.value===""?void 0:Number(e.value):i=e.value,i===void 0||i===""?delete t[e.dataset.key]:t[e.dataset.key]=i,this._config=t,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}_escape(e){return String(e).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}};customElements.get("ha-360-camera-card-editor")||customElements.define("ha-360-camera-card-editor",l);customElements.get("ha-360-camera-card")||customElements.define("ha-360-camera-card",c);customElements.get("unifi-ai360-view-card")||customElements.define("unifi-ai360-view-card",class extends c{});window.customCards=window.customCards||[];window.customCards.push({type:"ha-360-camera-card",name:"Home Assistant 360 Camera Card",description:"Interactive WebGL viewer for 360\xB0 and fisheye camera streams.",preview:!1});window.customCards.push({type:"unifi-ai360-view-card",name:"UniFi AI360 View Card (legacy alias)",description:"Legacy alias for Home Assistant 360 Camera Card.",preview:!1});console.info(`%c HA 360 CAMERA CARD %c v${d} `,"color: white; background: #03a9f4; font-weight: 700;","color: #03a9f4; background: transparent;");
