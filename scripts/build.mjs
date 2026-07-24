import fs from "node:fs";
import path from "node:path";

const source = path.resolve("src/ha-360-camera-card.js");
const target = path.resolve("dist/ha-360-camera-card.js");
fs.mkdirSync(path.dirname(target), { recursive: true });
const content = fs.readFileSync(source, "utf8");
fs.writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`);
console.log(`Built ${path.relative(process.cwd(), target)}`);
