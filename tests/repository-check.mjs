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
if (!dist.includes("1.1.1")) throw new Error("Version 1.1.1 missing");
console.log("Repository checks passed.");
