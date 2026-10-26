import { BALANCE, getRoute } from '../../game-data';
import type { OfflineReport as Report } from '../../core/offline';
import { T, formatDuration, formatNumber, speciesName } from '../i18n/pt-BR';
import { ItemIcon, Money, PokemonSprite } from './common';

export function OfflineReport({ report, onClose }: { report: Report; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <div className="modal frame frame-menu">
        <header className="window-title">
          <ItemIcon id="town-map" size={24} />
          <h3 id="offline-title">ENQUANTO VOCÊ ESTAVA FORA…</h3>
        </header>
        <div className="frame frame-dialog modal-dialog">
          {report.clockIssue === 'backwards' && <p>{T.offline.clockBackwards}</p>}
          {report.clockIssue === 'invalid' && <p>{T.offline.clockInvalid}</p>}
          {report.clockIssue === 'none' && (
            <>
              <p>
                {T.offline.away(formatDuration(report.elapsedMs))} Seu Pokémon continuou treinando em{' '}
                {getRoute(report.routeId).name}.
              </p>
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
            <dl className="report-grid">
              <dt>VITÓRIAS</dt>
              <dd>{formatNumber(report.kills)}</dd>
              <dt>EXP</dt>
              <dd>{formatNumber(report.exp)}</dd>
              <dt>DINHEIRO</dt>
              <dd>
                <Money value={report.coins} />
              </dd>
            </dl>
          ))}
        {report.levelUps.map((l) => (
          <p key={l.uid} className="report-line">
            <PokemonSprite speciesId={l.speciesId} kind="icon" /> {speciesName(l.speciesId)}: Nv. {l.from} →
            Nv. {l.to}
          </p>
        ))}
        {report.evolutions.map((e) => (
          <p key={`${e.uid}-${e.to}`} className="report-line rare">
            <PokemonSprite speciesId={e.to} kind="icon" /> {speciesName(e.from)} evoluiu para{' '}
            {speciesName(e.to)}!
          </p>
        ))}
        <button className="pbtn primary" onClick={onClose} autoFocus>
          {T.offline.continue}
        </button>
      </div>
    </div>
  );
}
