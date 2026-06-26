import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const heroPath = path.join(process.cwd(), "public", "images", "hero.jpg");
const outDir = path.join(process.cwd(), "public", "icons");
await mkdir(outDir, { recursive: true });

async function generateIcon(size) {
  await sharp(heroPath)
    .resize(size, size, { fit: "cover", position: "centre" })
    .grayscale()
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

for (const size of [192, 512]) {
  await generateIcon(size);
}

console.log("Icons generated from public/images/hero.jpg");
