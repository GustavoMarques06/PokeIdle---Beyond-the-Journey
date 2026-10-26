// Mensagens da caixa de batalha, no tom dos RPGs portáteis clássicos.

import { ACHIEVEMENTS, getRoute } from '../../game-data';
import type { GameEvent } from '../../core/game';
import { itemName, moveName, speciesName } from './pt-BR';

export interface BattleLine {
  text: string;
  /** Mensagens importantes ficam na caixa por um tempo mínimo antes de serem trocadas. */
  important: boolean;
}

/** Contexto que o evento não carrega (nome do chefe, nome do Pokémon ativo). */
export interface BattleTextContext {
  routeId: string;
  bossBattle: boolean;
  playerName: string;
  /** Treinador adversário (chefe, Rocket, Torre). */
  trainerName?: string;
}

function foeLabel(speciesId: number, ctx: BattleTextContext): string {
  return ctx.bossBattle ? `${speciesName(speciesId)} inimigo` : `${speciesName(speciesId)} selvagem`;
}

export function battleText(e: GameEvent, ctx: BattleTextContext): BattleLine | null {
  const boss = getRoute(ctx.routeId).boss;
  switch (e.type) {
    case 'spawn':
      return {
        text: e.boss
          ? `${ctx.trainerName ?? boss?.name ?? 'O treinador'} enviou ${speciesName(e.speciesId)}!`
          : e.legendary
            ? `${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''} apareceu! Enfraqueça-o e lance as bolas à mão!`
            : e.roamer
              ? `O raro ${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''} apareceu! Capture-o antes que fuja!`
              : `Um ${speciesName(e.speciesId)} selvagem${e.shiny ? ' brilhante' : ''} apareceu!${e.perfect ? ' Ele parece PERFEITO!' : ''}`,
        important: e.shiny || e.boss || !!e.roamer || !!e.perfect || !!e.legendary,
      };
    case 'attack': {
      const who = e.side === 'player' ? speciesName(e.attacker) : foeLabel(e.attacker, ctx);
      const r = e.result;
      let text = `${who} usou ${moveName(r.moveId)}!`;
      if (r.missed) text += ' Mas errou!';
      else if (r.effectiveness === 0) text += ` Não afeta ${speciesName(e.target)}…`;
      else {
        if (r.crit) text += ' Um golpe crítico!';
        if (r.effectiveness > 1) text += ' É super efetivo!';
        else if (r.effectiveness < 1) text += ' Não é muito efetivo…';
      }
      return { text, important: false };
    }
    case 'enemyFainted':
      return {
        text: `${foeLabel(e.speciesId, ctx)} desmaiou! ${ctx.playerName} ganhou ${e.exp} pontos de EXP e ${e.coins} moedas.`,
        important: false,
      };
    case 'playerFainted':
      return { text: `${speciesName(e.speciesId)} desmaiou! Correndo para se recuperar…`, important: true };
    case 'levelUp':
      return { text: `${speciesName(e.speciesId)} subiu para o Nv. ${e.level}!`, important: true };
    case 'learnedMove':
      return { text: `${speciesName(e.speciesId)} aprendeu ${moveName(e.move)}!`, important: true };
    case 'evolved':
      return { text: `Parabéns! ${speciesName(e.from)} evoluiu para ${speciesName(e.to)}!`, important: true };
    case 'evolutionReady':
      return { text: `${speciesName(e.speciesId)} está pronto para evoluir! Abra POKéMON.`, important: true };
    case 'captureAttempt':
      return e.success
        ? null
        : {
            text: e.chance > 0.6 ? 'Argh! Foi por pouco!' : 'Ah, não! O Pokémon escapou da bola!',
            important: true,
          };
    case 'captured':
      return {
        text: `Peguei! ${speciesName(e.speciesId)} foi capturado!${e.perfect ? ' É um Pokémon PERFEITO!' : ''}${e.isNew ? ' Dados registrados na Pokédex.' : ''}`,
        important: true,
      };
    case 'bossAvailable':
      return {
        text: `${getRoute(e.routeId).boss?.name} aceitou o seu desafio! Use DESAFIAR.`,
        important: true,
      };
    case 'bossDefeated': {
      const b = getRoute(e.routeId).boss;
      const items = Object.entries(e.items)
        .map(([id, n]) => `${itemName(id)} ×${n}`)
        .join(', ');
      return {
        text:
          `Você derrotou ${b?.name}! Recebeu ${e.coins} moedas` +
          (items ? ` e ${items}` : '') +
          '.' +
          (b?.badge ? ` Ganhou a ${b.badge.name}!` : '') +
          (e.tm ? ` Recebeu o TM de ${moveName(e.tm)}!` : ''),
        important: true,
      };
    }
    case 'hallOfFame':
      return { text: 'Parabéns! Sua equipe entrou para o HALL DA FAMA!', important: true };
    case 'hatched':
      return {
        text: `Oh? O ovo chocou! Nasceu um ${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''}!`,
        important: true,
      };
    case 'roamerFled':
      return { text: `${speciesName(e.speciesId)} fugiu! Ele foi para outra rota…`, important: true };
    case 'roamerAppeared':
      return {
        text: `Rumores: ${speciesName(e.speciesId)} foi visto em ${getRoute(e.routeId).name}!`,
        important: true,
      };
    case 'rocketAppeared':
      return { text: `A Equipe Rocket está aprontando em ${getRoute(e.routeId).name}!`, important: true };
    case 'rocketDefeated':
      return { text: `A Equipe Rocket decolou de novo! Você recebeu ${e.coins} moedas.`, important: true };
    case 'legendaryEnded':
      return {
        text:
          e.reason === 'caught'
            ? `Incrível! ${speciesName(e.speciesId)} foi capturado!`
            : e.reason === 'fled'
              ? `${speciesName(e.speciesId)} fugiu para longe…`
              : `${speciesName(e.speciesId)} desapareceu. Tente de novo mais tarde.`,
        important: true,
      };
    case 'towerFloor':
      return { text: `Andar ${e.floor} vencido! +${e.points} BP. Subindo…`, important: true };
    case 'towerEnded':
      return { text: `Fim da subida na Torre de Batalha: andar ${e.floor}.`, important: true };
    default:
      return null;
    case 'routeUnlocked':
      return { text: `Uma nova área foi liberada: ${getRoute(e.routeId).name}!`, important: true };
    case 'masteryUp':
      return {
        text: `A sintonia com ${speciesName(e.speciesId)} cresceu! Maestria ${e.level}.`,
        important: true,
      };
    case 'achievement': {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      return { text: `Conquista: ${a?.name ?? e.id}!`, important: true };
    }
  }
}
