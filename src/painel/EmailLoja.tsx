import { useCallback, useEffect, useState } from 'react';
import { chamar, mensagemDoErro, sessaoCaiu } from './api';

// "E-mail da loja": se o domínio está confirmado no Resend (aí o link de "Esqueci a senha" chega em qualquer e-mail) e,
// se não, os registros que faltam no DNS da Hostinger, com botão de copiar e "Verificar agora".

interface Registro {
  registro: string;
  tipo: string;
  nome: string;
  valor: string;
  prioridade: number | null;
  status: string;
}

interface Dominio {
  dominio: string;
  status: string;
  registros: Registro[];
}

const SITUACAO: Record<string, { texto: string; ok?: boolean }> = {
  verified: { texto: 'Confirmado: o link de “Esqueci a senha” chega em qualquer e-mail.', ok: true },
  pending: { texto: 'Aguardando: o Resend ainda está conferindo os registros (pode levar alguns minutos).' },
  not_started: { texto: 'Falta pôr os registros abaixo no DNS do domínio (Hostinger) e tocar em “Verificar agora”.' },
  failed: { texto: 'O Resend não encontrou os registros. Confira se foram copiados certinho e verifique de novo.' },
  temporary_failure: { texto: 'O Resend não conseguiu conferir agora. Tente “Verificar agora” daqui a pouco.' },
  'nao-encontrado': { texto: 'O domínio de e-mail não foi encontrado no Resend.' },
};

export function EmailLoja({ aoSessaoCair }: { aoSessaoCair: () => void }) {
  const [dados, setDados] = useState<Dominio | null>(null);
  const [erro, setErro] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const ler = useCallback(
    async (verificar = false) => {
      setErro('');
      try {
        setDados(await chamar<Dominio>('email-dominio', verificar ? { metodo: 'POST', corpo: {} } : {}));
      } catch (e) {
        if (sessaoCaiu(e)) aoSessaoCair();
        else setErro(mensagemDoErro(e));
      }
    },
    [aoSessaoCair],
  );

  useEffect(() => {
    void ler();
  }, [ler]);

  const verificar = async () => {
    setVerificando(true);
    await ler(true);
    setVerificando(false);
  };

  const copiar = async (texto: string, chave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 1800);
    } catch {
      /* sem acesso à área de transferência: o texto está na tela para copiar à mão */
    }
  };

  const situacao = dados ? SITUACAO[dados.status] ?? { texto: `Situação: ${dados.status}` } : null;
  const confirmado = dados?.status === 'verified';

  return (
    <section className="pn-cartao">
      <div className="pn-cartao__topo">
        <div>
          <h2>E-mail da loja</h2>
          <p className="pn-cartao__nota">
            É por ele que sai o link de “Esqueci a senha”{dados ? ` (remetente painel@${dados.dominio})` : ''}.
          </p>
        </div>
        {dados && !confirmado && (
          <button type="button" className="pn-btn pn-btn--sec pn-btn--mini" onClick={verificar} disabled={verificando}>
            {verificando ? 'Verificando…' : 'Verificar agora'}
          </button>
        )}
      </div>
      {erro && (
        <p className="pn-msg pn-msg--erro" role="alert">
          {erro}
        </p>
      )}
      {!dados && !erro && <p className="pn-carregando">Consultando o Resend…</p>}
      {situacao && (
        <p className={situacao.ok ? 'pn-msg pn-msg--ok' : 'pn-aviso'} role="status">
          {situacao.texto}
        </p>
      )}
      {dados && !confirmado && dados.registros.length > 0 && (
        <div className="pn-tabela-rolagem">
          <table className="pn-tabela pn-tabela--dns">
            <caption className="vh">Registros de DNS que o Resend pede</caption>
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Nome</th>
                <th scope="col">Valor</th>
                <th scope="col">Prior.</th>
              </tr>
            </thead>
            <tbody>
              {dados.registros.map((r, i) => (
                <tr key={`${r.tipo}-${r.nome}-${i}`}>
                  <td>{r.tipo}</td>
                  <td>{r.nome}</td>
                  <td>
                    <span className="pn-dns__valor">{r.valor}</span>
                    <button type="button" className="pn-link" onClick={() => copiar(r.valor, `${i}`)}>
                      {copiado === `${i}` ? 'Copiado' : 'Copiar'}
                    </button>
                  </td>
                  <td>{r.prioridade ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
