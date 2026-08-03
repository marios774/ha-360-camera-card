import fs from "node:fs";

const required = [
  "README.md",
  "hacs.json",
  "dist/ha-360-camera-card.js",
  "src/ha-360-camera-card.js",
  "LICENSE",
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const hacs = JSON.parse(fs.readFileSync("hacs.json", "utf8"));
if (hacs.filename !== "ha-360-camera-card.js") {
  throw new Error("hacs.json filename must be ha-360-camera-card.js");
}

const dist = fs.readFileSync("dist/ha-360-camera-card.js", "utf8");
if (!dist.includes('customElements.define("ha-360-camera-card"')) {
  throw new Error("Distribution does not register ha-360-camera-card");
}

if (!dist.includes("ha-360-camera-card-editor")) throw new Error("Visual editor missing");
if (!dist.includes("1.2.2")) throw new Error("Version 1.2.2 missing");
if (!dist.includes("1.2.2")) throw new Error("Distribution does not contain version 1.2.2");
if (!dist.includes("image_url")) throw new Error("Distribution does not contain static image support");
if (!dist.includes("u_mount_pitch")) throw new Error("Distribution does not contain mounting shader uniforms");
for (const marker of [
  "<h3>Kalibrierung</h3>",
  "data-expert-calibration",
  'if (["camera_profile", "mounting_mode", "source_type"].includes(element.dataset.key)) this._render()',
  "yaw: -84",
  "pitch: 270",
  "pitch_min: 195",
  "pitch_max: 348",
  "control_invert_x: false",
  "control_invert_y: true",
]) {
  if (!dist.includes(marker)) throw new Error(`Distribution is missing corrected calibration marker: ${marker}`);
}
console.log("Repository checks passed.");
