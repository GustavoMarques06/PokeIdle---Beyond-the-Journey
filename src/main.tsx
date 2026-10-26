import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import './ui/styles.css';
import { GameEngine } from './engine/GameEngine';
import { App } from './ui/App';
import { EngineContext } from './ui/useGame';
import { installFrames } from './ui/theme/frames';

installFrames();

const engine = new GameEngine(window.localStorage);
engine.load();
engine.start();

// Salva ao esconder a janela ou fechar o jogo.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') engine.save();
});
window.addEventListener('beforeunload', () => engine.save());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EngineContext.Provider value={engine}>
      <App />
    </EngineContext.Provider>
  </StrictMode>,
);
