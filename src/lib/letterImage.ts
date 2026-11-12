// Rysuje list na obrazku PNG (kartka w linie), żeby dało się go wysłać dalej. Działa tylko w przeglądarce.

const W = 1080;
const PAD_TOP = 110;
const PAD_BOTTOM = 100;
const LEFT = 170;
const RIGHT = 80;
const LINE = 60;
const INK = "#1b1640";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function letterToPng(letter: string): Promise<Blob> {
  await document.fonts.ready;
  const family = getComputedStyle(document.body).fontFamily;
  const font = `500 36px ${family}`;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak obsługi canvas.");
  ctx.font = font;
  const lines = wrap(ctx, letter.trim(), W - LEFT - RIGHT);

  canvas.width = W;
  canvas.height = PAD_TOP + lines.length * LINE + PAD_BOTTOM;
  const H = canvas.height;

  // kartka
  ctx.fillStyle = "#fffdf3";
  ctx.fillRect(0, 0, W, H);

  // linie zeszytu i czerwony margines
  ctx.strokeStyle = "#d9e2f7";
  ctx.lineWidth = 3;
  for (let y = PAD_TOP + 16; y < H - 30; y += LINE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#f3a6a8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(LEFT - 40, 0);
  ctx.lineTo(LEFT - 40, H);
  ctx.stroke();

  // kokarda w rogu
  ctx.fillStyle = "#ffc53d";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(W - 120 + dir * 34, 62, 32, 22, dir * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(W - 120, 66, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // treść
  ctx.font = font;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, i) => ctx.fillText(line, LEFT, PAD_TOP + i * LINE));

  // ramka
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Nie udało się zapisać obrazka."))), "image/png"),
  );
}
