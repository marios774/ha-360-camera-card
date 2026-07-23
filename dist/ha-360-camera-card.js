var u="1.0.0",l={generic:{},unifi_ai360:{projection:"hemisphere",fisheye_fov:180,circle_radius:.49,center_x:.5,center_y:.5,roll:180,mirror:!0},unifi_g6_pro_360:{projection:"hemisphere",fisheye_fov:180,circle_radius:.49,center_x:.5,center_y:.5,roll:180,mirror:!0}},c=class extends HTMLElement{setConfig(t){if(!t||!t.url&&!t.whep_url)throw new Error("Bitte 'url' oder 'whep_url' konfigurieren.");let e=l[t.camera_profile]||l.generic;this.config={title:"360\xB0 Camera",camera_profile:"generic",height:520,fov:95,projection:"hemisphere",fisheye_fov:360,circle_radius:.5,center_x:.5,center_y:.5,yaw:0,pitch:0,pitch_min:0,pitch_max:89,step:8,invert_x:!1,invert_y:!1,control_invert_x:!0,control_invert_y:!0,storage_key:"unifi-ai360-view-card",clipboard_preset_name:"preset_XX",preset_1:null,preset_2:null,rotate:0,mirror:!1,controls:!0,keyboard:!0,muted:!0,autoplay:!0,...e,...t},this._viewInitialized||(this._yaw=Number(this.config.yaw),this._pitch=Number(this.config.pitch),this._roll=Number(this.config.roll||0),this._fov=Number(this.config.fov),this._viewInitialized=!0),this._dragging=!1,this._lastPointer=null,this._raf=null,this._pc=null,this._resizeObserver=null,this._rendered=!1,this._hass=null}set hass(t){this._hass=t,this._rendered||this._render()}getCardSize(){return Math.max(3,Math.ceil(Number(this.config?.height||520)/50))}disconnectedCallback(){this._raf&&cancelAnimationFrame(this._raf),this._valuesOverlayTimer&&clearTimeout(this._valuesOverlayTimer),this._resizeObserver&&this._resizeObserver.disconnect(),this._pc&&this._pc.close(),this._video&&(this._video.pause(),this._video.srcObject=null,this._video.removeAttribute("src"),this._video.load()),window.removeEventListener("keydown",this._onKeyDownBound)}async _render(){this._rendered=!0,this.innerHTML=`
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
    `,this._injectStyles(),this._stage=this.querySelector(".stage"),this._canvas=this.querySelector("canvas"),this._video=this.querySelector("video"),this._message=this.querySelector(".message"),this._valuesOverlay=this.querySelector(".values-overlay"),this._status=this.querySelector(".status"),this._bindControls(),this._initWebGL(),this._resizeObserver=new ResizeObserver(()=>this._resize()),this._resizeObserver.observe(this._stage),this._resize();try{this.config.whep_url?await this._startWhep(this._resolveUrl(this.config.whep_url)):(this._video.src=this._resolveUrl(this.config.url),this.config.autoplay&&await this._video.play())}catch(t){this._setError(`Stream konnte nicht gestartet werden: ${t.message}`)}this._video.addEventListener("playing",()=>{this._message.style.display="none",this._status.classList.add("ok")}),this._video.addEventListener("waiting",()=>{this._status.classList.remove("ok")}),this._video.addEventListener("error",()=>{let t=this._video.error?.code;this._setError(`Videofehler${t?` (Code ${t})`:""}.`)}),this._animate()}_controlsHtml(){return`
      <div class="pad">
        <button type="button" data-action="up" aria-label="Nach oben">\u25B2</button>
        <button type="button" data-action="left" aria-label="Nach links">\u25C0</button>
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht">\u25CF</button>
        <button type="button" data-action="right" aria-label="Nach rechts">\u25B6</button>
        <button type="button" data-action="down" aria-label="Nach unten">\u25BC</button>
      </div>
      <div class="presets">
        <button type="button" data-action="home" aria-label="Startansicht" title="Startansicht">H</button>
        <button type="button" data-action="preset-1" aria-label="Ansicht 1" title="Antippen: aufrufen \xB7 lange dr\xFCcken: speichern">1</button>
        <button type="button" data-action="preset-2" aria-label="Ansicht 2" title="Antippen: aufrufen \xB7 lange dr\xFCcken: speichern">2</button>
        <button type="button" data-action="show-values" aria-label="Aktuelle Ansichtswerte" title="Aktuelle Werte anzeigen">i</button>
      </div>
      <div class="zoom">
        <button type="button" data-action="zoom-in" aria-label="Vergr\xF6\xDFern">\uFF0B</button>
        <button type="button" data-action="zoom-out" aria-label="Verkleinern">\u2212</button>
      </div>
    `}_injectStyles(){let t=document.createElement("style");t.textContent=`
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
    `,this.prepend(t)}_bindControls(){this.querySelectorAll("button[data-action]").forEach(e=>{let i=null,r=!1;e.addEventListener("pointerdown",o=>{o.preventDefault(),o.stopPropagation(),r=!1,(e.dataset.action==="preset-1"||e.dataset.action==="preset-2")&&(i=window.setTimeout(()=>{r=!0,this._savePreset(e.dataset.action==="preset-1"?1:2)},700))});let s=()=>{i&&window.clearTimeout(i),i=null};e.addEventListener("pointerup",s),e.addEventListener("pointercancel",s),e.addEventListener("pointerleave",s),e.addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),r||this._action(e.dataset.action)})}),this._stage.addEventListener("pointerdown",e=>{this._dragging=!0,this._lastPointer={x:e.clientX,y:e.clientY},this._stage.setPointerCapture(e.pointerId),this._stage.focus()}),this._stage.addEventListener("pointermove",e=>{if(!this._dragging||!this._lastPointer)return;let i=e.clientX-this._lastPointer.x,r=e.clientY-this._lastPointer.y;this._lastPointer={x:e.clientX,y:e.clientY};let s=this._fov/Math.max(260,this._stage.clientWidth);this._yaw+=i*s*(this.config.invert_x?-1:1),this.config.projection==="hemisphere"?this._pitch+=r*s*(this.config.invert_y?-1:1):this._pitch+=r*s*(this.config.invert_y?1:-1),this._clampView(),this._showValuesOverlay(!1)});let t=()=>{this._dragging=!1,this._lastPointer=null};this._stage.addEventListener("pointerup",t),this._stage.addEventListener("pointercancel",t),this._stage.addEventListener("wheel",e=>{e.preventDefault(),this._fov+=Math.sign(e.deltaY)*5,this._fov=Math.min(150,Math.max(25,this._fov)),this._showValuesOverlay(!1)},{passive:!1}),this._onKeyDownBound=e=>{if(!this.config.keyboard||document.activeElement!==this._stage)return;let i={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right","+":"zoom-in","=":"zoom-in","-":"zoom-out",0:"home",i:"show-values",I:"show-values"};i[e.key]&&(e.preventDefault(),this._action(i[e.key]))},window.addEventListener("keydown",this._onKeyDownBound)}_action(t){let e=Number(this.config.step),i=this.config.control_invert_x?-1:1,r=this.config.control_invert_y?-1:1;t==="left"&&(this._yaw-=e*i),t==="right"&&(this._yaw+=e*i),this.config.projection==="hemisphere"?(t==="up"&&(this._pitch-=e*r),t==="down"&&(this._pitch+=e*r)):(t==="up"&&(this._pitch+=e*r),t==="down"&&(this._pitch-=e*r)),t==="preset-1"&&this._loadPreset(1),t==="preset-2"&&this._loadPreset(2),t==="show-values"&&this._copyCurrentValuesAsYaml(),t==="zoom-in"&&(this._fov-=8),t==="zoom-out"&&(this._fov+=8),t==="home"&&(this._yaw=Number(this.config.yaw),this._pitch=Number(this.config.pitch),this._roll=Number(this.config.roll||0),this._fov=Number(this.config.fov)),this._fov=Math.min(150,Math.max(25,this._fov)),this._clampView(),["left","right","up","down","zoom-in","zoom-out","home","preset-1","preset-2"].includes(t)&&this._showValuesOverlay(!1)}async _copyCurrentValuesAsYaml(){let t={yaw:Number(this._yaw.toFixed(1)),pitch:Number(this._pitch.toFixed(1)),roll:Number((this._roll||0).toFixed(1)),fov:Number(this._fov.toFixed(1))},e=String(this.config.clipboard_preset_name||"preset_XX").trim().replace(/:\s*$/,"")||"preset_XX",i=`${e}:
  yaw: ${t.yaw}
  pitch: ${t.pitch}
  roll: ${t.roll}
  fov: ${t.fov}`;try{navigator.clipboard&&window.isSecureContext?await navigator.clipboard.writeText(i):this._copyTextFallback(i),this._showValuesOverlay(!0),this._showValuesOverlay(!0),this._showToast(`${e} als YAML in die Zwischenablage kopiert.`),console.info(`UniFi AI 360 View Card \u2013 kopiertes YAML:
`+i)}catch(r){try{this._copyTextFallback(i),this._showToast(`${e} als YAML in die Zwischenablage kopiert.`)}catch(s){this._showToast("Kopieren nicht m\xF6glich. Browser-Berechtigung f\xFCr die Zwischenablage pr\xFCfen."),console.error("UniFi AI 360 View Card \u2013 Zwischenablagefehler",r,s)}}}_showValuesOverlay(t=!1){if(!this._valuesOverlay)return;let e=Number(this._yaw.toFixed(1)),i=Number(this._pitch.toFixed(1)),r=Number((this._roll||0).toFixed(1)),s=Number(this._fov.toFixed(1));this._valuesOverlay.textContent=`yaw: ${e}
pitch: ${i}
roll: ${r}
fov: ${s}`,this._valuesOverlay.classList.add("visible"),this._valuesOverlayTimer&&clearTimeout(this._valuesOverlayTimer),this._valuesOverlayTimer=window.setTimeout(()=>{this._valuesOverlay?.classList.remove("visible")},t?5e3:1800)}_copyTextFallback(t){let e=document.createElement("textarea");e.value=t,e.setAttribute("readonly",""),e.style.position="fixed",e.style.left="-9999px",e.style.top="0",document.body.appendChild(e),e.focus(),e.select();let i=document.execCommand("copy");if(document.body.removeChild(e),!i)throw new Error("document.execCommand('copy') ist fehlgeschlagen.")}_presetStorageKey(t){return`${this.config.storage_key||"unifi-ai360-view-card"}:preset:${t}`}_configuredPreset(t){let e=this.config[`preset_${t}`];return e&&typeof e=="object"?e:null}_loadPreset(t){let e=null;try{let i=localStorage.getItem(this._presetStorageKey(t));i&&(e=JSON.parse(i))}catch{}if(e=e||this._configuredPreset(t),!e){this._showToast(`Ansicht ${t} ist noch nicht gespeichert.`);return}e.yaw!==void 0&&(this._yaw=Number(e.yaw)),e.pitch!==void 0&&(this._pitch=Number(e.pitch)),e.roll!==void 0&&(this._roll=Number(e.roll)),e.fov!==void 0&&(this._fov=Number(e.fov)),this._fov=Math.min(150,Math.max(25,this._fov)),this._clampView()}_savePreset(t){let e={yaw:this._yaw,pitch:this._pitch,roll:this._roll||0,fov:this._fov};try{localStorage.setItem(this._presetStorageKey(t),JSON.stringify(e)),this._showToast(`Ansicht ${t} gespeichert.`)}catch{this._showToast(`Ansicht ${t} konnte nicht gespeichert werden.`)}}_showToast(t){let e=new CustomEvent("hass-notification",{bubbles:!0,composed:!0,detail:{message:t}});this.dispatchEvent(e)}_clampView(){this._yaw=((this._yaw+180)%360+360)%360-180,this._roll=((this._roll+180)%360+360)%360-180,this._pitch=Math.min(Number(this.config.pitch_max),Math.max(Number(this.config.pitch_min),this._pitch))}_initWebGL(){let t=this._canvas.getContext("webgl",{antialias:!0,alpha:!1});if(!t)throw new Error("WebGL wird von diesem Browser nicht unterst\xFCtzt.");this._gl=t;let r=this._createProgram(`
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
    `);this._program=r,t.useProgram(r);let s=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,s),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),t.STATIC_DRAW);let o=t.getAttribLocation(r,"a_position");t.enableVertexAttribArray(o),t.vertexAttribPointer(o,2,t.FLOAT,!1,0,0),this._uniforms={},["u_video","u_resolution","u_yaw","u_roll","u_pitch","u_fov","u_fisheye_fov","u_radius","u_center","u_rotate","u_mirror","u_projection"].forEach(a=>{this._uniforms[a]=t.getUniformLocation(r,a)}),this._texture=t.createTexture(),t.bindTexture(t.TEXTURE_2D,this._texture),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR)}_createProgram(t,e){let i=this._gl,r=(o,a)=>{let n=i.createShader(o);if(i.shaderSource(n,a),i.compileShader(n),!i.getShaderParameter(n,i.COMPILE_STATUS))throw new Error(i.getShaderInfoLog(n));return n},s=i.createProgram();if(i.attachShader(s,r(i.VERTEX_SHADER,t)),i.attachShader(s,r(i.FRAGMENT_SHADER,e)),i.linkProgram(s),!i.getProgramParameter(s,i.LINK_STATUS))throw new Error(i.getProgramInfoLog(s));return s}_resize(){if(!this._canvas||!this._stage||!this._gl)return;let t=Math.min(window.devicePixelRatio||1,2),e=Math.max(1,Math.floor(this._stage.clientWidth*t)),i=Math.max(1,Math.floor(this._stage.clientHeight*t));(this._canvas.width!==e||this._canvas.height!==i)&&(this._canvas.width=e,this._canvas.height=i,this._gl.viewport(0,0,e,i))}_animate(){let t=this._gl;if(this._video.readyState>=2){t.useProgram(this._program),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this._texture);try{t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,this._video),t.uniform1i(this._uniforms.u_video,0),t.uniform2f(this._uniforms.u_resolution,this._canvas.width,this._canvas.height),t.uniform1f(this._uniforms.u_yaw,this._deg(this._yaw)),t.uniform1f(this._uniforms.u_roll,this._deg(this._roll||0)),t.uniform1f(this._uniforms.u_pitch,this._deg(this._pitch)),t.uniform1f(this._uniforms.u_fov,this._deg(this._fov)),t.uniform1f(this._uniforms.u_fisheye_fov,this._deg(Number(this.config.fisheye_fov))),t.uniform1f(this._uniforms.u_radius,Number(this.config.circle_radius)),t.uniform2f(this._uniforms.u_center,Number(this.config.center_x),Number(this.config.center_y)),t.uniform1f(this._uniforms.u_rotate,this._deg(Number(this.config.rotate))),t.uniform1f(this._uniforms.u_mirror,this.config.mirror?1:0),t.uniform1f(this._uniforms.u_projection,this.config.projection==="flat"?1:this.config.projection==="hemisphere"?2:0),t.drawArrays(t.TRIANGLES,0,6)}catch{this._setError("Der Browser blockiert den Videostream als WebGL-Textur. Pr\xFCfe HTTPS, CORS und denselben Ursprung.")}}this._raf=requestAnimationFrame(()=>this._animate())}async _startWhep(t){let e=new RTCPeerConnection({bundlePolicy:"max-bundle",rtcpMuxPolicy:"require"});this._pc=e,e.addTransceiver("video",{direction:"recvonly"}),this.config.muted||e.addTransceiver("audio",{direction:"recvonly"}),e.ontrack=o=>{let a=o.streams?.[0]||new MediaStream([o.track]);this._video.srcObject=a,this._video.play().catch(()=>{})},e.onconnectionstatechange=()=>{["failed","closed","disconnected"].includes(e.connectionState)&&this._status.classList.remove("ok")};let i=await e.createOffer();await e.setLocalDescription(i),await this._waitForIce(e);let r=await fetch(t,{method:"POST",headers:{"Content-Type":"application/sdp"},body:e.localDescription.sdp,credentials:"same-origin"});if(!r.ok)throw new Error(`WHEP antwortet mit HTTP ${r.status}`);let s=await r.text();await e.setRemoteDescription({type:"answer",sdp:s})}_waitForIce(t){return t.iceGatheringState==="complete"?Promise.resolve():new Promise(e=>{let i=setTimeout(e,2500),r=()=>{t.iceGatheringState==="complete"&&(clearTimeout(i),t.removeEventListener("icegatheringstatechange",r),e())};t.addEventListener("icegatheringstatechange",r)})}_resolveUrl(t){return t?t.startsWith("/")?`${window.location.origin}${t}`:t:""}_setError(t){this._message.textContent=t,this._message.style.display="flex",this._status.classList.remove("ok")}_deg(t){return Number(t)*Math.PI/180}_escape(t){return String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}static getStubConfig(){return{title:"UniFi AI 360",type:"custom:unifi-ai360-view-card",whep_url:"https://HOME-ASSISTANT-ODER-GO2RTC/api/webrtc?src=ai360",height:520,fisheye_fov:360,circle_radius:.49,pitch_min:0,pitch_max:89}}};console.info("UniFi AI 360 View Card v0.2.0");customElements.get("ha-360-camera-card")||customElements.define("ha-360-camera-card",c);customElements.get("unifi-ai360-view-card")||customElements.define("unifi-ai360-view-card",class extends c{});window.customCards=window.customCards||[];window.customCards.push({type:"ha-360-camera-card",name:"Home Assistant 360 Camera Card",description:"Interactive WebGL viewer for 360\xB0 and fisheye camera streams.",preview:!1});window.customCards.push({type:"unifi-ai360-view-card",name:"UniFi AI360 View Card (legacy alias)",description:"Legacy alias for Home Assistant 360 Camera Card.",preview:!1});console.info(`%c HA 360 CAMERA CARD %c v${u} `,"color: white; background: #03a9f4; font-weight: 700;","color: #03a9f4; background: transparent;");
