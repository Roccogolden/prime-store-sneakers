import { useRef } from 'react';
import { itens } from '../lib/catalogo';
import { gsap, useGSAP, reduzMovimento, rolarPara } from '../lib/gsap';
import { EVENTO_ABERTURA_SAINDO } from './Abertura';
import { IconeSeta } from './Icones';
import { Vitrine } from './Vitrine';

// Fatos do catálogo, no lugar das frases genéricas do print (pedido do usuário em 30/10/2026).
const DESTAQUES = [
  { titulo: `${itens.length} modelos`, texto: 'Tênis, chuteiras e infantil' },
  // espaço inseparável: no celular o "48" ficava sozinho na linha
  { titulo: 'Do infantil ao 48', texto: 'Filtre pela sua numeração' },
  { titulo: 'Entrega na região', texto: 'Aparecida e arredores' },
];

export function Hero({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const raiz = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduzMovimento()) return;
      const q = gsap.utils.selector(raiz);
      const anel = q('.hero__anel circle');
      // O conteúdo já nasce pronto debaixo da cortina da abertura e só desliza para o lugar quando ela sobe
      // (sem opacidade zero: o título e a foto contam como carregados logo no primeiro quadro).
      gsap.set(q('.hero__olho, .hero__texto, .hero__botoes > *'), { y: 22 });
      gsap.set(q('.hero__linha'), { yPercent: 45, skewY: 4 });
      gsap.set(q('.hero__destaques li'), { x: -14 });
      gsap.set(q('.hero__destaques li i'), { scaleY: 0, transformOrigin: '50% 0%' });
      gsap.set(q('.vitrine'), { y: 40, rotation: -4 });
      gsap.set(anel, { drawSVG: '0%' });

      const entrar = () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .to(q('.hero__olho'), { y: 0, duration: 0.6 })
          .to(q('.hero__linha'), { yPercent: 0, skewY: 0, duration: 1, ease: 'expo.out', stagger: 0.12 }, 0.05)
          .to(q('.hero__texto'), { y: 0, duration: 0.8 }, 0.25)
          .to(q('.hero__botoes > *'), { y: 0, duration: 0.7, stagger: 0.08, ease: 'back.out(1.6)' }, 0.35)
          .to(q('.hero__destaques li'), { x: 0, duration: 0.6, stagger: 0.08 }, 0.5)
          .to(q('.hero__destaques li i'), { scaleY: 1, duration: 0.5, stagger: 0.08, ease: 'power2.inOut' }, 0.55)
          .to(q('.vitrine'), { y: 0, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.75)' }, 0.25)
          .to(anel, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' }, 0.2);
      };

      if ((window as unknown as { __aberturaSaiu?: boolean }).__aberturaSaiu) entrar();
      else window.addEventListener(EVENTO_ABERTURA_SAINDO, entrar, { once: true });

      // o anel (um ilhós grande) desce mais devagar que a página
      gsap.to(q('.hero__anel'), {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

      return () => window.removeEventListener(EVENTO_ABERTURA_SAINDO, entrar);
    },
    { scope: raiz },
  );

  return (
    <section className="hero" id="topo" ref={raiz} aria-labelledby="hero-titulo">
      <svg className="hero__anel" viewBox="0 0 600 600" aria-hidden="true">
        <circle cx="300" cy="300" r="290" />
      </svg>
      <div className="hero__grade">
        <div className="hero__conteudo">
          <p className="hero__olho">Tênis • Moda • Estilo</p>
          <h1 id="hero-titulo" className="hero__titulo">
            <span className="hero__linha">Seu estilo.</span>
            <span className="hero__linha hero__linha--ouro">Sua presença.</span>
          </h1>
          <p className="hero__texto">
            Modelos que elevam o visual e destacam sua personalidade. Escolha seu próximo par na Prime Store.
          </p>
          <div className="hero__botoes">
            <a
              href="#catalogo"
              className="btn btn--ouro btn--grande"
              onClick={(e) => {
                e.preventDefault();
                rolarPara('#catalogo');
              }}
            >
              Explorar coleção <IconeSeta width={20} height={20} />
            </a>
            <a
              href="#prime"
              className="btn btn--contorno btn--grande"
              onClick={(e) => {
                e.preventDefault();
                rolarPara('#prime');
              }}
            >
              Conheça a Prime
            </a>
          </div>
          <ul className="hero__destaques">
            {DESTAQUES.map((d) => (
              <li key={d.titulo}>
                <i aria-hidden="true" />
                <strong>{d.titulo}</strong>
                <span>{d.texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <Vitrine aoAbrir={aoAbrir} />
      </div>
    </section>
  );
}
