import { useCallback, useEffect, useState } from 'react';
import { linkDoTenis, nomeCompleto, porId } from './catalogo';
import { loja } from './loja';

/**
 * Sacola: os pares que a pessoa separou para mandar de uma vez ao Robson. Não tem preço nem pagamento
 * (o site é catálogo; valor, disponibilidade e entrega são combinados no WhatsApp). Fica guardada só
 * neste navegador (localStorage), e some sozinho o tênis que sair do catálogo.
 */
export interface ItemSacola {
  id: string;
  /** Numeração escolhida, ou '' quando a pessoa ainda não escolheu. */
  num: string;
}

const CHAVE = 'prime-sacola';
export const MAXIMO_SACOLA = 20;

function ler(): ItemSacola[] {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((x): x is ItemSacola => !!x && typeof x.id === 'string' && porId.has(x.id))
      .map((x) => ({ id: x.id, num: typeof x.num === 'string' && porId.get(x.id)!.nums.includes(x.num) ? x.num : '' }))
      .slice(0, MAXIMO_SACOLA);
  } catch {
    return [];
  }
}

function gravar(itens: ItemSacola[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    /* armazenamento indisponível (aba anônima, bloqueio): a sacola vale só nesta visita */
  }
}

export function useSacola() {
  // começa vazia também na pré-renderização; o que estava guardado entra depois de montar (sem erro de hidratação)
  const [estado, setEstado] = useState({ pronta: false, itens: [] as ItemSacola[] });

  useEffect(() => setEstado({ pronta: true, itens: ler() }), []);
  useEffect(() => {
    if (estado.pronta) gravar(estado.itens);
  }, [estado]);

  const mudar = useCallback((f: (itens: ItemSacola[]) => ItemSacola[]) => {
    setEstado((e) => ({ ...e, itens: f(e.itens) }));
  }, []);

  const alternar = useCallback(
    (id: string, num: string) =>
      mudar((itens) =>
        itens.some((x) => x.id === id)
          ? itens.filter((x) => x.id !== id)
          : itens.length >= MAXIMO_SACOLA
            ? itens
            : [...itens, { id, num }],
      ),
    [mudar],
  );
  const definirNum = useCallback((id: string, num: string) => mudar((itens) => itens.map((x) => (x.id === id ? { ...x, num } : x))), [mudar]);
  const remover = useCallback((id: string) => mudar((itens) => itens.filter((x) => x.id !== id)), [mudar]);
  const limpar = useCallback(() => mudar(() => []), [mudar]);

  return { itens: estado.itens, alternar, definirNum, remover, limpar };
}

export type Sacola = ReturnType<typeof useSacola>;

export function mensagemDaSacola(itens: ItemSacola[]) {
  const linhas = [`Olá, ${loja.atendente}! Separei ${itens.length === 1 ? 'este tênis' : `estes ${itens.length} tênis`} no site da ${loja.nome}:`, ''];
  itens.forEach((it, i) => {
    const t = porId.get(it.id);
    if (!t) return;
    linhas.push(`${i + 1}. *${nomeCompleto(t)}*`, `Cor: ${t.cor}`, `Numeração: ${it.num || 'a combinar'}`, `Foto: ${linkDoTenis(t)}`, '');
  });
  linhas.push('Pode me passar valores e disponibilidade?');
  return linhas.join('\n');
}
