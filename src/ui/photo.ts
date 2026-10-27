// Fotos da batalha: redesenha a cena (canvas do cenário, fundo ilustrado, sombras e sprites) num
// PNG com moldura e legenda, baixa o arquivo e tenta copiar para a área de transferência.

const SCALE = 3;
const CAPTION_H = 26;

/** Retângulo de uma imagem com object-fit: cover e object-position (x% y%). */
function coverRect(img: HTMLImageElement, box: DOMRect): [number, number, number, number] {
  const iw = img.naturalWidth || box.width;
  const ih = img.naturalHeight || box.height;
  const k = Math.max(box.width / iw, box.height / ih);
  const [px, py] = (getComputedStyle(img).objectPosition || '50% 50%')
    .split(' ')
    .map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
  const w = iw * k;
  const h = ih * k;
  return [(box.width - w) * px, (box.height - h) * py, w, h];
}

export async function takePhoto(scene: HTMLElement, caption: string): Promise<boolean> {
  const root = scene.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(root.width * SCALE);
  canvas.height = Math.round(root.height * SCALE) + CAPTION_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE);

  const local = (r: DOMRect) => [r.left - root.left, r.top - root.top, r.width, r.height] as const;
  const layers = scene.querySelectorAll<HTMLElement>(
    '.scene-canvas, .scene-backdrop, .ground-shadow, .battle-mon .sprite, .capture-ghost .sprite',
  );
  for (const el of layers) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const [x, y, w, h] = local(r);
    if (el.classList.contains('ground-shadow')) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (el instanceof HTMLCanvasElement) {
      ctx.drawImage(el, x, y, w, h);
    } else if (el instanceof HTMLImageElement && el.complete) {
      if (el.classList.contains('scene-backdrop')) {
        const [cx, cy, cw, ch] = coverRect(el, r);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.drawImage(el, x + cx, y + cy, cw, ch);
        ctx.restore();
      } else {
        ctx.drawImage(el, x, y, w, h);
      }
    }
  }

  // Legenda: faixa escura com treinador, Pokémon, rota e data.
  const H = root.height;
  ctx.fillStyle = '#283050';
  ctx.fillRect(0, H, root.width, CAPTION_H);
  ctx.fillStyle = '#f8d830';
  ctx.fillRect(0, H, root.width, 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 11px ${getComputedStyle(scene).fontFamily || 'monospace'}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(`${caption} · ${new Date().toLocaleDateString('pt-BR')}`, 8, H + CAPTION_H / 2 + 1);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a8c0f0';
  ctx.fillText('PokéIdle', root.width - 8, H + CAPTION_H / 2 + 1);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  try {
    await navigator.clipboard?.write?.([new ClipboardItem({ 'image/png': blob })]);
  } catch {
    // Sem permissão de área de transferência: fica só o download.
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokeidle-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}
