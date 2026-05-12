import { PNG } from 'pngjs';

const ICON_SIZE = 64;
const OUTLINE = [34, 20, 12, 255];

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return [
    clamp(Math.round(a[0] + (b[0] - a[0]) * t)),
    clamp(Math.round(a[1] + (b[1] - a[1]) * t)),
    clamp(Math.round(a[2] + (b[2] - a[2]) * t)),
    255,
  ];
}

function createCanvas() {
  const png = new PNG({ width: ICON_SIZE, height: ICON_SIZE });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i + 3] = 0;
  }
  return png;
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const index = (png.width * y + x) << 2;
  const alpha = color[3] ?? 255;
  if (alpha === 0) return;
  if (alpha < 255) {
    const existingAlpha = png.data[index + 3];
    if (existingAlpha > 0) {
      const blend = alpha / 255;
      png.data[index] = clamp(Math.round(png.data[index] * (1 - blend) + color[0] * blend));
      png.data[index + 1] = clamp(Math.round(png.data[index + 1] * (1 - blend) + color[1] * blend));
      png.data[index + 2] = clamp(Math.round(png.data[index + 2] * (1 - blend) + color[2] * blend));
      png.data[index + 3] = clamp(Math.round(existingAlpha + alpha * (1 - existingAlpha / 255)));
      return;
    }
  }
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = alpha;
}

function fillRect(png, x, y, w, h, color) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      setPixel(png, col, row, color);
    }
  }
}

function drawLine(png, x0, y0, x1, y1, color, width = 1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy += 1) {
      for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox += 1) {
        setPixel(png, x + ox, y + oy, color);
      }
    }
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawCircle(png, cx, cy, radius, color, filled = true) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const distance = Math.hypot(x, y);
      if (filled ? distance <= radius : Math.abs(distance - radius) < 0.75) {
        setPixel(png, cx + x, cy + y, color);
      }
    }
  }
}

function drawPolygon(png, points, fill, stroke = null) {
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  for (let y = minY; y <= maxY; y += 1) {
    const intersections = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        const x = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
        intersections.push(x);
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const start = Math.ceil(intersections[i]);
      const end = Math.floor(intersections[i + 1]);
      for (let x = start; x <= end; x += 1) {
        setPixel(png, x, y, fill);
      }
    }
  }
  if (stroke) {
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      drawLine(png, x1, y1, x2, y2, stroke, 1);
    }
  }
}

function addWoodGrain(png, x, y, w, h, palette) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const wave = Math.sin((col + row * 0.35) * 0.55);
      const tone = wave > 0.35 ? palette.light : wave < -0.35 ? palette.dark : palette.base;
      setPixel(png, col, row, tone);
    }
  }
}

function addMetalBlade(png, x, y, w, h, palette, vertical = true) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const t = vertical ? (col - x) / Math.max(1, w - 1) : (row - y) / Math.max(1, h - 1);
      const tone = t < 0.2 ? palette.dark : t < 0.45 ? palette.base : t < 0.7 ? palette.light : palette.highlight;
      setPixel(png, col, row, tone);
    }
  }
}

function drawGlow(png, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const distance = Math.hypot(x, y);
      if (distance > radius) continue;
      const alpha = clamp(Math.round((1 - distance / radius) * (color[3] ?? 120)));
      setPixel(png, cx + x, cy + y, [color[0], color[1], color[2], alpha]);
    }
  }
}

function drawRuneMarks(png, cx, cy, color) {
  const marks = [
    [cx - 4, cy - 2, cx + 4, cy - 2],
    [cx, cy - 4, cx, cy + 4],
    [cx - 3, cy + 2, cx + 3, cy - 1],
    [cx - 2, cy + 4, cx + 2, cy + 4],
  ];
  for (const [x1, y1, x2, y2] of marks) {
    drawLine(png, x1, y1, x2, y2, color, 1);
  }
}

function drawSword(png, options) {
  const { blade, guard, grip, pommel, tip = 'sharp', width = 4, length = 28, tilt = 0 } = options;
  const cx = 32;
  const baseY = 48;
  const topY = baseY - length;
  const bladeX = cx - Math.floor(width / 2);

  addMetalBlade(png, bladeX, topY + 4, width, length - 10, blade, true);
  fillRect(png, bladeX - 1, topY + 2, width + 2, 3, tip === 'sharp' ? mix(blade.light, [255, 248, 220, 255], 0.35) : blade.base);
  fillRect(png, cx - 7, baseY - 12, 14, 3, guard.base);
  fillRect(png, cx - 8, baseY - 13, 16, 1, guard.dark);
  fillRect(png, cx - 8, baseY - 9, 16, 1, guard.light);
  addWoodGrain(png, cx - 2, baseY - 8, 4, 10, grip);
  fillRect(png, cx - 3, baseY + 2, 6, 4, pommel.base);
  drawCircle(png, cx, baseY + 4, 2, pommel.light, true);
  if (tilt !== 0) {
    // subtle diagonal highlight
    drawLine(png, bladeX + width, topY + 6, bladeX + width - 2, baseY - 14, mix(blade.highlight, [255, 255, 255, 255], 0.4), 1);
  }
  drawLine(png, bladeX - 1, topY + 1, bladeX + width, topY + 1, OUTLINE, 1);
}

