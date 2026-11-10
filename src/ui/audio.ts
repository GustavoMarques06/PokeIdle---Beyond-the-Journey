// Áudio do jogo: gritos dos Pokémon (arquivos da PokéAPI) e efeitos/música
// sintetizados com Web Audio, no estilo chiptune.

import { assetUrl, getSpecies } from '../game-data';
import { captureRevealMs, captureShakes } from '../core/capture';
import type { GameEvent, Settings } from '../core/game';

export type Sfx =
  | 'hit'
  | 'crit'
  | 'super'
  | 'weak'
  | 'miss'
  | 'faint'
  | 'throw'
  | 'escape'
  | 'capture'
  | 'levelUp'
  | 'evolve'
  | 'mega'
  | 'victory'
  | 'boss'
  | 'achievement'
  | 'item'
  | 'raid'
  | 'splash'
  | 'coin'
  | 'merchant'
  | 'fanfare'
  | 'heal'
  | 'itemGet'
  | 'cursor'
  | 'click'
  | 'shutter'
  | 'munch'
  | 'grumble'
  | 'splat'
  | 'tick';

type Wave = OscillatorType;

/** Nota MIDI → frequência. */
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Música original em loop (16 passos por compasso, 4 compassos). 0 = pausa.
const LEAD = [
  72, 0, 76, 0, 79, 0, 76, 77, 79, 0, 81, 0, 79, 0, 0, 0, 77, 0, 76, 0, 74, 0, 72, 74, 76, 0, 74, 0, 72, 0, 0,
  0, 72, 0, 76, 0, 79, 0, 84, 83, 81, 0, 79, 0, 77, 0, 79, 0, 81, 0, 79, 77, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0,
  0, 0,
];
const BASS = [48, 55, 53, 55, 45, 52, 50, 52, 48, 55, 53, 55, 43, 50, 47, 50];
const STEP_MS = 125;

/**
 * Parte B do tema das rotas (Am–F–C–G), para o loop não cansar: o tema toca A A B A.
 * Baixo em semínimas: fundamental, quinta, oitava, quinta de cada compasso.
 */
const LEAD_B = [
  76, 0, 0, 74, 72, 0, 69, 0, 72, 0, 76, 0, 74, 0, 0, 0, 77, 0, 0, 76, 74, 0, 72, 0, 69, 0, 72, 0, 74, 0, 0,
  0, 76, 0, 79, 0, 84, 0, 83, 81, 79, 0, 76, 0, 72, 0, 74, 0, 76, 0, 74, 0, 71, 0, 74, 0, 79, 0, 0, 0, 0, 0,
  0, 0,
];
const BASS_B = [45, 41, 48, 43].flatMap((r) => [r, r + 7, r + 12, r + 7]);
/** Ordem das partes do tema das rotas. */
const DAY_FORM: ('A' | 'B')[] = ['A', 'A', 'B', 'A'];

// Tema original da noite: Lá menor (Am–F–Dm–E), mais lento, melodia em onda triangular e
// acompanhamento em arpejo baixinho, sem caixa.
const NIGHT_LEAD = [
  69, 0, 0, 0, 72, 0, 76, 0, 74, 0, 72, 0, 71, 0, 0, 0, 69, 0, 0, 0, 65, 0, 69, 0, 72, 0, 0, 0, 0, 0, 0, 0,
  74, 0, 0, 0, 77, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0, 71, 0, 0, 0, 68, 0, 71, 0, 76, 0, 0, 0, 0, 0, 0, 0,
];
/** Acordes da noite: fundamental e terça (3 = menor, 4 = maior). */
const NIGHT_CHORDS: [number, 3 | 4][] = [
  [57, 3],
  [53, 4],
  [50, 3],
  [52, 4],
];
const NIGHT_STEP_MS = 170;

