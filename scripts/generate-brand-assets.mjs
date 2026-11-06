import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Run from any directory; all derivatives share the editable SVG master.
const root = new URL("../", import.meta.url);
const logo = await readFile(new URL("public/brand/logo.svg", root), "utf8");
const save = (path, data) => writeFile(new URL(path, root), data);
const mark = (x, y, size) => logo.replace('width="64" height="64"', `x="${x}" y="${y}" width="${size}" height="${size}"`);

await save("app/icon.svg", logo);
await sharp(Buffer.from(logo)).resize(512, 512).png().toFile(new URL("public/brand/logo.png", root).pathname);
await sharp(Buffer.from(logo)).resize(180, 180).png().toFile(new URL("app/apple-icon.png", root).pathname);

// ICO supports embedded PNGs; include small sizes for crisp browser tabs.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map((size) => sharp(Buffer.from(logo)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await save("app/favicon.ico", Buffer.concat([header, ...frames]));

const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F5F5F5"/>
  <g fill="none" stroke="#E4E4E4">
    <path d="M784 0V630M1008 0V630M0 196H1200M0 420H1200"/>
    <circle cx="896" cy="308" r="172"/>
    <circle cx="896" cy="308" r="238"/>
  </g>
  <g font-family="Arial, Helvetica, sans-serif">
    ${mark(72, 64, 48)}
    <text x="136" y="97" font-size="28" font-weight="700" fill="#171717">App Central</text>
    <circle cx="78" cy="191" r="5" fill="#4F78C7"/>
    <text x="96" y="197" font-size="15" font-weight="700" letter-spacing="2" fill="#5C5C5C">SELF-HOSTED ANALYTICS</text>
    <text x="68" y="285" font-size="72" font-weight="700" letter-spacing="-3" fill="#171717">Every app.</text>
    <text x="68" y="365" font-size="72" font-weight="700" letter-spacing="-3" fill="#171717">One clear picture.</text>
    <text x="72" y="425" font-size="23" fill="#5C5C5C">Analytics and monitoring for every app you ship.</text>
    ${mark(800, 212, 192)}
    <g fill="#4F78C7">
      <circle cx="896" cy="136" r="6"/>
      <circle cx="1068" cy="308" r="6"/>
      <circle cx="896" cy="480" r="6"/>
      <circle cx="724" cy="308" r="6"/>
    </g>
    <path d="M72 522H1128" stroke="#DCDCDC"/>
    <text x="72" y="567" font-size="18" fill="#5C5C5C">Your data. Your infrastructure.</text>
    <text x="1128" y="567" text-anchor="end" font-size="18" fill="#5C5C5C">Analytics · Funnels · Reports</text>
  </g>
</svg>`;
await save("public/brand/og-image.svg", social);
await sharp(Buffer.from(social)).png().toFile(new URL("public/brand/og-image.png", root).pathname);
console.log("Generated logo PNG, SVG icon, Apple icon, favicon, and 1200×630 social preview.");
