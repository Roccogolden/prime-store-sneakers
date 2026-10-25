import { useEffect, useState } from 'react';
import { rolarPara } from '../lib/gsap';
import { loja } from '../lib/loja';
import { IconeInstagram, IconeSeta } from './Icones';

const LINKS = [
  { href: '#marcas', rotulo: 'Marcas' },
  { href: '#catalogo', rotulo: 'Catálogo' },
  { href: '#prime', rotulo: 'A Prime' },
];

export function Cabecalho() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  function ir(e: React.MouseEvent<HTMLAnchorElement>, alvo: string) {
    e.preventDefault();
    rolarPara(alvo);
  }

  return (
    <header className={`cabecalho${rolou ? ' cabecalho--fixo' : ''}`}>
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
        <a href="#catalogo" className="btn btn--ouro btn--pequeno" onClick={(e) => ir(e, '#catalogo')}>
          Ver modelos <IconeSeta width={16} height={16} />
        </a>
      </div>
    </header>
  );
}
