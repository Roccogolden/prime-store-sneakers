import { useRef } from 'react';
import { gsap, useGSAP, reduzMovimento, rolarPara } from '../lib/gsap';
import { EVENTO_ABERTURA_SAINDO } from './Abertura';
import { IconeSeta } from './Icones';
import { Vitrine } from './Vitrine';

const DESTAQUES = [
  { titulo: 'Estilo marcante', texto: 'Modelos para compor seu visual' },
  { titulo: 'Atendimento direto', texto: 'Tire suas dúvidas com a loja' },
  { titulo: 'Escolha seu par', texto: 'Consulte tamanhos disponíveis' },
];

export function Hero({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const raiz = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduzMovimento()) return;
      const q = gsap.utils.selector(raiz);
      const anel = q('.hero__anel circle');
      gsap.set(q('.hero__olho, .hero__texto, .hero__botoes > *'), { autoAlpha: 0, y: 18 });
      gsap.set(q('.hero__linha'), { autoAlpha: 0, yPercent: 60, skewY: 5 });
      gsap.set(q('.hero__destaques li'), { autoAlpha: 0, x: -14 });
      gsap.set(q('.hero__destaques li i'), { scaleY: 0, transformOrigin: '50% 0%' });
      gsap.set(q('.vitrine'), { autoAlpha: 0, y: 40, rotation: -4 });
      gsap.set(anel, { drawSVG: '0%' });

      const entrar = () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .to(q('.hero__olho'), { autoAlpha: 1, y: 0, duration: 0.5 })
          .to(q('.hero__linha'), { autoAlpha: 1, yPercent: 0, skewY: 0, duration: 0.9, ease: 'expo.out', stagger: 0.13 }, 0.05)
          .to(q('.hero__texto'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
          .to(q('.hero__botoes > *'), { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'back.out(1.6)' }, 0.45)
          .to(q('.hero__destaques li'), { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.08 }, 0.6)
          .to(q('.hero__destaques li i'), { scaleY: 1, duration: 0.5, stagger: 0.08, ease: 'power2.inOut' }, 0.6)
          .to(q('.vitrine'), { autoAlpha: 1, y: 0, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.75)' }, 0.3)
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
