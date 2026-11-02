import { useId, useState, type FormEvent } from 'react';
import { CHAVE_NAO_CONTAR } from '../lib/medir';
import { chamar, mensagemDoErro, sessaoCaiu, type Conta } from './api';
import { CampoSenha, Mensagem } from './Campos';
import { EmailLoja } from './EmailLoja';

type Msg = { ok: boolean; texto: string } | null;

function lerNaoContar() {
  try {
    return localStorage.getItem(CHAVE_NAO_CONTAR) === '1';
  } catch {
    return false;
  }
}

interface Props {
  conta: Conta;
  aoAtualizar: (c: Conta) => void;
  aoSair: () => void;
  aoSessaoCair: () => void;
}

export function ContaTela({ conta, aoAtualizar, aoSair, aoSessaoCair }: Props) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [senhaEmail, setSenhaEmail] = useState('');
  const [msgEmail, setMsgEmail] = useState<Msg>(null);
  const [nova, setNova] = useState('');
  const [repetir, setRepetir] = useState('');
  const [atual, setAtual] = useState('');
  const [msgSenha, setMsgSenha] = useState<Msg>(null);
  const [enviando, setEnviando] = useState<'email' | 'senha' | 'sair' | null>(null);
  const [naoContar, setNaoContar] = useState(lerNaoContar);

  const salvar = async (qual: 'email' | 'senha', corpo: Record<string, string>, aoDarCerto: string, setMsg: (m: Msg) => void) => {
    setEnviando(qual);
    setMsg(null);
    try {
      const c = await chamar<Conta>('conta', { corpo });
      aoAtualizar(c);
      setMsg({ ok: true, texto: aoDarCerto });
      return true;
    } catch (err) {
      if (sessaoCaiu(err)) aoSessaoCair();
      else setMsg({ ok: false, texto: mensagemDoErro(err) });
      return false;
    } finally {
      setEnviando(null);
    }
  };

  const trocarEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senhaEmail) return setMsgEmail({ ok: false, texto: 'Preencha o e-mail novo e a senha atual.' });
    const ok = await salvar('email', { email: email.trim(), senhaAtual: senhaEmail }, 'E-mail trocado. Use o novo para entrar e para recuperar a senha.', setMsgEmail);
    if (ok) {
      setEmail('');
      setSenhaEmail('');
    }
  };

  const trocarSenha = async (e: FormEvent) => {
    e.preventDefault();
    if (nova.length < 8) return setMsgSenha({ ok: false, texto: 'A senha nova precisa ter pelo menos 8 caracteres.' });
    if (nova !== repetir) return setMsgSenha({ ok: false, texto: 'As duas senhas novas não são iguais.' });
    if (!atual) return setMsgSenha({ ok: false, texto: 'Digite a senha atual.' });
    const ok = await salvar('senha', { senhaNova: nova, senhaAtual: atual }, 'Senha trocada. Os outros aparelhos vão pedir a senha nova.', setMsgSenha);
    if (ok) {
      setNova('');
      setRepetir('');
      setAtual('');
    }
  };

  const marcarAparelho = (marcar: boolean) => {
    try {
      if (marcar) localStorage.setItem(CHAVE_NAO_CONTAR, '1');
      else localStorage.removeItem(CHAVE_NAO_CONTAR);
      setNaoContar(marcar);
    } catch {
      /* navegador sem armazenamento: não dá para marcar */
    }
  };

  const sair = async () => {
    setEnviando('sair');
    try {
      await chamar('sair', { metodo: 'POST', corpo: {} });
    } catch {
      /* mesmo sem resposta, volta para a entrada */
    }
    aoSair();
  };

  return (
    <div className="pn-conta">
      <section className="pn-cartao">
        <div className="pn-cartao__topo">
          <div>
            <h2>Sua conta</h2>
            <p className="pn-cartao__nota">
              Você entra com <strong>{conta.email}</strong>
            </p>
          </div>
          <button type="button" className="pn-btn pn-btn--sec" onClick={sair} disabled={enviando === 'sair'}>
            Sair
          </button>
        </div>
        {!conta.emailPronto && (
          <p className="pn-aviso">O envio de e-mail ainda não foi ligado: por enquanto, “Esqueci a senha” não manda o link. Guarde bem a sua senha.</p>
        )}
      </section>

      {conta.emailPronto && <EmailLoja aoSessaoCair={aoSessaoCair} />}

      <section className="pn-cartao">
        <div className="pn-cartao__topo">
          <div>
            <h2>Painel como aplicativo</h2>
            <p className="pn-cartao__nota">Deixe o painel na tela de início do celular e abra com um toque.</p>
          </div>
        </div>
        <ul className="pn-dicas">
          <li>
            <strong>iPhone (Safari):</strong> toque em Compartilhar e depois em “Adicionar à Tela de Início”.
          </li>
          <li>
            <strong>Android (Chrome):</strong> toque nos três pontinhos e depois em “Adicionar à tela inicial”.
          </li>
        </ul>
      </section>

      <section className="pn-cartao">
        <div className="pn-cartao__topo">
          <div>
            <h2>Não contar este aparelho</h2>
            <p className="pn-cartao__nota">Marque no seu celular e no seu computador: as suas próprias visitas ao site deixam de entrar nos números.</p>
          </div>
        </div>
        <label className="pn-marcar pn-marcar--grande">
          <input type="checkbox" checked={naoContar} onChange={(e) => marcarAparelho(e.target.checked)} />
          {naoContar ? 'Este aparelho não entra nas contas' : 'Este aparelho ainda entra nas contas'}
        </label>
        <p className="pn-campo__ajuda">Vale para este navegador. Se limpar os dados do navegador, marque de novo.</p>
      </section>

      <div className="pn-duas">
        <form className="pn-cartao pn-form" onSubmit={trocarSenha} noValidate>
          <div className="pn-cartao__topo">
            <div>
              <h2>Trocar a senha</h2>
              <p className="pn-cartao__nota">Pelo menos 8 caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar.</p>
            </div>
          </div>
          <CampoSenha id={`${id}-nova`} rotulo="Senha nova" valor={nova} aoMudar={setNova} autoComplete="new-password" />
          <CampoSenha id={`${id}-repetir`} rotulo="Repita a senha nova" valor={repetir} aoMudar={setRepetir} autoComplete="new-password" />
          <CampoSenha id={`${id}-atual`} rotulo="Senha atual" valor={atual} aoMudar={setAtual} autoComplete="current-password" />
          <Mensagem msg={msgSenha} />
          <button className="pn-btn" type="submit" disabled={enviando === 'senha'}>
            {enviando === 'senha' ? 'Salvando…' : 'Trocar a senha'}
          </button>
        </form>

        <form className="pn-cartao pn-form" onSubmit={trocarEmail} noValidate>
          <div className="pn-cartao__topo">
            <div>
              <h2>Trocar o e-mail</h2>
              <p className="pn-cartao__nota">É para ele que vai o link de “Esqueci a senha”.</p>
            </div>
          </div>
          <div className="pn-campo">
            <label htmlFor={`${id}-email`}>E-mail novo</label>
            <input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <CampoSenha id={`${id}-senha-email`} rotulo="Senha atual" valor={senhaEmail} aoMudar={setSenhaEmail} autoComplete="current-password" />
          <Mensagem msg={msgEmail} />
          <button className="pn-btn" type="submit" disabled={enviando === 'email'}>
            {enviando === 'email' ? 'Salvando…' : 'Trocar o e-mail'}
          </button>
        </form>
      </div>
    </div>
  );
}
