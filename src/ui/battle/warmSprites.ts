// Sprites baixados antes de aparecer. Sem isso, cada espécie nova só começa a baixar quando entra na batalha, e no
// celular (onde o pré-carregamento geral não baixa os sprites sozinho) o jogador fica olhando a Poké Ball de espera.
// Ao entrar numa rota, os sprites de frente de quem pode aparecer nela (e do chefe) e os de costas da equipe
// vão para o cache do service worker e ficam decodificados na memória: quando o Pokémon aparece, o desenho já está lá.

import { useEffect } from 'react';
import type { GameState } from '../../core/state';
import { ROUTES, assetUrl, formSprite, getRoute, getSpecies } from '../../game-data';

/** Caminho do sprite de batalha. */
export function battleSpritePath(speciesId: number, kind: 'front' | 'back', shiny: boolean, form?: string) {
  const s = getSpecies(speciesId).sprites;
  return (
    formSprite(speciesId, form, kind, shiny) ??
    (kind === 'front' ? (shiny && s.frontShiny) || s.front : (shiny && s.backShiny) || s.back)
  );
}

/** Imagens mantidas vivas (a mais antiga sai primeiro): o navegador não as descarta da memória enquanto existem. */
const MAX_HELD = 90;
const held = new Map<string, HTMLImageElement>();

export function warmImages(paths: (string | undefined)[]): void {
  if (typeof Image === 'undefined') return;
  for (const path of paths) {
    const url = assetUrl(path);
    if (!url) continue;
    const old = held.get(url);
    if (old) {
      // Usado de novo: vai para o fim da fila.
      held.delete(url);
      held.set(url, old);
      continue;
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    // Falha (sem internet): sai da lista para tentar de novo na próxima vez.
    img.onerror = () => held.delete(url);
    held.set(url, img);
    while (held.size > MAX_HELD) held.delete(held.keys().next().value!);
  }
}

/** O que precisa estar pronto para a rota atual e a equipe que está lutando. */
export function battleWarmList(state: GameState): string[] {
  const out: (string | undefined)[] = [];
  const route = getRoute(state.battle.routeId);
  // A equipe primeiro: quem entra em campo aparece logo, e a troca no meio da luta não pode esperar.
  for (const uid of [state.activeUid, ...state.battleTeam]) {
    const mon = state.collection.find((p) => p.uid === uid);
    if (mon) out.push(battleSpritePath(mon.speciesId, 'back', mon.shiny, mon.form));
  }
  // Os mais comuns primeiro: são os que aparecem antes.
  const encounters = [...route.encounters].sort((a, b) => b.weight - a.weight);
  for (const e of encounters) out.push(battleSpritePath(e.speciesId, 'front', false));
  for (const m of route.boss?.team ?? [])
    if ('speciesId' in m) out.push(battleSpritePath(m.speciesId, 'front', false, m.form));
  if (route.boss) out.push(`sprites/trainers/${route.boss.trainer}.png`);
  // A sala de desafio treina numa rota ao lado: os selvagens dela também.
  if (route.farm)
    for (const e of getRoute(route.farm).encounters) out.push(battleSpritePath(e.speciesId, 'front', false));
  // A próxima rota da lista (para onde o jogador costuma ir depois): os mais comuns dela, para a chegada não esperar.
  const next = ROUTES[ROUTES.findIndex((r) => r.id === route.id) + 1];
  if (next && next.regionId === route.regionId) out.push(`sprites/backgrounds/${next.scene}.png`);
  if (next && next.regionId === route.regionId)
    for (const e of [...next.encounters].sort((a, b) => b.weight - a.weight).slice(0, 6))
      out.push(battleSpritePath(e.speciesId, 'front', false));
  return [...new Set(out.filter((p): p is string => !!p))];
}

/** Deixa prontos os sprites da rota e da equipe; refaz só quando a rota ou a equipe mudam. */
export function useWarmBattleSprites(state: GameState | null): void {
  const team = !state
    ? ''
    : [state.activeUid, ...state.battleTeam]
        .map((uid) => {
          const mon = state.collection.find((p) => p.uid === uid);
          return mon ? `${mon.speciesId}${mon.shiny ? 's' : ''}${mon.form ?? ''}` : '';
        })
        .join(',');
  const key = state ? `${state.battle.routeId}|${team}` : '';
  useEffect(() => {
    // Depois do que a tela atual está pedindo: o sprite em campo agora vem antes.
    if (!state) return;
    const id = setTimeout(() => warmImages(battleWarmList(state)), 300);
    return () => clearTimeout(id);
    // `state` muda a cada passo da batalha; só a rota e a equipe importam aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
