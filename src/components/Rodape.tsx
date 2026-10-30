import { useRef } from 'react';
import { atualizadoEm, dataCurta } from '../lib/catalogo';
import { gsap, useGSAP, ScrollTrigger, reduzMovimento } from '../lib/gsap';
import { loja, mensagemGeral, whatsappLink } from '../lib/loja';
import { usePerto } from '../lib/perto';
import { IconeInstagram, IconeWhatsapp } from './Icones';

export function Rodape() {
  const assinatura = useRef<HTMLDivElement>(null);
  const perto = usePerto(assinatura);

  // A assinatura fecha a página: as letras sobem de trás da borda, a logo aparece por cima e um reflexo de luz passa
  // pela logo e depois pela palavra, como em metal polido. Depois ele volta a cada 6 s, só com o rodapé na tela.
  useGSAP(
    () => {
      if (!perto) return;
      const raiz = assinatura.current!;
      const palavra = raiz.querySelector<HTMLElement>('.rodape__palavra')!;
      const letras = gsap.utils.toArray<HTMLElement>('.rodape__palavra span', raiz);
      const selo = raiz.querySelector('.rodape__selo')!;
      const brilhoSelo = raiz.querySelector('.rodape__selo i')!;

      // onde cada letra começa na palavra: o reflexo passa contínuo de uma letra para a outra
      const medir = () => letras.forEach((l) => l.style.setProperty('--x', `${l.offsetLeft}px`));
      medir();
      const ro = new ResizeObserver(medir);
      ro.observe(palavra);
      if (reduzMovimento()) return () => ro.disconnect();

      const varrer = () =>
        gsap
          .timeline()
          .fromTo(brilhoSelo, { xPercent: -130 }, { xPercent: 130, duration: 0.75, ease: 'power2.inOut' })
          .fromTo(
            palavra,
            { '--brilho': () => `${-palavra.offsetHeight * 0.7}px` },
            { '--brilho': () => `${palavra.offsetWidth + palavra.offsetHeight * 0.7}px`, duration: 1.5, ease: 'power2.inOut' },
            0.3,
          );

      const repetir = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 6, delay: 6 }).add(varrer());
      const vigia = ScrollTrigger.create({
        trigger: raiz,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (s) => (s.isActive ? repetir.play() : repetir.pause()),
      });
      vigia.disable(); // só começa a vigiar depois da entrada

      gsap.set(letras, { yPercent: 104 });
      gsap.set(selo, { scale: 0.55, autoAlpha: 0 });
      gsap
        .timeline({
          scrollTrigger: { trigger: raiz, start: 'top 94%', once: true },
          onComplete: () => {
            vigia.enable();
            if (vigia.isActive) repetir.play();
          },
        })
        .to(letras, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 })
        .to(selo, { scale: 1, autoAlpha: 1, duration: 0.65, ease: 'back.out(2.2)' }, 0.5)
        .add(varrer(), 1.05);

      return () => ro.disconnect();
    },
    { scope: assinatura, dependencies: [perto] },
  );

  return (
    <footer className="rodape">
      {/* sem o bloco da logo pequena: o cabeçalho fixo já mostra a marca, e a assinatura fecha a página */}
      <div className="secao__miolo rodape__miolo">
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
        <p className="rodape__copy">
          © {new Date().getFullYear()} {loja.nome} · {loja.cidade} – {loja.uf}
        </p>
        <div className="rodape__assinatura" ref={assinatura} aria-hidden="true">
          <span className="rodape__selo">
            <img src="/marca/logo-prime.webp" alt="" width={64} height={64} loading="lazy" />
            <i />
          </span>
          <p className="rodape__palavra">
            {['P', 'R', 'I', 'M', 'E'].map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