function drawAxe(png, options) {
  const { haft, head, edge } = options;
  addWoodGrain(png, 30, 18, 4, 30, haft);
  drawPolygon(
    png,
    [
      [18, 18],
      [40, 12],
      [44, 20],
      [36, 28],
      [20, 26],
    ],
    head.base,
    OUTLINE,
  );
  drawLine(png, 18, 18, 40, 12, edge.light, 2);
  drawLine(png, 40, 12, 44, 20, edge.highlight, 1);
  fillRect(png, 28, 24, 8, 3, head.dark);
}

function drawSpear(png, options) {
  const { shaft, head, banner } = options;
  addWoodGrain(png, 31, 24, 2, 24, shaft);
  drawPolygon(
    png,
    [
      [32, 8],
      [27, 20],
      [37, 20],
    ],
    head.base,
    OUTLINE,
  );
  drawLine(png, 32, 8, 29, 18, head.light, 1);
  drawLine(png, 32, 8, 35, 18, head.highlight, 1);
  fillRect(png, 24, 21, 16, 5, banner.base);
  fillRect(png, 25, 22, 14, 1, banner.light);
  drawRuneMarks(png, 32, 23, banner.accent);
}

function drawStaff(png, options) {
  const { shaft, focus, glow = false, runes = false, cracked = false } = options;
  addWoodGrain(png, 31, 20, 3, 30, shaft);
  if (cracked) {
    drawLine(png, 32, 24, 34, 30, shaft.dark, 1);
    drawLine(png, 33, 31, 31, 38, shaft.dark, 1);
  }
  drawCircle(png, 32, 16, 6, focus.base, true);
  drawCircle(png, 32, 16, 4, focus.core, true);
  drawCircle(png, 30, 14, 1, focus.highlight, true);
  if (glow) drawGlow(png, 32, 16, 10, [focus.glow[0], focus.glow[1], focus.glow[2], 90]);
  if (runes) drawRuneMarks(png, 32, 16, focus.rune);
  fillRect(png, 29, 47, 6, 3, shaft.dark);
}

function drawBow(png, options) {
  const { limb, grip, string, arrowRest = false, reinforced = false } = options;
  const centerY = 32;
  for (let y = 10; y <= 54; y += 1) {
    const offset = Math.abs(y - centerY);
    const left = 18 + Math.floor(offset * 0.42);
    const right = 46 - Math.floor(offset * 0.42);
    const tone = y < centerY ? limb.light : mix(limb.base, limb.dark, (y - centerY) / 24);
    setPixel(png, left, y, tone);
    setPixel(png, right, y, mix(tone, limb.dark, 0.25));
    setPixel(png, 32, y, string);
    if (reinforced && y % 7 === 0) {
      setPixel(png, left + 1, y, limb.wrap);
      setPixel(png, right - 1, y, limb.wrap);
    }
  }
  fillRect(png, 30, 29, 4, 8, grip.base);
  fillRect(png, 31, 30, 2, 6, grip.wrap);
  if (arrowRest) {
    fillRect(png, 33, 31, 5, 1, limb.wrap);
    setPixel(png, 37, 30, limb.highlight);
  }
  drawLine(png, 20, 12, 44, 12, OUTLINE, 1);
  drawLine(png, 20, 52, 44, 52, OUTLINE, 1);
}

function drawDagger(png, options) {
  const { blade, guard, grip, gem = null } = options;
  addMetalBlade(png, 30, 12, 4, 18, blade, true);
  drawPolygon(
    png,
    [
      [26, 30],
      [38, 30],
      [36, 34],
      [28, 34],
    ],
    guard.base,
    OUTLINE,
  );
  addWoodGrain(png, 31, 34, 2, 12, grip);
  fillRect(png, 30, 46, 4, 3, grip.dark);
  if (gem) {
    drawCircle(png, 32, 32, 2, gem.core, true);
    drawGlow(png, 32, 32, 4, [gem.glow[0], gem.glow[1], gem.glow[2], 70]);
  }
}

const WOOD = {
  light: [196, 146, 88, 255],
  base: [150, 96, 54, 255],
  dark: [96, 58, 32, 255],
};

const IRON = {
  highlight: [236, 242, 248, 255],
  light: [196, 204, 214, 255],
  base: [148, 156, 168, 255],
  dark: [88, 94, 104, 255],
};

const STEEL = {
  highlight: [250, 252, 255, 255],
  light: [214, 220, 228, 255],
  base: [168, 176, 188, 255],
  dark: [74, 78, 88, 255],
};

const GOLD = {
  light: [244, 214, 120, 255],
  base: [201, 162, 39, 255],
  dark: [120, 88, 20, 255],
};

const ARCANE = {
  glow: [120, 92, 255, 255],
  core: [168, 148, 255, 255],
  base: [92, 72, 188, 255],
  rune: [232, 220, 255, 255],
  highlight: [214, 204, 255, 255],
};

