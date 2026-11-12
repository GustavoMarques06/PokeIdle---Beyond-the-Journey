import { useEffect, useState } from 'react';
import { BALANCE, getRoute } from '../../game-data';
import type { OfflineReport as Report } from '../../core/offline';
import { STAT_NAMES, T, formatDuration, formatNumber, speciesName } from '../i18n/pt-BR';
import { ItemIcon, PixelIcon, PokemonSprite } from './common';
import { diaryLine } from '../i18n/story';

/** Número que rola de 0 até o valor (com movimento reduzido, aparece direto). */
function Roll({ value, delay = 0 }: { value: number; delay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (document.documentElement.classList.contains('reduced-motion')) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - start) / 900));
      setShown(Math.round(value * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  return <>{formatNumber(shown)}</>;
}

export function OfflineReport({
  report,
  onClose,
  partner,
  team = [],
}: {
  report: Report;
  onClose: () => void;
  /** Nome do parceiro: o diário dele resume o que aconteceu. */
  partner?: string;
  /** A equipe, que aparece correndo pela rota no alto do relatório. */
  team?: { speciesId: number; shiny: boolean; form?: string }[];
}) {
  let line = 0;
  const next = () => ({ ['--i' as string]: line++ });
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <div className="modal frame frame-menu">
        <header className="window-title">
          <ItemIcon id="town-map" size={24} />
          <h3 id="offline-title">ENQUANTO VOCÊ ESTAVA FORA…</h3>
        </header>
        {report.clockIssue === 'none' && report.kills > 0 && team.length > 0 && (
          <div className="offline-run" aria-hidden>
            <span className="offline-route">{getRoute(report.routeId).name.toUpperCase()}</span>
            <span className="offline-runners">
              {team.map((m, i) => (
                <span key={i} className="offline-runner" style={{ ['--i' as string]: i }}>
                  <PokemonSprite speciesId={m.speciesId} kind="icon" shiny={m.shiny} />
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="frame frame-dialog modal-dialog">
          {report.clockIssue === 'backwards' && <p>{T.offline.clockBackwards}</p>}
          {report.clockIssue === 'invalid' && <p>{T.offline.clockInvalid}</p>}
          {report.clockIssue === 'none' && (
            <>
              <p>
                {T.offline.away(formatDuration(report.elapsedMs))} Seu Pokémon continuou treinando em{' '}
                {getRoute(report.routeId).name}.
              </p>
              {partner && (
                <p className="offline-diary">{diaryLine(partner, report.kills, report.countedMs / 3_600_000)}</p>
              )}
              <p className="hint">
                {T.offline.counted(formatDuration(report.countedMs))}{' '}
                {report.capped && T.offline.capped(BALANCE.offline.maxHours)}
              </p>
            </>
          )}
        </div>
        {report.clockIssue === 'none' &&
          (report.kills === 0 ? (
            <p className="hint">{T.offline.nothing}</p>
          ) : (
            <dl className="report-grid report-hero">
              <dt>VITÓRIAS</dt>
              <dd>
                <Roll value={report.kills} />
              </dd>
              <dt>EXP</dt>
              <dd>
                <Roll value={report.exp} delay={150} />
              </dd>
              {report.reserveExp > 0 && (
                <>
                  <dt>EXP DA EQUIPE</dt>
                  <dd>
                    <Roll value={report.reserveExp} delay={300} /> cada
                  </dd>
                </>
              )}
              <dt>DINHEIRO</dt>
              <dd className="money">
                <PixelIcon name="pokedollar" scale={2} />
                <Roll value={report.coins} delay={450} />
              </dd>
            </dl>
          ))}
        {report.evolutions.map((e) => (
          <p key={`${e.uid}-${e.to}`} className="report-line rare" style={next()}>
            <PokemonSprite speciesId={e.to} kind="icon" /> {speciesName(e.from)} evoluiu para{' '}
            {speciesName(e.to)}!
          </p>
        ))}
        {report.levelUps.map((l) => (
          <p key={l.uid} className="report-line" style={next()}>
            <PokemonSprite speciesId={l.speciesId} kind="icon" /> {speciesName(l.speciesId)}: Nv. {l.from} →
            Nv. {l.to}
          </p>
        ))}
        {report.training?.map((t) => (
          <p key={t.uid} className="report-line" style={next()}>
            <PokemonSprite speciesId={t.speciesId} kind="icon" /> {speciesName(t.speciesId)} treinou: +
            {t.gained} EVs de {STAT_NAMES[t.stat as keyof typeof STAT_NAMES] ?? t.stat}
          </p>
        ))}
        <button className="pbtn primary" onClick={onClose} autoFocus>
          {T.offline.continue}
        </button>
      </div>
    </div>
  );
}
