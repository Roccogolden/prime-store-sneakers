import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, reduzMovimento, rolarPara } from '../lib/gsap';
import { loja } from '../lib/loja';
import { IconeInstagram, IconeSacola, IconeSeta } from './Icones';

const LINKS = [
  { href: '#marcas', rotulo: 'Marcas' },
  { href: '#catalogo', rotulo: 'Catálogo' },
  { href: '#prime', rotulo: 'A Prime' },
];

export function Cabecalho({ totalSacola, aoAbrirSacola }: { totalSacola: number; aoAbrirSacola: () => void }) {
  const [rolou, setRolou] = useState(false);
  const sacola = useRef<HTMLButtonElement>(null);
  const totalAntes = useRef(0);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  // A sacola aparece com o primeiro par; depois, o número pula a cada par que entra ou sai
  useGSAP(
    () => {
      const anterior = totalAntes.current;
      totalAntes.current = totalSacola;
      const el = sacola.current;
      if (!el || reduzMovimento() || totalSacola === anterior) return;
      if (anterior === 0) gsap.from(el, { scale: 0.4, autoAlpha: 0, duration: 0.5, ease: 'back.out(2.2)' });
      else gsap.fromTo(el.querySelector('b'), { scale: 1.45 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
    },
    { dependencies: [totalSacola] },
  );

  function ir(e: React.MouseEvent<HTMLAnchorElement>, alvo: string) {
    e.preventDefault();
    rolarPara(alvo);
  }

  return (
    <header className={`cabecalho${rolou ? ' cabecalho--fixo' : ''}${totalSacola > 0 ? ' cabecalho--sacola' : ''}`}>
      <div className="cabecalho__linha">
        <a href="#topo" className="marca" onClick={(e) => ir(e, '#topo')} aria-label="Prime Store, voltar ao início">
          <img src="/marca/logo-prime.webp" alt="" width={44} height={44} className="marca__logo" />
          <span className="marca__nome">
            PRIME <span>STORE</span>
          </span>
        </a>
        <nav className="cabecalho__nav" aria-label="Seções">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => ir(e, l.href)}>
              {l.rotulo}
            </a>
          ))}
          <a href={loja.instagramUrl} target="_blank" rel="noopener" aria-label={`Instagram ${loja.instagram}`} className="cabecalho__insta">
            <IconeInstagram width={20} height={20} />
          </a>
        </nav>
        {totalSacola > 0 ? (
          <button
            type="button"
            ref={sacola}
            className="cabecalho__sacola"
            onClick={aoAbrirSacola}
            aria-label={`Abrir a sacola: ${totalSacola === 1 ? '1 par' : `${totalSacola} pares`}`}
          >
            <IconeSacola width={22} height={22} />
            <b aria-hidden="true">{totalSacola}</b>
          </button>
        ) : null}
        <a href="#catalogo" className="btn btn--ouro btn--pequeno" onClick={(e) => ir(e, '#catalogo')}>
          Ver modelos <IconeSeta width={16} height={16} />
        </a>
      </div>
    </header>
  );
}
