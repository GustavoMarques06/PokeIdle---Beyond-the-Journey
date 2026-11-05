# Monta os climas da batalha (public/sprites/weather/<clima>.webp) a partir das folhas exportadas do pixelfx
# (https://github.com/patch-gg/pixelfx, MIT): chuva, neve, tempestade e os climas de ambiente (folhas, pétalas, vaga-lumes, aurora, estrelas cadentes), 320×180, em loop. Para exportar as folhas:
#   git clone https://github.com/patch-gg/pixelfx && cd pixelfx && npm install && node tools/sheets.mjs weather/rain weather/snow weather/storm weather/falling-leaves weather/cherry-blossoms weather/fireflies weather/aurora weather/shooting-stars
# Cada folha tem 240–360 quadros a 30 fps; aqui ficam 1 a cada STEP (10 fps) num WebP animado sem perdas, que o
# navegador repete sozinho. Uso: python scripts/build-weather.py <pasta sheets/weather>   (requer Pillow)

import json
import sys
from pathlib import Path

from PIL import Image

STEP = 3
# Climas de ambiente: arquivo de saída → (folha de origem, intervalo entre quadros, WebP com perdas?)
AMBIENT = {
    'leaves': ('falling-leaves', 3, False),
    'blossoms': ('cherry-blossoms', 3, False),
    'fireflies': ('fireflies', 3, False),
    'aurora': ('aurora', 6, True),  # degradês suaves: com perdas fica bem menor
    'stars': ('shooting-stars', 3, False),
}
src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / 'public' / 'sprites' / 'weather'
out.mkdir(parents=True, exist_ok=True)
jobs = [(n, n, STEP, False) for n in ('rain', 'snow', 'storm')] + [(o, *v) for o, v in AMBIENT.items()]
for outname, name, step, lossy in jobs:
    meta = json.loads((src / f'{name}.json').read_text(encoding='utf-8'))
    sheet = Image.open(src / f'{name}.png').convert('RGBA')
    frames = []
    for f in meta['frames'][::step]:
        r = f['frame']
        frames.append(sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])))
    ms = round(1000 * step / meta['meta']['pixelfx']['fps'])
    path = out / f'{outname}.webp'
    opts = dict(quality=70, method=4) if lossy else dict(lossless=True, method=4)
    frames[0].save(path, 'WEBP', save_all=True, append_images=frames[1:], duration=ms, loop=0, **opts)
    print(outname, len(frames), 'quadros,', path.stat().st_size // 1024, 'KB')
