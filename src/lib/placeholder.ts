export function placeholderArt(label: string): string {
  const seed = (label || "RevOps Pulse").slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const initials =
    seed
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "RP";

  const palettes = [
    { bg1: "#0f1b3d", bg2: "#18243f", accent: "#ff6b63", dot: "#ffaaa3", deco: "#1e3a8a" },
    { bg1: "#18243f", bg2: "#1e3a8a", accent: "#ffaaa3", dot: "#ff6b63", deco: "#274690" },
    { bg1: "#1e3a8a", bg2: "#274690", accent: "#ff6b63", dot: "#cfe0f4", deco: "#0f1b3d" },
    { bg1: "#0f1b3d", bg2: "#274690", accent: "#ffd7d2", dot: "#ff6b63", deco: "#18243f" },
  ];
  const p = palettes[hash % palettes.length];

  // 800x800 square viewBox — composition is centered so object-cover never crops it awkwardly
  const w = 800;
  const h = 800;

  const r = (i: number) => ((hash >> (i * 6)) & 0x3f) / 64;
  const rI = (i: number, max: number) => Math.floor(r(i) * max);

  const dots = Array.from({ length: 10 }, (_, i) => {
    const cx = Math.round(80 + r(i) * (w - 160));
    const cy = Math.round(70 + r(i + 12) * (h - 140));
    const cr = 4 + r(i + 24) * 10;
    const opacity = (0.1 + r(i + 34) * 0.16).toFixed(2);
    const fill = i % 2 === 0 ? p.dot : p.accent;
    return `<circle cx='${cx}' cy='${cy}' r='${cr}' fill='${fill}' opacity='${opacity}'/>`;
  }).join("");

  const ribbonX = 220 + rI(5, 200);
  const ribbon =
    `<line x1='${ribbonX}' y1='0' x2='${ribbonX + 120}' y2='${h}' stroke='${p.accent}' stroke-width='2' opacity='0.18'/>` +
    `<line x1='${ribbonX + 28}' y1='0' x2='${ribbonX + 148}' y2='${h}' stroke='${p.accent}' stroke-width='1' opacity='0.1'/>`;

  const ringR = rI(7, 40);
  const blobR = 100 + rI(9, 60);

  // centered layout
  const cx = w / 2;
  const cy = h / 2;

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<defs>` +
    `<linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${p.bg1}'/>` +
    `<stop offset='1' stop-color='${p.bg2}'/>` +
    `</linearGradient>` +
    `<radialGradient id='reticule' cx='${cx}' cy='${cy}' r='${ringR + 110}'>` +
    `<stop offset='0' stop-color='${p.accent}' stop-opacity='0.14'/>` +
    `<stop offset='1' stop-color='${p.accent}' stop-opacity='0'/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width='${w}' height='${h}' fill='url(#bg)'/>` +
    // central glow (keeps focus in the middle, safe under any crop)
    `<circle cx='${cx}' cy='${cy}' r='${ringR + 110}' fill='url(#reticule)'/>` +
    // corner blob
    `<circle cx='${w - 90}' cy='90' r='${blobR}' fill='${p.deco}' opacity='0.14'/>` +
    dots +
    ribbon +
    // centered initials
    `<text x='${cx}' y='${cy + 60}' text-anchor='middle' font-family="Georgia, 'DM Serif Display', serif" font-size='300' font-weight='bold' fill='rgba(255,255,255,0.92)'>${initials}</text>` +
    // underline accent bar
    `<rect x='${cx - 70}' y='${cy + 88}' width='140' height='4' rx='2' fill='url(#accentBar)'/>` +
    `<linearGradient id='accentBar' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${p.accent}'/><stop offset='1' stop-color='${p.dot}'/></linearGradient>` +
    // brand tag
    `<text x='${cx}' y='${cy + 122}' text-anchor='middle' font-family='Inter, system-ui, sans-serif' font-size='16' letter-spacing='0.14em' fill='${p.accent}' opacity='0.85'>REVOPS PULSE</text>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}