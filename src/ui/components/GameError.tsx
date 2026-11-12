// Se algo quebrar na tela, em vez da página em branco: uma tela do jogo com o Professor, o aviso de que o progresso
// está salvo e o botão para reiniciar. O detalhe técnico fica recolhido, para quem quiser mandar no relato.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { assetUrl, trainerSprite } from '../../game-data';

interface State {
  error: Error | null;
}

export class GameErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="game-error" role="alert">
        <div className="game-error-box frame frame-dialog">
          <img className="game-error-oak" src={assetUrl(trainerSprite('oak'))} alt="" draggable={false} />
          <div>
            <h1>Ops! Algo deu errado.</h1>
            <p>
              Não se preocupe: o seu progresso está salvo. Reinicie o jogo para continuar de onde parou.
            </p>
            <button className="pbtn primary" onClick={() => window.location.reload()}>
              REINICIAR O JOGO
            </button>
            <details>
              <summary>Detalhe para o relato</summary>
              <code>{error.message}</code>
            </details>
          </div>
        </div>
      </div>
    );
  }
}
