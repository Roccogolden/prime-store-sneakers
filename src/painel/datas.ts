// Datas do painel no fuso de Goiás (o mesmo do servidor), sempre como AAAA-MM-DD.

export const hojeGoias = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Periodo = '7d' | '30d' | 'mes' | 'mes-passado';

export const PERIODOS: { id: Periodo; nome: string }[] = [
  { id: '7d', nome: '7 dias' },
  { id: '30d', nome: '30 dias' },
  { id: 'mes', nome: 'Este mês' },
  { id: 'mes-passado', nome: 'Mês passado' },
];

export function intervalo(p: Periodo, hoje = hojeGoias()) {
  if (p === '7d') return { de: somarDias(hoje, -6), ate: hoje };
  if (p === '30d') return { de: somarDias(hoje, -29), ate: hoje };
  const inicio = `${hoje.slice(0, 7)}-01`;
  if (p === 'mes') return { de: inicio, ate: hoje };
  const fim = somarDias(inicio, -1);
  return { de: `${fim.slice(0, 7)}-01`, ate: fim };
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const diaMes = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
export const diaDaSemana = (d: string) => SEMANA[new Date(`${d}T12:00:00Z`).getUTCDay()];

/** "Outubro de 2026" para o mês inteiro; senão "03/10 a 01/11/2026". */
export function nomeDoPeriodo(de: string, ate: string) {
  const mesInteiro = de.endsWith('-01') && somarDias(ate, 1).endsWith('-01') && de.slice(0, 7) === ate.slice(0, 7);
  if (mesInteiro) {
    const nome = MESES[Number(de.slice(5, 7)) - 1];
    return `${nome[0].toUpperCase()}${nome.slice(1)} de ${de.slice(0, 4)}`;
  }
  if (de === ate) return dataBr(de);
  return `${de.slice(0, 4) === ate.slice(0, 4) ? diaMes(de) : dataBr(de)} a ${dataBr(ate)}`;
}

export function horaCurta(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);
}

export function dataHora(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(d);
}

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (v: number) => reais.format(v);

export const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
