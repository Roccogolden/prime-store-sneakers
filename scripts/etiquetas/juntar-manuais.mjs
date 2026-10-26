// Junta as caixas manuais da revisão às detecções. node juntar-manuais.mjs <deteccoes.json> <manuais.json> <saida.json>
// Pode rodar sobre a própria saída: as caixas, os recortes e os clones da revisão anterior saem antes de entrar os atuais.
import fs from 'node:fs';
const [detArq, manArq, saida] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(detArq, 'utf8'));
const M = JSON.parse(fs.readFileSync(manArq, 'utf8'));
for (const d of Object.values(D)) {
  if (d.manuais) d.manuais = d.manuais.filter((r) => r.tipo !== 'manual');
  delete d.recorte;
  delete d.clone;
}
for (const id of M._descartar_cantos || []) if (D[id]) D[id].manuais = (D[id].manuais || []).filter((r) => !String(r.motivo).startsWith('canto:'));
const mexidas = new Set(M._descartar_cantos || []);
for (const [id, v] of Object.entries(M)) {
  if (id.startsWith('_') || !D[id]) continue;
  const regioes = Array.isArray(v) ? v : v.regioes;
  D[id].manuais = [...(D[id].manuais || []), ...regioes.map((r) => ({ tipo: 'manual', ...r }))];
  if (!Array.isArray(v) && v.recorte) D[id].recorte = v.recorte;
  if (!Array.isArray(v) && v.clone) D[id].clone = v.clone;
  mexidas.add(id);
}
for (const [id, d] of Object.entries(D)) if ((d.manuais || []).some((r) => String(r.motivo).startsWith('canto:'))) mexidas.add(id);
fs.writeFileSync(saida, JSON.stringify(D, null, 1));
console.log([...mexidas].sort().join(','));
