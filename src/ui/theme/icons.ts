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
  tree: {
    rows: [
      '...kkk...',
      '..kgggk..',
      '.kgrggrk.',
      'kggggggk.',
      'kgrgggrgk',
      '.kgggggk.',
      '..kkbkk..',
      '....b....',
      '...kbk...',
    ],
    palette: { k: '#204820', g: '#58b048', r: '#e04848', b: '#805830' },
  },
  camera: {
    rows: ['..kkk....', 'kkkwkkkkk', 'kgggkkggk', 'kggkbbkgk', 'kggkbwkgk', 'kgggkkggk', 'kkkkkkkkk'],
    palette: { k: K, g: '#8890a8', w: '#f8f8f8', b: '#4878c8' },
  },
  fog: {
    rows: [
      '.........',
      'kkkk.kkk.',
      '.........',
      '..kkkkkkk',
      '.........',
      'kkkkk.kk.',
      '.........',
      '...kkkkkk',
    ],
    palette: { k: '#98a8b8' },
  },
  hail: {
    rows: ['...kkk...', '..kwwwk..', '.kwwwwwkk', 'kwwwwwwwk', '.kkkkkkk.', '.i..i..i.', 'i..i..i..'],
    palette: { k: '#586880', w: '#d8e0f0', i: '#a8e8ff' },
  },
  rocket: {
    rows: ['kkkkkk.', 'krrrrrk', 'krk..rk', 'krrrrk.', 'krk.rk.', 'krk..rk', 'kkk..kk'],
    palette: { k: '#281818', r: '#e03030' },
  },
  // Medalha de conquista: a chave 'c' recebe a cor do metal (bronze, prata, ouro, platina).
  medal: {
    rows: [
      'kk.....kk',
      'krk...kbk',
      '.krk.kbk.',
      '..krkbk..',
      '..kkkkk..',
      '.kwwccck.',
      'kwwcccccd',
      'kwccccccd',
      'kcccccdd.',
      '.kccddd..',
      '..kkkkk..',
    ],
    palette: { k: K, r: '#e04848', b: '#4878e0', c: '#f0c030', w: '#ffffffc0', d: '#00000050' },
  },
  // Itens sem sprite da PokéAPI: a chave 'c' recebe a cor do item (ver ItemIcon).
  gem: {
    rows: [
      '..kkkkk..',
      '.kwwccdck',
      'kwwccccdk',
      'kccccccdk',
      '.kccccdk.',
      '..kccdk..',
      '...kdk...',
      '....k....',
    ],
    palette: { k: K, c: '#80c0f0', w: '#ffffffb0', d: '#00000040' },
  },
  orb: {
    rows: [
      '..kkkkk..',
      '.kwwcccdk',
      'kwwccccdk',
      'kwcccccdk',
      'kccccccdk',
      'kccccdddk',
      '.kcddddk.',
      '..kkkkk..',
    ],
    palette: { k: K, c: '#e86090', w: '#ffffffb0', d: '#00000040' },
  },
  band: {
    rows: ['kkkkkkkkk', 'kwccccccck', 'kcckkkcdk', 'kcckwkcdk', 'kcckkkcdk', 'kcddddddk', 'kkkkkkkkk'],
    palette: { k: K, c: '#e05040', w: '#ffffffb0', d: '#00000040' },
  },
  bag: {
    rows: [
      '..kkkkk..',
      '...kdk...',
      '..kcccck.',
      '.kcwcccck',
      'kcwccccdk',
      'kccccccdk',
      'kccccdddk',
      '.kkkkkkk.',
    ],
    palette: { k: K, c: '#58b878', w: '#ffffffb0', d: '#00000040' },
  },
  bell: {
    rows: [
      '...kkk...',
      '..kcwck..',
      '.kcwcccdk',
      '.kcccccdk',
      'kccccccdk',
      'kkkkkkkkk',
      '...kyk...',
      '....k....',
    ],
    palette: { k: K, c: '#f0a8c8', w: '#ffffffb0', d: '#00000040', y: '#f8d830' },
  },
  vial: {
    rows: ['..kkkk..', '..kwwk..', '.kkwwkk.', 'kwccccdk', 'kcccccdk', 'kccwcddk', 'kcccdddk', '.kkkkkk.'],
    palette: { k: K, c: '#e85858', w: '#ffffffb0', d: '#00000040' },
  },
  cap: {
    rows: ['.kkkkkkk.', 'kwwccccck', 'kwcccccdk', 'kcccccddk', 'kccccdddk', '.kdddddk.', '..kkkkk..'],
    palette: { k: K, c: '#f0c830', w: '#ffffffb0', d: '#00000040' },
  },
  capsule: {
    rows: ['.kkkkkkk.', 'kwccchhhk', 'kcccchhgk', 'kcccdhggk', '.kkkkkkk.'],
    palette: { k: K, c: '#e85858', w: '#ffffffb0', d: '#00000040', h: '#f8f8f8', g: '#c8c8d0' },
  },
  help: {
    rows: [
      '..kkkkk..',
      '.kbbbbbk.',
      'kbbwwwbbk',
      'kbbbbbwbk',
      'kbbbwwbbk',
      'kbbbwbbbk',
      'kbbbbbbbk',
      'kbbbwbbbk',
      '.kkkkkkk.',
    ],
    palette: { k: K, b: '#4888e0', w: '#ffffff' },
  },
  // Botões de batalha e marcadores do mapa (polimento de 11/11).
  shoe: {
    rows: ['.....kkk.', '....krrk.', '...krrrk.', '.kkrwrrkk', 'krrrrrrrk', 'kwwwwwwwk', '.kkkkkkk.'],
    palette: { k: K, r: '#e04838', w: '#f8f8f8' },
  },
  fist: {
    rows: ['..kkkkkk.', '.kskskskk', '.kskskssk', 'kkkkkkssk', 'ksssssssk', 'ksssssssk', '.kssssssk', '..kkkkkk.'],
    palette: { k: '#603020', s: '#f8c890' },
  },
  wave: {
    rows: ['..kk.....', '.kwbk..kk', 'kwbbbkkbk', 'kbbbbbbbk', '.kkkkkkk.'],
    palette: { k: '#204878', b: '#4898e8', w: '#c8f0ff' },
  },
  rock: {
    rows: ['...kkk...', '..kgggk..', '.kgkkkgk.', 'kgkdddkgk', 'kgkdddkgk', 'kkkkkkkkk'],
    palette: { k: '#403020', g: '#a08060', d: '#201810' },
  },
  house: {
    rows: ['....k....', '...krk...', '..krrrk..', '.krrrrrk.', 'kkkkkkkkk', '.kwbwwwk.', '.kwbwkwk.', '.kkkkkkk.'],
    palette: { k: K, r: '#d84838', w: '#f8f0d8', b: '#5880c8' },
  },
  flame: {
    rows: ['...k...', '..kok..', '..koyk.', '.kooyk.', '.koyyok', 'koyywok', 'koywwok', '.koook.', '..kkk..'],
    palette: { k: '#802010', o: '#f06020', y: '#f8c830', w: '#fff8c0' },
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
