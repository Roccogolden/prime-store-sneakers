import dados from '../data/catalogo.json';
import { loja, siteUrl } from './loja';

export type Tipo = 'tenis' | 'chuteira' | 'casual';

export interface Tenis {
  id: string;
  /** Dia em que a foto entrou no catálogo do fornecedor (AAAA-MM-DD). */
  desde: string | null;
  marca: string;
  modelo: string;
  tipo: Tipo;
  cor: string;
  /** Numerações em que a foto aparece no catálogo do fornecedor ("34", "46/47"…). */
  nums: string[];
  infantil: boolean;
  /** Larguras geradas em public/fotos/<id>-<w>.webp */
  ws: number[];
  w: number;
  h: number;
  /** Cor dominante da foto, usada enquanto ela carrega. */
  bg: string;
}

export const itens = dados.itens as Tenis[];
export const numeracoes = dados.numeracoes;
export const atualizadoEm = dados.atualizadoEm;
export const porId = new Map(itens.map((t) => [t.id, t]));

export const NUMERACOES_ADULTAS = numeracoes.filter((n) => Number(n.split('/')[0]) >= 34);

export function dataCurta(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function diaMes(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Os que entraram por último no catálogo do fornecedor (a lista já vem do mais novo para o mais antigo). */
export const novidades = itens.filter((t) => t.desde).slice(0, 14);

export function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function srcset(t: Tenis) {
  return t.ws.map((w) => `/fotos/${t.id}-${w}.webp ${w}w`).join(', ');
}

export function fotoPadrao(t: Tenis, alvo = 720) {
  const w = t.ws.find((x) => x >= alvo) ?? t.ws[t.ws.length - 1];
  return `/fotos/${t.id}-${w}.webp`;
}

/** Fundo (CSS `background`) de um quadro em que a foto aparece inteira: ela mesma, pequena e desfocada, sobre a cor média. */
export function fundoDesfocado(t: Tenis) {
  return `${t.bg} url(/fotos/${t.id}-fundo.webp) center / cover no-repeat`;
}

export function nomeCompleto(t: Tenis) {
  if (t.marca === 'Outras marcas') return `Tênis ${t.modelo.toLowerCase()}`;
  if (t.marca === 'Personagens') return `Tênis infantil ${t.modelo}`;
  return `${t.marca} ${t.modelo}`;
}

export function descricaoAlt(t: Tenis) {
  return `${nomeCompleto(t)}, ${t.cor.toLowerCase()}`;
}

/** "34 ao 43" quando a sequência é contínua; senão, a lista. */
export function resumoNumeracoes(nums: string[]) {
  if (nums.length === 0) return '';
  if (nums.length === 1) return nums[0];
  const idx = nums.map((n) => numeracoes.indexOf(n));
  const continua = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (continua && nums.length > 2) return `${nums[0]} ao ${nums[nums.length - 1]}`;
  return nums.join(' · ');
}

export function linkDoTenis(t: Tenis) {
  return `${siteUrl}/?m=${t.id}`;
}

export function mensagemDoTenis(t: Tenis, numeracao?: string) {
  const linhas = [
    `Olá, ${loja.atendente}! Vi este tênis no site da ${loja.nome}:`,
    '',
    `*${nomeCompleto(t)}*`,
    `Cor: ${t.cor}`,
  ];
  if (numeracao) linhas.push(`Numeração: ${numeracao}`);
  linhas.push(`Foto: ${linkDoTenis(t)}`, '', numeracao ? 'Tem disponível?' : 'Quais numerações estão disponíveis?');
  return linhas.join('\n');
}

export interface Contagem {
  nome: string;
  slug: string;
  total: number;
}

function contar(lista: Tenis[], chave: (t: Tenis) => string): Contagem[] {
  const mapa = new Map<string, number>();
  for (const t of lista) mapa.set(chave(t), (mapa.get(chave(t)) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([nome, total]) => ({ nome, slug: slug(nome), total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Marcas em ordem de quantidade; "Outras marcas" sempre no fim. */
export const marcas = (() => {
  const lista = contar(itens, (t) => t.marca);
  const outras = lista.filter((m) => m.nome === 'Outras marcas');
  return [...lista.filter((m) => m.nome !== 'Outras marcas'), ...outras];
})();

export function modelosDaMarca(marca: string) {
  return contar(
    itens.filter((t) => slug(t.marca) === marca),
    (t) => t.modelo,
  );
}

export type Linha = 'todos' | 'tenis' | 'chuteiras' | 'infantil';

export interface Filtro {
  linha: Linha;
  marca: string;
  modelo: string;
  num: string;
  busca: string;
}

export const filtroVazio: Filtro = { linha: 'todos', marca: '', modelo: '', num: '', busca: '' };

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filtrar(f: Filtro) {
  const termos = normalizar(f.busca).split(/\s+/).filter(Boolean);
  return itens.filter((t) => {
    if (f.linha === 'chuteiras' && t.tipo !== 'chuteira') return false;
    if (f.linha === 'tenis' && (t.tipo === 'chuteira' || t.infantil)) return false;
    if (f.linha === 'infantil' && !t.infantil) return false;
    if (f.marca && slug(t.marca) !== f.marca) return false;
    if (f.modelo && slug(t.modelo) !== f.modelo) return false;
    if (f.num && !t.nums.includes(f.num)) return false;
    if (termos.length) {
      const alvo = normalizar(`${t.marca} ${t.modelo} ${t.cor} ${t.tipo === 'chuteira' ? 'chuteira' : 'tenis'} ${t.infantil ? 'infantil' : ''}`);
      if (!termos.every((p) => alvo.includes(p))) return false;
    }
    return true;
  });
}

export const totalChuteiras = itens.filter((t) => t.tipo === 'chuteira').length;
export const totalInfantil = itens.filter((t) => t.infantil).length;