const SHADOW = {
  glow: [120, 92, 188, 255],
  core: [92, 88, 118, 255],
  base: [54, 48, 72, 255],
  highlight: [148, 132, 196, 255],
};

const weaponGenerators = {
  sword_wood: (png) =>
    drawSword(png, {
      blade: { ...WOOD, highlight: [214, 176, 112, 255], light: [196, 146, 88, 255], base: [168, 118, 64, 255], dark: [110, 72, 38, 255] },
      guard: { light: [168, 118, 64, 255], base: [120, 78, 42, 255], dark: [74, 48, 28, 255] },
      grip: WOOD,
      pommel: WOOD,
      width: 5,
      length: 30,
    }),
  sword_iron: (png) =>
    drawSword(png, {
      blade: IRON,
      guard: { light: [168, 176, 188, 255], base: [120, 128, 140, 255], dark: [72, 78, 88, 255] },
      grip: WOOD,
      pommel: GOLD,
      width: 5,
      length: 32,
    }),
  axe_iron: (png) =>
    drawAxe(png, {
      haft: WOOD,
      head: IRON,
      edge: { light: [214, 220, 228, 255], highlight: [250, 252, 255, 255] },
    }),
  sword_mythril: (png) =>
    drawSpear(png, {
      shaft: WOOD,
      head: { base: [168, 214, 255, 255], light: [214, 236, 255, 255], highlight: [250, 252, 255, 255], dark: [92, 148, 196, 255] },
      banner: { base: [92, 72, 188, 255], light: [148, 128, 220, 255], accent: [244, 228, 148, 255] },
    }),
  staff_old: (png) =>
    drawStaff(png, {
      shaft: { ...WOOD, dark: [84, 56, 32, 255] },
      focus: { base: [148, 132, 118, 255], core: [176, 160, 144, 255], highlight: [214, 198, 180, 255], glow: [160, 140, 120, 255], rune: [120, 104, 88, 255] },
      cracked: true,
    }),
  staff_arcane: (png) =>
    drawStaff(png, {
      shaft: WOOD,
      focus: { base: ARCANE.base, core: ARCANE.core, highlight: ARCANE.highlight, glow: ARCANE.glow, rune: ARCANE.rune },
      glow: true,
    }),
  staff_runic: (png) =>
    drawStaff(png, {
      shaft: { ...WOOD, dark: [74, 48, 28, 255] },
      focus: { base: ARCANE.base, core: ARCANE.core, highlight: ARCANE.highlight, glow: ARCANE.glow, rune: ARCANE.rune },
      glow: true,
      runes: true,
    }),
  bow_improvised: (png) =>
    drawBow(png, {
      limb: { light: [168, 118, 64, 255], base: [130, 88, 48, 255], dark: [88, 58, 32, 255], wrap: [196, 168, 120, 255], highlight: [214, 180, 120, 255] },
      grip: { base: [108, 72, 40, 255], wrap: [88, 58, 32, 255] },
      string: [232, 220, 188, 255],
    }),
  bow_wood: (png) =>
    drawBow(png, {
      limb: { light: [176, 124, 72, 255], base: [138, 92, 52, 255], dark: [92, 60, 34, 255], wrap: [214, 180, 120, 255], highlight: [226, 194, 140, 255] },
      grip: { base: [120, 78, 42, 255], wrap: [88, 58, 32, 255] },
      string: [244, 232, 204, 255],
      arrowRest: true,
    }),
  bow_war: (png) =>
    drawBow(png, {
      limb: { light: [132, 92, 52, 255], base: [96, 64, 36, 255], dark: [62, 40, 24, 255], wrap: [168, 148, 96, 255], highlight: [196, 168, 112, 255] },
      grip: { base: [88, 58, 32, 255], wrap: [62, 40, 24, 255] },
      string: [236, 226, 196, 255],
      arrowRest: true,
      reinforced: true,
    }),
  dagger_iron: (png) =>
    drawDagger(png, {
      blade: IRON,
      guard: IRON,
      grip: WOOD,
    }),
  dagger_steel: (png) =>
    drawDagger(png, {
      blade: STEEL,
      guard: STEEL,
      grip: { ...WOOD, base: [120, 78, 42, 255] },
    }),
  dagger_shadow: (png) =>
    drawDagger(png, {
      blade: { highlight: SHADOW.highlight, light: [118, 112, 148, 255], base: SHADOW.base, dark: [34, 28, 48, 255] },
      guard: SHADOW,
      grip: { light: [74, 64, 92, 255], base: [54, 46, 68, 255], dark: [34, 28, 48, 255] },
      gem: { core: SHADOW.core, glow: SHADOW.glow },
    }),
};

export function generateWeaponIcon(weaponId) {
  const draw = weaponGenerators[weaponId];
  if (!draw) return null;
  const png = createCanvas();
  draw(png);
  return png;
}

export function listGeneratedWeaponIds() {
  return Object.keys(weaponGenerators);
}
