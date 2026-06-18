import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "icons");
await mkdir(outDir, { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000"/>
  <rect x="${size * 0.12}" y="${size * 0.12}" width="${size * 0.76}" height="${size * 0.76}" rx="${size * 0.14}" fill="none" stroke="#F5C518" stroke-width="${size * 0.035}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#F5C518" font-family="Arial, sans-serif" font-size="${size * 0.22}" font-weight="700">AN</text>
</svg>`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

console.log("Icons generated");
