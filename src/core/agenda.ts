// Próximos passos: com tantas coisas rodando ao mesmo tempo, uma lista curta do que vale a
// pena fazer agora, da mais urgente à menos. Cada sugestão diz para onde ir e, quando dá, traz
// uma ação de um clique (desafiar o chefe, colher o jardim…). Só consulta o estado.

import { BALANCE, LEGENDARIES, ROUTES, getRoute, getSpecies } from '../game-data';
import { combatScales, computeModifiers } from './bonuses';
import { activityUnlocked, busyUids } from './collection';
import { attackInterval, chooseMove, combatantOf, expectedDamage, type Combatant } from './combat';
import { claimableMilestones } from './dex';
import { expeditionDone, expeditionSlots } from './expeditions';
import { guideDone } from './safari';
import { plotReady, gardenPlots } from './garden';
import { legendaryStatus } from './legendary';
import { linkUnlocked } from './link';
import { claimableMissions } from './missions';
import { statsOf } from './pokemon';
import { canRematch } from './rematch';
import { activePokemon, canChallengeBoss, resolveBossTeam, type GameState, type TeamMember } from './state';
import { bossLook } from './rival';
import { reservePokemon, reserveSlotsUnlocked } from './team';
import { canPlayTournament } from './tournament';
import { towerUnlocked, weeklyRule } from './tower';
import { trainingSlotsUnlocked } from './training';

/** Telas e abas do jogo (os nomes da interface, sem depender dela). */
export type StepTarget =
  | { screen: 'party' | 'dex' | 'bag' | 'shop' | 'map' | 'missions' | 'trainer' | 'upgrades' | 'pc' }
  | { screen: 'activities'; tab: string };

export type StepAction =
  | { kind: 'boss'; routeId: string }
  | { kind: 'rematch'; routeId: string }
  | { kind: 'raid' }
  | { kind: 'rocket' }
  | { kind: 'route'; routeId: string }
  | { kind: 'harvest' }
  | { kind: 'claimMissions' };

export interface NextStep {
  id: string;
  /** Maior = mais urgente. */
  priority: number;
  text: string;
  detail?: string;
  target?: StepTarget;
  action?: StepAction;
  /** Ícone (id de item) ou nome de ícone em pixel art. */
  icon: { item: string } | { pixel: string };
}

export type Odds = 'alta' | 'média' | 'baixa' | 'muito baixa';

/**
 * Estimativa rápida de uma luta de equipe contra equipe: cada lado bate com o golpe de maior dano
 * esperado, na sua velocidade, até um dos dois ficar sem Pokémon. Não considera status,
 * habilidades de efeito nem itens de cura: serve para orientar, não para prever.
 */
export function teamOdds(state: GameState, foes: TeamMember[]): { odds: Odds; win: boolean } {
  const mods = computeModifiers(state);
  const mine = [activePokemon(state), ...reservePokemon(state)].map((p) => ({
    c: combatantOf(p, mods.playerMoveBoost),
    hp: statsOf(p).hp,
  }));
  const theirs = foes.map((m) => {
    const c = combatantOf(
      { ...m, ivs: m.ivs ?? { hp: 20, atk: 20, def: 20, spAtk: 20, spDef: 20, spe: 20 } },
      mods.enemyMoveBoost,
    );
    return { c, hp: c.stats.hp };
  });
  const dps = (a: Combatant, b: Combatant, scale: number, interval: number) =>
    expectedDamage(a, b, chooseMove(a, b), scale) / (attackInterval(a.stats.spe, b.stats.spe) * interval);
  const myTotal = mine.reduce((s, x) => s + x.hp, 0);
  const foeTotal = theirs.reduce((s, x) => s + x.hp, 0);
  let i = 0;
  let j = 0;
  while (i < mine.length && j < theirs.length) {
    const me = mine[i];
    const foe = theirs[j];
    const scales = combatScales(mods, foe.c.types);
    const myDps = dps(me.c, foe.c, scales.playerDamage, scales.playerInterval);
    const foeDps = dps(foe.c, me.c, scales.enemyDamage, 1);
    const toKill = myDps > 0 ? foe.hp / myDps : Infinity;
    const toDie = foeDps > 0 ? me.hp / foeDps : Infinity;
    if (!Number.isFinite(toKill) && !Number.isFinite(toDie)) break;
    if (toKill <= toDie) {
      me.hp -= foeDps * toKill;
      j++;
    } else {
      foe.hp -= myDps * toDie;
      i++;
    }
  }
  const win = j >= theirs.length;
  if (win) {
    const left = mine.slice(i).reduce((s, x) => s + Math.max(0, x.hp), 0) / myTotal;
    return { win, odds: left >= 0.4 ? 'alta' : 'média' };
  }
  const foeLeft = theirs.slice(j).reduce((s, x) => s + Math.max(0, x.hp), 0) / foeTotal;
  return { win, odds: foeLeft <= 0.3 ? 'baixa' : 'muito baixa' };
}

