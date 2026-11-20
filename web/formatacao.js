export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, letra => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letra]);
}
export function moeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
export function data(valor) { return valor ? valor.slice(0, 10).split('-').reverse().join('/') : '—'; }
export function horario(valor) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}
export function cpf(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length !== 11) return String(valor ?? '');
  return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
}
export function mascaraCpf(valor) {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}
export function mascaraTelefone(valor) {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}
export function telefone(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return mascaraTelefone(d);
  return String(valor ?? '—');
}
export function somarDias(dataInicial, dias) {
  const dia = new Date(`${dataInicial}T00:00:00Z`);
  if (!Number.isFinite(dia.getTime()) || !Number.isInteger(dias) || dias < 1 || dias > 36500) return '';
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}
