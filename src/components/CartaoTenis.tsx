import { memo } from 'react';
import { fotoPadrao, fundoDesfocado, resumoNumeracoes, srcset, type Tenis } from '../lib/catalogo';

interface Props {
  t: Tenis;
  aoAbrir: (id: string) => void;
  /** false enquanto a grade está longe da tela (o HTML pré-renderizado sai sem as fotos). */
  foto: boolean;
}

/** Fotos deitadas ou quadradas aparecem inteiras sobre elas mesmas desfocadas; as em pé preenchem o cartão. */
export const CartaoTenis = memo(function CartaoTenis({ t, aoAbrir, foto }: Props) {
  const inteira = t.h / t.w < 1.2;
  const marca = t.marca === 'Personagens' ? 'Infantil' : t.marca;
  return (
    <li className="cartao" data-id={t.id}>
      {/* sem aria-label: o nome lido é o próprio texto do cartão (marca, modelo, cor e numerações) */}
      <button type="button" className="cartao__botao" onClick={() => aoAbrir(t.id)}>
        <span className={`cartao__foto${inteira ? ' cartao__foto--inteira' : ''}`} style={{ background: inteira && foto ? fundoDesfocado(t) : t.bg }}>
          {foto ? (
            <img
              src={fotoPadrao(t, 400)}
              srcSet={srcset(t)}
              sizes="(max-width: 767px) 47vw, (max-width: 1099px) 31vw, 290px"
              width={t.w}
              height={t.h}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </span>
        <span className="cartao__info">
          <span className="cartao__marca">{marca}</span>
          <span className="cartao__modelo">{t.modelo}</span>
          <span className="cartao__cor">{t.cor}</span>
          <span className="cartao__nums">
            <span className="visualmente-oculto">Numerações: </span>
            {resumoNumeracoes(t.nums)}
          </span>
        </span>
      </button>
    </li>
  );
});