// Tema original da abertura: mais lento e esperançoso (I–vi–IV–V), com baixo em arpejo.
const INTRO_LEAD = [
  67, 0, 72, 0, 76, 0, 74, 72, 74, 0, 76, 0, 79, 0, 0, 0, 76, 0, 74, 0, 72, 0, 69, 0, 71, 0, 72, 0, 74, 0, 0,
  0, 69, 0, 72, 0, 77, 0, 76, 74, 72, 0, 74, 0, 76, 0, 77, 0, 79, 0, 0, 0, 77, 0, 76, 0, 74, 0, 0, 0, 71, 0,
  0, 0,
];
const INTRO_BASS = [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50];
const INTRO_STEP_MS = 160;
const INTRO_MUSIC_KEY = 'pokeidle.introMusic';

// Tema original de batalha contra chefe (líderes, rival, Elite): Lá menor, Am–F–G–E, mais
// rápido, com baixo em colcheias alternando oitavas e caixa no contratempo.
const BOSS_LEAD = [
  69, 0, 72, 69, 76, 0, 74, 72, 74, 0, 72, 0, 71, 0, 69, 0, 65, 0, 69, 72, 77, 0, 76, 74, 72, 0, 74, 0, 76, 0,
  0, 0, 67, 0, 71, 74, 79, 0, 77, 76, 74, 0, 76, 0, 77, 0, 79, 0, 76, 0, 0, 75, 76, 0, 80, 0, 83, 0, 81, 0,
  80, 0, 76, 0,
];
/** Fundamental de cada compasso (Lá, Fá, Sol, Mi). */
const BOSS_ROOTS = [45, 41, 43, 40];
const BOSS_STEP_MS = 110;

/** Fanfarra de insígnia / Hall da Fama: subida em arpejo e nota longa no fim. */
const FANFARE: [number, number][] = [
  [67, 1],
  [72, 1],
  [76, 1],
  [79, 2],
  [76, 1],
  [79, 1],
  [84, 4],
];

/**
 * Qual música toca: a das rotas de dia ou de noite e a de chefe (seguem as Opções), ou o tema
 * da abertura (botão próprio).
 */
export type MusicTrack = 'game' | 'night' | 'intro' | 'boss';

