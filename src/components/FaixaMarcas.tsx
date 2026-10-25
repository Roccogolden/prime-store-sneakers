import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, reduzMovimento } from '../lib/gsap';
import { marcas } from '../lib/catalogo';
import { usePerto } from '../lib/perto';

const NA_FAIXA = marcas.filter((m) => m.nome !== 'Outras marcas' && m.nome !== 'Personagens' && m.total >= 4);

/** Faixa com os nomes das marcas do catálogo. Anda sozinha e acelera com a rolagem; cada nome filtra o catálogo. */
export function FaixaMarcas({ aoEscolher }: { aoEscolher: (marca: string) => void }) {
  const raiz = useRef<HTMLDivElement>(null);
  const perto = usePerto(raiz);

  useGSAP(
    () => {
      if (!perto || reduzMovimento()) return;
      const faixa = raiz.current!.querySelector('.faixa__trilha')!;
      const giro = gsap.to(faixa, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
      // Velocidade por um único quickTo (nada de tween novo a cada quadro de rolagem)
      const vel = { v: 1 };
      const irPara = gsap.quickTo(vel, 'v', { duration: 0.5, ease: 'power2.out', onUpdate: () => giro.timeScale(vel.v) });
      const voltar = gsap.delayedCall(0.2, () => irPara(1)).pause();
      const el = raiz.current!;
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => (self.isActive ? giro.resume() : giro.pause()),
        onUpdate: (self) => {
          irPara(gsap.utils.clamp(1, 4, 1 + Math.abs(self.getVelocity()) / 900));
          voltar.restart(true);
        },
      });
      const parar = () => irPara(0);
      const seguir = () => irPara(1);
      el.addEventListener('pointerenter', parar);
      el.addEventListener('pointerleave', seguir);
      el.addEventListener('focusin', parar);
      el.addEventListener('focusout', seguir);
      return () => {
        st.kill();
        el.removeEventListener('pointerenter', parar);
        el.removeEventListener('pointerleave', seguir);
        el.removeEventListener('focusin', parar);
        el.removeEventListener('focusout', seguir);
      };
    },
    { scope: raiz, dependencies: [perto] },
  );

  const lista = (copia: boolean) =>
    NA_FAIXA.map((m) => (
      <li key={`${m.slug}-${copia}`} aria-hidden={copia || undefined}>
        <button type="button" tabIndex={copia ? -1 : 0} onClick={() => aoEscolher(m.slug)} aria-label={`Ver modelos ${m.nome}`}>
          {m.nome}
        </button>
        <span className="faixa__ilhos" aria-hidden="true" />
      </li>
    ));

  return (
    <div className="faixa" ref={raiz}>
      <ul className="faixa__trilha" aria-label="Marcas do catálogo">
        {lista(false)}
        {lista(true)}
      </ul>
    </div>
  );
}
