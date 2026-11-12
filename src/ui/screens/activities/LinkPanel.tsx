// CABO LINK: troca de Pokémon e duelo fantasma por código. Os códigos são texto: dá para mandar
// por mensagem, e-mail ou qualquer lugar. Nada passa por servidor.

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BALANCE } from '../../../game-data';
import { findPokemon } from '../../../core/collection';
import type { GameEvent, GameState } from '../../../core/game';
import {
  badgesText,
  cancelSend,
  challengeGhost,
  commitSend,
  decodeLinkCode,
  deleteGhost,
  duelRanking,
  encodeLinkCode,
  ghostAverageLevel,
  ghostPacket,
  ghostReward,
  importGhost,
  linkUnlocked,
  receiveTrade,
  sendBlocker,
  surpriseLeft,
  surpriseTrade,
  tradePacket,
  SURPRISE_PER_DAY,
  type LinkPacket,
  type SurpriseRecord,
} from '../../../core/link';
import { pokemonName, potential } from '../../../core/pokemon';
import { ItemIcon, Money, PokemonSprite, Shiny, TrainerSprite, Window } from '../../components/common';
import { formatDuration, formatNumber, moveName, speciesName } from '../../i18n/pt-BR';
import { audio } from '../../audio';
import { Award } from '../../components/PixelUi';
import { useEngine } from '../../useGame';
import { Locked, PokemonPicker } from './shared';
import { Empty } from '../../components/Dynamic';
import { askConfirm } from '../../components/GameConfirm';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Caixa com o código gerado, para copiar. */
function CodeBox({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="link-code">
      <textarea readOnly value={code} rows={3} aria-label={label} onFocus={(e) => e.target.select()} />
      <button
        className="pbtn small"
        onClick={async () => {
          setCopied(await copy(code));
        }}
      >
        {copied ? 'Copiado!' : 'Copiar código'}
      </button>
    </div>
  );
}

