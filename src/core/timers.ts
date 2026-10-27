// Cronômetros de tempo real: ambiente, ovos, berries, expedições, fósseis, errantes,
// Equipe Rocket e missões. Chamado pelo motor a cada segundo e ao carregar o save.

import { daycareTime, hatchReadyEggs } from './daycare';
import { environmentAt } from './env';
import { updateRoamer, updateRocket } from './events';
import { expeditionDone } from './expeditions';
import { fossilTimers } from './fossils';
import { gardenTimers } from './garden';
import { sampleHistory } from './history';
import type { GameEvent, GameState } from './game';
import { refreshMissions } from './missions';
import { rngFrom } from './rng';

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
  refreshMissions(state, now, events);
  sampleHistory(state, now);
  return events;
}
