import { useRef } from 'react';
import { loja } from '../lib/loja';
import { useFotosPerto } from '../lib/perto';
import { TituloSecao } from './Cadarco';
import { IconeInstagram } from './Icones';
import { Trilho } from './Trilho';

const POSTS = [
  { src: '/instagram/post-1.webp', alt: 'Post da Prime Store: Nike Air Force 1 bege com solado caramelo' },
  { src: '/instagram/post-2.webp', alt: 'Post da Prime Store: Nike Air Force 1 preto com solado azul' },
  { src: '/instagram/post-3.webp', alt: 'Post da Prime Store: tênis preto com pingente dourado' },
  { src: '/instagram/post-4.webp', alt: 'Post da Prime Store: Nike Air Force 1 cinza e preto' },
  { src: '/instagram/post-5.webp', alt: 'Post da Prime Store: Nike Air Force 1 Bulls branco e vermelho' },
];

export function Instagram() {
  const raiz = useRef<HTMLElement>(null);
  const fotos = useFotosPerto(raiz);
  return (
    <section className="secao secao--insta" ref={raiz} aria-labelledby="insta-titulo">
      <div className="secao__miolo">
        <TituloSecao id="insta-titulo" sub={`Os lançamentos aparecem primeiro no ${loja.instagram}.`}>
          Novidades no Instagram
        </TituloSecao>
      </div>
      <Trilho rotulo="Posts do Instagram" className="trilho--insta">
        {POSTS.map((p) => (
          <a key={p.src} className="post" data-item href={loja.instagramUrl} target="_blank" rel="noopener" draggable={false} aria-label={p.alt}>
            {fotos ? <img src={p.src} alt="" width={480} height={600} loading="lazy" draggable={false} /> : null}
          </a>
        ))}
        <a className="post post--seguir" data-item href={loja.instagramUrl} target="_blank" rel="noopener" draggable={false}>
          <IconeInstagram width={34} height={34} />
          <span>Seguir {loja.instagram}</span>
        </a>
      </Trilho>
    </section>
  );
}
