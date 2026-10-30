// Plugin do Vite: gera asset-manifest.json no build, com cada arquivo de public/ que o jogo
// carrega (sprites, sons, mapas) e o tamanho em bytes. O pré-carregador (src/ui/preload.ts)
// usa a lista para deixar tudo no cache do navegador antes de ser pedido.

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Pastas de public/ com arquivos do jogo; o resto (ícones do app, sw.js) é do PWA. */
const ASSET_DIRS = ['sprites', 'audio', 'maps'];

export function assetManifest() {
  return {
    name: 'asset-manifest',
    apply: 'build',
    generateBundle() {
      const root = join(import.meta.dirname, '..', 'public');
      const files = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          const info = statSync(path);
          if (info.isDirectory()) walk(path);
          else files.push([relative(root, path).split('\\').join('/'), info.size]);
        }
      };
      for (const dir of ASSET_DIRS) walk(join(root, dir));
      files.sort((a, b) => a[0].localeCompare(b[0]));
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify({ files }) });
    },
  };
}
