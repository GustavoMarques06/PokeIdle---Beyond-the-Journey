// Pré-carregamento dos arquivos do jogo (só no navegador; no app de desktop eles já estão no
// disco). Assim que o jogo abre, tudo o que está em asset-manifest.json (gerado no build) vai
// para o mesmo cache do service worker (public/sw.js), em segundo plano e com prioridade baixa:
// abrir a Pokédex, trocar de Pokémon ou encontrar uma espécie nova não espera a rede.
//
// Ordem: primeiro o código do jogo (sem ele, nada abre offline), depois o que é pequeno e aparece em todo lugar (ícones, itens, insígnias,
// treinadores, cenários, mapas, sons), depois os sprites de frente (Pokédex, equipe), os de
// costas (batalha), os shiny e por fim as animações de clima. Com "economia de dados" ligada ou internet 2G, só o
// essencial é baixado sozinho; o resto espera o jogador pedir nas Opções. No celular também: são ~135 MB de sprites, e o
// iPhone não informa se está em dados móveis. Quem pede "Baixar tudo" não precisa pedir de novo.

import { useSyncExternalStore } from 'react';
import { isTauri } from '../engine/storage';

/** O mesmo nome de cache do public/sw.js (o service worker serve o que estiver lá). */
const CACHE = 'pokeidle-v1';
const PARALLEL = 4;

type Group = 'app' | 'essential' | 'front' | 'back' | 'shiny' | 'weather';

