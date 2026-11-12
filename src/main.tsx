import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import './ui/styles/index.css';
import { GameEngine } from './engine/GameEngine';
import { createStorage, isTauri } from './engine/storage';
import { App } from './ui/App';
import { installNotifications } from './ui/notify';
import { requestPersistentStorage } from './ui/backup';
import { startPreload } from './ui/preload';
import { EngineContext } from './ui/useGame';
import { installFrames } from './ui/theme/frames';
import { installAppFeel } from './ui/appFeel';

installFrames();

async function boot(): Promise<void> {
  const engine = new GameEngine(await createStorage());
  engine.load();
  engine.start();
  installNotifications(engine);
  // Só no `npm run dev` (some do build): o motor no console, para testar cerimônias e eventos à mão.
  if (import.meta.env.DEV) (window as unknown as { __engine: GameEngine }).__engine = engine;
  // Jogo, não site: sem arrastar imagens, menu do botão direito, zoom do navegador; Ctrl+S salva o jogo.
  installAppFeel(() => engine.save());

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
}

void boot();

// PWA: no navegador (fora do Tauri), o jogo pode ser instalado e abre sem internet.
if ('serviceWorker' in navigator && import.meta.env.PROD && !isTauri()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker falhou', err));
    requestPersistentStorage();
    // Depois da primeira tela pintada, o resto dos arquivos vai para o cache em segundo plano.
    setTimeout(() => void startPreload(), 1500);
  });
}
