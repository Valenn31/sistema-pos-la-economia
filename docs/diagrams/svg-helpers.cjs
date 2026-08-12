// Helpers mínimos para armar diagramas SVG a mano, con la paleta del manual.
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const DARK = "#0F172A";
const GRAY = "#64748B";
const LIGHT_GRAY_BORDER = "#CBD5E1";
const BG_GREEN = "#F0FDF4";
const BG_BLUE = "#EFF6FF";
const BG_YELLOW = "#FFFBEB";
const BG_GRAY = "#F8FAFC";
const WHITE = "#FFFFFF";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Caja con título (bold) + hasta 3 líneas de subtítulo (regular, gris)
function box(x, y, w, h, { title, lines = [], fill = WHITE, stroke = LIGHT_GRAY_BORDER, strokeWidth = 1.5, titleColor = DARK, titleSize = 15, lineSize = 12.5, rx = 8, dashed = false } = {}) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashed ? ' stroke-dasharray="5,4"' : ''}/>`;
  const cx = x + w / 2;
  const titleY = lines.length ? y + h / 2 - (lines.length * (lineSize + 4)) / 2 - 2 : y + h / 2 + titleSize / 3;
  if (title) {
    s += `<text x="${cx}" y="${titleY}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${titleSize}" fill="${titleColor}">${esc(title)}</text>`;
  }
  lines.forEach((line, i) => {
    const ly = titleY + titleSize / 2 + 10 + i * (lineSize + 5);
    s += `<text x="${cx}" y="${ly}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${lineSize}" fill="${GRAY}">${esc(line)}</text>`;
  });
  return s;
}

// Encabezado de grupo/sección (barra de color con texto blanco)
function groupHeader(x, y, w, h, text, { fill = GREEN, textColor = WHITE, size = 13.5, rx = 6 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>` +
    `<text x="${x + w / 2}" y="${y + h / 2 + size / 3}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${size}" fill="${textColor}">${esc(text)}</text>`;
}

function plainText(x, y, text, { size = 13, color = DARK, weight = 400, anchor = "start", italic = false } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}"${italic ? ' font-style="italic"' : ''}>${esc(text)}</text>`;
}

let arrowHeadDefs = `
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
  <path d="M0,0 L10,5 L0,10 z" fill="${DARK}"/>
</marker>
<marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
  <path d="M0,0 L10,5 L0,10 z" fill="${GREEN_DARK}"/>
</marker>`;

function arrow(x1, y1, x2, y2, { color = DARK, width = 1.8, dashed = false, marker = "arrow", label = "", labelSize = 11.5 } = {}) {
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="5,4"' : ''} marker-end="url(#${marker})"/>`;
  if (label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    s += `<rect x="${mx - label.length * labelSize * 0.29 - 4}" y="${my - labelSize - 2}" width="${label.length * labelSize * 0.58 + 8}" height="${labelSize + 6}" fill="${WHITE}" opacity="0.9"/>`;
    s += plainText(mx, my, label, { size: labelSize, color, anchor: "middle" });
  }
  return s;
}

// Path en L (para conectar cajas que no están alineadas)
function elbow(x1, y1, x2, y2, { color = DARK, width = 1.8, marker = "arrow" } = {}) {
  const midY = (y1 + y2) / 2;
  return `<path d="M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}" fill="none" stroke="${color}" stroke-width="${width}" marker-end="url(#${marker})"/>`;
}

function svgWrap(w, h, body, title) {
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<defs>${arrowHeadDefs}</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="${WHITE}"/>
${title ? plainText(w / 2, 34, title, { size: 20, weight: 700, color: DARK, anchor: "middle" }) : ""}
${body}
</svg>`;
}

module.exports = { GREEN, GREEN_DARK, DARK, GRAY, LIGHT_GRAY_BORDER, BG_GREEN, BG_BLUE, BG_YELLOW, BG_GRAY, WHITE, box, groupHeader, plainText, arrow, elbow, svgWrap, esc };
