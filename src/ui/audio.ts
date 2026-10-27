// Áudio do jogo: gritos dos Pokémon (arquivos da PokéAPI) e efeitos/música
// sintetizados com Web Audio, no estilo chiptune.

import { assetUrl, getSpecies } from '../game-data';
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
  | 'victory'
  | 'boss'
  | 'achievement'
  | 'item'
  | 'raid'
  | 'splash'
  | 'coin'
  | 'merchant'
  | 'click';

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
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private nextNoteAt = 0;

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
    void el.play().catch(() => {});
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
      case 'victory':
        this.arpeggio([72, 79], t, 0.06, 'square', 0.05);
        return;
      case 'boss':
        this.arpeggio([60, 64, 67, 72, 67, 72, 76, 84], t, 0.1, 'square', 0.08);
        return;
      case 'achievement':
        this.arpeggio([76, 79, 84, 88], t, 0.07, 'triangle', 0.12);
        return;
      case 'click':
        this.tone(880, t, 0.03, 'square', 0.04);
        return;
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
          if (e.water) this.sfx('splash');
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
          else if (e.action !== 'run') this.sfx('throw');
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
        case 'captureAttempt':
          this.sfx(e.success ? 'capture' : 'escape');
          break;
        case 'levelUp':
          this.sfx('levelUp');
          break;
        case 'evolved':
          this.sfx('evolve');
          break;
        case 'bossDefeated':
          this.sfx('boss');
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

  // --- música -----------------------------------------------------------------------

  private syncMusic(): void {
    const shouldPlay = this.settings.music && this.settings.volume > 0 && !!this.ctx;
    if (shouldPlay && !this.musicTimer) {
      this.nextNoteAt = this.ctx!.currentTime + 0.1;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
    } else if (!shouldPlay && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Agenda as notas dos próximos ~200 ms (lookahead), para não depender da precisão do timer. */
  private scheduleMusic(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const step = STEP_MS / 1000;
    while (this.nextNoteAt < this.ctx.currentTime + 0.2) {
      const i = this.musicStep % LEAD.length;
      const lead = LEAD[i];
      if (lead) this.tone(hz(lead), this.nextNoteAt, step * 1.8, 'square', 0.035);
      if (i % 4 === 0)
        this.tone(hz(BASS[(i / 4) % BASS.length]), this.nextNoteAt, step * 3.5, 'triangle', 0.09);
      if (i % 8 === 4) this.noise(this.nextNoteAt, 0.04, 0.03);
      this.musicStep++;
      this.nextNoteAt += step;
    }
  }
}

export const audio = new AudioManager();