function groupOf(path: string): Group {
  if (path.startsWith('assets/')) return 'app';
  // Animações pesadas (até 2,7 MB) e só de enfeite: por último, e nunca como "essencial".
  if (path.startsWith('sprites/weather/')) return 'weather';
  if (/^sprites\/pokemon\/(front-shiny|back-shiny)\//.test(path)) return 'shiny';
  if (/^sprites\/pokemon\/back\//.test(path)) return 'back';
  if (/^sprites\/pokemon\/(front|forms)\//.test(path)) return 'front';
  return 'essential';
}
const ORDER: Group[] = ['app', 'essential', 'front', 'back', 'shiny', 'weather'];

export interface PreloadStatus {
  /** Disponível neste ambiente (navegador com cache, build de produção). */
  supported: boolean;
  files: number;
  filesDone: number;
  bytes: number;
  bytesDone: number;
  /** Parou depois do essencial para poupar dados (economia de dados ou 2G). */
  waitingForData: boolean;
  /** Sem internet: retoma sozinho quando a conexão voltar. */
  offline: boolean;
  running: boolean;
}

let status: PreloadStatus = {
  supported: false,
  files: 0,
  filesDone: 0,
  bytes: 0,
  bytesDone: 0,
  waitingForData: false,
  offline: false,
  running: false,
};
const listeners = new Set<() => void>();
let notifyTimer: ReturnType<typeof setTimeout> | undefined;

function update(patch: Partial<PreloadStatus>, now = false): void {
  status = { ...status, ...patch };
  // A barra de progresso não precisa de um aviso por arquivo.
  if (now) {
    clearTimeout(notifyTimer);
    notifyTimer = undefined;
    for (const fn of listeners) fn();
  } else if (!notifyTimer) {
    notifyTimer = setTimeout(() => {
      notifyTimer = undefined;
      for (const fn of listeners) fn();
    }, 300);
  }
}

export function usePreloadStatus(): PreloadStatus {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => status,
  );
}

const saveData = (): boolean => {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  return !!c?.saveData || c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g';
};

/** Tela de toque: não baixa tudo sem o jogador pedir. */
const isPhone = (): boolean => !!window.matchMedia?.('(pointer: coarse)').matches;

const OPT_IN_KEY = 'pokeidle.offlineAll';

function optedIn(): boolean {
  try {
    return localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

let queue: { url: string; size: number; group: Group; tries: number }[] = [];
let allowAll = false;
let started = false;

async function pump(cache: Cache): Promise<void> {
  if (status.running) return;
  update({ running: true, offline: false }, true);
  const next = () => {
    const i = queue.findIndex((f) => allowAll || f.group === 'app' || f.group === 'essential');
    return i < 0 ? undefined : queue.splice(i, 1)[0];
  };
  const worker = async () => {
    for (let f = next(); f; f = next()) {
      if (!navigator.onLine) {
        queue.unshift(f);
        return;
      }
      try {
        const res = await fetch(f.url, { priority: 'low' } as RequestInit);
        if (res.ok) await cache.put(f.url, res);
        update({ filesDone: status.filesDone + 1, bytesDone: status.bytesDone + f.size });
      } catch {
        if (!navigator.onLine) {
          queue.unshift(f);
          return;
        }
        // Falha passageira: volta para o fim da fila (até 3 tentativas; depois o arquivo é
        // baixado normalmente quando o jogo pedir).
        if (++f.tries < 3) queue.push(f);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  update(
    {
      running: false,
      offline: !navigator.onLine && queue.length > 0,
      waitingForData: !allowAll && queue.length > 0,
    },
    true,
  );
}

let cacheRef: Cache | null = null;

/** Tamanhos da última lista de arquivos vista neste aparelho (para notar arquivos trocados). */
const SIZES_KEY = 'pokeidle.assetSizes';

function readSizes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SIZES_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeSizes(files: [string, number][]): void {
  try {
    localStorage.setItem(SIZES_KEY, JSON.stringify(Object.fromEntries(files)));
  } catch {
    // Sem espaço ou sem acesso: na próxima abertura a comparação só fica mais conservadora.
  }
}

/** Começa (uma vez) a deixar os arquivos do jogo no cache. */
export async function startPreload(): Promise<void> {
  if (started || isTauri() || !import.meta.env.PROD || typeof caches === 'undefined') return;
  started = true;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}asset-manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const { files } = (await res.json()) as { files: [string, number][] };
    const cache = await caches.open(CACHE);
    cacheRef = cache;
    const cached = new Set((await cache.keys()).map((r) => r.url));
    // Arquivo que mudou de tamanho desde a última lista (sprite atualizado numa versão nova):
    // sai do cache para ser baixado de novo, senão o jogador ficaria com o antigo.
    const previous = readSizes();
    for (const [path, size] of files) {
      const url = new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;
      if (previous[path] !== undefined && previous[path] !== size && cached.delete(url))
        await cache.delete(url);
    }
    writeSizes(files);
    const all = files.map(([path, size]) => ({
      url: new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href,
      size,
      group: groupOf(path),
      tries: 0,
    }));
    // Código de versões antigas (o hash muda a cada build) não serve mais: libera o espaço.
    const current = new Set(all.map((f) => f.url));
    for (const url of cached) {
      if (new URL(url).pathname.includes('/assets/') && !current.has(url) && cached.delete(url))
        await cache.delete(url);
    }
    const missing = all.filter((f) => !cached.has(f.url));
    queue = missing.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
    allowAll = optedIn() || (!saveData() && !isPhone());
    const bytes = all.reduce((s, f) => s + f.size, 0);
    update(
      {
        supported: true,
        files: all.length,
        filesDone: all.length - missing.length,
        bytes,
        bytesDone: bytes - missing.reduce((s, f) => s + f.size, 0),
      },
      true,
    );
    window.addEventListener('online', () => void pump(cache));
    await pump(cache);
  } catch (err) {
    console.warn('Pré-carregamento falhou', err);
  }
}

/** Baixa também o que esperava (economia de dados) ou o que ficou por falta de internet. */
export function preloadEverything(): void {
  allowAll = true;
  try {
    localStorage.setItem(OPT_IN_KEY, '1');
  } catch {
    // Sem acesso ao armazenamento: pergunta de novo na próxima abertura.
  }
  update({ waitingForData: false }, true);
  if (cacheRef) void pump(cacheRef);
}
