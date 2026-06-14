import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "icons");
await mkdir(outDir, { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D4AF37"/>
      <stop offset="100%" style="stop-color:#8A6623"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#121212"/>
  <rect x="${size * 0.12}" y="${size * 0.12}" width="${size * 0.76}" height="${size * 0.76}" rx="${size * 0.14}" fill="none" stroke="url(#gold)" stroke-width="${size * 0.035}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="url(#gold)" font-family="Arial, sans-serif" font-size="${size * 0.26}" font-weight="700">BN</text>
</svg>`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

console.log("Icons generated");
