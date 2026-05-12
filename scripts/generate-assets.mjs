import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { generateWeaponIcon, listGeneratedWeaponIds } from './generators/weaponIconGenerator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const playerSpritePath = path.join(publicDir, 'img', 'sprites', 'player', 'player_sprite.png');

const classVariants = [
  { id: 'player_sprite', preview: 'player_guerreiro', tint: { r: 1, g: 1, b: 1 } },
  { id: 'player_mago', preview: 'player_mago', tint: { r: 0.72, g: 0.78, b: 1.18 } },
  { id: 'player_arqueiro', preview: 'player_arqueiro', tint: { r: 0.82, g: 1.08, b: 0.78 } },
  { id: 'player_ladino', preview: 'player_ladino', tint: { r: 1.12, g: 0.82, b: 0.82 } },
];

const PREVIEW_FRAME = { row: 3, col: 7, size: 96 };

const weaponIconFiles = listGeneratedWeaponIds().map((weaponId) => ({
  file: `icons/weapons/${weaponId}.png`,
  weaponId,
}));

const itemIcons = [
  ...weaponIconFiles,
  { file: 'icons/armor/armor_leather.png', draw: drawLeatherArmor },
  { file: 'icons/armor/armor_chain.png', draw: drawChainArmor },
  { file: 'icons/shields/shield_wood.png', draw: drawWoodShield },
  { file: 'icons/shields/shield_iron.png', draw: drawIronShield },
  { file: 'icons/materials/ice_shard.png', draw: drawIceShard },
  { file: 'icons/materials/fire_shard.png', draw: drawFireShard },
  { file: 'icons/materials/dragon_scale.png', draw: drawDragonScale },
  { file: 'icons/default-item.png', draw: drawDefaultItem },
];

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const index = (png.width * y + x) << 2;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = color[3] ?? 255;
}

function fillRect(png, x, y, w, h, color) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      setPixel(png, col, row, color);
    }
  }
}

function drawOutline(png, pixels, color) {
  for (const [x, y] of pixels) {
    setPixel(png, x, y, color);
  }
}

function createCanvas(drawFn, size = 32) {
  const png = new PNG({ width: size, height: size });
  drawFn(png);
  return png;
}

function drawLeatherArmor(png) {
  fillRect(png, 10, 8, 12, 16, [150, 96, 54, 255]);
  fillRect(png, 15, 8, 2, 16, [96, 58, 32, 255]);
}

function drawChainArmor(png) {
  fillRect(png, 10, 8, 12, 16, [148, 156, 168, 255]);
  for (let y = 9; y <= 22; y += 2) {
    fillRect(png, 11, y, 10, 1, [88, 94, 104, 255]);
  }
}

function drawWoodShield(png) {
  fillRect(png, 11, 9, 10, 14, [126, 82, 46, 255]);
  fillRect(png, 10, 8, 12, 2, [88, 56, 30, 255]);
  fillRect(png, 10, 22, 12, 2, [88, 56, 30, 255]);
}

function drawIronShield(png) {
  fillRect(png, 11, 9, 10, 14, [168, 176, 188, 255]);
  fillRect(png, 14, 13, 4, 4, [214, 180, 84, 255]);
}

function drawIceShard(png) {
  drawOutline(
    png,
    [
      [16, 7], [15, 8], [14, 9], [13, 11], [14, 14], [16, 24], [18, 14], [19, 11], [18, 9], [17, 8],
    ],
    [168, 228, 255, 255],
  );
  setPixel(png, 16, 12, [232, 248, 255, 255]);
}

function drawFireShard(png) {
  drawOutline(
    png,
    [
      [16, 8], [14, 12], [13, 16], [16, 24], [19, 16], [18, 12],
    ],
    [255, 132, 48, 255],
  );
  setPixel(png, 16, 14, [255, 220, 96, 255]);
}

function drawDragonScale(png) {
  fillRect(png, 12, 10, 8, 12, [92, 168, 84, 255]);
  fillRect(png, 11, 10, 1, 12, [48, 104, 52, 255]);
  fillRect(png, 20, 10, 1, 12, [48, 104, 52, 255]);
}

function drawDefaultItem(png) {
  fillRect(png, 10, 10, 12, 12, [196, 168, 128, 255]);
  fillRect(png, 12, 12, 8, 2, [96, 64, 40, 255]);
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readPng(filePath) {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
}

async function writePng(filePath, png) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, PNG.sync.write(png));
}

async function generateClassSprites() {
  const source = await readPng(playerSpritePath);

  for (const variant of classVariants) {
    const tinted = new PNG({ width: source.width, height: source.height });
    for (let index = 0; index < source.data.length; index += 4) {
      const alpha = source.data[index + 3];
      tinted.data[index + 3] = alpha;
      if (alpha === 0) continue;
      tinted.data[index] = clamp(Math.round(source.data[index] * variant.tint.r));
      tinted.data[index + 1] = clamp(Math.round(source.data[index + 1] * variant.tint.g));
      tinted.data[index + 2] = clamp(Math.round(source.data[index + 2] * variant.tint.b));
    }

    const sheetPath = path.join(publicDir, 'img', 'sprites', 'player', `${variant.id}.png`);
    await writePng(sheetPath, tinted);

    const preview = cropSpriteFrame(tinted, PREVIEW_FRAME);
    const previewPath = path.join(publicDir, 'img', 'sprites', 'player', 'previews', `${variant.preview}.png`);
    await writePng(previewPath, preview);
  }
}

function cropSpriteFrame(sheet, frame) {
  const cropped = new PNG({ width: frame.size, height: frame.size });
  const startX = frame.col * frame.size;
  const startY = frame.row * frame.size;

  for (let y = 0; y < frame.size; y += 1) {
    for (let x = 0; x < frame.size; x += 1) {
      const sourceIndex = ((startY + y) * sheet.width + (startX + x)) * 4;
      const targetIndex = (y * frame.size + x) * 4;
      cropped.data[targetIndex] = sheet.data[sourceIndex];
      cropped.data[targetIndex + 1] = sheet.data[sourceIndex + 1];
      cropped.data[targetIndex + 2] = sheet.data[sourceIndex + 2];
      cropped.data[targetIndex + 3] = sheet.data[sourceIndex + 3];
    }
  }

  return cropped;
}

async function generateItemIcons() {
  for (const icon of itemIcons) {
    const outputPath = path.join(publicDir, icon.file);
    const png = icon.weaponId ? generateWeaponIcon(icon.weaponId) : createCanvas(icon.draw);
    if (!png) {
      throw new Error(`Gerador de arma ausente para ${icon.weaponId}`);
    }
    await writePng(outputPath, png);
  }
}

await generateClassSprites();
await generateItemIcons();

console.log('Sprites e ícones gerados com sucesso.');
