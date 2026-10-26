import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, Draggable, reduzMovimento, ehCelular } from '../lib/gsap';
import { descricaoAlt, nomeCompleto, porId, srcset, fotoPadrao, type Tenis } from '../lib/catalogo';
import { IconeAnterior, IconeProximo, IconeSeta } from './Icones';

const IDS = ['p265', 'p167', 'p048', 'p009', 'p121', 'p005'];
const VISIVEIS = 4;
const INTERVALO = 4.2;
const GIROS = [0, 1.2, -1.2, 0.6];

/** Pose de cada carta na pilha (a mesma do GSAP), já no HTML pré-renderizado: a de cima aparece antes do JS. */
function poseInicial(k: number, n: number) {
  const j = Math.min(k, VISIVEIS - 1);
  return {
    zIndex: n - k,
    transform: `translateY(${j * 14}px) rotate(${GIROS[j]}deg) scale(${1 - j * 0.06})`,
    ...(k < VISIVEIS ? {} : { opacity: 0, visibility: 'hidden' as const }),
  };
}

/**
 * Pilha de fotos reais do catálogo. A de cima pode ser arrastada e jogada para o lado;
 * sozinha, a pilha avança a cada 4 s enquanto está na tela (parada com "reduzir movimento").
 */
export function Vitrine({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const itens = IDS.map((id) => porId.get(id)).filter(Boolean) as Tenis[];
  const raiz = useRef<HTMLDivElement>(null);
  const cartas = useRef<HTMLButtonElement[]>([]);
  const ordem = useRef(itens.map((_, i) => i));
  const arrastou = useRef(false);
  const ocupado = useRef(false);
  const [topo, setTopo] = useState(0);
  const controle = useRef<{ jogar: (dir: number) => void; voltar: () => void } | null>(null);
  // Na abertura só a carta de cima baixa a foto (ela é o LCP); as de trás entram quando o navegador fica livre
  const [todas, setTodas] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setTodas(true), { timeout: 1500 });
    else setTimeout(() => setTodas(true), 600);
  }, []);

  useGSAP(
    (_, contextSafe) => {
      const n = itens.length;
      const mob = ehCelular();
      const quieto = reduzMovimento();
      const passo = mob ? 12 : 16;
      const giros = GIROS;

      // As cartas de trás aparecem só por baixo: as etiquetas do topo das fotos ficam escondidas
      const pose = (k: number) => ({
        x: 0,
        y: Math.min(k, VISIVEIS - 1) * passo,
        rotation: giros[Math.min(k, VISIVEIS - 1)],
        scale: 1 - Math.min(k, VISIVEIS - 1) * 0.06,
        transformOrigin: '50% 100%',
        zIndex: n - k,
        autoAlpha: k < VISIVEIS ? 1 : 0,
      });

      const arrumar = (animar: boolean) => {
        ordem.current.forEach((idx, k) => {
          const el = cartas.current[idx];
          if (animar) gsap.to(el, { ...pose(k), duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
          else gsap.set(el, pose(k));
        });
        const atual = ordem.current[0];
        cartas.current.forEach((el, i) => {
          el.tabIndex = i === atual ? 0 : -1;
          el.setAttribute('aria-hidden', i === atual ? 'false' : 'true');
        });
        drags.forEach((d, i) => {
          if (i !== atual) d.disable();
        });
        const d = drags.get(atual);
        if (d) d.enable();
        else drags.set(atual, criarDrag(atual));
      };

      const jogar = contextSafe!((dir: number) => {
        if (ocupado.current) return;
        ocupado.current = true;
        const idx = ordem.current[0];
        const el = cartas.current[idx];
        const fim = () => {
          ordem.current.push(ordem.current.shift()!);
          gsap.set(el, { ...pose(n - 1), autoAlpha: 0 });
          arrumar(!quieto);
          setTopo(ordem.current[0]);
          ocupado.current = false;
        };
        if (quieto) return fim();
        gsap.to(el, {
          x: dir * el.offsetWidth * 1.15,
          y: 30,
          rotation: dir * 18,
          autoAlpha: 0,
          duration: 0.42,
          ease: 'power2.in',
          onComplete: fim,
        });
      });

      const voltar = contextSafe!(() => {
        if (ocupado.current) return;
        ocupado.current = true;
        const idx = ordem.current.pop()!;
        ordem.current.unshift(idx);
        const el = cartas.current[idx];
        setTopo(idx);
        if (quieto) {
          arrumar(false);
          ocupado.current = false;
          return;
        }
        gsap.set(el, { x: -el.offsetWidth * 0.55, y: 20, rotation: -10, autoAlpha: 0, zIndex: n + 1 });
        arrumar(true);
        gsap.delayedCall(0.6, () => (ocupado.current = false));
      });

      // O arrasto só existe na carta de cima e é criado na primeira vez que ela chega ao topo
      // (seis Draggables de uma vez mediam o layout seis vezes na abertura da página).
      const drags = new Map<number, Draggable>();
      const criarDrag = (i: number) => {
        const el = cartas.current[i];
        return Draggable.create(el, {
          type: 'x',
          dragClickables: true,
          minimumMovement: 6,
          zIndexBoost: false,
          onDragStart() {
            arrastou.current = true;
            relogio?.pause();
          },
          onDrag() {
            gsap.set(el, { rotation: this.x / 14 });
          },
          // onDragEnd só dispara quando houve arrasto (no onRelease o isDragging já vem falso)
          onDragEnd() {
            const v = Math.abs(this.x) > el.offsetWidth * 0.28;
            if (v) jogar(this.x < 0 ? -1 : 1);
            else gsap.to(el, { x: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
            setTimeout(() => (arrastou.current = false), 60);
            relogio?.restart(true);
          },
        })[0];
      };

      arrumar(false);
      controle.current = { jogar, voltar };

      let relogio: gsap.core.Tween | null = null;
      if (!quieto) {
        // sai para a direita, longe do título
        relogio = gsap.delayedCall(INTERVALO, function repetir() {
          jogar(1);
          relogio = gsap.delayedCall(INTERVALO, repetir);
        });
        relogio.pause();
        // só anda enquanto está na tela e depois que a página abriu
        const io = new IntersectionObserver(([e]) => (e.isIntersecting ? relogio?.resume() : relogio?.pause()), { threshold: 0.4 });
        io.observe(raiz.current!);
        const el = raiz.current!;
        const parar = () => relogio?.pause();
        const seguir = () => relogio?.resume();
        el.addEventListener('pointerenter', parar);
        el.addEventListener('pointerleave', seguir);
        return () => {
          io.disconnect();
          el.removeEventListener('pointerenter', parar);
          el.removeEventListener('pointerleave', seguir);
          drags.forEach((d) => d.kill());
        };
      }
      return () => drags.forEach((d) => d.kill());
    },
    { scope: raiz },
  );

  const atual = itens[topo];

  return (
    <div className="vitrine" ref={raiz}>
      <div className="vitrine__pilha" role="group" aria-roledescription="vitrine" aria-label="Modelos em destaque">
        {itens.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className="vitrine__carta"
            ref={(el) => {
              if (el) cartas.current[i] = el;
            }}
            style={{ background: t.bg, ...poseInicial(i, itens.length) }}
            onClick={() => {
              if (arrastou.current) return;
              aoAbrir(t.id);
            }}
            aria-label={`Ver ${descricaoAlt(t)}`}
          >
            {i === 0 || todas ? (
              <img
                src={fotoPadrao(t, 720)}
                srcSet={srcset(t)}
                sizes="(max-width: 767px) 78vw, 420px"
                width={t.w}
                height={t.h}
                alt=""
                draggable={false}
                fetchPriority={i === 0 ? 'high' : 'low'}
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="vitrine__legenda">
        <button type="button" className="btn-redondo" onClick={() => controle.current?.voltar()} aria-label="Modelo anterior">
          <IconeAnterior width={20} height={20} />
        </button>
        <button type="button" className="vitrine__nome" onClick={() => aoAbrir(atual.id)}>
          <span className="vitrine__marca">{atual.marca}</span>
          <span>
            {nomeCompleto(atual).replace(`${atual.marca} `, '')} <IconeSeta width={15} height={15} />
          </span>
        </button>
        <button type="button" className="btn-redondo" onClick={() => controle.current?.jogar(1)} aria-label="Próximo modelo">
          <IconeProximo width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
