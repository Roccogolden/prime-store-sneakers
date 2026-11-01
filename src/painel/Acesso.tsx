import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { chamar, ErroApi, mensagemDoErro, type Conta } from './api';
import { CampoSenha, Mensagem } from './Campos';

// Entrada do painel: entrar, pedir o link de senha nova e criar a senha nova pelo link do e-mail.

function Moldura({ titulo, texto, children }: { titulo: string; texto?: ReactNode; children: ReactNode }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  // ao trocar de tela (entrar → esqueci…), o leitor de tela e o teclado começam pelo título novo
  useEffect(() => h1.current?.focus({ preventScroll: true }), [titulo]);
  return (
    <main className="pn-acesso">
      <div className="pn-acesso__cartao">
        <div className="pn-acesso__marca">
          <img src="/marca/logo-prime.webp" alt="" width={64} height={64} />
          <p>
            PRIME <span>STORE</span>
          </p>
        </div>
        <h1 ref={h1} tabIndex={-1}>
          {titulo}
        </h1>
        {texto && <p className="pn-acesso__texto">{texto}</p>}
        {children}
      </div>
      <a className="pn-acesso__site" href="/">
        Voltar para o site
      </a>
    </main>
  );
}

export function Entrar({ aviso, aoEntrar, aoEsquecer }: { aviso: string; aoEntrar: (c: Conta) => void; aoEsquecer: () => void }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) return setErro('Preencha o e-mail e a senha.');
    setEnviando(true);
    setErro('');
    try {
      aoEntrar(await chamar<Conta>('entrar', { corpo: { email: email.trim(), senha } }));
    } catch (err) {
      setErro(mensagemDoErro(err));
      setEnviando(false);
    }
  };

  return (
    <Moldura titulo="Painel da loja" texto="Visitas do site, pedidos no WhatsApp e as vendas que você anotar.">
      {aviso && (
        <p className="pn-aviso" role="status">
          {aviso}
        </p>
      )}
      <form className="pn-form" onSubmit={enviar} noValidate>
        <div className="pn-campo">
          <label htmlFor={`${id}-email`}>E-mail</label>
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" />
        <Mensagem msg={erro ? { ok: false, texto: erro } : null} />
        <button className="pn-btn pn-btn--largo" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <button type="button" className="pn-link pn-acesso__esqueci" onClick={aoEsquecer}>
        Esqueci a senha
      </button>
    </Moldura>
  );
}

export function Esqueci({ aoVoltar }: { aoVoltar: () => void }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setMsg({ ok: false, texto: 'Digite o e-mail da conta.' });
    setEnviando(true);
    setMsg(null);
    try {
      await chamar('esqueci', { corpo: { email: email.trim() } });
      setEnviado(true);
    } catch (err) {
      setMsg({ ok: false, texto: mensagemDoErro(err) });
    } finally {
      setEnviando(false);
    }
  };

  if (enviado)
    return (
      <Moldura titulo="Confira o seu e-mail" texto="Se esse for o e-mail da conta, o link para criar a senha nova chega em instantes. Confira também a caixa de spam. O link vale por 1 hora.">
        <button type="button" className="pn-btn pn-btn--sec pn-btn--largo" onClick={aoVoltar}>
          Voltar para entrar
        </button>
      </Moldura>
    );

  return (
    <Moldura titulo="Criar senha nova" texto="Digite o e-mail da conta. Mandamos um link para você criar uma senha nova.">
      <form className="pn-form" onSubmit={enviar} noValidate>
        <div className="pn-campo">
          <label htmlFor={`${id}-email`}>E-mail da conta</label>
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Mensagem msg={msg} />
        <button className="pn-btn pn-btn--largo" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Mandar o link'}
        </button>
      </form>
      <button type="button" className="pn-link pn-acesso__esqueci" onClick={aoVoltar}>
        Voltar para entrar
      </button>
    </Moldura>
  );
}

export function Redefinir({ token, aoEntrar, aoPedirOutro }: { token: string; aoEntrar: (c: Conta) => void; aoPedirOutro: () => void }) {
  const id = useId();
  const [senha, setSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [erro, setErro] = useState('');
  const [vencido, setVencido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== repetir) return setErro('As duas senhas não são iguais.');
    setEnviando(true);
    setErro('');
    try {
      aoEntrar(await chamar<Conta>('redefinir', { corpo: { token, senha } }));
    } catch (err) {
      setErro(mensagemDoErro(err));
      setVencido(err instanceof ErroApi && err.codigo === 'link-vencido');
      setEnviando(false);
    }
  };

  return (
    <Moldura titulo="Criar senha nova" texto="Escolha a senha nova do painel. Depois de salvar, você já entra.">
      <form className="pn-form" onSubmit={enviar} noValidate>
        <CampoSenha id={`${id}-nova`} rotulo="Senha nova" valor={senha} aoMudar={setSenha} autoComplete="new-password" ajuda="Pelo menos 8 caracteres." />
        <CampoSenha id={`${id}-repetir`} rotulo="Repita a senha nova" valor={repetir} aoMudar={setRepetir} autoComplete="new-password" />
        <Mensagem msg={erro ? { ok: false, texto: erro } : null} />
        <button className="pn-btn pn-btn--largo" type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar e entrar'}
        </button>
      </form>
      {vencido && (
        <button type="button" className="pn-btn pn-btn--sec pn-btn--largo" onClick={aoPedirOutro}>
          Pedir outro link
        </button>
      )}
    </Moldura>
  );
}

export function Desligado() {
  return (
    <Moldura
      titulo="Painel quase pronto"
      texto="Falta ligar o banco de dados do painel na Vercel (Storage → Upstash for Redis, no projeto do site). Depois disso, esta página mostra a entrada."
    >
      <button type="button" className="pn-btn pn-btn--sec pn-btn--largo" onClick={() => location.reload()}>
        Tentar de novo
      </button>
    </Moldura>
  );
}

export function Carregando() {
  return (
    <main className="pn-acesso" aria-busy="true">
      <p className="pn-carregando">Abrindo o painel…</p>
    </main>
  );
}
