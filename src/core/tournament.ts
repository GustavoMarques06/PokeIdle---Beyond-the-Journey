// Torneio semanal: chave de 8 treinadores (os chefes já vencidos) em quartas, semi e final,
// cada partida em melhor de três. Um torneio por semana; o resultado entra no ranking.

import { BALANCE, RAID_LOOT, ROUTES, getRoute, type TrainerOutfit } from '../game-data';
import { giveItems, routeDone } from './collection';
import { progressMission } from './missions';
import { weekOf } from './records';
import { pickWeighted, rngFrom } from './rng';
import { applyChallengePreset } from './presets';
import { bossLook } from './rival';
import { healTeam } from './team';
import {
  freshBattle,
  resolveBossTeam,
  type BattleState,
  type GameEvent,
  type GameState,
  type TournamentPlace,
} from './state';

export interface TournamentEntrant {
  name: string;
  sprite: string;
  /** Roupa do jogador (os chefes usam o sprite original). */
  outfit?: TrainerOutfit;
  /** Rota do chefe (de onde vem o time). Vazio = o jogador. */
  routeId: string;
}

export interface TournamentState {
  /** Semana do torneio atual (weekOf). */
  season: number;
  /** Chave: 0 é o jogador; 1 nas quartas, 2–3 na semi e 4–7 na final. */
  bracket: TournamentEntrant[] | null;
  /** Índices (na chave) de quem o jogador enfrenta em cada fase. */
  opponents: number[];
  round: number;
  /** Vitórias e derrotas na partida atual. */
  score: [number, number];
  place: TournamentPlace | null;
  history: { season: number; place: TournamentPlace }[];
  /** Rivais: o seu placar de partidas contra cada adversário (nome → vitórias e derrotas suas). */
  rivals?: Record<string, RivalRecord>;
}

export interface RivalRecord {
  sprite: string;
  wins: number;
  losses: number;
}

/** Cada partida que você venceu contra o mesmo rival o deixa 2 níveis mais forte na próxima (até +6). */
const RIVAL_LEVELS = 2;
const RIVAL_MAX = 6;

/** O que o rival diz ao reencontrar você (nada no primeiro encontro). */
export function rivalLine(r: RivalRecord | undefined): string | undefined {
  if (!r || r.wins + r.losses === 0) return undefined;
  if (r.wins > r.losses) return `De novo você! Treinei muito desde a última vez (${r.losses}–${r.wins}). Hoje é a minha vez!`;
  if (r.losses > r.wins) return `Ainda lembra da última vez? Eu lembro bem (${r.losses}–${r.wins} pra mim)!`;
  return `Empatados (${r.wins}–${r.losses})… Hoje a gente desempata!`;
}

export const ROUND_NAMES = ['Quartas de final', 'Semifinal', 'Final'];

/** Patrocinador da semana: o prêmio extra que o campeão leva (muda toda semana). */
export const SPONSORS: { name: string; item: string; qty: number }[] = [
  { name: 'Silph Co.', item: 'ultra-ball', qty: 10 },
  { name: 'Devon Corp.', item: 'rare-candy', qty: 3 },
  { name: 'Clube dos Criadores', item: 'lum-berry', qty: 3 },
  { name: 'Joalheria de Celadon', item: 'star-piece', qty: 2 },
  { name: 'Mina de Oreburgh', item: 'nugget', qty: 3 },
  { name: 'Liga Pokémon', item: 'master-ball', qty: 1 },
];

export const sponsorOf = (season: number) => SPONSORS[((season % SPONSORS.length) + SPONSORS.length) % SPONSORS.length];
const PLACE_BY_ROUND: TournamentPlace[] = ['quarter', 'semi', 'final'];

export function emptyTournament(): TournamentState {
  return { season: 0, bracket: null, opponents: [], round: 0, score: [0, 0], place: null, history: [] };
}

export function tournamentUnlocked(state: GameState): boolean {
  return routeDone(state, BALANCE.tournament.unlock);
}

/** Chefes que podem entrar na chave: os já vencidos. */
function eligible(state: GameState): string[] {
  return ROUTES.filter((r) => r.boss && state.routes[r.id]?.bossDefeated).map((r) => r.id);
}

/** Nova semana: zera a chave (o histórico fica). */
export function refreshSeason(state: GameState, now: number): void {
  const season = weekOf(now);
  if (state.tournament.season === season) return;
  state.tournament = {
    ...emptyTournament(),
    season,
    history: state.tournament.history,
    ...(state.tournament.rivals ? { rivals: state.tournament.rivals } : {}),
  };
}

export function canPlayTournament(state: GameState, now: number): boolean {
  const t = state.tournament;
  const sameSeason = t.season === weekOf(now);
  return (
    tournamentUnlocked(state) &&
    state.battle.kind === 'wild' &&
    eligible(state).length >= 7 &&
    !(sameSeason && t.place !== null)
  );
}

function buildBracket(state: GameState): void {
  const rng = rngFrom(state);
  const pool = eligible(state);
  const picked: string[] = [];
  while (picked.length < 7) picked.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  // Um rival conhecido entra logo nas quartas, se estiver entre os chefes possíveis.
  const rivals = state.tournament.rivals ?? {};
  const known = picked
    .map((id, i) => ({ i, name: bossLook(state, getRoute(id).boss!).name }))
    .filter((x) => rivals[x.name])
    .sort((a, b) => rivals[b.name].wins + rivals[b.name].losses - (rivals[a.name].wins + rivals[a.name].losses))[0];
  if (known && known.i !== 0) [picked[0], picked[known.i]] = [picked[known.i], picked[0]];
  const entrants: TournamentEntrant[] = [
    { name: state.trainerName, sprite: state.trainerAvatar, outfit: state.trainerOutfit, routeId: '' },
    ...picked.map((id) => {
      const b = bossLook(state, getRoute(id).boss!);
      return { name: b.name, sprite: b.trainer, routeId: id };
    }),
  ];
  // Os outros jogos da chave são decididos por sorteio (só para mostrar a chave).
  const winner = (a: number, b: number) => (rng.next() < 0.5 ? a : b);
  const semi = winner(2, 3);
  const final = winner(winner(4, 5), winner(6, 7));
  state.tournament.bracket = entrants;
  state.tournament.opponents = [1, semi, final];
}

