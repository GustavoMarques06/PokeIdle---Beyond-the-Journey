// O parceiro comenta a batalha: um balão de fala sobre o Pokémon do jogador, de vez em quando (a cada ~50 s) e
// na hora em momentos marcantes (shiny, HP baixo, subiu de nível, evolução, chefe). As falas mudam com o lugar,
// a hora e o clima. Fala o acompanhante, se houver; senão, quem está lutando.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getRoute } from '../../game-data';
import { activePokemon, type GameEvent, type GameState } from '../../core/game';
import { routeWeather } from '../../core/env';
import { pokemonName, statsOf } from '../../core/pokemon';
import { useEngine, useGameEvents } from '../useGame';

const IDLE_MS = 50_000;
const SHOW_MS = 3600;

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function idleLine(st: GameState): string {
  const route = getRoute(st.battle.routeId);
  const weather = routeWeather(route, st.env);
  const night = st.env.period === 'night';
  const p = activePokemon(st);
  const lines = ['Bora, mais um!', 'Tô pegando o jeito!', 'Essa rota é nossa!', 'Treino é treino!'];
  if (night) lines.push('Tô com soninho…', 'A noite é bonita aqui.');
  if (weather === 'rain') lines.push('Que chuva!', 'Tô ensopado…');
  if (weather === 'hail') lines.push('Brrr, que frio!');
  if (weather === 'sun') lines.push('Que sol forte!');
  if (weather === 'sand') lines.push('Areia no olho!');
  if (['cave', 'dampcave', 'icecave'].includes(route.scene)) lines.push('Que escuro aqui…', 'Ouviu esse eco?');
  if (route.scene === 'beach' || route.scene === 'river') lines.push('Cheiro de mar!', 'Bora nadar depois?');
  if (p.level >= 100) lines.push('Nível 100, hein?');
  return pick(lines);
}

function eventLine(st: GameState, events: GameEvent[]): string | null {
  for (const e of events) {
    if (e.type === 'spawn' && e.shiny) return 'Olha! Ele brilha! Pega!';
    if (e.type === 'spawn' && e.boss && st.battle.bossIndex === 0) return pick(['Chegou a hora!', 'Vamos com tudo!']);
    if (e.type === 'evolved') return 'Olha só como eu fiquei!';
    if (e.type === 'levelUp' && e.uid === st.activeUid) return pick(['Tô mais forte!', 'Subi de nível!']);
    if (e.type === 'captured') return pick(['Bem-vindo à equipe!', 'Mais um amigo!']);
    if (e.type === 'attack' && e.side === 'enemy' && !e.result.missed) {
      const p = activePokemon(st);
      if (p.currentHp > 0 && p.currentHp / statsOf(p).hp < 0.25) return pick(['Ai… essa doeu!', 'Aguenta firme!']);
    }
    if (e.type === 'attack' && e.side === 'player' && e.result.crit) return 'Na mosca!';
  }
  return null;
}

export function PartnerQuip({ state, x, y }: { state: GameState; x: number; y: number }) {
  const engine = useEngine();
  const [quip, setQuip] = useState<{ id: number; text: string; who: string } | null>(null);
  const n = useRef(0);
  // Quando falou pela última vez (0 = ainda não: a primeira fala espera o intervalo inteiro).
  const lastAt = useRef(0);

  const say = useCallback((text: string) => {
    const st = engine.state;
    if (!st) return;
    const partner = st.companion ? st.collection.find((p) => p.uid === st.companion!.uid) : undefined;
    const who = pokemonName(partner ?? activePokemon(st));
    const id = ++n.current;
    lastAt.current = Date.now();
    setQuip({ id, text, who });
    setTimeout(() => setQuip((q) => (q?.id === id ? null : q)), SHOW_MS);
  }, [engine]);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      const st = engine.state;
      if (!st || st.settings.graphics === 'performance') return;
      // Um comentário por vez, e nunca dois em menos de 6 s (exceto o shiny).
      const line = eventLine(st, events);
      const shiny = events.some((e) => e.type === 'spawn' && e.shiny);
      if (line && (shiny || Date.now() - lastAt.current > 6000)) say(line);
    },
    [engine, say],
  );
  useGameEvents(onEvents);

  useEffect(() => {
    if (!lastAt.current) lastAt.current = Date.now();
    const t = setInterval(() => {
      const st = engine.state;
      if (!st || st.settings.graphics === 'performance' || document.hidden) return;
      if (st.battle.phase !== 'fighting' && st.battle.phase !== 'spawning') return;
      if (Date.now() - lastAt.current >= IDLE_MS) say(idleLine(st));
    }, 5000);
    return () => clearInterval(t);
  }, [engine, say]);

  if (!quip || state.settings.graphics === 'performance') return null;
  return (
    <span
      key={quip.id}
      className="partner-quip"
      style={{ left: `calc(var(--u) * ${x})`, top: `calc(var(--u) * ${y})` }}
      role="status"
    >
      <b>{quip.who.toUpperCase()}</b>
      {quip.text}
    </span>
  );
}
