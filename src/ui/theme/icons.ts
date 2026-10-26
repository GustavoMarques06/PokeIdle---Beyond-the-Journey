// Ícones originais em pixel art (grades de caracteres → SVG). Substituem emojis
// para tudo que não tem sprite próprio na PokéAPI (Pokédex, insígnias, cursores…).
// '.' = transparente; demais caracteres são chaves da paleta de cada ícone.

export interface PixelIconDef {
  rows: string[];
  palette: Record<string, string>;
}

const K = '#283050'; // contorno marinho

export const ICONS = {
  cursor: {
    rows: ['k....', 'kk...', 'kwk..', 'kwwk.', 'kwwwk', 'kwwk.', 'kwk..', 'kk...', 'k....'],
    palette: { k: K, w: '#f8f8f8' },
  },
  star: {
    rows: [
      '....k....',
      '...kyk...',
      '...kyk...',
      'kkkkyykkk',
      'kyyyyyyyk',
      '.kyywyyk.',
      '..kyyyk..',
      '.kyykyyk.',
      'kkk...kkk',
    ],
    palette: { k: '#a06000', y: '#f8d830', w: '#fff8c0' },
  },
  lock: {
    rows: ['..kkkk..', '.k....k.', '.k....k.', 'kkkkkkkk', 'kyyyyyyk', 'kyykkyyk', 'kyyyyyyk', 'kkkkkkkk'],
    palette: { k: '#404850', y: '#d8b048' },
  },
  check: {
    rows: ['.......kk', '......kgk', 'kk...kgk.', 'kgk.kgk..', '.kgkgk...', '..kgk....', '...k.....'],
    palette: { k: '#205020', g: '#58c858' },
  },
  trophy: {
    rows: [
      'kkkkkkkkk',
      'kyyyyyyyk',
      'kyywyyyyk',
      '.kyyyyyk.',
      '..kyyyk..',
      '...kyk...',
      '...kyk...',
      '..kkkkk..',
      '.kyyyyyk.',
      '.kkkkkkk.',
    ],
    palette: { k: '#805000', y: '#f8c830', w: '#fff8d0' },
  },
  trophyEmpty: {
    rows: [
      'kkkkkkkkk',
      'k.......k',
      'k.......k',
      '.k.....k.',
      '..k...k..',
      '...k.k...',
      '...k.k...',
      '..kkkkk..',
      '.k.....k.',
      '.kkkkkkk.',
    ],
    palette: { k: '#9098a8' },
  },
  miniBall: {
    rows: ['.kkkk.', 'krrrrk', 'kkwwkk', 'kwwwwk', '.kkkk.'],
    palette: { k: '#283050', r: '#e83838', w: '#f8f8f8' },
  },
  pokedex: {
    rows: [
      'kkkkkkkkkkkk',
      'krrrrrrrrrrk',
      'krbbkrrrrrrk',
      'krbwbkrgyrrk',
      'krbbkrrrrrrk',
      'krrrrrrrrrrk',
      'krkkkkkkkkrk',
      'krkssssssskr',
      'krksswssssrk',
      'krkssssssskr',
      'krkkkkkkkkrk',
      'krrrrrrrrrrk',
      'kkkkkkkkkkkk',
    ],
    palette: {
      k: '#401010',
      r: '#d83028',
      b: '#48a8f8',
      w: '#c8f0ff',
      g: '#58c858',
      y: '#f8d030',
      s: '#98d8a8',
    },
  },
  spark: {
    rows: ['...w...', '.w.w.w.', '..www..', 'wwwcwww', '..www..', '.w.w.w.', '...w...'],
    palette: { w: '#ffffff', c: '#f8f8a0' },
  },
  boss: {
    rows: ['.kkkkkk.', 'kwwwwwwk', 'kwkwwkwk', 'kwwwwwwk', '.kwkkwk.', '..kwwk..', '...kk...'],
    palette: { k: '#401818', w: '#f8e0d0' },
  },
  pokedollar: {
    rows: ['kkkk.', 'k...k', 'k...k', 'kkkk.', 'k....', 'kkk..', 'k....'],
    palette: { k: K },
  },
  arrowDown: {
    rows: ['kkkkkkk', '.kwwwk.', '..kwk..', '...k...'],
    palette: { k: K, w: '#f8d830' },
  },
  arrowUp: {
    rows: ['...k...', '..kwk..', '.kwwwk.', 'kkkkkkk'],
    palette: { k: K, w: '#f8f8f8' },
  },
  sun: {
    rows: [
      '...y.y...',
      'y..yyy..y',
      '.yyoooyy.',
      '.yoowooy.',
      'yyowwwoyy',
      '.yoowooy.',
      '.yyoooyy.',
      'y..yyy..y',
      '...y.y...',
    ],
    palette: { y: '#f8d030', o: '#f89830', w: '#fff8c0' },
  },
  moon: {
    rows: ['...kkk..', '..kyyk..', '.kyyk...', 'kyyk....', 'kyyk....', 'kyyyk...', '.kyyyyk.', '..kkkk..'],
    palette: { k: '#6070a0', y: '#f8f0b0' },
  },
  cloud: {
    rows: ['...kkk...', '..kwwwk..', '.kwwwwwkk', 'kwwwwwwwk', 'kwwwwwwwk', '.kkkkkkk.'],
    palette: { k: '#7888a0', w: '#f8f8f8' },
  },
  rain: {
    rows: ['...kkk...', '..kwwwk..', '.kwwwwwkk', 'kwwwwwwwk', '.kkkkkkk.', '.b..b..b.', 'b..b..b..'],
    palette: { k: '#586880', w: '#c8d0e0', b: '#4890f0' },
  },
  sand: {
    rows: ['.ss...ss.', 's..ss...s', '...ss.s..', '.s...s..s', 's.ss...s.', '..s..ss..'],
    palette: { s: '#c89850' },
  },
  egg: {
    rows: ['..kkk..', '.kwwwk.', 'kwwgwwk', 'kwgggwk', 'kwwwwwk', 'kgwwwgk', '.kwwwk.', '..kkk..'],
    palette: { k: '#506048', w: '#f8f8e8', g: '#78c058' },
  },
  rocket: {
    rows: ['kkkkkk.', 'krrrrrk', 'krk..rk', 'krrrrk.', 'krk.rk.', 'krk..rk', 'kkk..kk'],
    palette: { k: '#281818', r: '#e03030' },
  },
  target: {
    rows: ['..kkk..', '.krrrk.', 'krwwwrk', 'krwrwrk', 'krwwwrk', '.krrrk.', '..kkk..'],
    palette: { k: K, r: '#e04848', w: '#f8f8f8' },
  },
} satisfies Record<string, PixelIconDef>;

export type IconName = keyof typeof ICONS;

export function iconSvg(def: PixelIconDef, override?: Record<string, string>): string {
  const palette = { ...def.palette, ...override };
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  let rects = '';
  def.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (ch !== '.' && color) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${rects}</svg>`;
}
