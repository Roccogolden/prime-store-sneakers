import { atualizadoEm, dataCurta } from '../lib/catalogo';
import { loja, mensagemGeral, whatsappLink } from '../lib/loja';
import { IconeInstagram, IconeWhatsapp } from './Icones';

export function Rodape() {
  return (
    <footer className="rodape">
      <div className="secao__miolo rodape__miolo">
        <div className="rodape__marca">
          <img src="/marca/logo-prime.webp" alt="Logo da Prime Store" width={56} height={56} loading="lazy" />
          <div>
            <p className="marca__nome">
              PRIME <span>STORE</span>
            </p>
            <p>
              {loja.cidade} – {loja.uf}
            </p>
          </div>
        </div>
        <ul className="rodape__contatos">
          <li>
            <a href={whatsappLink(mensagemGeral)} target="_blank" rel="noopener">
              <IconeWhatsapp width={18} height={18} /> {loja.whatsappExibido} · {loja.atendente}
            </a>
          </li>
          <li>
            <a href={loja.instagramUrl} target="_blank" rel="noopener">
              <IconeInstagram width={18} height={18} /> {loja.instagram}
            </a>
          </li>
        </ul>
        <p className="rodape__nota">
          Catálogo atualizado em {dataCurta(atualizadoEm)}. As fotos vêm do catálogo do fornecedor; a disponibilidade de cada numeração é
          confirmada no atendimento.
        </p>
        <p className="rodape__copy">© {new Date().getFullYear()} {loja.nome}</p>
      </div>
    </footer>
  );
}
