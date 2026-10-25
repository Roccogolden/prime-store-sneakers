import { useCallback, useEffect, useMemo, useState } from 'react';
import { filtrar, filtroVazio, porId, type Filtro, type Linha } from './lib/catalogo';
import { rolarPara } from './lib/gsap';
import { Abertura } from './components/Abertura';
import { Cabecalho } from './components/Cabecalho';
import { Hero } from './components/Hero';
import { FaixaMarcas } from './components/FaixaMarcas';
import { Marcas } from './components/Marcas';
import { Catalogo, prepararFlip } from './components/Catalogo';
import { Prime } from './components/Prime';
import { Instagram } from './components/Instagram';
import { Fechamento } from './components/Fechamento';
import { Rodape } from './components/Rodape';
import { BotaoWhatsapp } from './components/BotaoWhatsapp';
import { Detalhe } from './components/Detalhe';

const LINHAS: Linha[] = ['todos', 'tenis', 'chuteiras', 'infantil'];

function lerUrl() {
  const p = new URLSearchParams(window.location.search);
  const linha = p.get('linha') as Linha | null;
  const filtro: Filtro = {
    linha: linha && LINHAS.includes(linha) ? linha : 'todos',
    marca: p.get('marca') ?? '',
    modelo: p.get('modelo') ?? '',
    num: p.get('num') ?? '',
    busca: p.get('q') ?? '',
  };
  const m = p.get('m');
  return { filtro, aberto: m && porId.has(m) ? m : null };
}

function montarUrl(filtro: Filtro, aberto: string | null) {
  const p = new URLSearchParams();
  if (filtro.linha !== 'todos') p.set('linha', filtro.linha);
  if (filtro.marca) p.set('marca', filtro.marca);
  if (filtro.modelo) p.set('modelo', filtro.modelo);
  if (filtro.num) p.set('num', filtro.num);
  if (filtro.busca) p.set('q', filtro.busca);
  if (aberto) p.set('m', aberto);
  const s = p.toString();
  return `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`;
}

export default function App() {
  const inicial = useMemo(lerUrl, []);
  const [filtro, setFiltro] = useState<Filtro>(inicial.filtro);
  const [aberto, setAberto] = useState<string | null>(inicial.aberto);
  const lista = useMemo(() => filtrar(filtro), [filtro]);

  // Filtros ficam no endereço (dá para mandar o link filtrado)
  useEffect(() => {
    window.history.replaceState(window.history.state, '', montarUrl(filtro, aberto));
  }, [filtro, aberto]);

  // Voltar do navegador (ou o gesto do celular) fecha o detalhe
  useEffect(() => {
    const aoVoltar = () => setAberto(lerUrl().aberto);
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);

  const aoFiltrar = useCallback((parcial: Partial<Filtro>) => {
    prepararFlip();
    setFiltro((f) => ({ ...f, ...parcial }));
  }, []);

  const escolherMarca = useCallback(
    (marca: string) => {
      aoFiltrar({ ...filtroVazio, marca });
      rolarPara('#catalogo');
    },
    [aoFiltrar],
  );

  const escolherLinha = useCallback(
    (linha: Linha) => {
      aoFiltrar({ ...filtroVazio, linha });
      rolarPara('#catalogo');
    },
    [aoFiltrar],
  );

  // Abrir cria uma entrada no histórico; o endereço já tem os filtros (efeito acima)
  const abrir = useCallback((id: string) => {
    const p = new URLSearchParams(window.location.search);
    p.set('m', id);
    window.history.pushState({ detalhe: true }, '', `${window.location.pathname}?${p}`);
    setAberto(id);
  }, []);

  const trocar = useCallback((id: string) => setAberto(id), []);

  const fechar = useCallback(() => {
    if (window.history.state?.detalhe) window.history.back();
    else setAberto(null);
  }, []);

  return (
    <>
      <a className="pular" href="#catalogo">
        Pular para o catálogo
      </a>
      <Abertura />
      <Cabecalho />
      <main>
        <Hero aoAbrir={abrir} />
        <FaixaMarcas aoEscolher={escolherMarca} />
        <Marcas aoEscolherMarca={escolherMarca} aoEscolherLinha={escolherLinha} />
        <Catalogo filtro={filtro} lista={lista} aoFiltrar={aoFiltrar} aoAbrir={abrir} />
        <Prime />
        <Instagram />
        <Fechamento />
      </main>
      <Rodape />
      <BotaoWhatsapp escondido={aberto !== null} />
      {aberto ? <Detalhe id={aberto} sequencia={lista} numPreferida={filtro.num} aoTrocar={trocar} aoFechar={fechar} /> : null}
    </>
  );
}