/** Colar um código (troca ou equipe) e ver o que vem nele antes de aceitar. */
/** Chegada de um Pokémon por código: a bola atravessa o cabo e ele sai dela. */
function ArrivalShow({
  speciesId,
  shiny,
  from,
  avatar,
  onClose,
}: {
  speciesId: number;
  shiny: boolean;
  from: string;
  avatar: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<'arrive' | 'done'>('arrive');
  useEffect(() => {
    audio.sfx('throw');
    const t = window.setTimeout(() => {
      setStage('done');
      audio.sfx(shiny ? 'fanfare' : 'itemGet');
    }, 1700);
    return () => clearTimeout(t);
  }, [shiny]);
  return createPortal(
    <div className="modal-backdrop st-backdrop" role="dialog" aria-modal="true" aria-label="Troca recebida">
      <div className={`st-show frame frame-dialog stage-${stage} lk-arrival`}>
        <h3>TROCA RECEBIDA</h3>
        <div className="st-cable" aria-hidden>
          <span className="st-you">
            <TrainerSprite id={avatar} size={48} head />
          </span>
          <span className="st-wire" />
          <span className="st-ball in">
            <ItemIcon id="poke-ball" size={24} />
          </span>
        </div>
        <p className="st-caption">{stage === 'arrive' ? `${from} está mandando um Pokémon pelo cabo…` : ''}</p>
        {stage === 'done' && (
          <div className="st-result">
            <span className="st-burst" aria-hidden />
            <PokemonSprite speciesId={speciesId} kind="front" shiny={shiny} pixelScale={2} />
            <strong>
              {speciesName(speciesId).toUpperCase()} {shiny && <Shiny />}
            </strong>
            <small>Veio de {from}. Ele já está no seu PC.</small>
            <button className="pbtn primary" onClick={onClose} autoFocus>
              Obrigado, {from}!
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Receive({ expect }: { expect: LinkPacket['kind'] }) {
  const engine = useEngine();
  const [arrival, setArrival] = useState<{ speciesId: number; shiny: boolean; from: string; avatar: string } | null>(
    null,
  );
  const [text, setText] = useState('');
  const [packet, setPacket] = useState<LinkPacket | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const read = async () => {
    setMessage(null);
    const out = await decodeLinkCode(text);
    if (!out.ok) return setMessage(`Não deu: ${out.error}.`);
    if (out.packet.kind !== expect) {
      return setMessage(
        out.packet.kind === 'trade'
          ? 'Este é um código de troca: cole-o na aba TROCA.'
          : 'Este é o código de uma equipe: cole-o na aba DUELO.',
      );
    }
    setPacket(out.packet);
  };

  const accept = () => {
    if (!packet) return;
    const result: { error: string | null } = { error: null };
    engine.dispatch((s, now) => {
      const events: GameEvent[] = [];
      const out =
        packet.kind === 'trade' ? receiveTrade(s, packet, now, events) : importGhost(s, packet, now);
      if (!out.ok) result.error = out.error;
      return events;
    });
    if (result.error) setMessage(result.error);
    else {
      if (packet.kind === 'trade')
        setArrival({
          speciesId: packet.pokemon.speciesId,
          shiny: packet.pokemon.shiny,
          from: packet.from.name,
          avatar: packet.from.avatar,
        });
      audio.sfx('itemGet');
      setMessage(
        packet.kind === 'trade'
          ? 'Pokémon recebido! Ele já está no PC.'
          : 'Equipe guardada! Desafie-a abaixo.',
      );
      setText('');
    }
    setPacket(null);
  };

  return (
    <div className="link-receive">
      {arrival && <ArrivalShow {...arrival} onClose={() => setArrival(null)} />}
      <textarea
        value={text}
        rows={3}
        placeholder={
          expect === 'trade' ? 'Cole aqui o código de troca (PKT1…)' : 'Cole aqui o código da equipe (PKG1…)'
        }
        aria-label="Código recebido"
        onChange={(e) => {
          setText(e.target.value);
          setPacket(null);
        }}
      />
      <button className="pbtn small" disabled={!text.trim()} onClick={() => void read()}>
        Ler código
      </button>
      {packet && (
        <div className="link-preview frame frame-dialog">
          <TrainerSprite id={packet.from.avatar} outfit={packet.from.outfit} size={40} head />
          <div>
            <p>
              <strong>{packet.from.name}</strong>
              {packet.kind === 'trade' ? ' quer enviar:' : ` · ${badgesText(packet.badges)} · equipe:`}
            </p>
            <ul className="link-team">
              {(packet.kind === 'trade' ? [packet.pokemon] : packet.team).map((m, i) => (
                <li key={i}>
                  <PokemonSprite speciesId={m.speciesId} kind="icon" />
                  <span>
                    {pokemonName(m).toUpperCase()} Nv{m.level}
                    {m.shiny && <Shiny />}
                  </span>
                  {packet.kind === 'trade' && <small>Potencial {potential(m.ivs)}%</small>}
                </li>
              ))}
            </ul>
            <div className="save-row">
              <button className="pbtn small primary" onClick={accept}>
                {packet.kind === 'trade' ? 'Receber' : 'Guardar equipe'}
              </button>
              <button className="pbtn small" onClick={() => setPacket(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

/** A animação da Troca Surpresa: a bola sobe pelo cabo, o globo procura um parceiro e a bola de volta abre. */
function SurpriseShow({ gave, record, onClose }: { gave: number; record: SurpriseRecord; onClose: () => void }) {
  const [stage, setStage] = useState<'send' | 'search' | 'arrive' | 'done'>('send');
  useEffect(() => {
    const t = [
      window.setTimeout(() => setStage('search'), 900),
      window.setTimeout(() => {
        setStage('arrive');
        audio.sfx('throw');
      }, 2600),
      window.setTimeout(() => {
        setStage('done');
        audio.sfx(record.shiny ? 'fanfare' : 'itemGet');
      }, 3500),
    ];
    return () => t.forEach(clearTimeout);
  }, [record.shiny]);
  const shown = record.evolvedTo ?? record.got;
  return createPortal(
    <div className="modal-backdrop st-backdrop" role="dialog" aria-modal="true" aria-label="Troca Surpresa">
      <div className={`st-show frame frame-dialog stage-${stage}`}>
        <h3>TROCA SURPRESA</h3>
        <div className="st-cable" aria-hidden>
          <span className="st-you">
            <PokemonSprite speciesId={gave} kind="front" pixelScale={1} />
          </span>
          <span className="st-wire" />
          <span className="st-ball out">
            <ItemIcon id="poke-ball" size={24} />
          </span>
          <span className="st-globe" />
          <span className="st-ball in">
            <ItemIcon id="luxury-ball" size={24} />
          </span>
        </div>
        <p className="st-caption">
          {stage === 'send'
            ? `Lá vai o ${speciesName(gave)}!`
            : stage === 'search'
              ? 'Procurando alguém para trocar…'
              : stage === 'arrive'
                ? 'Encontrado! Chegando…'
                : ''}
        </p>
        {stage === 'done' && (
          <div className="st-result">
            <span className="st-burst" aria-hidden />
            <PokemonSprite speciesId={shown} kind="front" shiny={record.shiny} pixelScale={2} />
            <strong>
              {speciesName(shown).toUpperCase()} {record.shiny && <Shiny />}
            </strong>
            {record.evolvedTo && <small className="st-evo">Ele evoluiu ao chegar pela troca!</small>}
            <div className="st-card">
              <TrainerSprite id={record.avatar} size={44} head />
              <span>
                <b>{record.from}</b> diz: “{record.message}”
              </span>
            </div>
            <button className="pbtn primary" onClick={onClose} autoFocus>
              Obrigado, {record.from}!
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SurpriseTrade({ state }: { state: GameState }) {
  const engine = useEngine();
  const [uid, setUid] = useState<number | null>(null);
  const [show, setShow] = useState<{ gave: number; record: SurpriseRecord } | null>(null);
  const now = state.lastTimerAt;
  const left = surpriseLeft(state, now);
  const picked = uid !== null ? findPokemon(state, uid) : undefined;
  const blocker = uid !== null ? sendBlocker(state, uid) : null;
  const log = state.link?.surprise?.log ?? [];

  const go = () => {
    if (!picked) return;
    const gave = picked.speciesId;
    let record: SurpriseRecord | null = null;
    engine.dispatch((s, t) => {
      const events: GameEvent[] = [];
      record = surpriseTrade(s, picked.uid, t, events);
      return events;
    });
    if (record) {
      audio.sfx('throw');
      setShow({ gave, record });
      setUid(null);
    }
  };

  return (
    <Window title={`TROCA SURPRESA · ${left}/${SURPRISE_PER_DAY} HOJE`} icon={<ItemIcon id="luxury-ball" size={24} />} frame="dialog">
      {show && <SurpriseShow gave={show.gave} record={show.record} onClose={() => setShow(null)} />}
      <p className="hint">
        Mande um Pokémon e receba outro de um treinador do mundo do jogo, sem precisar de amigo nem internet. Pode vir
        uma espécie que você não tem, e às vezes até um shiny!
      </p>
      <PokemonPicker
        state={state}
        selected={uid !== null ? [uid] : []}
        onPick={(p) => setUid(p.uid === uid ? null : p.uid)}
        filter={(p) => !p.favorite}
      />
      {picked && (
        <div className="link-send frame frame-dialog">
          <PokemonSprite speciesId={picked.speciesId} kind="icon" />
          <span>
            {pokemonName(picked).toUpperCase()} Nv{picked.level}
          </span>
          <button className="pbtn small primary" disabled={!!blocker || left <= 0} title={blocker ?? undefined} onClick={go}>
            {left > 0 ? 'Trocar de surpresa!' : 'Volte amanhã'}
          </button>
        </div>
      )}
      {log.length > 0 && (
        <ul className="st-log">
          {log.map((r) => (
            <li key={r.at}>
              <PokemonSprite speciesId={r.gave} kind="icon" />
              <span className="st-arrow">⇄</span>
              <PokemonSprite speciesId={r.evolvedTo ?? r.got} kind="icon" shiny={r.shiny} />
              <small>
                {speciesName(r.evolvedTo ?? r.got)}
                {r.shiny ? ' ★' : ''} · de {r.from}
              </small>
            </li>
          ))}
        </ul>
      )}
    </Window>
  );
}

/** Os Pokémon que vieram de outros treinadores (pela troca ou pela Troca Surpresa), com a origem. */
function Received({ state }: { state: GameState }) {
  const list = state.collection.filter((p) => p.ot && p.ot !== state.trainerName).sort((a, b) => b.uid - a.uid);
  if (!list.length) return null;
  return (
    <Window title={`RECEBIDOS DE OUTROS TREINADORES · ${list.length}`} icon={<ItemIcon id="luxury-ball" size={24} />}>
      <ul className="lk-received">
        {list.slice(0, 18).map((p, i) => (
          <li key={p.uid} style={{ '--i': i } as CSSProperties} title={p.caughtOn}>
            <PokemonSprite speciesId={p.speciesId} kind="icon" shiny={p.shiny} form={p.form} />
            <span>
              <strong>
                {p.nickname ?? speciesName(p.speciesId)} {p.shiny && <Shiny />}
              </strong>
              <small>
                de <b>{p.ot}</b> · {p.caughtOn} · {new Date(p.caughtAt).toLocaleDateString('pt-BR')}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

export function TradePanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [uid, setUid] = useState<number | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!linkUnlocked(state)) return <Locked routeId={BALANCE.link.unlock} />;
  const picked = uid !== null ? findPokemon(state, uid) : undefined;
  const blocker = uid !== null ? sendBlocker(state, uid) : null;
  const sent = state.link?.sent ?? [];

  const send = async () => {
    if (!picked) return;
    const name = pokemonName(picked).toUpperCase();
    if (!(await askConfirm(`Enviar ${name}? Ele sai do seu jogo agora; o amigo recebe ao colar o código.`)))
      return;
    const packet = tradePacket(state, picked.uid, state.lastTimerAt);
    if (!packet) return;
    const text = await encodeLinkCode(packet);
    const result = { ok: false };
    engine.dispatch((s) => {
      result.ok = commitSend(s, picked.uid, packet, text);
    });
    if (!result.ok) return setMessage('Este Pokémon não pode mais ser enviado.');
    setCode(text);
    setUid(null);
    setMessage(`${name} foi enviado. Mande o código abaixo para o seu amigo.`);
  };

  return (
    <div className="link-panel">
      <SurpriseTrade state={state} />
      <Window title="ENVIAR PARA UM AMIGO" icon={<ItemIcon id="linking-cord" size={24} />}>
        <p className="hint">
          Escolha um Pokémon livre (fora da equipe e das atividades). Ele vai com o item que segura, os
          golpes, os IVs e o apelido. Favoritos ficam protegidos.
        </p>
        <PokemonPicker
          state={state}
          selected={uid !== null ? [uid] : []}
          onPick={(p) => {
            setUid(p.uid === uid ? null : p.uid);
            setCode(null);
            setMessage(null);
          }}
          filter={(p) => !p.favorite}
        />
        {picked && (
          <div className="link-send frame frame-dialog">
            <PokemonSprite speciesId={picked.speciesId} kind="icon" />
            <span>
              {pokemonName(picked).toUpperCase()} Nv{picked.level} · potencial {potential(picked.ivs)}%
              {picked.held && (
                <>
                  {' '}
                  · <ItemIcon id={picked.held} size={16} />
                </>
              )}
            </span>
            <button
              className="pbtn small primary"
              disabled={!!blocker}
              title={blocker ?? undefined}
              onClick={() => void send()}
            >
              Gerar código e enviar
            </button>
          </div>
        )}
        {message && (
          <p className="hint" role="status">
            {message}
          </p>
        )}
        {code && <CodeBox code={code} label="Código de troca" />}
      </Window>

      <Received state={state} />
      <Window title="RECEBER" icon={<ItemIcon id="pokemon-box" size={24} />}>
        <Receive expect="trade" />
      </Window>

      {sent.length > 0 && (
        <Window title="ENVIADOS" icon={<ItemIcon id="fame-checker" size={24} />}>
          <p className="hint">
            O código continua aqui para copiar de novo. Cancele um envio só se o amigo ainda não colou o
            código: o jogo não tem como saber, e o Pokémon ficaria nos dois jogos.
          </p>
          <ul className="link-sent">
            {sent.map((t) => (
              <li key={t.id}>
                <PokemonSprite speciesId={t.pokemon.speciesId} kind="icon" />
                <span>
                  {pokemonName(t.pokemon).toUpperCase()} Nv{t.pokemon.level}
                  <small> · {new Date(t.at).toLocaleString('pt-BR')}</small>
                </span>
                <button className="pbtn small" onClick={() => void copy(t.code)}>
                  Copiar
                </button>
                <button
                  className="pbtn small danger"
                  onClick={async () => {
                    if (
                      await askConfirm(
                        `Cancelar o envio de ${speciesName(t.pokemon.speciesId)}? Ele volta para o seu PC.`,
                      )
                    )
                      engine.dispatch((s, now) => void cancelSend(s, t.id, now));
                  }}
                >
                  Cancelar envio
                </button>
              </li>
            ))}
          </ul>
        </Window>
      )}
      <p className="hint">
        Trocas: {formatNumber(state.stats.tradesSent)} enviadas · {formatNumber(state.stats.tradesReceived)}{' '}
        recebidas.
      </p>
    </div>
  );
}

/** O replay do último duelo: os lances aparecem um a um, como num relato de partida. */
function DuelReplay({ state, ghostId, onClose }: { state: GameState; ghostId: string; onClose: () => void }) {
  const g = state.link?.ghosts.find((x) => x.id === ghostId);
  const log = g?.lastDuel?.log ?? [];
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= log.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), 700);
    return () => clearTimeout(t);
  }, [shown, log.length]);
  if (!g?.lastDuel) return null;
  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Replay do duelo" onClick={onClose}>
      <div className="duel-replay frame frame-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>
          REPLAY · VOCÊ × {g.name.toUpperCase()}{' '}
          <span className={g.lastDuel.won ? 'w' : 'l'}>{g.lastDuel.won ? 'VITÓRIA' : 'DERROTA'}</span>
        </h3>
        <ol className="duel-replay-log">
          {log.slice(0, shown).map((m, i) => (
            <li key={i} className={`${m.side} ${m.ko ? 'ko' : ''}`}>
              <PokemonSprite speciesId={m.attacker} kind="icon" />
              <span>
                <b>{speciesName(m.attacker)}</b>
                {m.side === 'enemy' ? ` (de ${g.name})` : ''} usou <b>{moveName(m.move)}</b>
                {m.missed
                  ? ': errou!'
                  : `: ${m.damage} de dano${m.crit ? ', crítico' : ''}${m.super ? ', super efetivo' : ''}`}
                {m.ko ? ` · ${speciesName(m.target)} caiu!` : ''}
              </span>
            </li>
          ))}
        </ol>
        <div className="duel-replay-actions">
          {shown < log.length && (
            <button className="pbtn small" onClick={() => setShown(log.length)}>
              Mostrar tudo
            </button>
          )}
          <button className="pbtn primary" onClick={onClose} autoFocus>
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Temporada do mês: o ranking local (você e os amigos) e os troféus dos meses que você venceu. */
function DuelSeasonBoard({ state }: { state: GameState }) {
  const now = state.lastTimerAt;
  const ghosts = state.link?.ghosts ?? [];
  if (!ghosts.length) return null;
  const rows = duelRanking(state, now);
  const season = state.duelSeason;
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);
  const left = end.getTime() - now;
  return (
    <Window
      title={`TEMPORADA ${new Date(now).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}`}
      icon={<ItemIcon id="relic-crown" size={24} />}
    >
      <ol className="duel-ranking">
        {rows.map((r, i) => (
          <li key={`${r.name}-${i}`} className={`${r.you ? 'you' : ''} ${i === 0 ? 'first' : ''}`} style={{ '--i': i } as CSSProperties}>
            <span className="duel-rank">{i + 1}º</span>
            <strong>{r.you ? `${r.name} (você)` : r.name}</strong>
            <span>
              {r.w}V {r.l}D
            </span>
          </li>
        ))}
      </ol>
      <p className="hint">
        A temporada fecha em {left > 2 * 86_400_000 ? `${Math.ceil(left / 86_400_000)} dias` : formatDuration(left)}. Quem fecha o mês em 1º com 3 vitórias ou mais
        ganha um troféu. Contam os duelos contra as equipes guardadas.
      </p>
      {season && season.trophies.length > 0 && (
        <ul className="duel-trophies">
          {season.trophies.map((m) => (
            <li key={m} title={`Campeão de ${m}`}>
              <Award kind="cup" metal="gold" scale={2} />
              <small>{m.split('-').reverse().join('/')}</small>
            </li>
          ))}
        </ul>
      )}
    </Window>
  );
}

export function DuelPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [code, setCode] = useState<string | null>(null);
  const [replay, setReplay] = useState<string | null>(null);
  if (!linkUnlocked(state)) return <Locked routeId={BALANCE.link.unlock} />;
  const ghosts = state.link?.ghosts ?? [];
  const wild = state.battle.kind === 'wild';

  return (
    <div className="link-panel">
      <Window title="SUA EQUIPE" icon={<ItemIcon id="linking-cord" size={24} />}>
        <p className="hint">
          O código leva a equipe de agora, com níveis, golpes, itens e habilidades. Gere de novo quando a
          equipe mudar: o amigo só precisa colar o código novo.
        </p>
        <button
          className="pbtn small"
          onClick={async () => setCode(await encodeLinkCode(ghostPacket(state, state.lastTimerAt)))}
        >
          Gerar código da equipe
        </button>
        {code && <CodeBox code={code} label="Código da equipe" />}
      </Window>

      {replay && <DuelReplay state={state} ghostId={replay} onClose={() => setReplay(null)} />}
      <DuelSeasonBoard state={state} />
      <Window title="EQUIPES DE AMIGOS" icon={<ItemIcon id="vs-recorder" size={24} />}>
        <Receive expect="ghost" />
        {ghosts.length === 0 ? (
          <Empty icon="linking-cord">Nenhuma equipe ainda. Cole acima o código que um amigo mandar.</Empty>
        ) : (
          <ul className="ghost-list">
            {ghosts.map((g) => {
              const reward = ghostReward(g);
              return (
                <li key={g.id} className="ghost-row frame frame-slot">
                  <TrainerSprite id={g.avatar} outfit={g.outfit} size={40} head />
                  <div className="ghost-info">
                    <strong>{g.name.toUpperCase()}</strong>
                    <small>
                      {badgesText(g.badges)} · Nv. médio {ghostAverageLevel(g)} · {g.wins}V {g.losses}D
                    </small>
                    {g.duels && g.duels.length > 0 && (
                      <span className="duel-form" title="Últimos duelos (o mais novo à esquerda)">
                        {g.duels.map((d, i) => (
                          <i key={i} className={d.won ? 'w' : 'l'}>
                            {d.won ? 'V' : 'D'}
                          </i>
                        ))}
                      </span>
                    )}
                    <ul className="link-team">
                      {g.team.map((m, i) => (
                        <li key={i} title={`${pokemonName(m)} Nv. ${m.level}`}>
                          <PokemonSprite speciesId={m.speciesId} kind="icon" />
                          <span>Nv{m.level}</span>
                        </li>
                      ))}
                    </ul>
                    {reward > 0 && (
                      <small>
                        Primeira vitória: <Money value={reward} />
                      </small>
                    )}
                  </div>
                  <div className="ghost-actions">
                    <button
                      className="pbtn small primary"
                      disabled={!wild}
                      title={wild ? undefined : 'Termine a batalha atual primeiro'}
                      onClick={() => engine.dispatch((s) => challengeGhost(s, g.id))}
                    >
                      Duelar
                    </button>
                    {g.lastDuel && g.lastDuel.log.length > 0 && (
                      <button className="pbtn small" onClick={() => setReplay(g.id)}>
                        Replay
                      </button>
                    )}
                    <button
                      className="pbtn small danger"
                      onClick={async () => {
                        if (await askConfirm(`Apagar a equipe de ${g.name}?`))
                          engine.dispatch((s) => deleteGhost(s, g.id));
                      }}
                    >
                      Apagar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="hint">
          No duelo, os dois lados lutam com a mesma força: sem bônus da equipe, medalhas ou desafios. Não dá
          EXP nem moedas por Pokémon; a primeira vitória contra cada equipe paga um prêmio. Até{' '}
          {BALANCE.link.maxGhosts} equipes guardadas.
        </p>
      </Window>
    </div>
  );
}
