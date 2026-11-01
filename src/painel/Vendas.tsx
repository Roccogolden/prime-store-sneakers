import { useId, useMemo, useState, type FormEvent } from 'react';
import { filtrar, filtroVazio, nomeCompleto, numeracoes, porId, type Tenis } from '../lib/catalogo';
import { chamar, mensagemDoErro, sessaoCaiu, type Dados, type Venda } from './api';
import { Mensagem } from './Campos';
import { brl, dataBr, hojeGoias, plural } from './datas';
import { Miniatura, nomeDoTenis } from './Resumo';

// O site não vende nem mostra preço: aqui o Robson anota as vendas que fechou no WhatsApp, para o painel e o
// relatório mostrarem o que mais sai. O valor é opcional e só aparece para ele.

/** Acha o tênis pelo link que chegou no WhatsApp (…/?m=p123), pelo código ou por marca, modelo e cor. */
function achar(texto: string): Tenis[] {
  const codigo = texto.match(/\bp\d{3,4}\b/i)?.[0].toLowerCase();
  if (codigo) {
    const t = porId.get(codigo);
    return t ? [t] : [];
  }
  return texto.trim().length >= 2 ? filtrar({ ...filtroVazio, busca: texto }).slice(0, 8) : [];
}

interface Props {
  dados: Dados | null;
  aoMudar: () => void;
  aoSessaoCair: () => void;
}

