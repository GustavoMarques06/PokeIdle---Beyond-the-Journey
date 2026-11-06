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
# As folhas do pixelfx são feitas para fundo escuro e trazem um véu preto na tela inteira, que escurecia o cenário em até
# 54%. Aqui ele sai: VEIL diz quanto sobra dele em cada clima (0 = nada; chuva e tempestade ficam só um pouco mais escuras).
VEIL = {'rain': 0.25, 'snow': 0.15, 'storm': 0.35}
# Nestes, o escuro opaco também é cenário do pacote (capim preto, nuvens), não efeito.
DARK_IS_SCENERY = {'fireflies', 'storm'}
# Linhas de baixo (de 180) que somem: montes de folhas e poças cobririam os pés dos Pokémon.
CLEAR_BOTTOM = {'leaves': 18, 'rain': 10, 'storm': 10, 'snow': 18}
# Menos partículas, para não atrapalhar a visão da luta. Antes de exportar, no pixelfx:
#   src/fx/weather/cherry-blossoms.js: `near ? 54 : 90` vira `near ? 10 : 14`; sem as chamadas blossoms() e scatter()
#   src/fx/weather/falling-leaves.js:  `trips(t, D, 62,` vira `trips(t, D, 14,`
# Climas de ambiente: arquivo de saída → (folha de origem, intervalo entre quadros, WebP com perdas?)
AMBIENT = {
    'leaves': ('falling-leaves', 3, False),
    'blossoms': ('cherry-blossoms', 3, False),
    'fireflies': ('fireflies', 3, False),
    'aurora': ('aurora', 6, True),  # degradês suaves: com perdas fica bem menor
    'stars': ('shooting-stars', 3, False),
}


def thin_veil(frame, name):
    """Reduz o véu: pixels escuros e translúcidos são o fundo; o desenho (claro ou opaco) fica como está."""
    keep = VEIL.get(name, 0)
    limit = 256 if name in DARK_IS_SCENERY else 200
    floor = frame.height - CLEAR_BOTTOM.get(name, 0)
    # A tempestade tem nuvens riscadas em azul-escuro, que pareciam fios cruzando a cena.
    dark = 130 if name == 'storm' else 70
    rgba = frame.copy()
    data = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = data[x, y]
            if y >= floor:
                data[x, y] = (r, g, b, 0)
            elif a and a < limit and max(r, g, b) < dark:
                data[x, y] = (r, g, b, int(a * keep))
    return rgba


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
        frames.append(thin_veil(sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), outname))
    ms = round(1000 * step / meta['meta']['pixelfx']['fps'])
    path = out / f'{outname}.webp'
    opts = dict(quality=70, method=4) if lossy else dict(lossless=True, method=4)
    frames[0].save(path, 'WEBP', save_all=True, append_images=frames[1:], duration=ms, loop=0, **opts)
    print(outname, len(frames), 'quadros,', path.stat().st_size // 1024, 'KB')
