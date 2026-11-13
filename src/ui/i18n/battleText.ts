// Mensagens da caixa de batalha, no tom dos RPGs portáteis clássicos.

import { ACHIEVEMENTS, SUPPORT_MOVES, getRoute } from '../../game-data';
import type { GameEvent } from '../../core/game';
import { STATUS_TEXT, effectText, itemName, moveName, speciesName, withBadgeArticle } from './pt-BR';

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
  /** Apelidos da equipe de batalha (ativo + reservas), por espécie: os eventos só trazem a espécie. */
  nicknames?: ReadonlyMap<number, string>;
  /** Noite no jogo (muda as falas de encontro). */
  night?: boolean;
}

/**
 * Escolhe uma das frases pelo conteúdo do evento: o mesmo evento sempre dá a mesma frase (a caixa e o REGISTRO
 * concordam), e eventos diferentes variam.
 */
function vary(e: GameEvent, options: string[]): string {
  const key = JSON.stringify(e);
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

const CAVE = new Set(['cave', 'dampcave', 'icecave', 'ruins', 'volcano']);
const WOODS = new Set(['forest', 'jungle', 'swamp']);

/** Frases de encontro de um selvagem em terra, pelo lugar e pela hora. `X` = nome (com "brilhante"). */
function wildLines(scene: string, night: boolean): ((x: string) => string)[] {
  const base = [
    (x: string) => `Um ${x} selvagem apareceu!`,
    (x: string) => `O mato se mexeu… é um ${x} selvagem!`,
    (x: string) => `Um ${x} selvagem pulou na sua frente!`,
    (x: string) => `Um ${x} selvagem bloqueia o caminho!`,
  ];
  if (CAVE.has(scene))
    return [
      (x) => `Um ${x} selvagem saiu das sombras!`,
      (x) => `Algo se mexe entre as pedras… é um ${x} selvagem!`,
      (x) => `Um ${x} selvagem apareceu na escuridão!`,
    ];
  if (scene === 'desert') return [(x) => `Um ${x} selvagem surgiu da areia!`, base[0], base[2]];
  if (scene === 'snowfield') return [(x) => `Um ${x} selvagem surgiu da neve!`, base[0], base[2]];
  if (scene === 'city' || scene === 'street') return [(x) => `Um ${x} selvagem apareceu no meio da rua!`, base[0], base[2]];
  if (WOODS.has(scene)) return [(x) => `As folhas balançam… um ${x} selvagem apareceu!`, ...base];
  if (night) return [(x) => `Olhos brilham no escuro… é um ${x} selvagem!`, ...base];
  return base;
}

/** Nome de um Pokémon do jogador: o apelido, se houver, ou o nome da espécie. */
function mine(speciesId: number, ctx: BattleTextContext): string {
  return ctx.nicknames?.get(speciesId) ?? speciesName(speciesId);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function foeLabel(speciesId: number, ctx: BattleTextContext): string {
  return ctx.bossBattle ? `${speciesName(speciesId)} inimigo` : `${speciesName(speciesId)} selvagem`;
}

const SUPPORT_RESULT: Record<string, string> = {
  sleep: 'adormeceu',
  paralysis: 'ficou paralisado',
  burn: 'se queimou',
  poison: 'foi envenenado',
  freeze: 'congelou',
};

export function battleText(e: GameEvent, ctx: BattleTextContext): BattleLine | null {
  const boss = getRoute(ctx.routeId).boss;
  switch (e.type) {
    case 'spawn':
      return {
        text: e.raid
          ? `RAIDE! ${speciesName(e.speciesId)} gigante${e.shiny ? ' brilhante' : ''} bloqueia o caminho!`
          : e.boss
            ? vary(e, [
                `${ctx.trainerName ?? boss?.name ?? 'O treinador'} enviou ${speciesName(e.speciesId)}!`,
                `${ctx.trainerName ?? boss?.name ?? 'O treinador'}: "Vai, ${speciesName(e.speciesId)}!"`,
              ])
            : e.legendary
              ? `${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''} apareceu! Enfraqueça-o e lance as bolas à mão!`
              : e.roamer
                ? `O raro ${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''} apareceu! Capture-o antes que fuja!`
                : `${vary(
                    e,
                    (e.water === 'fish'
                      ? [
                          (x: string) => `Fisgou! Um ${x} selvagem mordeu a isca!`,
                          (x: string) => `Algo puxou a linha… é um ${x} selvagem!`,
                          (x: string) => `A boia afundou! Um ${x} selvagem!`,
                        ]
                      : e.water === 'surf'
                        ? [
                            (x: string) => `Um ${x} selvagem surgiu das águas!`,
                            (x: string) => `Bolhas na água… é um ${x} selvagem!`,
                          ]
                        : wildLines(getRoute(ctx.routeId).scene, !!ctx.night)
                    ).map((f) => f(`${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''}`)),
                  )}${e.perfect ? '\nEle parece PERFEITO!' : ''}`,
        important: e.shiny || e.boss || !!e.raid || !!e.roamer || !!e.perfect || !!e.legendary,
      };
    case 'attack': {
      const who = e.side === 'player' ? mine(e.attacker, ctx) : foeLabel(e.attacker, ctx);
      const r = e.result;
      const lines = [`${who} usou ${moveName(r.moveId)}!`];
      if (r.missed) lines.push('Mas errou!');
      else if (r.effectiveness === 0)
        lines.push(`Não afeta ${e.side === 'player' ? speciesName(e.target) : mine(e.target, ctx)}…`);
      else {
        if (r.hits) lines.push(`Acertou ${r.hits} vezes!`);
        if (r.crit) lines.push('Um golpe crítico!');
        if (r.effectiveness > 1) lines.push('É super efetivo!');
        else if (r.effectiveness < 1) lines.push('Não é muito efetivo…');
      }
      if (r.status) {
        const target = e.side === 'player' ? foeLabel(e.target, ctx) : mine(e.target, ctx);
        lines.push(`${target} ${STATUS_TEXT[r.status].inflicted}!`);
      }
      // A segunda linha (efeito do golpe) vai embaixo da primeira, como nos portáteis.
      return { text: [lines[0], lines.slice(1).join(' ')].filter(Boolean).join('\n'), important: false };
    }
    case 'ranAway':
      return { text: 'Fugiu em segurança!', important: true };
    case 'megaEvolved':
      return {
        text: `${mine(e.speciesId, ctx)} sofreu ${e.form === 'primal' ? 'Regressão Primal' : 'Mega Evolução'}!`,
        important: true,
      };
    case 'switched':
      return {
        text:
          e.reason === 'fainted'
            ? `${mine(e.from, ctx)} desmaiou! Vai, ${mine(e.to, ctx)}!`
            : `Volte, ${mine(e.from, ctx)}! Vai, ${mine(e.to, ctx)}!`,
        important: true,
      };
    case 'supportMove': {
      const who = e.side === 'player' ? mine(e.speciesId, ctx) : foeLabel(e.speciesId, ctx);
      const foe = e.side === 'player' ? foeLabel(e.target, ctx) : mine(e.target, ctx);
      const name = SUPPORT_MOVES[e.move]?.name ?? e.move;
      const result =
        e.outcome === 'ailment'
          ? `${foe} ${SUPPORT_RESULT[e.ailment!]}!`
          : e.outcome === 'boost'
            ? `${who} ficou mais forte!`
            : e.outcome === 'heal'
              ? `${who} recuperou HP!`
              : e.outcome === 'immune'
                ? 'Não teve efeito...'
                : 'Mas errou!';
      return { text: `${who} usou ${name}! ${result}`, important: false };
    }
    case 'statusSkip':
    case 'statusCured':
    case 'statusDamage': {
      const who = e.side === 'player' ? mine(e.speciesId, ctx) : foeLabel(e.speciesId, ctx);
      const t = STATUS_TEXT[e.status];
      const phrase = e.type === 'statusSkip' ? t.skip : e.type === 'statusCured' ? t.cured : t.damage;
      return { text: `${who} ${phrase}!`, important: false };
    }
    case 'enemyFainted':
      return {
        text:
          e.exp || e.coins
            ? `${vary(e, [
                `${foeLabel(e.speciesId, ctx)} desmaiou!`,
                `${foeLabel(e.speciesId, ctx)} não aguentou!`,
                `${foeLabel(e.speciesId, ctx)} caiu!`,
              ])}\n${ctx.playerName} ganhou ${plural(e.exp, 'ponto', 'pontos')} de EXP e ${plural(e.coins, 'moeda', 'moedas')}.`
            : `${foeLabel(e.speciesId, ctx)} desmaiou!`,
        important: false,
      };
    case 'playerFainted':
      return { text: `${mine(e.speciesId, ctx)} desmaiou! Correndo para se recuperar…`, important: true };
    case 'levelUp':
      return { text: `${mine(e.speciesId, ctx)} subiu para o Nv. ${e.level}!`, important: true };
    case 'learnedMove':
      return { text: `${mine(e.speciesId, ctx)} aprendeu ${moveName(e.move)}!`, important: true };
    case 'evolved':
      // Depois de evoluir, o Pokémon já é da espécie nova: o apelido está nela.
      return {
        text: `Parabéns! ${ctx.nicknames?.get(e.to) ?? speciesName(e.from)} evoluiu para ${speciesName(e.to)}!`,
        important: true,
      };
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
          (b?.badge ? ` Ganhou ${withBadgeArticle(b.badge.name)}!` : '') +
          (e.tm ? ` Recebeu o TM de ${moveName(e.tm)}!` : ''),
        important: true,
      };
    }
    case 'hallOfFame':
      return { text: 'Parabéns! Sua equipe entrou para o HALL DA FAMA!', important: true };
    case 'eggReady':
      return { text: 'Oh? Um ovo está se mexendo na Creche! Vá até lá para vê-lo chocar.', important: true };
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
    case 'legendRage':
      return {
        text: `${speciesName(e.speciesId)} se enfureceu!${e.weather ? ` O clima mudou!` : ''} Ele ficou mais forte e se livrou do status!`,
        important: true,
      };
    case 'legendaryReturned':
      return { text: `${speciesName(e.speciesId)} voltou a ser avistado!`, important: false };
    case 'legendRumor':
      return { text: `Dizem que viram ${speciesName(e.speciesId)} por aí hoje!`, important: true };
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
    case 'effect':
      return { text: effectText(e), important: true };
    case 'itemFound':
      return { text: `Ele deixou cair ${itemName(e.item)}! Guardado na Mochila.`, important: true };
    case 'raidRage':
      return {
        text: `${speciesName(e.speciesId)} ficou FURIOSO, ergueu o escudo e está carregando um golpe gigante!`,
        important: true,
      };
    case 'raidAlly':
      return { text: `${speciesName(e.speciesId)} de ${e.name} acertou o chefe!`, important: false };
    case 'raidShieldBroken':
      return { text: `O escudo quebrou! ${speciesName(e.speciesId)} ficou atordoado!`, important: true };
    case 'raidBlast':
      return { text: `${speciesName(e.speciesId)} soltou o golpe gigante!`, important: true };
    case 'raidFailed':
      return { text: `O tempo acabou! ${speciesName(e.speciesId)} escapou da raide.`, important: true };
    case 'raidDefeated': {
      const loot = Object.entries(e.items)
        .map(([id, n]) => `${itemName(id)} ×${n}`)
        .join(', ');
      return {
        text: `Raide vencida! Recebeu ${e.coins} moedas${loot ? ` e ${loot}` : ''}.${e.caught ? ` ${speciesName(e.speciesId)} foi capturado!` : ' Ele fugiu antes da captura…'}`,
        important: true,
      };
    }
    case 'rematchDefeated': {
      const loot = Object.entries(e.items)
        .map(([id, n]) => `${itemName(id)} ×${n}`)
        .join(', ');
      return {
        text: `Revanche vencida contra ${getRoute(e.routeId).boss?.name}! +${e.coins} moedas${loot ? ` e ${loot}` : ''}.`,
        important: true,
      };
    }
    case 'towerFloor':
      return { text: `Andar ${e.floor} vencido! +${e.points} BP. Subindo…`, important: true };
    case 'towerEnded':
      return { text: `Fim da subida na Torre de Batalha: andar ${e.floor}.`, important: true };
    default:
      return null;
    case 'tournamentMatch':
      return {
        text: e.won
          ? `Você venceu ${e.opponent} por ${e.score[0]}–${e.score[1]}! +${e.coins} moedas.`
          : `${e.opponent} venceu a partida por ${e.score[1]}–${e.score[0]}…`,
        important: true,
      };
    case 'tournamentEnded':
      return {
        text:
          e.place === 'champion'
            ? 'Você é o CAMPEÃO do torneio da semana!'
            : 'Fim do torneio para você nesta semana. Volte na próxima!',
        important: true,
      };
    case 'ghostDuelEnded':
      return {
        text: e.won
          ? `Você venceu a equipe de ${e.name}!${e.coins ? ` Prêmio da primeira vitória: ${plural(e.coins, 'moeda', 'moedas')}.` : ''}`
          : `A equipe de ${e.name} venceu o duelo…`,
        important: true,
      };
    case 'tradeReceived':
      return {
        text: e.evolvedTo
          ? `${speciesName(e.speciesId)} chegou de ${e.from}… e evoluiu para ${speciesName(e.evolvedTo)}!`
          : `${speciesName(e.speciesId)} chegou de ${e.from}! Cuide bem dele.`,
        important: true,
      };
    case 'merchantAppeared':
      return { text: 'Um mercador viajante chegou! Ofertas por tempo limitado na LOJA.', important: true };
    case 'routeUnlocked':
      return { text: `Uma nova área foi liberada: ${getRoute(e.routeId).name}!`, important: true };
    case 'masteryUp':
      return {
        text: `A sintonia com ${speciesName(e.speciesId)} cresceu! Maestria ${e.level}.`,
        important: true,
      };
    case 'achievement': {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      // Nomes que já terminam em pontuação ("Fisgou!", "Pego!") não ganham outra exclamação.
      const name = a?.name ?? e.id;
      return { text: `Conquista: ${/[!?…]$/.test(name) ? name : `${name}!`}`, important: true };
    }
  }
}
