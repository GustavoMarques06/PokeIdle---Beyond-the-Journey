// Estado ao vivo de cada atividade, para a grade de ATIVIDADES: uma linha curta embaixo do ícone ("2 ovos prontos",
// "Fóssil 1h20", "RAIDE! 12 min") e o tom dela (pronta para pegar, em andamento, acontecendo agora ou parada).

import { LEGENDARIES } from '../../../game-data';
import { daycareCompatible, daycarePokemon, eggReady } from '../../../core/daycare';
import { expeditionDone } from '../../../core/expeditions';
import type { GameState } from '../../../core/game';
import { plotReady } from '../../../core/garden';
import { legendaryStatus, rumorOf } from '../../../core/legendary';
import { guideDone } from '../../../core/safari';
import { canPlayTournament } from '../../../core/tournament';
import { speciesName } from '../../i18n/pt-BR';
import { tabOpen, type Tab } from './tabs';

export type StatusTone = 'ready' | 'live' | 'busy' | 'idle';
export interface ActivityStatus {
  text: string;
  tone: StatusTone;
}

/** "45 s", "12 min", "1h20", "2 d". */
export function shortTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h >= 48) return `${Math.floor(h / 24)} d`;
  const rest = m % 60;
  return rest ? `${h}h${String(rest).padStart(2, '0')}` : `${h} h`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function activityStatus(state: GameState, tab: Tab, now: number): ActivityStatus | null {
  if (!tabOpen(state, tab)) return null;
  switch (tab) {
    case 'daycare': {
      const ready = state.eggs.filter(eggReady).length;
      if (ready) return { text: plural(ready, 'ovo pronto!', 'ovos prontos!'), tone: 'ready' };
      const guests = daycarePokemon(state).length;
      if (guests === 2 && daycareCompatible(state))
        return { text: `♥ casal · ${state.eggs.length} ovos`, tone: 'busy' };
      if (state.eggs.length) return { text: plural(state.eggs.length, 'ovo', 'ovos'), tone: 'busy' };
      return { text: guests ? '1 hóspede' : 'vazia', tone: 'idle' };
    }
    case 'expeditions': {
      const done = state.expeditions.filter((r) => expeditionDone(r, now)).length;
      if (done) return { text: plural(done, 'voltou!', 'voltaram!'), tone: 'ready' };
      if (!state.expeditions.length) return { text: 'ninguém fora', tone: 'idle' };
      const next = Math.min(...state.expeditions.map((r) => r.endsAt));
      return { text: `${state.expeditions.length} fora · ${shortTime(next - now)}`, tone: 'busy' };
    }
    case 'garden': {
      const plots = state.garden.filter((p) => !!p);
      const ready = plots.filter((p) => plotReady(p, now)).length;
      if (ready) return { text: plural(ready, 'madura!', 'maduras!'), tone: 'ready' };
      if (!plots.length) return { text: 'plantar', tone: 'idle' };
      const next = Math.min(...plots.map((p) => p!.readyAt));
      return { text: `cresce · ${shortTime(next - now)}`, tone: 'busy' };
    }
    case 'fossils': {
      if (!state.fossils.length) return { text: 'máquina livre', tone: 'idle' };
      if (state.fossils.some((f) => now >= f.readyAt)) return { text: 'reviveu!', tone: 'ready' };
      return { text: shortTime(Math.min(...state.fossils.map((f) => f.readyAt)) - now), tone: 'busy' };
    }
    case 'training': {
      const n = state.training.slots.length;
      return n
        ? { text: plural(n, 'treinando', 'treinando'), tone: 'busy' }
        : { text: 'vagas livres', tone: 'idle' };
    }
    case 'raids':
      if (state.raid && state.raid.until > now)
        return { text: `RAIDE! ${shortTime(state.raid.until - now)}`, tone: 'live' };
      return state.nextRaidAt > now
        ? { text: `próxima ${shortTime(state.nextRaidAt - now)}`, tone: 'idle' }
        : { text: 'a qualquer hora', tone: 'idle' };
    case 'hunt': {
      const h = state.hunt;
      if (!h.target) return { text: 'sem alvo', tone: 'idle' };
      return { text: `${speciesName(h.target)} ×${h.chain}`, tone: 'busy' };
    }
    case 'legendary': {
      const ready = LEGENDARIES.filter((l) => legendaryStatus(state, l, now) === 'ready').length;
      const rumor = rumorOf(state, now);
      if (ready) return { text: plural(ready, 'por aí!', 'por aí!'), tone: 'live' };
      if (rumor) return { text: `boato: ${speciesName(rumor)}`, tone: 'busy' };
      return { text: 'à espreita', tone: 'idle' };
    }
    case 'tower': {
      const t = state.tower;
      if (t.floor) return { text: `subindo · andar ${t.floor}`, tone: 'live' };
      return { text: t.best ? `recorde ${t.best}` : 'suba!', tone: 'idle' };
    }
    case 'tournament': {
      const t = state.tournament;
      if (t.bracket && t.place === null)
        return { text: `em jogo · ${['quartas', 'semi', 'final'][t.round] ?? ''}`, tone: 'live' };
      if (canPlayTournament(state, now)) return { text: 'inscrições!', tone: 'ready' };
      return t.place === 'champion'
        ? { text: '🏆 campeão', tone: 'idle' }
        : { text: 'semana que vem', tone: 'idle' };
    }
    case 'safari': {
      if (state.safari) return { text: `visita · ${state.safari.balls} bolas`, tone: 'live' };
      const g = state.safariProgress?.guide;
      if (g)
        return guideDone(g, now)
          ? { text: 'Guia voltou!', tone: 'ready' }
          : { text: `Guia ${shortTime(g.endsAt - now)}`, tone: 'busy' };
      return { text: 'entrar', tone: 'idle' };
    }
    case 'gamecorner':
      return { text: `${state.tokens} fichas`, tone: state.tokens > 0 ? 'busy' : 'idle' };
    default:
      return null;
  }
}