function readIntroMusic(): boolean {
  try {
    return localStorage.getItem(INTRO_MUSIC_KEY) !== 'off';
  } catch {
    return true;
  }
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: Pick<Settings, 'volume' | 'sfx' | 'cries' | 'music'> = {
    volume: 0.6,
    sfx: true,
    cries: true,
    music: false,
  };
  private cries = new Map<number, HTMLAudioElement>();
  private lastCry = 0;
  private lastHit = 0;
  private lowHpTimer: ReturnType<typeof setInterval> | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private nextNoteAt = 0;
  private track: MusicTrack = 'game';
  private introMusic = readIntroMusic();

  /** Navegadores só liberam áudio após um gesto do usuário. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncMusic();
  }

  configure(s: Pick<Settings, 'volume' | 'sfx' | 'cries' | 'music'>): void {
    const changed =
      s.volume !== this.settings.volume ||
      s.sfx !== this.settings.sfx ||
      s.cries !== this.settings.cries ||
      s.music !== this.settings.music;
    if (!changed) return;
    this.settings = { volume: s.volume, sfx: s.sfx, cries: s.cries, music: s.music };
    this.applyVolume();
    this.syncMusic();
  }

  setTrack(track: MusicTrack): void {
    if (track === this.track) return;
    this.track = track;
    this.musicStep = 0;
    this.stopMusic();
    this.syncMusic();
  }

  get introMusicOn(): boolean {
    return this.introMusic;
  }

  setIntroMusic(on: boolean): void {
    this.introMusic = on;
    try {
      localStorage.setItem(INTRO_MUSIC_KEY, on ? 'on' : 'off');
    } catch {
      // Sem armazenamento (aba privada): vale só nesta sessão.
    }
    this.syncMusic();
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.settings.volume * 0.5;
  }

  private get audible(): boolean {
    return !!this.ctx && this.ctx.state === 'running' && this.settings.volume > 0 && !document.hidden;
  }

  // --- gritos ---------------------------------------------------------------

  cry(speciesId: number): void {
    if (!this.settings.cries || this.settings.volume <= 0 || document.hidden) return;
    const now = performance.now();
    if (now - this.lastCry < 400) return;
    this.lastCry = now;
    let el = this.cries.get(speciesId);
    if (!el) {
      const src = assetUrl(getSpecies(speciesId).cry);
      if (!src) return;
      el = new Audio(src);
      el.preload = 'auto';
      this.cries.set(speciesId, el);
    }
    el.volume = Math.min(1, this.settings.volume * 0.7);
    el.currentTime = 0;
    // Navegadores antigos (e o jsdom) não devolvem uma Promise aqui.
    void el.play()?.catch(() => {});
  }

  // --- efeitos ------------------------------------------------------------------

  private tone(freq: number, start: number, dur: number, wave: Wave, vol: number, slideTo?: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buffer;
    src.connect(gain).connect(this.master!);
    src.start(start);
  }

  private arpeggio(notes: number[], start: number, step: number, wave: Wave, vol: number): void {
    notes.forEach((n, i) => this.tone(hz(n), start + i * step, step * 1.6, wave, vol));
  }

  sfx(name: Sfx): void {
    if (!this.settings.sfx || !this.audible) return;
    const t = this.ctx!.currentTime + 0.01;
    switch (name) {
      case 'hit':
      case 'weak': {
        const now = performance.now();
        if (now - this.lastHit < 60) return;
        this.lastHit = now;
        this.noise(t, 0.08, name === 'weak' ? 0.08 : 0.15);
        this.tone(220, t, 0.08, 'square', 0.06, 110);
        return;
      }
      case 'super':
        // Pancada grave em duas batidas, com o tremor da tela.
        this.noise(t, 0.16, 0.24);
        this.tone(180, t, 0.18, 'square', 0.1, 50);
        this.tone(120, t + 0.07, 0.16, 'triangle', 0.12, 40);
        return;
      case 'crit':
        // Estalo agudo e um brilho subindo: soa diferente do super efetivo.
        this.noise(t, 0.06, 0.2);
        this.tone(1320, t, 0.05, 'square', 0.07, 880);
        this.arpeggio([84, 88, 91], t + 0.04, 0.035, 'triangle', 0.08);
        return;
      case 'miss':
        this.tone(500, t, 0.12, 'triangle', 0.08, 900);
        return;
      case 'faint':
        this.tone(440, t, 0.5, 'square', 0.08, 60);
        return;
      case 'throw':
        this.tone(300, t, 0.18, 'triangle', 0.1, 1200);
        return;
      case 'escape':
        this.arpeggio([67, 64, 60], t, 0.07, 'square', 0.07);
        return;
      case 'capture':
        this.arpeggio([72, 76, 79, 84], t, 0.08, 'square', 0.08);
        this.tone(hz(84), t + 0.32, 0.4, 'triangle', 0.1);
        return;
      case 'levelUp':
        this.arpeggio([67, 71, 74, 79], t, 0.06, 'square', 0.07);
        return;
      case 'evolve':
        this.arpeggio([60, 64, 67, 72, 76, 79, 84], t, 0.09, 'square', 0.07);
        return;
      case 'mega':
        // Energia subindo (grave a agudo), um estouro de ruído e um acorde brilhante.
        this.tone(110, t, 0.5, 'sawtooth', 0.06, 880);
        this.arpeggio([55, 59, 62, 67, 71, 74, 79, 83, 86], t + 0.05, 0.055, 'square', 0.06);
        this.noise(t + 0.5, 0.2, 0.22);
        this.arpeggio([79, 83, 86, 91], t + 0.52, 0.04, 'triangle', 0.09);
        return;
      case 'victory':
        this.arpeggio([72, 79], t, 0.06, 'square', 0.05);
        return;
      case 'boss':
        this.arpeggio([60, 64, 67, 72, 67, 72, 76, 84], t, 0.1, 'square', 0.08);
        return;
      case 'fanfare': {
        let at = t;
        for (const [note, beats] of FANFARE) {
          this.tone(hz(note), at, 0.11 * beats * 1.2, 'square', 0.07);
          this.tone(hz(note - 12), at, 0.11 * beats * 1.2, 'triangle', 0.08);
          at += 0.11 * beats;
        }
        return;
      }
      case 'achievement':
        this.arpeggio([76, 79, 84, 88], t, 0.07, 'triangle', 0.12);
        return;
      case 'click':
        this.tone(880, t, 0.03, 'square', 0.04);
        return;
      case 'tick':
        // Tique do relógio nos últimos segundos da raide.
        this.tone(1760, t, 0.04, 'square', 0.035);
        this.tone(880, t + 0.05, 0.03, 'square', 0.02);
        return;
      case 'cursor':
        // Bipe curto e baixo do cursor passando pelos menus.
        this.tone(1320, t, 0.025, 'square', 0.025);
        return;
      case 'shutter':
        // Câmera: estalo do obturador, uma pausa e o avanço do filme.
        this.noise(t, 0.03, 0.2);
        this.tone(2000, t, 0.02, 'square', 0.05);
        this.noise(t + 0.09, 0.05, 0.1);
        this.tone(600, t + 0.1, 0.06, 'triangle', 0.05, 900);
        return;
      case 'munch':
        // Comendo: três mordidinhas.
        for (let i = 0; i < 3; i++)
          this.tone(hz(64 + (i % 2) * 3), t + 0.22 + i * 0.09, 0.05, 'square', 0.05);
        return;
      case 'grumble':
        // Irritado: rosnado grave tremendo.
        this.tone(140, t + 0.22, 0.3, 'sawtooth', 0.06, 90);
        this.tone(150, t + 0.3, 0.2, 'square', 0.04, 100);
        return;
      case 'splat':
        // Lama: "plop" molhado.
        this.noise(t + 0.22, 0.12, 0.16);
        this.tone(400, t + 0.22, 0.14, 'triangle', 0.08, 120);
        return;
      case 'itemGet':
        // Jingle de item recebido: subida curta e acorde no fim.
        this.arpeggio([72, 76, 79], t, 0.08, 'square', 0.06);
        this.tone(hz(84), t + 0.24, 0.35, 'square', 0.06);
        this.tone(hz(76), t + 0.24, 0.35, 'triangle', 0.07);
        return;
      case 'heal': {
        // Jingle de cura do Centro Pokémon (original): seis notas e um acorde longo.
        const notes = [76, 79, 84, 79, 81, 84];
        notes.forEach((n, i) => this.tone(hz(n), t + i * 0.16, 0.2, 'square', 0.055));
        this.tone(hz(88), t + 0.96, 0.6, 'square', 0.05);
        this.tone(hz(76), t + 0.96, 0.6, 'triangle', 0.08);
        this.tone(hz(64), t + 0.96, 0.6, 'triangle', 0.06);
        return;
      }
      case 'item':
        this.arpeggio([79, 84], t, 0.05, 'triangle', 0.08);
        return;
      case 'raid':
        this.arpeggio([48, 55, 48, 55, 60], t, 0.12, 'sawtooth', 0.06);
        this.noise(t + 0.1, 0.2, 0.08);
        return;
      case 'splash':
        this.noise(t, 0.22, 0.12);
        this.tone(900, t, 0.15, 'sine', 0.05, 300);
        return;
      case 'coin':
        this.tone(hz(88), t, 0.05, 'square', 0.05);
        this.tone(hz(93), t + 0.05, 0.12, 'square', 0.05);
        return;
      case 'merchant':
        this.arpeggio([72, 76, 79, 76, 84], t, 0.08, 'triangle', 0.1);
        return;
    }
  }

  /** Traduz eventos do jogo em sons. */
  play(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'spawn':
          if (e.shiny && !e.boss) this.sfx('fanfare');
          if (e.water) this.sfx('splash');
          this.cry(e.speciesId);
          break;
        case 'megaEvolved':
          this.sfx('mega');
          this.cry(e.speciesId);
          break;
        case 'switched':
          // Quem entra também solta o grito (se o inimigo gritou há pouco, o limite evita sobrepor).
          this.cry(e.to);
          break;
        case 'merchantAppeared':
          this.sfx('merchant');
          break;
        case 'companionFound':
          this.sfx('item');
          break;
        case 'researchComplete':
          this.sfx('achievement');
          break;
        case 'safariResult':
          if (e.outcome === 'caught') this.sfx('capture');
          else if (e.outcome === 'missed' || e.outcome === 'fled') this.sfx('escape');
          else if (e.outcome === 'photo') this.sfx('shutter');
          else if (e.outcome === 'appeared') this.sfx('cursor');
          else if (e.action !== 'run') {
            this.sfx('throw');
            // O som do humor novo, logo depois do arremesso.
            if (e.outcome === 'stayed')
              this.sfx(
                e.mood === 'eating'
                  ? 'munch'
                  : e.mood === 'angry'
                    ? 'grumble'
                    : e.mood === 'muddy'
                      ? 'splat'
                      : 'cursor',
              );
          }
          break;
        case 'safariGuideReady':
          this.sfx('itemGet');
          break;
        case 'tournamentMatch':
          this.sfx(e.won ? 'boss' : 'faint');
          break;
        case 'tournamentEnded':
          if (e.place === 'champion') this.sfx('achievement');
          break;
        case 'attack': {
          const r = e.result;
          if (r.missed) this.sfx('miss');
          else if (r.crit) this.sfx('crit');
          else if (r.effectiveness > 1) this.sfx('super');
          else if (r.damage > 0) this.sfx(r.effectiveness < 1 ? 'weak' : 'hit');
          break;
        }
        case 'enemyFainted':
          this.sfx('victory');
          break;
        case 'playerFainted':
          this.sfx('faint');
          break;
        case 'supportMove':
          this.sfx(
            e.outcome === 'heal' ? 'heal' : e.outcome === 'miss' || e.outcome === 'immune' ? 'miss' : 'item',
          );
          break;
        case 'captureAttempt':
          // O resultado só soa quando a bola termina de balançar, para não estragar o suspense.
          this.sfx('throw');
          setTimeout(
            () => this.sfx(e.success ? 'capture' : 'escape'),
            captureRevealMs(captureShakes(e.chance, e.success)),
          );
          break;
        case 'levelUp':
          this.sfx('levelUp');
          break;
        case 'evolved':
          this.sfx('evolve');
          break;
        case 'bossDefeated':
          // Insígnia ou título de campeão: fanfarra; os outros chefes, o arpejo de sempre.
          this.sfx(e.badge || e.champion ? 'fanfare' : 'boss');
          break;
        case 'effect':
        case 'itemFound':
          this.sfx('item');
          break;
        case 'raidAppeared':
        case 'raidRage':
          this.sfx('raid');
          break;
        case 'raidDefeated':
        case 'rematchDefeated':
          this.sfx('boss');
          break;
        case 'raidFailed':
          this.sfx('faint');
          break;
        case 'achievement':
        case 'masteryUp':
          this.sfx('achievement');
          break;
      }
    }
  }

  // --- alarme de HP baixo ---------------------------------------------------------------

  /**
   * Bipe de HP baixo, como nos portáteis. Num jogo idle o Pokémon pode ficar fraco por
   * muito tempo, então o alarme toca alguns segundos e para (volta a tocar se o HP subir
   * e cair de novo).
   */
  lowHpAlarm(on: boolean): void {
    if (this.lowHpTimer) {
      clearInterval(this.lowHpTimer);
      this.lowHpTimer = null;
    }
    if (!on) return;
    let beeps = 0;
    const beep = () => {
      if (++beeps > 8) return this.lowHpAlarm(false);
      if (!this.settings.sfx || !this.audible) return;
      const t = this.ctx!.currentTime + 0.01;
      this.tone(hz(88), t, 0.08, 'square', 0.035);
      this.tone(hz(84), t + 0.12, 0.08, 'square', 0.035);
    };
    beep();
    this.lowHpTimer = setInterval(beep, 500);
  }

  // --- música -----------------------------------------------------------------------

  private syncMusic(): void {
    const enabled = this.track === 'intro' ? this.introMusic : this.settings.music;
    const shouldPlay = enabled && this.settings.volume > 0 && !!this.ctx;
    if (shouldPlay && !this.musicTimer) {
      this.nextNoteAt = this.ctx!.currentTime + 0.1;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
    } else if (!shouldPlay) this.stopMusic();
  }

  private stopMusic(): void {
    if (!this.musicTimer) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  /** Agenda as notas dos próximos ~200 ms (lookahead), para não depender da precisão do timer. */
  private scheduleMusic(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.track === 'boss') return this.scheduleBoss();
    if (this.track === 'night') return this.scheduleNight();
    const intro = this.track === 'intro';
    const step = (intro ? INTRO_STEP_MS : STEP_MS) / 1000;
    while (this.nextNoteAt < this.ctx.currentTime + 0.2) {
      // O tema das rotas alterna as partes (A A B A); a abertura repete a mesma.
      const part = intro ? 'A' : DAY_FORM[Math.floor(this.musicStep / LEAD.length) % DAY_FORM.length];
      const leadNotes = intro ? INTRO_LEAD : part === 'B' ? LEAD_B : LEAD;
      const bassNotes = intro ? INTRO_BASS : part === 'B' ? BASS_B : BASS;
      const i = this.musicStep % leadNotes.length;
      const lead = leadNotes[i];
      if (lead) this.tone(hz(lead), this.nextNoteAt, step * 1.8, intro ? 'triangle' : 'square', 0.035);
      if (intro) {
        // Arpejo do acorde (fundamental, quinta, terça, quinta) em colcheias.
        if (i % 2 === 0) {
          const chord = bassNotes.slice(Math.floor(i / 16) * 4, Math.floor(i / 16) * 4 + 4);
          this.tone(hz(chord[(i / 2) % 4]), this.nextNoteAt, step * 1.6, 'square', 0.025);
        }
        if (i % 16 === 0)
          this.tone(
            hz(bassNotes[(i / 4) % bassNotes.length] - 12),
            this.nextNoteAt,
            step * 14,
            'triangle',
            0.08,
          );
      } else {
        if (i % 4 === 0)
          this.tone(hz(bassNotes[(i / 4) % bassNotes.length]), this.nextNoteAt, step * 3.5, 'triangle', 0.09);
        if (i % 8 === 4) this.noise(this.nextNoteAt, 0.04, 0.03);
      }
      this.musicStep++;
      this.nextNoteAt += step;
    }
  }

  private scheduleNight(): void {
    const step = NIGHT_STEP_MS / 1000;
    while (this.nextNoteAt < this.ctx!.currentTime + 0.2) {
      const i = this.musicStep % NIGHT_LEAD.length;
      const lead = NIGHT_LEAD[i];
      if (lead) this.tone(hz(lead), this.nextNoteAt, step * 3, 'triangle', 0.06);
      const [root, third] = NIGHT_CHORDS[Math.floor(i / 16) % NIGHT_CHORDS.length];
      // Arpejo fundamental–terça–quinta–terça em colcheias, bem baixo, e baixo longo por compasso.
      if (i % 2 === 0) {
        const tones = [0, third, 7, third];
        this.tone(hz(root + 12 + tones[(i / 2) % 4]), this.nextNoteAt, step * 1.5, 'square', 0.012);
      }
      if (i % 16 === 0) this.tone(hz(root - 12), this.nextNoteAt, step * 15, 'triangle', 0.08);
      if (i % 8 === 6) this.noise(this.nextNoteAt, 0.02, 0.012);
      this.musicStep++;
      this.nextNoteAt += step;
    }
  }

  private scheduleBoss(): void {
    const step = BOSS_STEP_MS / 1000;
    while (this.nextNoteAt < this.ctx!.currentTime + 0.2) {
      const i = this.musicStep % BOSS_LEAD.length;
      const lead = BOSS_LEAD[i];
      if (lead) this.tone(hz(lead), this.nextNoteAt, step * 1.7, 'square', 0.032);
      if (i % 2 === 0) {
        const root = BOSS_ROOTS[Math.floor(i / 16) % BOSS_ROOTS.length];
        this.tone(hz(root + ((i / 2) % 2 ? 12 : 0)), this.nextNoteAt, step * 1.8, 'triangle', 0.09);
      }
      if (i % 8 === 4) this.noise(this.nextNoteAt, 0.05, 0.04);
      this.musicStep++;
      this.nextNoteAt += step;
    }
  }
}

export const audio = new AudioManager();
