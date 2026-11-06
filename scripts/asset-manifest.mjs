// Plugin do Vite: gera asset-manifest.json no build, com o código do jogo (assets/, com hash) e
// cada arquivo de public/ que ele carrega (sprites, sons, mapas, ajuda), com o tamanho em bytes. O pré-carregador (src/ui/preload.ts)
// usa a lista para deixar tudo no cache do navegador antes de ser pedido.

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Pastas de public/ com arquivos do jogo; o resto (ícones do app, sw.js) é do PWA. */
const ASSET_DIRS = ['sprites', 'audio', 'maps', 'brand', 'help', 'icons'];

export function assetManifest({ buildId }) {
  return {
    name: 'asset-manifest',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const root = join(import.meta.dirname, '..', 'public');
      const files = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          const info = statSync(path);
          if (info.isDirectory()) walk(path); else files.push([relative(root, path).split('\\').join('/'), info.size]);
        }
      };
      for (const dir of ASSET_DIRS) walk(join(root, dir));
      // O código do build: sem ele no cache, a página abre em branco sem internet.
      for (const [fileName, item] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') || fileName.endsWith('.map')) continue;
        files.push([fileName, Buffer.byteLength(item.type === 'chunk' ? item.code : item.source)]);
      }
      files.sort((a, b) => a[0].localeCompare(b[0]));
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify({ files }) });
      // O número desta versão: o jogo compara com o que leva no código para saber se há atualização.
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId }) });
    },
  };
}
