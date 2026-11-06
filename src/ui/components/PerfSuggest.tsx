// Se a máquina parece fraca ou a luta está travando, oferece o modo Desempenho, uma vez só.

import { useEffect, useState } from 'react';
import { isTauri } from '../../engine/storage';
import { LOW_FPS, isPerfMode, looksWeak } from '../perfMode';
import { useEngine } from '../useGame';

const ASKED_KEY = 'pokeidle.perfAsked';
const SAMPLE_DELAY_MS = 8_000;
const SAMPLE_MS = 8_000;

function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return true;
  }
}

function remember(): void {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // Sem acesso ao armazenamento: pode perguntar de novo na próxima abertura.
  }
}

const canAsk = () => import.meta.env.PROD && !isTauri() && !isPerfMode() && !alreadyAsked();

export function PerfSuggest() {
  const engine = useEngine();
  const [show, setShow] = useState(() => {
    if (!canAsk()) return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    return looksWeak(nav.hardwareConcurrency, nav.deviceMemory);
  });

  useEffect(() => {
    if (!canAsk() || show) return;
    // Mede o que o jogador está vendo: com a aba em segundo plano, os quadros param e a conta não vale.
    let raf = 0;
    const start = setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      const t0 = performance.now();
      let frames = 0;
      const count = () => {
        frames++;
        if (performance.now() - t0 < SAMPLE_MS) {
          raf = requestAnimationFrame(count);
        } else if (document.visibilityState === 'visible' && frames / (SAMPLE_MS / 1000) < LOW_FPS) {
          setShow(true);
        }
      };
      raf = requestAnimationFrame(count);
    }, SAMPLE_DELAY_MS);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
    // Mede uma vez, ao entrar no jogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;
  const close = () => {
    remember();
    setShow(false);
  };
  return (
    <div className="update-notice safety-notice frame frame-dialog" role="status">
      <p>
        <strong>O jogo parece pesado neste aparelho.</strong> O modo Desempenho deixa tudo mais leve: a
        batalha fica mais simples, mas o progresso é o mesmo.
      </p>
      <span className="update-notice-actions">
        <button
          className="pbtn small primary"
          onClick={() => {
            engine.dispatch((s) => void (s.settings.graphics = 'performance'));
            close();
          }}
        >
          Ativar
        </button>
        <button className="pbtn small" onClick={close}>
          Agora não
        </button>
      </span>
    </div>
  );
}
