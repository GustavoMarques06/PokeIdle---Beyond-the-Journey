// Relatório de balanceamento (desenvolvimento): ritmo da campanha e dificuldade das raides.
// Uso: npm run balance [-- <id-do-inicial> <rota-final>]

import { STARTERS } from '../src/game-data';
import { campaignPace, raidOutcome } from '../src/core/balance-report';

const starter = Number(process.argv[2] ?? STARTERS[0]);
const last = process.argv[3] ?? 'rota-5-6';

console.log(`\nRitmo da campanha (inicial ${starter}, até ${last})`);
for (const r of campaignPace(starter, last)) {
  console.log(`  ${r.routeId.padEnd(28)} ${String(r.minutes ?? '—').padStart(4)} min  (Nv. ${r.level})`);
}

console.log('\nRaides (ativo + 2 reservas, 10 lutas)');
for (const [route, offset] of [
  ['rota-7-8-celadon', 0],
  ['rota-7-8-celadon', 5],
  ['johto-rotas-29-31', 3],
] as const) {
  const o = raidOutcome(route, 6, offset);
  console.log(
    `  ${route} +${offset}: vitórias ${o.wins}/${o.runs}, tempo esgotado ${o.timeouts}, desmaios ${o.faints}, média ${o.avgSeconds}s`,
  );
}
