// Conversa com /api/painel (api/painel.js). A sessão vai num cookie HttpOnly: o JS daqui nunca vê a senha guardada
// nem o token da sessão.

export interface Conta {
  email: string;
  /** false enquanto o envio de e-mail (Resend) não foi ligado na Vercel: "Esqueci a senha" ainda não funciona. */
  emailPronto: boolean;
}

export interface Venda {
  id: string;
  dia: string;
  /** id do tênis no catálogo (p123) ou vazio quando foi vendido algo fora do site (descrito em obs) */
  tenis: string;
  num: string;
  valor: number | null;
  obs: string;
  em: number;
}

export interface Dados {
  de: string;
  ate: string;
  porDia: { dia: string; visitas: number; unicos: number; pedidos: number }[];
  totais: {
    visitas: number;
    visitantes: number;
    pedidos: number;
    pedidosGerais: number;
    sacolas: number;
    pares: number;
    vendas: number;
    valor: number;
  };
  origens: [string, number][];
  tenisVistos: { id: string; n: number }[];
  tenisPedidos: { id: string; n: number; nums: Record<string, number> }[];
  buscas: { termo: string; n: number }[];
  vendas: Venda[];
}

export class ErroApi extends Error {
  constructor(
    public codigo: string,
    public status: number,
  ) {
    super(codigo);
  }
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'DELETE';
  corpo?: unknown;
  busca?: Record<string, string>;
}

export async function chamar<T>(acao: string, { metodo, corpo, busca }: Opcoes = {}): Promise<T> {
  const p = new URLSearchParams({ acao, ...busca });
  let r: Response;
  try {
    r = await fetch(`/api/painel?${p}`, {
      method: metodo ?? (corpo === undefined ? 'GET' : 'POST'),
      headers: corpo === undefined ? undefined : { 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ErroApi('rede', 0);
  }
  let dados: unknown = null;
  try {
    dados = await r.json();
  } catch {
    /* resposta sem JSON (ex.: a página 404) */
  }
  if (!r.ok) {
    const codigo = (dados as { erro?: string } | null)?.erro;
    throw new ErroApi(codigo ?? (r.status === 404 ? 'sem-api' : 'falha'), r.status);
  }
  return dados as T;
}

export const MENSAGENS: Record<string, string> = {
  'dados-errados': 'E-mail ou senha não conferem.',
  'muitas-tentativas': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'sem-conta': 'A conta do painel ainda não foi criada (faltam o e-mail e a senha iniciais na Vercel).',
  'nao-configurado': 'O painel ainda não foi ligado ao banco de dados.',
  'sem-email': 'O envio de e-mail ainda não foi ligado. Peça a senha nova a quem cuida do site.',
  'link-vencido': 'Este link venceu ou já foi usado. Peça outro em “Esqueci a senha”.',
  'senha-curta': 'A senha precisa ter pelo menos 8 caracteres.',
  'senha-atual': 'A senha atual não confere.',
  'email-invalido': 'Confira o e-mail: ele parece incompleto.',
  'sem-sessao': 'Sua sessão terminou. Entre de novo.',
  valor: 'Confira o valor (exemplo: 259,90).',
  tenis: 'Escolha o tênis do catálogo ou descreva o que foi vendido.',
  origem: 'Pedido recusado por segurança. Recarregue a página e tente de novo.',
  rede: 'Sem conexão com o painel. Confira a internet e tente de novo.',
  'sem-api': 'O painel não respondeu (o endereço da API não foi encontrado).',
};

export function mensagemDoErro(e: unknown) {
  return (e instanceof ErroApi && MENSAGENS[e.codigo]) || 'Algo deu errado. Tente de novo em instantes.';
}

export const sessaoCaiu = (e: unknown) => e instanceof ErroApi && e.status === 401 && e.codigo === 'sem-sessao';