export function Vendas({ dados, aoMudar, aoSessaoCair }: Props) {
  const id = useId();
  const [busca, setBusca] = useState('');
  const [tenis, setTenis] = useState<Tenis | null>(null);
  const [fora, setFora] = useState(false);
  const [num, setNum] = useState('');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState(hojeGoias);
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [apagar, setApagar] = useState<string | null>(null);
  const resultados = useMemo(() => (tenis || fora ? [] : achar(busca)), [busca, tenis, fora]);
  const hoje = hojeGoias();

  const limpar = () => {
    setBusca('');
    setTenis(null);
    setFora(false);
    setNum('');
    setValor('');
    setObs('');
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenis && !(fora && obs.trim())) {
      setMsg({ ok: false, texto: fora ? 'Descreva o que foi vendido.' : 'Escolha o tênis que foi vendido.' });
      return;
    }
    setEnviando(true);
    setMsg(null);
    try {
      const v = await chamar<Venda>('venda', { corpo: { tenis: tenis?.id ?? '', num, valor: valor.trim(), dia, obs: obs.trim() } });
      const noPeriodo = dados && v.dia >= dados.de && v.dia <= dados.ate;
      setMsg({ ok: true, texto: `Venda anotada (${dataBr(v.dia)})${noPeriodo ? '.' : ': ela fica fora do período escolhido acima.'}` });
      limpar();
      aoMudar();
    } catch (err) {
      if (sessaoCaiu(err)) aoSessaoCair();
      else setMsg({ ok: false, texto: mensagemDoErro(err) });
    } finally {
      setEnviando(false);
    }
  };

  const remover = async (v: Venda) => {
    try {
      await chamar('venda', { metodo: 'DELETE', busca: { id: v.id, mes: v.dia.slice(0, 7) } });
      setApagar(null);
      setMsg(null);
      aoMudar();
    } catch (err) {
      if (sessaoCaiu(err)) aoSessaoCair();
      else setMsg({ ok: false, texto: mensagemDoErro(err) });
    }
  };

  const nums = tenis ? tenis.nums : numeracoes;
  const vendas = dados?.vendas ?? [];
  const total = vendas.reduce((a, v) => a + (v.valor ?? 0), 0);

  return (
    <div className="pn-vendas">
      <form className="pn-cartao pn-form" onSubmit={enviar} noValidate>
        <div className="pn-cartao__topo">
          <div>
            <h2>Anotar uma venda</h2>
            <p className="pn-cartao__nota">O site não mostra preço: anote aqui o que você fechou no WhatsApp. Só você vê.</p>
          </div>
        </div>

        {!fora && !tenis && (
          <div className="pn-campo">
            <label htmlFor={`${id}-busca`}>Qual tênis?</label>
            <input
              id={`${id}-busca`}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Marca, modelo ou cor"
              autoComplete="off"
              enterKeyHint="search"
            />
            <p className="pn-campo__ajuda">Dica: cole o link da foto que veio na mensagem do cliente.</p>
            {resultados.length > 0 && (
              <ul className="pn-achados" aria-label="Tênis encontrados">
                {resultados.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="pn-achado"
                      onClick={() => {
                        setTenis(t);
                        setMsg(null);
                      }}
                    >
                      <Miniatura id={t.id} />
                      <span>
                        <strong>{nomeCompleto(t)}</strong>
                        <span>{t.cor}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busca.trim().length >= 2 && resultados.length === 0 && <p className="pn-campo__ajuda">Nenhum tênis do catálogo com esse nome.</p>}
          </div>
        )}

        {tenis && (
          <div className="pn-escolhido">
            <Miniatura id={tenis.id} />
            <span>
              <strong>{nomeCompleto(tenis)}</strong>
              <span>{tenis.cor}</span>
            </span>
            <button
              type="button"
              className="pn-link"
              onClick={() => {
                setTenis(null);
                setNum('');
              }}
            >
              Trocar
            </button>
          </div>
        )}

        <label className="pn-marcar">
          <input
            type="checkbox"
            checked={fora}
            onChange={(e) => {
              setFora(e.target.checked);
              setTenis(null);
              setNum('');
            }}
          />
          Vendi algo que não está no site
        </label>

        <div className="pn-grade-campos">
          <div className="pn-campo">
            <label htmlFor={`${id}-num`}>Numeração</label>
            <select id={`${id}-num`} value={num} onChange={(e) => setNum(e.target.value)}>
              <option value="">Não anotar</option>
              {nums.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="pn-campo">
            <label htmlFor={`${id}-valor`}>Valor (opcional)</label>
            <div className="pn-reais">
              <span aria-hidden="true">R$</span>
              <input
                id={`${id}-valor`}
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="0,00"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="pn-campo">
            <label htmlFor={`${id}-dia`}>Dia da venda</label>
            <input id={`${id}-dia`} type="date" value={dia} max={hoje} onChange={(e) => setDia(e.target.value || hoje)} />
          </div>
        </div>

        <div className="pn-campo">
          <label htmlFor={`${id}-obs`}>{fora ? 'O que foi vendido' : 'Observação (opcional)'}</label>
          <input
            id={`${id}-obs`}
            value={obs}
            maxLength={120}
            onChange={(e) => setObs(e.target.value)}
            placeholder={fora ? 'Ex.: chinelo slide preto' : 'Ex.: entregue em Goiânia, pago no Pix'}
            required={fora}
            autoComplete="off"
          />
        </div>

        <Mensagem msg={msg} />
        <button className="pn-btn" type="submit" disabled={enviando}>
          {enviando ? 'Anotando…' : 'Anotar venda'}
        </button>
      </form>

      <section className="pn-cartao">
        <div className="pn-cartao__topo">
          <div>
            <h2>Vendas do período</h2>
            <p className="pn-cartao__nota">
              {plural(vendas.length, 'venda', 'vendas')}
              {total > 0 && ` · ${brl(total)}`}
            </p>
          </div>
        </div>
        {vendas.length === 0 ? (
          <p className="pn-vazio">Nenhuma venda anotada neste período.</p>
        ) : (
          <ul className="pn-lista-vendas">
            {vendas.map((v) => (
              <li key={v.id}>
                <Miniatura id={v.tenis} />
                <span className="pn-tenis__info">
                  <strong>{v.tenis ? nomeDoTenis(v.tenis) : v.obs}</strong>
                  <span>
                    {dataBr(v.dia)}
                    {v.num && ` · Nº ${v.num}`}
                    {v.valor !== null && ` · ${brl(v.valor)}`}
                  </span>
                  {v.tenis && v.obs && <span>{v.obs}</span>}
                </span>
                {apagar === v.id ? (
                  <span className="pn-confirma" role="group" aria-label="Confirmar">
                    <button type="button" className="pn-btn pn-btn--perigo pn-btn--mini" onClick={() => remover(v)}>
                      Apagar
                    </button>
                    <button type="button" className="pn-link" onClick={() => setApagar(null)}>
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button type="button" className="pn-link" onClick={() => setApagar(v.id)} aria-label={`Apagar a venda de ${dataBr(v.dia)}`}>
                    Apagar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
