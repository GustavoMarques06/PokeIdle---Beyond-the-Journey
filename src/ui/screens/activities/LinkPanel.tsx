// CABO LINK: troca de Pokémon e duelo fantasma por código. Os códigos são texto: dá para mandar
// por mensagem, e-mail ou qualquer lugar. Nada passa por servidor.

import { useEffect, useState } from 'react';
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
import { formatNumber, speciesName } from '../../i18n/pt-BR';
import { audio } from '../../audio';
import { useEngine } from '../../useGame';
import { Locked, PokemonPicker } from './shared';

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
function Receive({ expect }: { expect: LinkPacket['kind'] }) {
  const engine = useEngine();
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
    if (!window.confirm(`Enviar ${name}? Ele sai do seu jogo agora; o amigo recebe ao colar o código.`))
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
                  onClick={() => {
                    if (
                      window.confirm(
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

export function DuelPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [code, setCode] = useState<string | null>(null);
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

      <Window title="EQUIPES DE AMIGOS" icon={<ItemIcon id="vs-recorder" size={24} />}>
        <Receive expect="ghost" />
        {ghosts.length === 0 ? (
          <p className="hint">Nenhuma equipe ainda. Cole acima o código que um amigo mandar.</p>
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
                    <button
                      className="pbtn small danger"
                      onClick={() => {
                        if (window.confirm(`Apagar a equipe de ${g.name}?`))
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
