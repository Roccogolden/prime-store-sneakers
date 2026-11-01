import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Carregando, Desligado, Entrar, Esqueci, Redefinir } from './Acesso';
import { chamar, ErroApi, MENSAGENS, mensagemDoErro, sessaoCaiu, type Conta, type Dados } from './api';
import { ContaTela } from './Conta';
import { dataHora, horaCurta, intervalo, nomeDoPeriodo, PERIODOS, type Periodo } from './datas';
import { Resumo } from './Resumo';
import { Vendas } from './Vendas';

type Tela = 'carregando' | 'entrar' | 'esqueci' | 'redefinir' | 'dentro' | 'desligado';
type Aba = 'resumo' | 'vendas' | 'conta';

const ABAS: { id: Aba; nome: string }[] = [
  { id: 'resumo', nome: 'Resumo' },
  { id: 'vendas', nome: 'Vendas' },
  { id: 'conta', nome: 'Conta' },
];

const CHAVE_PERIODO = 'prime-painel-periodo';

function periodoGuardado(): Periodo {
  try {
    const p = localStorage.getItem(CHAVE_PERIODO);
    if (PERIODOS.some((x) => x.id === p)) return p as Periodo;
  } catch {
    /* sem armazenamento */
  }
  return '30d';
}

export function Painel() {
  const [token] = useState(() => new URLSearchParams(location.search).get('redefinir') ?? '');
  const [tela, setTela] = useState<Tela>(token ? 'redefinir' : 'carregando');
  const [conta, setConta] = useState<Conta | null>(null);
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState<Aba>('resumo');
  const [periodo, setPeriodo] = useState<Periodo>(periodoGuardado);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erroDados, setErroDados] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [pedido, setPedido] = useState(0);
  const [lidoEm, setLidoEm] = useState<Date | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [relatorio, setRelatorio] = useState(false);
  const imprimirDepois = useRef(false);
  const folha = useRef<HTMLElement>(null);

  // já tem sessão? (o cookie é HttpOnly: só o servidor sabe)
  useEffect(() => {
    if (token) return;
    chamar<{ conta: Conta | null }>('eu')
      .then(({ conta: c }) => {
        if (!c) return setTela('entrar');
        setConta(c);
        setTela('dentro');
      })
      .catch((e) => {
        if (e instanceof ErroApi && e.codigo === 'nao-configurado') return setTela('desligado');
        if (!(e instanceof ErroApi && e.status === 401)) setAviso(mensagemDoErro(e));
        setTela('entrar');
      });
  }, [token]);

  const entrou = (c: Conta) => {
    setConta(c);
    setAviso('');
    setTela('dentro');
    if (location.search) history.replaceState(null, '', location.pathname); // tira o link de senha do endereço
  };

  const sessaoTerminou = useCallback(() => {
    setConta(null);
    setDados(null);
    setAviso(MENSAGENS['sem-sessao']);
    setTela('entrar');
  }, []);

  const saiu = () => {
    setConta(null);
    setDados(null);
    setAviso('');
    setAba('resumo');
    setTela('entrar');
  };

  const recarregar = useCallback(() => setPedido((n) => n + 1), []);

  useEffect(() => {
    if (tela !== 'dentro') return;
    let vivo = true;
    const { de, ate } = intervalo(periodo);
    setCarregando(true);
    chamar<Dados>('dados', { busca: { de, ate } })
      .then((d) => {
        if (!vivo) return;
        setDados(d);
        setErroDados('');
        setLidoEm(new Date());
      })
      .catch((e) => {
        if (!vivo) return;
        if (sessaoCaiu(e)) sessaoTerminou();
        else setErroDados(mensagemDoErro(e));
      })
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [tela, periodo, pedido, sessaoTerminou]);

  // voltou para o painel depois de um tempo (outro aplicativo, outra aba): números novos
  useEffect(() => {
    if (tela !== 'dentro') return;
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && lidoEm && Date.now() - lidoEm.getTime() > 120_000) recarregar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [tela, lidoEm, recarregar]);

  useEffect(() => {
    if (tela === 'dentro') titulo.current?.focus({ preventScroll: true });
  }, [tela]);

  // Relatório em PDF: o relatório só é montado na hora (as fotos dele não pesam no painel), espera as fotos carregarem
  // (no máximo 1,5 s) e abre a impressão do navegador, onde se escolhe "Salvar como PDF".
  const pedirRelatorio = () => {
    if (relatorio) return window.print(); // já montado (a impressão anterior foi cancelada sem avisar)
    imprimirDepois.current = true;
    setRelatorio(true);
  };

  useEffect(() => {
    if (!relatorio || !imprimirDepois.current) return;
    imprimirDepois.current = false;
    let vivo = true;
    const fotos = [...(folha.current?.querySelectorAll('img') ?? [])];
    const prontas = Promise.all(fotos.map((f) => f.decode().catch(() => undefined)));
    void Promise.race([prontas, new Promise((r) => setTimeout(r, 1500))]).then(() => vivo && window.print());
    return () => {
      vivo = false;
    };
  }, [relatorio]);

  // Ctrl+P / imprimir pelo menu do navegador também sai com o relatório
  useEffect(() => {
    const antes = () => flushSync(() => setRelatorio(true));
    const depois = () => setRelatorio(false);
    window.addEventListener('beforeprint', antes);
    window.addEventListener('afterprint', depois);
    return () => {
      window.removeEventListener('beforeprint', antes);
      window.removeEventListener('afterprint', depois);
    };
  }, []);

  const escolherPeriodo = (p: Periodo) => {
    setPeriodo(p);
    try {
      localStorage.setItem(CHAVE_PERIODO, p);
    } catch {
      /* sem armazenamento */
    }
  };

  if (tela === 'carregando') return <Carregando />;
  if (tela === 'desligado') return <Desligado />;
  if (tela === 'redefinir') return <Redefinir token={token} aoEntrar={entrou} aoPedirOutro={() => setTela('esqueci')} />;
  if (tela === 'esqueci') return <Esqueci aoVoltar={() => setTela('entrar')} />;
  if (tela === 'entrar' || !conta) return <Entrar aviso={aviso} aoEntrar={entrou} aoEsquecer={() => setTela('esqueci')} />;

  const { de, ate } = dados ?? intervalo(periodo);

  return (
    <div className="pn">
      <header className="pn-topo">
        <div className="pn-topo__miolo">
          <a className="pn-marca" href="/" target="_blank" rel="noopener" title="Abrir o site">
            <img src="/marca/logo-prime.webp" alt="" width={36} height={36} />
            <span>
              PRIME <b>STORE</b>
            </span>
            <small>Painel</small>
          </a>
          <nav className="pn-abas" aria-label="Partes do painel">
            {ABAS.map((a) => (
              <button key={a.id} type="button" aria-current={aba === a.id ? 'page' : undefined} onClick={() => setAba(a.id)}>
                {a.nome}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="pn-miolo">
        <h1 ref={titulo} tabIndex={-1} className="vh">
          Painel da Prime Store: {ABAS.find((a) => a.id === aba)?.nome}
        </h1>

        {aba !== 'conta' && (
          <div className="pn-filtros">
            <fieldset className="pn-periodos">
              <legend className="vh">Período</legend>
              {PERIODOS.map((p) => (
                <label key={p.id}>
                  <input type="radio" name="periodo" value={p.id} checked={periodo === p.id} onChange={() => escolherPeriodo(p.id)} />
                  <span>{p.nome}</span>
                </label>
              ))}
            </fieldset>
            <div className="pn-filtros__acoes">
              <p className="pn-filtros__quando" aria-live="polite">
                {nomeDoPeriodo(de, ate)}
                {carregando ? ' · atualizando…' : lidoEm ? ` · lido às ${horaCurta(lidoEm)}` : ''}
              </p>
              <button type="button" className="pn-btn pn-btn--sec pn-btn--mini" onClick={recarregar} disabled={carregando}>
                Atualizar
              </button>
              <button type="button" className="pn-btn pn-btn--mini" onClick={pedirRelatorio} disabled={!dados}>
                Relatório em PDF
              </button>
            </div>
          </div>
        )}

        {erroDados && aba !== 'conta' && (
          <p className="pn-msg pn-msg--erro" role="alert">
            {erroDados}
          </p>
        )}

        <div className={carregando && dados ? 'pn-conteudo pn-conteudo--lendo' : 'pn-conteudo'} aria-busy={carregando}>
          {aba === 'resumo' && (dados ? <Resumo dados={dados} /> : !erroDados && <p className="pn-carregando">Lendo os números…</p>)}
          {aba === 'vendas' && <Vendas dados={dados} aoMudar={recarregar} aoSessaoCair={sessaoTerminou} />}
          {aba === 'conta' && <ContaTela conta={conta} aoAtualizar={setConta} aoSair={saiu} aoSessaoCair={sessaoTerminou} />}
        </div>
      </main>

      {/* Relatório: só aparece na impressão (Relatório em PDF → Salvar como PDF) */}
      {dados && relatorio && (
        <article className="pn-relatorio" aria-hidden="true" ref={folha}>
          <header className="pn-relatorio__topo">
            <img src="/marca/logo-prime.webp" alt="" width={56} height={56} />
            <div>
              <h1>Relatório do site</h1>
              <p>Prime Store · {nomeDoPeriodo(dados.de, dados.ate)}</p>
            </div>
            <p className="pn-relatorio__gerado">Gerado em {dataHora(lidoEm ?? new Date())}</p>
          </header>
          <Resumo dados={dados} impresso />
          <footer className="pn-relatorio__rodape">
            Contagem anônima, sem cookies e sem dados pessoais. Visitantes: cada aparelho conta uma vez por dia. Chamadas no WhatsApp: toques nos
            botões do site (a conversa em si acontece no WhatsApp). Vendas: as que foram anotadas no painel.
          </footer>
        </article>
      )}
    </div>
  );
}
