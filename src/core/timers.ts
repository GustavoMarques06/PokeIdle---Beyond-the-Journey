// Cronômetros de tempo real: ambiente, ovos, berries, expedições, fósseis, errantes,
// Equipe Rocket, raides, mercador, missões, regras de automação e a volta da equipe depois
// de um desafio. Chamado pelo motor a cada segundo e ao carregar o save.

import { automationTick } from './automation';
import { daycareTime, hatchReadyEggs } from './daycare';
import { environmentAt } from './env';
import { updateRoamer, updateRocket } from './events';
import { expeditionDone } from './expeditions';
import { fossilTimers } from './fossils';
import { updateLegends } from './legendary';
import { gardenTimers } from './garden';
import { sampleHistory } from './history';
import type { GameEvent, GameState } from './game';
import { companionTick } from './companion';
import { updateMerchant } from './market';
import { refreshSeason } from './tournament';
import { refreshMissions } from './missions';
import { restoreAfterChallenge } from './presets';
import { updateRaid } from './raids';
import { rngFrom } from './rng';
import { trainingTick } from './training';

export function updateTimers(state: GameState, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  const elapsed = now - state.lastTimerAt;
  // Relógio voltou: não desconta nada, só reancora.
  if (elapsed > 0) daycareTime(state, elapsed);
  state.lastTimerAt = now;

  const env = environmentAt(now);
  if (env.weather !== state.env.weather) events.push({ type: 'weatherChanged', weather: env.weather });
  state.env = env;

  hatchReadyEggs(state, now, events);
  gardenTimers(state, now, events);
  fossilTimers(state, now, events);
  for (const run of state.expeditions) {
    if (!run.notified && expeditionDone(run, now)) {
      run.notified = true;
      events.push({ type: 'expeditionDone', id: run.id });
    }
  }
  const rng = rngFrom(state);
  updateRoamer(state, now, rng, events);
  updateRocket(state, now, rng, events);
  updateRaid(state, now, rng, events);
  updateLegends(state, now, events);
  updateMerchant(state, now, rng, events);
  companionTick(state, now, rng, events);
  refreshSeason(state, now);
  trainingTick(state, now, events);
  refreshMissions(state, now, events);
  automationTick(state, now, events);
  restoreAfterChallenge(state);
  sampleHistory(state, now);
  return events;
}