const ODDS_TEXT: Record<Odds, string> = {
  alta: 'chance alta',
  média: 'chance média',
  baixa: 'chance baixa: treine mais um pouco',
  'muito baixa': 'chance muito baixa: treine ou mude a equipe',
};

export function nextSteps(state: GameState, now: number): NextStep[] {
  const out: NextStep[] = [];
  const add = (s: NextStep) => out.push(s);
  const wild = state.battle.kind === 'wild';
  const here = getRoute(state.currentRouteId);

  // --- Coisas prontas esperando o jogador -------------------------------------------------
  const evolving = state.collection.filter((p) => p.pendingEvolution).length;
  if (evolving) {
    add({
      id: 'evolution',
      priority: 100,
      text: evolving > 1 ? `${evolving} Pokémon prontos para evoluir` : 'Um Pokémon está pronto para evoluir',
      target: { screen: 'party' },
      icon: { pixel: 'star' },
    });
  }
  const missions = claimableMissions(state);
  if (missions) {
    add({
      id: 'missions',
      priority: 95,
      text: missions > 1 ? `${missions} missões para resgatar` : 'Uma missão para resgatar',
      target: { screen: 'missions' },
      action: { kind: 'claimMissions' },
      icon: { item: 'fame-checker' },
    });
  }
  const doneRuns = state.expeditions.filter((r) => expeditionDone(r, now)).length;
  if (doneRuns) {
    add({
      id: 'expeditions-done',
      priority: 90,
      text: doneRuns > 1 ? `${doneRuns} expedições voltaram` : 'Uma expedição voltou',
      detail: 'Resgate o que trouxeram',
      target: { screen: 'activities', tab: 'expeditions' },
      icon: { item: 'explorer-kit' },
    });
  }
  const guide = state.safariProgress?.guide;
  if (guide && guideDone(guide, now)) {
    add({
      id: 'safari-guide',
      priority: 88,
      text: 'O Guia do Safari voltou',
      detail: 'Receba as capturas dele',
      target: { screen: 'activities', tab: 'safari' },
      icon: { item: 'safari-ball' },
    });
  }
  if (state.fossils.some((f) => now >= f.readyAt)) {
    add({
      id: 'fossil',
      priority: 90,
      text: 'Um fóssil reviveu',
      target: { screen: 'activities', tab: 'fossils' },
      icon: { item: 'helix-fossil' },
    });
  }
  const ripe = state.garden.filter((p) => plotReady(p, now)).length;
  if (ripe) {
    add({
      id: 'garden',
      priority: 88,
      text: ripe > 1 ? `${ripe} canteiros prontos para colher` : 'Um canteiro pronto para colher',
      target: { screen: 'activities', tab: 'garden' },
      action: { kind: 'harvest' },
      icon: { item: 'oran-berry' },
    });
  }

  // --- Eventos com hora para acabar ----------------------------------------------------------
  if (state.raid && wild) {
    add({
      id: 'raid',
      priority: 86,
      text: `Raide: ${getSpecies(state.raid.speciesId).name} gigante apareceu`,
      detail: `em ${getRoute(state.raid.routeId).name}`,
      action: { kind: 'raid' },
      target: { screen: 'activities', tab: 'raids' },
      icon: { item: 'dynamax-band' },
    });
  }
  if (state.rocket && wild) {
    add({
      id: 'rocket',
      priority: 85,
      text: 'A Equipe Rocket está aprontando',
      detail: `em ${getRoute(state.rocket.routeId).name}`,
      action: { kind: 'rocket' },
      icon: { pixel: 'boss' },
    });
  }
  if (state.roamer && state.roamer.routeId !== state.currentRouteId && wild) {
    add({
      id: 'roamer',
      priority: 84,
      text: `${getSpecies(state.roamer.speciesId).name} errante foi visto`,
      detail: `em ${getRoute(state.roamer.routeId).name}`,
      action: { kind: 'route', routeId: state.roamer.routeId },
      icon: { item: 'ultra-ball' },
    });
  }
  if (state.merchant && state.merchant.until > now) {
    add({
      id: 'merchant',
      priority: 75,
      text: 'Mercador viajante com ofertas',
      target: { screen: 'shop' },
      icon: { item: 'coin-case' },
    });
  }

  // --- Campanha ------------------------------------------------------------------------------
  const bossRoute =
    (canChallengeBoss(state, here.id) && here) ||
    ROUTES.find((r) => r.id !== here.id && canChallengeBoss(state, r.id));
  if (bossRoute && wild) {
    const boss = bossRoute.boss!;
    const odds = teamOdds(state, resolveBossTeam(state, boss)).odds;
    const away = bossRoute.id !== here.id;
    add({
      id: 'boss',
      priority: odds === 'alta' || odds === 'média' ? 80 : 45,
      text: `Desafiar ${bossLook(state, boss).name}`,
      detail: `${away ? `em ${bossRoute.name} · ` : ''}${ODDS_TEXT[odds]}`,
      action: away ? { kind: 'route', routeId: bossRoute.id } : { kind: 'boss', routeId: bossRoute.id },
      icon: { item: 'relic-crown' },
    });
  } else if (here.boss && !state.routes[here.id].bossDefeated) {
    const left = here.killsRequired - state.routes[here.id].kills;
    if (left > 0) {
      add({
        id: 'boss-progress',
        priority: 20,
        text: `Faltam ${left} vitórias para desafiar ${bossLook(state, here.boss).name}`,
        icon: { item: 'relic-crown' },
      });
    }
  }
  if (wild && here.boss && canRematch(state, here.id, now)) {
    add({
      id: 'rematch',
      priority: 55,
      text: `Revanche contra ${bossLook(state, here.boss).name} disponível`,
      detail: 'moedas e itens raros',
      action: { kind: 'rematch', routeId: here.id },
      icon: { item: 'vs-seeker' },
    });
  }
  // Só sugere os que ainda faltam: repetir um lendário é escolha do jogador.
  const legend = LEGENDARIES.find(
    (d) => !state.legends.caught.includes(d.speciesId) && legendaryStatus(state, d, now) === 'ready',
  );
  if (legend) {
    add({
      id: 'legendary',
      priority: 70,
      text: `${getSpecies(legend.speciesId).name} pode ser enfrentado`,
      target: { screen: 'activities', tab: 'legendary' },
      icon: { item: 'master-ball' },
    });
  }
  if (canPlayTournament(state, now)) {
    add({
      id: 'tournament',
      priority: 68,
      text: state.tournament.bracket ? 'Continue o torneio da semana' : 'O torneio da semana está aberto',
      target: { screen: 'activities', tab: 'tournament' },
      icon: { item: 'relic-crown' },
    });
  }
  if (towerUnlocked(state) && state.tower.weekly.week !== weeklyRule(now).week) {
    add({
      id: 'weekly-tower',
      priority: 62,
      text: 'Torre semanal nova',
      detail: 'regra nova e andares iguais para todos',
      target: { screen: 'activities', tab: 'tower' },
      icon: { item: 'rainbow-pass' },
    });
  }
  const milestones = claimableMilestones(state);
  if (milestones) {
    add({
      id: 'dex',
      priority: 60,
      text:
        milestones > 1
          ? `${milestones} marcos da Pokédex para resgatar`
          : 'Um marco da Pokédex para resgatar',
      target: { screen: 'dex' },
      icon: { pixel: 'pokedex' },
    });
  }

  // --- Espaços parados -------------------------------------------------------------------------
  const busy = busyUids(state);
  const free = state.collection.filter((p) => !busy.has(p.uid)).length;
  if (activityUnlocked(state, 'daycare') && state.daycare.uids.length < BALANCE.daycare.slots && free >= 1) {
    add({
      id: 'daycare',
      priority: 50,
      text: 'A creche está com vaga',
      detail: 'dois Pokémon compatíveis geram ovos',
      target: { screen: 'activities', tab: 'daycare' },
      icon: { item: 'mystery-egg' },
    });
  }
  if (expeditionSlots(state) > state.expeditions.length && free >= 1) {
    add({
      id: 'expeditions',
      priority: 50,
      text: 'Há vaga para uma expedição',
      target: { screen: 'activities', tab: 'expeditions' },
      icon: { item: 'explorer-kit' },
    });
  }
  const emptyPlots = Array.from({ length: gardenPlots(state) }, (_, i) => state.garden[i]).filter(
    (p) => !p,
  ).length;
  const seeds = Object.entries(state.items).some(([id, n]) => n > 0 && id.endsWith('-berry'));
  if (emptyPlots && seeds) {
    add({
      id: 'garden-empty',
      priority: 48,
      text: emptyPlots > 1 ? `${emptyPlots} canteiros vazios` : 'Um canteiro vazio',
      detail: 'plante uma berry',
      target: { screen: 'activities', tab: 'garden' },
      icon: { item: 'oran-berry' },
    });
  }
  const openSlots = reserveSlotsUnlocked(state) - reservePokemon(state).length;
  if (openSlots > 0 && free >= 1) {
    add({
      id: 'team',
      priority: 46,
      text: openSlots > 1 ? `${openSlots} vagas livres na equipe` : 'Uma vaga livre na equipe',
      detail: 'mais Pokémon: mais bônus e quem entre se o 1º desmaiar',
      target: { screen: 'party' },
      icon: { item: 'poke-ball' },
    });
  }
  if (trainingSlotsUnlocked(state) > state.training.slots.length && free >= 1) {
    add({
      id: 'training',
      priority: 40,
      text: 'Há vaga no Campo de Treino',
      target: { screen: 'activities', tab: 'training' },
      icon: { item: 'macho-brace' },
    });
  }
  if (linkUnlocked(state) && !state.link?.ghosts.length && !state.flags.includes('seen:duel')) {
    add({
      id: 'link',
      priority: 30,
      text: 'Cabo Link liberado',
      detail: 'troque Pokémon e duele com amigos por código',
      target: { screen: 'activities', tab: 'duel' },
      icon: { item: 'linking-cord' },
    });
  }

  // --- Pokédex da área -----------------------------------------------------------------------
  const missing = new Set(here.encounters.map((e) => e.speciesId).filter((id) => !state.pokedex[id]?.caught))
    .size;
  if (missing) {
    add({
      id: 'dex-route',
      priority: 15,
      text: `${missing} espécie${missing > 1 ? 's' : ''} desta área ainda não capturada${missing > 1 ? 's' : ''}`,
      detail: 'na batalha, MOCHILA → Poké Ball (ou tecla Q)',
      target: { screen: 'dex' },
      icon: { pixel: 'pokedex' },
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}
