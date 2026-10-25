import { rolarPara } from '../lib/gsap';
import { loja, mensagemGeral, whatsappLink } from '../lib/loja';
import { LacoNoBotao } from './Cadarco';
import { IconeWhatsapp } from './Icones';

export function Fechamento() {
  return (
    <section className="fechamento" aria-labelledby="fechamento-titulo">
      <div className="secao__miolo fechamento__miolo">
        <h2 id="fechamento-titulo" className="fechamento__titulo">
          Achou o seu par?
        </h2>
        <p className="fechamento__texto">
          Manda pro {loja.atendente} no WhatsApp. Ele confirma a numeração e combina a entrega com você.
        </p>
        <div className="fechamento__botoes">
          <LacoNoBotao>
            <a className="btn btn--ouro btn--grande" href={whatsappLink(mensagemGeral)} target="_blank" rel="noopener">
              <IconeWhatsapp width={22} height={22} /> Chamar no WhatsApp
            </a>
          </LacoNoBotao>
          <a
            href="#catalogo"
            className="link-ouro"
            onClick={(e) => {
              e.preventDefault();
              rolarPara('#catalogo');
            }}
          >
            Voltar ao catálogo
          </a>
        </div>
      </div>
    </section>
  );
}
