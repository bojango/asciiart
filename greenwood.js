/* GREENWOOD / 002 — cinematic ASCII woodland clearing.
   Rebuilt around stronger composition: right-side oak, left-of-centre clearing,
   visible canopy opening, layered depth and more legible forest-floor detail.
*/
(() => {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const fract = (v) => v - Math.floor(v);
  const rnd = (a, b = 0) => fract(Math.sin(a * 127.17 + b * 217.71 + 11.41) * 43758.5453);

  const colors = {
    sky: [[8, 14, 24], [48, 93, 104], [174, 214, 208]],
    haze: [[14, 24, 24], [39, 67, 61], [116, 164, 150]],
    leaves: [[18, 43, 34], [54, 108, 67], [154, 188, 104]],
    deepLeaf: [[11, 29, 23], [34, 73, 49], [92, 142, 90]],
    bark: [[26, 31, 33], [79, 72, 60], [151, 120, 86]],
    moss: [[25, 46, 37], [60, 98, 62], [126, 160, 94]],
    floor: [[26, 30, 28], [84, 72, 54], [164, 133, 93]],
    light: [[78, 96, 88], [205, 178, 108], [255, 226, 154]],
    water: [[12, 29, 34], [39, 92, 97], [159, 201, 198]],
    stars: [[135, 170, 182], [216, 230, 228], [255, 248, 221]]
  };

  const seasons = [
    { name: 'SPRING', leaf: 0.72, warmth: 0.03, desat: 0.00, winter: 0.0 },
    { name: 'SUMMER', leaf: 1.00, warmth: 0.09, desat: 0.00, winter: 0.0 },
    { name: 'AUTUMN', leaf: 0.74, warmth: 0.26, desat: 0.04, winter: 0.0 },
    { name: 'WINTER', leaf: 0.18, warmth: -0.12, desat: 0.10, winter: 1.0 }
  ];

  const canopyChars = '.,:;!+xvV%Y#@';
  const barkChars = '|!Il/\\#%H';
  const floorChars = '.,;:`~-_*=+v';
  const waterChars = '.~=-_';
  const leafBits = '^,.:;v+*';
  const fernBits = '/\\^v:*';

  const cache = document.createElement('canvas');
  const cc = cache.getContext('2d', { alpha: false });
  let season = 1;
  let fw = 8.6, stepX = 5.3, stepY = 9.4;
  let lastStatic = -99;
  let lastSignature = '';

  const draw = (ctx, ch, x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillText(ch, x, y);
  };
  const setFont = (ctx, px = fw) => {
    ctx.font = `${px}px 'Courier New', ui-monospace, monospace`;
    ctx.textBaseline = 'middle';
  };

  function palette(daylight, fx) {
    const day = smooth(0.04, 0.66, daylight);
    const fog = clamp((fx?.humidity ?? 0.45) * 0.14 + (fx?.air ?? 0) * 0.16, 0, 0.25);
    const seasonCfg = seasons[season];
    const out = {};

    for (const [name, triple] of Object.entries(colors)) {
      out[name] = Array.from({ length: 15 }, (_, i) => {
        const lum = i / 14;
        const base = triple[0].map((v, j) => mix(v, triple[1][j], day));
        const exposed = base.map((v, j) => {
          const hi = triple[2][j] * Math.max(0, lum - 0.50) * 0.58;
          let value = v * (0.72 + lum * 1.05 + day * 0.18) + hi;
          return clamp(value, 0, 255);
        });

        if (name === 'leaves' || name === 'deepLeaf' || name === 'moss') {
          exposed[0] *= 1 + seasonCfg.warmth * 0.80;
          exposed[1] *= 1 - seasonCfg.desat * 0.30;
          exposed[2] *= 1 - seasonCfg.warmth * 0.18 + seasonCfg.winter * 0.22;
        }
        if (name === 'bark') {
          exposed[0] *= 1 + seasonCfg.warmth * 0.45;
          exposed[1] *= 1 + seasonCfg.warmth * 0.15;
          exposed[2] *= 1 - seasonCfg.winter * 0.10;
        }
        if (name === 'light') {
          exposed[0] *= 1 + seasonCfg.warmth * 0.55;
          exposed[1] *= 1 + seasonCfg.warmth * 0.16;
          exposed[2] *= 1 - seasonCfg.winter * 0.10;
        }
        if (name === 'sky' && seasonCfg.winter > 0) {
          exposed[2] *= 1.08;
        }
        if (name === 'water') {
          exposed[2] *= 1.08;
        }
        return `rgb(${exposed.map(v => Math.round(clamp(v * (1 - fog) + 52 * fog, 0, 255))).join(',')})`;
      });
    }
    return out;
  }

  function skyGap(u, v) {
    if (v > 0.32) return false;
    const cx = 0.46 + 0.03 * Math.sin(v * 15);
    const cy = 0.11;
    const rx = 0.19 - 0.30 * v;
    const ry = 0.12;
    const dx = (u - cx) / Math.max(rx, 0.04);
    const dy = (v - cy) / ry;
    return dx * dx + dy * dy < 1.0;
  }

  function clearingValue(u, v) {
    const dx = (u - 0.43) / 0.22;
    const dy = (v - 0.73) / 0.17;
    const open = 1 - smooth(0.20, 1.12, Math.hypot(dx, dy));
    return clamp(open, 0, 1);
  }

  function streamValue(u, v) {
    const center = 0.49 - 0.18 * smooth(0.58, 0.98, v) + 0.022 * Math.sin(v * 16);
    const width = 0.026 + 0.045 * smooth(0.60, 1.0, v);
    return 1 - smooth(width * 0.7, width * 1.7, Math.abs(u - center));
  }

  function rightOakCenter(v) {
    return 0.80 - 0.07 * smooth(0.0, 1.0, v) + 0.008 * Math.sin(v * 9);
  }

  function rightOakWidth(v) {
    return 0.055 + 0.115 * smooth(0.10, 1.0, v);
  }

  function leftFramerCenter(v) {
    return 0.12 + 0.035 * smooth(0.10, 0.95, v);
  }

  function leftFramerWidth(v) {
    return 0.030 + 0.040 * smooth(0.20, 1.0, v);
  }

  function branchPresence(u, v) {
    const branchV = 0.16 + 0.17 * smooth(0.32, 0.86, 1 - u) - 0.04 * Math.sin(u * 13);
    const main = 1 - smooth(0.0, 0.020 + 0.026 * (1 - u), Math.abs(v - branchV));
    const little = 1 - smooth(0.0, 0.012, Math.abs(v - (branchV - 0.05 - 0.03 * Math.sin(u * 21))));
    const within = u > 0.32 && u < 0.84;
    return within ? Math.max(main, little * 0.55) : 0;
  }

  function leafMass(u, v, time, wind) {
    const sway = Math.sin(time * 0.55 + v * 15) * wind * 0.010;
    const right = (u > 0.58 && v < 0.42) ? 1 - smooth(0.0, 0.16, Math.hypot((u - (0.74 + sway)) / 0.26, (v - 0.18) / 0.28)) : 0;
    const left = (u < 0.44 && v < 0.38) ? 1 - smooth(0.0, 0.18, Math.hypot((u - (0.19 + sway * 0.6)) / 0.23, (v - 0.18) / 0.25)) : 0;
    const middle = (u > 0.32 && u < 0.66 && v < 0.22) ? 1 - smooth(0.0, 0.17, Math.hypot((u - (0.47 + sway * 0.7)) / 0.20, (v - 0.11) / 0.14)) : 0;
    return Math.max(right, left, middle);
  }

  function drawStatic(w, h, time, fx, highRes) {
    const dpr = Math.min(devicePixelRatio || 1, w < 600 ? 1.3 : 1.7);
    if (cache.width !== Math.round(w * dpr) || cache.height !== Math.round(h * dpr)) {
      cache.width = Math.round(w * dpr);
      cache.height = Math.round(h * dpr);
    }
    cc.setTransform(dpr, 0, 0, dpr, 0, 0);

    const daylight = clamp(fx?.daylight ?? 0.60);
    const day = smooth(0.04, 0.66, daylight);
    const night = 1 - smooth(0.04, 0.54, daylight);
    const wind = clamp(fx?.wind ?? 0);
    const humidity = clamp(fx?.humidity ?? 0.45);
    const rain = clamp(fx?.rain ?? 0);
    const P = palette(daylight, fx);

    const bg = cc.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, day > 0.28 ? '#122227' : '#060b15');
    bg.addColorStop(0.45, day > 0.28 ? '#112018' : '#07110f');
    bg.addColorStop(1, '#08100c');
    cc.fillStyle = bg;
    cc.fillRect(0, 0, w, h);

    const skyGlow = cc.createRadialGradient(w * 0.44, h * 0.14, w * 0.03, w * 0.43, h * 0.18, w * 0.40);
    skyGlow.addColorStop(0, day > 0.3 ? 'rgba(182,213,194,0.22)' : 'rgba(78,98,154,0.20)');
    skyGlow.addColorStop(1, 'rgba(0,0,0,0)');
    cc.fillStyle = skyGlow;
    cc.fillRect(0, 0, w, h * 0.65);

    const clearingGlow = cc.createRadialGradient(w * 0.42, h * 0.74, 0, w * 0.43, h * 0.75, w * 0.52);
    clearingGlow.addColorStop(0, day > 0.25 ? 'rgba(246,212,128,0.16)' : 'rgba(72,94,82,0.08)');
    clearingGlow.addColorStop(1, 'rgba(0,0,0,0)');
    cc.fillStyle = clearingGlow;
    cc.fillRect(0, h * 0.35, w, h * 0.65);

    fw = clamp((w < 460 ? 8.35 : 9.1) * (highRes ? 1 : 1.28), 8.2, 12.4);
    stepX = fw * 0.60;
    stepY = fw * 1.06;
    setFont(cc);

    const cols = Math.ceil(w / stepX);
    const rows = Math.ceil(h / stepY);
    const seasonCfg = seasons[season];

    for (let iy = 0; iy < rows; iy++) {
      const v = iy / (rows - 1);
      const y = iy * stepY;
      for (let ix = 0; ix < cols; ix++) {
        const u = ix / (cols - 1);
        const x = ix * stepX;
        const r = rnd(ix * 0.53, iy * 0.83);
        const r2 = rnd(ix * 1.11 + 18, iy * 0.71 + 44);
        const clear = clearingValue(u, v);
        const stream = v > 0.54 ? streamValue(u, v) : 0;
        const sky = skyGap(u, v);
        const leaves = leafMass(u, v, time, wind);
        const branch = branchPresence(u, v);

        const roCenter = rightOakCenter(v);
        const roWidth = rightOakWidth(v);
        const ro = v > 0.05 ? 1 - smooth(0.0, roWidth, Math.abs(u - roCenter)) : 0;

        const lfCenter = leftFramerCenter(v);
        const lfWidth = leftFramerWidth(v);
        const lf = v > 0.08 ? 1 - smooth(0.0, lfWidth, Math.abs(u - lfCenter)) : 0;

        let type = null;
        let ch = '';
        let alpha = 1;

        if (ro > 0.06 || branch > 0.12 || lf > 0.12) {
          type = 'bark';
          const barkIndex = Math.floor((r2 * barkChars.length + v * 5) % barkChars.length);
          ch = barkChars[barkIndex];
          alpha = 0.74 + 0.24 * Math.max(ro, lf, branch);
          if (ro > 0.25 && r > 0.84) ch = '|';
          if (branch > 0.45 && r > 0.66) ch = '=';
        } else if (sky && leaves < 0.15) {
          if (day < 0.50 && r > 0.972) {
            type = 'stars';
            ch = r > 0.992 ? '*' : r > 0.985 ? '+' : '.';
            alpha = 0.9;
          } else if (day > 0.14 && r > 0.82) {
            type = 'sky';
            ch = r > 0.95 ? '+' : '.';
            alpha = 0.25 + r * 0.28;
          }
        } else if (v < 0.48 && leaves > (1 - seasonCfg.leaf) * 0.70 && r > 0.10) {
          type = r > 0.55 ? 'leaves' : 'deepLeaf';
          ch = canopyChars[Math.floor(r2 * canopyChars.length) % canopyChars.length];
          alpha = 0.50 + leaves * 0.40 + r * 0.08;
        } else {
          // mid and far trunks behind the clearing
          const trunks = [0.24, 0.34, 0.47, 0.57, 0.65];
          for (let i = 0; i < trunks.length && !type; i++) {
            const tx = trunks[i] + 0.012 * Math.sin(i * 3 + v * 11);
            const width = 0.005 + 0.010 * smooth(0.18, 0.95, v) * (1 - i * 0.06);
            if (v > 0.18 + i * 0.02 && Math.abs(u - tx) < width) {
              type = 'bark';
              ch = i % 2 ? '|' : '!';
              alpha = 0.28 + 0.28 * (1 - i / trunks.length) + 0.10 * r;
            }
          }
        }

        if (!type && v > 0.50) {
          if (stream > 0.36 && r > 0.14) {
            type = 'water';
            ch = waterChars[Math.floor(r2 * waterChars.length) % waterChars.length];
            alpha = 0.48 + stream * 0.44;
          } else {
            type = clear > 0.20 ? 'floor' : 'moss';
            if (r < 0.08 + clear * 0.16) {
              type = null;
            } else {
              ch = floorChars[Math.floor(r2 * floorChars.length) % floorChars.length];
              alpha = 0.30 + 0.36 * clear + 0.26 * r;
            }
            if (clear > 0.32 && r > 0.95) {
              type = 'light';
              ch = r > 0.985 ? '*' : '.';
              alpha = 0.70 + clear * 0.25;
            }
          }
        }

        if (!type && v > 0.28 && v < 0.82 && r > 0.93 - clear * 0.10) {
          type = 'haze';
          ch = r > 0.975 ? ':' : '.';
          alpha = 0.18 + 0.25 * humidity;
        }

        if (!type || !ch) continue;

        const lum = clamp(Math.floor((0.24 + clear * 0.52 + (1 - v) * 0.14 + r * 0.10) * 14), 0, 14);
        cc.globalAlpha = clamp(alpha, 0, 1);
        draw(cc, ch, x, y, P[type][lum]);
      }
    }

    // Roots from the oak
    for (let i = 0; i < 22; i++) {
      const baseX = w * (0.70 + 0.12 * rnd(i + 140));
      const baseY = h * (0.84 + 0.10 * rnd(i + 141));
      const dir = -1 + rnd(i + 142) * 0.9;
      const length = 0.05 + 0.13 * rnd(i + 143);
      for (let j = 0; j < 12; j++) {
        const q = j / 11;
        const x = baseX + w * dir * q * length + Math.sin(q * Math.PI * 2 + i) * stepX * 0.35;
        const y = baseY + Math.sin(q * Math.PI) * stepY * 0.2 - h * q * 0.015;
        cc.globalAlpha = 0.34 + 0.28 * (1 - q);
        draw(cc, '_~=-/'.charAt((i + j) % 5), x, y, P.bark[4 + (i % 5)]);
      }
    }

    // Foreground ferns and grasses framing the clearing
    const drawFern = (x0, y0, scale, seed, side) => {
      const sway = Math.sin(time * 0.9 + seed) * wind * 4;
      const stem = scale * (1.5 + 0.5 * rnd(seed));
      for (let i = 0; i < 12; i++) {
        const q = i / 11;
        const px = x0 + sway * q * q + Math.sin(q * 2 + seed) * stem * 0.10;
        const py = y0 - stem * q;
        cc.globalAlpha = 0.64 + 0.26 * q;
        draw(cc, i % 2 ? ':' : '!', px, py, P.leaves[7 + (i % 5)]);
        if (i >= 2) {
          const frond = scale * (1 - q) * (0.9 + 0.2 * Math.sin(i));
          const hx = px + side * frond * 0.45;
          const hy = py - frond * 0.12;
          draw(cc, side < 0 ? '\\' : '/', hx, hy, P.leaves[8 + (i % 4)]);
          if (i % 3 === 0) draw(cc, '*', hx + side * stepX * 0.65, hy - stepY * 0.32, P.moss[7 + (i % 4)]);
        }
      }
    };

    for (let i = 0; i < 18; i++) {
      const leftSide = i < 9;
      const x = w * (leftSide ? 0.05 + rnd(i + 201) * 0.25 : 0.62 + rnd(i + 201) * 0.26);
      const y = h * (0.73 + rnd(i + 202) * 0.24);
      drawFern(x, y, h * (0.05 + rnd(i + 203) * 0.09), i * 1.77, leftSide ? 1 : -1);
    }

    // Low rocks around the stream and clearing edge
    const drawRock = (cx, cy, s, seed) => {
      const grid = [
        ['.', '_', '_', '.'],
        ['/', '-', '-', '\\'],
        ['(', '_', '_', ')']
      ];
      for (let iy = 0; iy < grid.length; iy++) {
        for (let ix = 0; ix < grid[iy].length; ix++) {
          cc.globalAlpha = 0.60 + 0.08 * iy;
          draw(cc, grid[iy][ix], cx + (ix - 1.5) * stepX * s, cy + (iy - 1.4) * stepY * s, P.floor[5 + ((seed + iy) % 5)]);
        }
      }
    };
    drawRock(w * 0.37, h * 0.90, 1.0, 1);
    drawRock(w * 0.49, h * 0.86, 0.78, 2);
    drawRock(w * 0.57, h * 0.82, 0.70, 3);

    // Small mushrooms, subtle and low in the frame
    const drawMushroom = (px, py, scale) => {
      const cap = [['.', '_', '.'], ['/', '^', '\\'], ['(', '=', ')']];
      for (let iy = 0; iy < cap.length; iy++) {
        for (let ix = 0; ix < 3; ix++) {
          cc.globalAlpha = 0.66;
          draw(cc, cap[iy][ix], px + (ix - 1) * stepX * scale, py + (iy - 2) * stepY * scale, P.floor[9]);
        }
      }
      cc.globalAlpha = 0.60;
      draw(cc, '|', px, py + stepY * scale, P.light[7]);
    };
    drawMushroom(w * 0.29, h * 0.93, 0.84);
    drawMushroom(w * 0.73, h * 0.94, 0.72);

    cc.globalAlpha = 1;
    lastStatic = time;
    lastSignature = `${w}/${h}/${highRes}/${season}/${Math.round(daylight * 30)}/${Math.round(rain * 6)}/${Math.round(wind * 10)}/${Math.round((fx?.humidity ?? 0) * 6)}`;
  }

  function drawScene(ctx, w, h, time, fx = {}, highRes = true) {
    const daylight = clamp(fx?.daylight ?? 0.6);
    const rain = clamp(fx?.rain ?? 0);
    const wind = clamp(fx?.wind ?? 0);
    const humidity = clamp(fx?.humidity ?? 0.45);
    const signature = `${w}/${h}/${highRes}/${season}/${Math.round(daylight * 30)}/${Math.round(rain * 6)}/${Math.round(wind * 10)}/${Math.round(humidity * 6)}`;
    if (signature !== lastSignature || time - lastStatic > 0.26 || !cache.width) {
      drawStatic(w, h, time, fx, highRes);
    }

    ctx.drawImage(cache, 0, 0, w, h);
    setFont(ctx, fw);

    const day = smooth(0.04, 0.66, daylight);
    const night = 1 - smooth(0.04, 0.54, daylight);

    // Sunbeams by day, angled from the canopy opening through the clearing.
    if (day > 0.12) {
      for (let i = 0; i < 250; i++) {
        const rr = rnd(4001 + i);
        const v = 0.18 + rnd(4002 + i) * 0.66;
        const xLine = 0.33 + v * 0.28 + Math.sin(v * 16 + i) * 0.01;
        const x = w * (xLine + Math.sin(time * 0.35 + i) * wind * 0.010);
        const y = h * v;
        if (x < w * 0.14 || x > w * 0.75) continue;
        ctx.globalAlpha = day * (0.10 + 0.28 * rr) * (1 - smooth(0.68, 0.98, v));
        draw(ctx, rr > 0.76 ? '·' : '.', x, y, `rgb(${Math.floor(212 + 24 * rr)},${Math.floor(189 + 26 * rr)},${Math.floor(123 + 24 * rr)})`);
      }
    }

    // Low-lying mist and atmospheric haze.
    const mist = humidity * (0.10 + 0.24 * (1 - day));
    for (let i = 0; i < 110; i++) {
      const seed = 5001 + i;
      const y = h * (0.52 + 0.42 * rnd(seed + 2));
      const x = ((rnd(seed) * w + time * (3 + wind * 11) * (i % 2 ? 1 : -1)) % w + w) % w;
      ctx.globalAlpha = mist * (0.10 + 0.34 * rnd(seed + 3));
      draw(ctx, i % 5 === 0 ? '~' : '.', x, y, '#b0d0bc');
    }

    // Floating dust/pollen in bright daylight.
    if (day > 0.18) {
      for (let i = 0; i < 65; i++) {
        const seed = 5400 + i;
        const x = ((rnd(seed) * w + time * (5 + wind * 18)) % w + w) % w;
        const y = h * (0.28 + 0.58 * rnd(seed + 1));
        if (x > w * 0.12 && x < w * 0.80) {
          ctx.globalAlpha = day * 0.10 * (0.5 + rnd(seed + 2));
          draw(ctx, i % 9 === 0 ? '*' : '.', x, y, '#e7d7a1');
        }
      }
    }

    // Rainfall through canopy openings and across the foreground.
    if (rain > 0.01) {
      ctx.globalAlpha = rain * 0.38;
      for (let i = 0; i < 340; i++) {
        const x = (rnd(6101 + i) * w + time * (10 + wind * 42)) % w;
        const y = (rnd(6201 + i) * h + time * (58 + rain * 92)) % h;
        const u = x / w, v = y / h;
        if (skyGap(u, v) || (v > 0.28 && u > 0.12 && u < 0.90)) {
          draw(ctx, i % 4 === 0 ? '|' : '.', x, y, '#a4babe');
        }
      }
    }

    // Night stars and fireflies.
    if (night > 0.08) {
      for (let i = 0; i < 32; i++) {
        const x = w * (0.28 + 0.34 * rnd(7101 + i));
        const y = h * (0.04 + 0.23 * rnd(7102 + i));
        if (!skyGap(x / w, y / h)) continue;
        const twinkle = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(time * (0.6 + 0.5 * rnd(7103 + i)) + i * 1.8), 3);
        ctx.globalAlpha = night * twinkle * 0.75;
        draw(ctx, i % 8 === 0 ? '*' : i % 3 === 0 ? '+' : '.', x, y, '#dce7e4');
      }
      for (let i = 0; i < 18; i++) {
        const x = w * (0.24 + 0.42 * rnd(7301 + i) + 0.018 * Math.sin(time * 0.42 + i));
        const y = h * (0.44 + 0.42 * rnd(7302 + i) + 0.020 * Math.sin(time * 0.51 + i * 1.7));
        const bright = night * (0.18 + 0.82 * Math.pow(0.5 + 0.5 * Math.sin(time * 0.96 + i * 2.1), 3));
        ctx.globalAlpha = bright * 0.18;
        draw(ctx, '.', x - stepX * 0.8, y, '#ffde9b');
        draw(ctx, '.', x + stepX * 0.8, y, '#ffde9b');
        draw(ctx, '.', x, y - stepY * 0.7, '#ffde9b');
        ctx.globalAlpha = bright;
        ctx.shadowColor = '#f5ce86';
        ctx.shadowBlur = 5 + bright * 4;
        draw(ctx, i % 4 === 0 ? '*' : '+', x, y, '#ffe3a7');
        ctx.shadowBlur = 0;
      }
    }

    ctx.globalAlpha = 1;
  }

  function setSeason(value) {
    season = ((Number(value) % 4) + 4) % 4;
    lastStatic = -99;
    return seasons[season].name;
  }
  function cycleSeason() {
    return setSeason(season + 1);
  }
  function source() {
    return [
      '// GREENWOOD / 002 — cinematic ASCII woodland',
      '// Off-centre clearing, right-side oak, layered depth, day/night atmosphere.',
      drawStatic.toString(),
      drawScene.toString(),
      skyGap.toString(),
      clearingValue.toString(),
      streamValue.toString(),
      leafMass.toString(),
      '// Wildlife and rare events intentionally deferred to the next phase.'
    ].join('\n\n');
  }

  window.PelagicGreenwood = Object.freeze({
    draw: drawScene,
    setSeason,
    cycleSeason,
    source,
    get season() { return seasons[season].name; }
  });
})();