/** A batalha contra o adversário da fase atual. */
export function tournamentBattle(state: GameState): BattleState {
  const t = state.tournament;
  const foe = t.bracket![t.opponents[t.round]];
  const boss = getRoute(foe.routeId).boss!;
  const rival = t.rivals?.[foe.name];
  const extra =
    t.round * BALANCE.tournament.levelsPerRound + Math.min(RIVAL_MAX, (rival?.wins ?? 0) * RIVAL_LEVELS);
  const team = resolveBossTeam(state, boss, true).map((m) => ({
    ...m,
    level: Math.min(BALANCE.maxLevel, m.level + extra),
  }));
  return {
    ...freshBattle(state.currentRouteId),
    kind: 'tournament',
    team,
    trainer: {
      sprite: foe.sprite,
      outfit: foe.outfit,
      name: foe.name,
      title: `${rival ? 'Rival' : 'Torneio'} · ${ROUND_NAMES[t.round]} (${t.score[0]}–${t.score[1]})`,
      // A fala do rival só na primeira batalha da partida.
      ...(t.score[0] + t.score[1] === 0 && rivalLine(rival) ? { line: rivalLine(rival) } : {}),
    },
  };
}

/** Entra no torneio da semana (ou retoma a partida em andamento). */
export function playTournament(state: GameState, now: number): boolean {
  refreshSeason(state, now);
  if (!canPlayTournament(state, now)) return false;
  if (!state.tournament.bracket) buildBracket(state);
  applyChallengePreset(state, 'tournament');
  healTeam(state);
  state.battle = tournamentBattle(state);
  return true;
}

function finish(state: GameState, place: TournamentPlace, events: GameEvent[]): void {
  const t = state.tournament;
  t.place = place;
  t.history = [{ season: t.season, place }, ...t.history].slice(0, 12);
  if (place === 'champion') {
    state.stats.tournamentTitles++;
    const rng = rngFrom(state);
    for (let i = 0; i < BALANCE.tournament.championLoot; i++)
      giveItems(state, pickWeighted(rng, RAID_LOOT).items);
    const sponsor = sponsorOf(t.season);
    giveItems(state, { [sponsor.item]: sponsor.qty });
  }
  events.push({ type: 'tournamentEnded', place });
}

/** O jogador venceu a batalha (o time inteiro do adversário). */
export function tournamentWon(state: GameState, events: GameEvent[]): void {
  const t = state.tournament;
  const routeId = state.battle.routeId;
  t.score[0]++;
  healTeam(state);
  if (t.score[0] < 2) {
    state.battle = {
      ...tournamentBattle(state),
      phase: 'victory',
      phaseMs: BALANCE.combat.victoryDelayMs * 2,
    };
    return;
  }
  recordRival(state, true);
  const coins = BALANCE.tournament.coinsPerRound[t.round];
  state.coins += coins;
  state.stats.coinsEarned += coins;
  progressMission(state, 'bosses', 1, events);
  events.push({
    type: 'tournamentMatch',
    round: t.round,
    opponent: t.bracket![t.opponents[t.round]].name,
    won: true,
    score: [...t.score],
    coins,
  });
  t.round++;
  t.score = [0, 0];
  if (t.round >= ROUND_NAMES.length) {
    finish(state, 'champion', events);
    state.battle = { ...freshBattle(routeId), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
    return;
  }
  state.battle = { ...tournamentBattle(state), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs * 2 };
}

/** O jogador perdeu a batalha (ou desistiu: `forfeit` encerra a partida na hora). */
export function tournamentLost(state: GameState, events: GameEvent[], forfeit = false): void {
  const t = state.tournament;
  const routeId = state.battle.routeId;
  t.score[1] = forfeit ? 2 : t.score[1] + 1;
  healTeam(state);
  if (t.score[1] < 2) {
    state.battle = tournamentBattle(state);
    return;
  }
  recordRival(state, false);
  events.push({
    type: 'tournamentMatch',
    round: t.round,
    opponent: t.bracket![t.opponents[t.round]].name,
    won: false,
    score: [...t.score],
    coins: 0,
  });
  finish(state, PLACE_BY_ROUND[t.round], events);
  state.battle = freshBattle(routeId);
}

/** Anota o resultado da partida contra o adversário atual no placar de rivais. */
function recordRival(state: GameState, won: boolean): void {
  const t = state.tournament;
  const foe = t.bracket?.[t.opponents[t.round]];
  if (!foe) return;
  const r = ((t.rivals ??= {})[foe.name] ??= { sprite: foe.sprite, wins: 0, losses: 0 });
  if (won) r.wins++;
  else r.losses++;
}

/** Melhor colocação já alcançada (para o ranking). */
export function bestPlace(state: GameState): TournamentPlace | null {
  const order: TournamentPlace[] = ['champion', 'final', 'semi', 'quarter'];
  const places = new Set(state.tournament.history.map((h) => h.place));
  return order.find((p) => places.has(p)) ?? null;
}
