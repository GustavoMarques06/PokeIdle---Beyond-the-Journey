// "SALVANDO… NÃO DESLIGUE O JOGO", como nos portáteis. O jogo salva sozinho a cada poucos
// segundos, então o aviso aparece no máximo uma vez por minuto (e some rápido).

import { useEffect, useState } from 'react';
import { useEngine } from '../useGame';
import { ItemIcon } from './common';

const MIN_GAP_MS = 60_000;
const SHOW_MS = 1600;

export function SaveIndicator() {
  const engine = useEngine();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let last = 0;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const off = engine.onSave(() => {
      const now = Date.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      setVisible(true);
      clearTimeout(hide);
      hide = setTimeout(() => setVisible(false), SHOW_MS);
    });
    return () => {
      off();
      clearTimeout(hide);
    };
  }, [engine]);

  if (!visible) return null;
  return (
    <div className="save-indicator frame frame-menu" role="status">
      <ItemIcon id="poke-ball" size={20} />
      <span>SALVANDO… NÃO DESLIGUE O JOGO</span>
    </div>
  );
}
