// Página de AJUDA (ajuda.html): o guia do jogo numa aba separada, sem o jogo nem o save.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import './ui/styles/index.css';
import { HelpPage } from './ui/help/HelpPage';
import { installFrames } from './ui/theme/frames';

installFrames();
document.body.classList.add('help-body');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelpPage />
  </StrictMode>,
);
