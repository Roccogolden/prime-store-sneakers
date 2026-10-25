export const siteUrl = 'https://prime-store-sneakers.vercel.app';

export const loja = {
  nome: 'Prime Store',
  atendente: 'Robson',
  cidade: 'Aparecida de Goiânia',
  uf: 'GO',
  whatsappNumero: '5562981168032',
  whatsappExibido: '(62) 98116-8032',
  instagram: '@prime.storego',
  instagramUrl: 'https://www.instagram.com/prime.storego/',
};

export function whatsappLink(mensagem?: string) {
  const base = `https://wa.me/${loja.whatsappNumero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

export const mensagemGeral = `Olá, ${loja.atendente}! Vim pelo site da ${loja.nome} e quero ver os modelos disponíveis.`;
