import { useState } from 'react';

/** Campo de senha com "Mostrar" (no celular é fácil errar uma letra sem ver). */
export function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  autoComplete,
  ajuda,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  ajuda?: string;
}) {
  const [ver, setVer] = useState(false);
  return (
    <div className="pn-campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="pn-senha">
        <input
          id={id}
          type={ver ? 'text' : 'password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          minLength={autoComplete === 'new-password' ? 8 : undefined}
          aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        />
        <button type="button" className="pn-senha__ver" aria-pressed={ver} onClick={() => setVer((v) => !v)}>
          {ver ? 'Esconder' : 'Mostrar'}
        </button>
      </div>
      {ajuda && (
        <p className="pn-campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </p>
      )}
    </div>
  );
}

export function Mensagem({ msg }: { msg: { ok: boolean; texto: string } | null }) {
  if (!msg) return null;
  return (
    <p className={msg.ok ? 'pn-msg pn-msg--ok' : 'pn-msg pn-msg--erro'} role={msg.ok ? 'status' : 'alert'}>
      {msg.texto}
    </p>
  );
}
