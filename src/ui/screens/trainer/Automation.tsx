// AUTOMAÇÃO: as regras que deixam o jogo cuidar das tarefas repetidas — o que a captura
// automática leva, o que conta como bom exemplar, a limpeza de repetidos, o jardim e as missões.

import { BALANCE, NATURES, getNature } from '../../../game-data';
import {
  autoTransferPlan,
  automationOf,
  hasKeeperCriteria,
  setAutomation,
  type AutomationRules,
} from '../../../core/automation';
import type { GameState } from '../../../core/game';
import { ItemIcon, PixelIcon, Window } from '../../components/common';
import { STAT_NAMES, formatNumber } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';

type Flag = {
  [K in keyof AutomationRules]: AutomationRules[K] extends boolean ? K : never;
}[keyof AutomationRules];

function Switch({
  rules,
  flag,
  label,
  hint,
  disabled,
}: {
  rules: AutomationRules;
  flag: Flag;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const engine = useEngine();
  const on = rules[flag];
  return (
    <label className={`option-row ${disabled ? 'disabled' : ''}`}>
      <span>
        {label}
        {hint && <small className="option-hint">{hint}</small>}
      </span>
      <button
        className={`switch ${on ? 'on' : ''}`}
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => engine.dispatch((s) => setAutomation(s, { [flag]: !on }))}
      >
        {on ? 'SIM' : 'NÃO'}
      </button>
    </label>
  );
}

const natureLabel = (id: string) => {
  const n = getNature(id)!;
  return n.up && n.down ? `${n.name} (+${STAT_NAMES[n.up]} −${STAT_NAMES[n.down]})` : `${n.name} (neutra)`;
};

export function Automation({ state }: { state: GameState }) {
  const engine = useEngine();
  const rules = automationOf(state);
  const capture = state.upgrades.includes('auto-capture');
  const criteria = hasKeeperCriteria(rules);
  const pending = rules.autoTransfer ? 0 : autoTransferPlan(state).length;
  const toggleNature = (id: string) =>
    engine.dispatch((s) =>
      setAutomation(s, {
        natures: rules.natures.includes(id) ? rules.natures.filter((n) => n !== id) : [...rules.natures, id],
      }),
    );

  return (
    <Window title="AUTOMAÇÃO" icon={<ItemIcon id="machine-part" size={24} />} className="automation">
      <section className="auto-section">
        <h4>
          <ItemIcon id="poke-ball" size={20} /> CAPTURA AUTOMÁTICA
        </h4>
        {!capture ? (
          <p className="hint">
            Compre a Captura automática no Poké Mart para usar estas regras. Ela sempre leva espécies novas,
            shinies e errantes.
          </p>
        ) : (
          <>
            <p className="hint">
              Sempre leva espécies novas, shinies e errantes. Além disso:
              {!state.settings.autoCapture && ' (a captura automática está desligada nas Opções)'}
            </p>
            <Switch
              rules={rules}
              flag="catchKeepers"
              label="Repetidos que são bons exemplares"
              hint={criteria ? 'pelos critérios abaixo' : 'escolha ao menos um critério abaixo'}
            />
            <Switch rules={rules} flag="catchForms" label="Formas que faltam (Unown, Deerling, Spinda…)" />
            <Switch
              rules={rules}
              flag="catchAll"
              label="Todos os outros, com Poké Ball comum"
              hint="junto com a transferência automática, os repetidos viram pontos de pesquisa"
            />
          </>
        )}
      </section>

      <section className="auto-section">
        <h4>
          <PixelIcon name="star" scale={2} /> BOM EXEMPLAR
        </h4>
        <p className="hint">
          Precisa passar em todos os critérios ligados. Bons exemplares nunca são transferidos sozinhos.
        </p>
        <label className="option-row">
          <span>Potencial mínimo (soma dos IVs)</span>
          <select
            value={rules.minPotential}
            onChange={(e) =>
              engine.dispatch((s) => setAutomation(s, { minPotential: Number(e.target.value) }))
            }
          >
            {BALANCE.automation.potentialSteps.map((v) => (
              <option key={v} value={v}>
                {v === 0 ? 'Não olhar' : v === 100 ? 'Perfeito (100%)' : `${v}% ou mais`}
              </option>
            ))}
          </select>
        </label>
        <Switch rules={rules} flag="hiddenAbility" label="Com habilidade oculta" />
        <fieldset className="nature-picker">
          <legend>
            Naturezas procuradas ({rules.natures.length}/{BALANCE.automation.maxNatures})
          </legend>
          {NATURES.map((n) => {
            const on = rules.natures.includes(n.id);
            return (
              <label key={n.id} className="box-check" title={natureLabel(n.id)}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && rules.natures.length >= BALANCE.automation.maxNatures}
                  onChange={() => toggleNature(n.id)}
                />
                {n.name}
              </label>
            );
          })}
        </fieldset>
      </section>

      <section className="auto-section">
        <h4>
          <ItemIcon id="pokemon-box" size={20} /> ROTINA
        </h4>
        <Switch
          rules={rules}
          flag="autoTransfer"
          label="Transferir repetidos que sobram"
          hint={`fica o melhor de cada espécie; favoritos, etiquetados, shinies, perfeitos, bons exemplares, com apelido, golpes de ovo ou de troca nunca saem${
            pending ? ` · ${pending} sairiam agora` : ''
          }`}
        />
        <Switch rules={rules} flag="autoGarden" label="Colher o jardim e replantar a mesma berry" />
        <Switch rules={rules} flag="autoClaim" label="Resgatar missões concluídas" />
        {state.stats.autoTransferred > 0 && (
          <p className="hint">
            Transferidos pela automação até agora: {formatNumber(state.stats.autoTransferred)}.
          </p>
        )}
      </section>
    </Window>
  );
}
