// Regras de automação: o que a captura automática leva além das espécies novas e dos shinies,
// o que é um "bom exemplar", a transferência automática de repetidos, o jardim que se colhe e
// replanta sozinho e as missões resgatadas sozinhas. Tudo desligado por padrão, menos o que o
// jogo já fazia (capturar espécies novas, shinies e errantes).

import { BALANCE, NATURES, abilitiesOf } from '../game-data';
import { busyUids } from './collection';
import { harvest, plantBerry, plotReady } from './garden';
import type { GameEvent, GameState } from './game';
import { claimMission, type MissionScope } from './missions';
import { surplusDuplicates, transferPokemon } from './meta';
import { defaultAbilitySlot, isPerfect, natureFor, potential, type PokemonInstance } from './pokemon';
import type { EnemyState } from './state';
import type { Ivs } from './stats';

export interface AutomationRules {
  /** Capturar formas que faltam (Unown, Deerling, Spinda…). */
  catchForms: boolean;
  /** Capturar repetidos que são bons exemplares (pelos critérios abaixo). */
  catchKeepers: boolean;
  /** Capturar tudo com Poké Balls comuns (os repetidos viram pontos de pesquisa). */
  catchAll: boolean;
  /** Bom exemplar: potencial mínimo (0 = não olha), habilidade oculta e naturezas. */
  minPotential: number;
  hiddenAbility: boolean;
  natures: string[];
  /** Transferir os repetidos que sobram e não são bons exemplares. */
  autoTransfer: boolean;
  /** Colher o jardim quando fica pronto e replantar a mesma berry. */
  autoGarden: boolean;
  /** Resgatar missões concluídas. */
  autoClaim: boolean;
}

export const DEFAULT_AUTOMATION: AutomationRules = {
  catchForms: false,
  catchKeepers: false,
  catchAll: false,
  minPotential: 0,
  hiddenAbility: false,
  natures: [],
  autoTransfer: false,
  autoGarden: false,
  autoClaim: false,
};

export function automationOf(state: GameState): AutomationRules {
  return { ...DEFAULT_AUTOMATION, ...state.automation };
}

export function setAutomation(state: GameState, patch: Partial<AutomationRules>): void {
  const next = { ...automationOf(state), ...patch };
  next.natures = [...new Set(next.natures.filter((n) => NATURES.some((x) => x.id === n)))].slice(
    0,
    BALANCE.automation.maxNatures,
  );
  if (!BALANCE.automation.potentialSteps.includes(next.minPotential)) next.minPotential = 0;
  state.automation = next;
}

/** Há algum critério de bom exemplar ligado? */
export const hasKeeperCriteria = (r: AutomationRules) =>
  r.minPotential > 0 || r.hiddenAbility || r.natures.length > 0;

interface Candidate {
  ivs: Ivs;
  nature?: string;
  hidden: boolean;
}

/** Passa em todos os critérios ligados (sem critério nenhum, ninguém é bom exemplar). */
export function isKeeper(rules: AutomationRules, c: Candidate): boolean {
  if (!hasKeeperCriteria(rules)) return false;
  if (rules.minPotential > 0 && potential(c.ivs) < rules.minPotential) return false;
  if (rules.hiddenAbility && !c.hidden) return false;
  if (rules.natures.length && !(c.nature && rules.natures.includes(c.nature))) return false;
  return true;
}

export const keeperPokemon = (rules: AutomationRules, p: PokemonInstance) =>
  isKeeper(rules, {
    ivs: p.ivs,
    nature: p.nature,
    hidden: (p.abilitySlot ?? defaultAbilitySlot(p.uid, p.ivs, p.speciesId)) === 2,
  });

/**
 * O selvagem como ele seria se fosse capturado agora: a natureza e a habilidade saem do uid
 * que ele vai receber (o próximo da coleção) e dos IVs, então dá para saber antes de lançar.
 */
export function previewCapture(state: GameState, enemy: EnemyState): Candidate {
  const uid = state.nextUid;
  const hasHidden = !!abilitiesOf(enemy.speciesId)[2];
  return {
    ivs: enemy.ivs,
    nature: natureFor(uid, enemy.ivs),
    hidden: hasHidden && defaultAbilitySlot(uid, enemy.ivs, enemy.speciesId) === 2,
  };
}

export type CaptureReason = 'new' | 'shiny' | 'form' | 'keeper' | 'all';

/** Por que a captura automática levaria este selvagem (null = deixa passar). */
export function captureReason(state: GameState, enemy: EnemyState): CaptureReason | null {
  if (!state.pokedex[enemy.speciesId]?.caught) return 'new';
  if (enemy.shiny || enemy.roamer) return 'shiny';
  const rules = automationOf(state);
  if (rules.catchForms && enemy.form && !state.forms[enemy.speciesId]?.includes(enemy.form)) return 'form';
  if (rules.catchKeepers && isKeeper(rules, previewCapture(state, enemy))) return 'keeper';
  if (rules.catchAll) return 'all';
  return null;
}

/**
 * Repetidos que a transferência automática levaria: os que sobram de cada espécie (o melhor
 * fica), menos os protegidos — favoritos, com etiqueta, shinies, perfeitos, bons exemplares,
 * com apelido, com golpes de ovo e os recebidos em trocas.
 */
export function autoTransferPlan(state: GameState): PokemonInstance[] {
  const rules = automationOf(state);
  const busy = busyUids(state);
  return surplusDuplicates(state).filter(
    (p) =>
      !busy.has(p.uid) &&
      !p.tag &&
      !p.nickname &&
      !p.eggMoves?.length &&
      !p.ot &&
      !isPerfect(p.ivs) &&
      !keeperPokemon(rules, p),
  );
}

/**
 * Aplica as regras que rodam sozinhas (chamado pelos cronômetros, a cada segundo). Devolve o
 * que foi feito para a interface avisar.
 */
export function automationTick(state: GameState, now: number, events: GameEvent[]): void {
  const rules = automationOf(state);
  if (rules.autoTransfer) {
    let count = 0;
    let points = 0;
    for (const p of autoTransferPlan(state)) {
      const got = transferPokemon(state, p.uid);
      if (got > 0) {
        count++;
        points += got;
      }
    }
    if (count) {
      state.stats.autoTransferred += count;
      events.push({ type: 'autoTransferred', count, points });
    }
  }
  if (rules.autoGarden) {
    for (let i = 0; i < state.garden.length; i++) {
      const plot = state.garden[i];
      if (!plot || !plotReady(plot, now)) continue;
      const berry = plot.berry;
      const qty = harvest(state, i, now, events);
      if (qty > 0)
        events.push({ type: 'autoHarvested', berry, qty, replanted: plantBerry(state, i, berry, now) });
    }
  }
  if (rules.autoClaim) {
    for (const scope of ['daily', 'weekly'] as MissionScope[]) {
      for (const m of state.missions[scope]) {
        if (!m.claimed && m.progress >= m.target && claimMission(state, scope, m.id)) {
          events.push({ type: 'autoClaimed', id: m.id });
        }
      }
    }
  }
}
