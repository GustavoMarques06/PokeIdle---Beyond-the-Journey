// Formas alternativas: sorteio ao aparecer, forma do Castform pelo clima e a coleção.

import { SEASONS, formSet, type Season } from '../game-data';
import type { Weather } from './env';
import type { Rng } from './rng';
import type { GameState } from './state';

/** Estação do ano, trocando todo mês (como em Black/White): jan primavera, fev verão… */
export function seasonAt(now: number): Season {
  return SEASONS[new Date(now).getMonth() % 4];
}

/** Forma de um Pokémon que acabou de aparecer ou nascer (undefined = sem formas). */
export function rollForm(speciesId: number, rng: Rng, now: number): string | undefined {
  const set = formSet(speciesId);
  if (!set) return undefined;
  switch (set.rule) {
    case 'random':
    case 'pattern':
      return set.forms[Math.floor(rng.next() * set.forms.length)];
    case 'season':
      return seasonAt(now);
    case 'weather':
      return 'normal';
  }
}

/** O Castform muda de forma com o clima da batalha. */
export function castformForm(weather: Weather): string {
  return weather === 'sun' ? 'sunny' : weather === 'rain' ? 'rainy' : weather === 'hail' ? 'snowy' : 'normal';
}

/** Forma exibida em batalha: a guardada ou, no Castform, a do clima. */
export function battleForm(
  speciesId: number,
  form: string | undefined,
  weather: Weather,
): string | undefined {
  return formSet(speciesId)?.rule === 'weather' ? castformForm(weather) : form;
}

/**
 * Pokémon que chegou fora de batalha (expedição, ovo, prêmio): sorteia a forma e a registra na coleção. Sem isso o
 * Unown das ruínas vinha sem letra e a conquista das 28 formas não tinha como ser feita.
 */
export function giveForm(
  state: GameState,
  p: { speciesId: number; form?: string },
  rng: Rng,
  now: number,
): void {
  if (p.form || formSet(p.speciesId)?.rule === 'weather') return;
  const form = rollForm(p.speciesId, rng, now);
  if (!form) return;
  p.form = form;
  recordForm(state, p.speciesId, form);
}

/** Registra a forma na coleção. Devolve true se era nova. */
export function recordForm(state: GameState, speciesId: number, form: string | undefined): boolean {
  if (!form || !formSet(speciesId)) return false;
  const list = (state.forms[speciesId] ??= []);
  if (list.includes(form)) return false;
  list.push(form);
  return true;
}

export function formsCaught(state: GameState, speciesId: number): string[] {
  return state.forms[speciesId] ?? [];
}
