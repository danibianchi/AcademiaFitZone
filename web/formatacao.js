export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, letra => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letra]);
}
export function moeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
export function data(valor) { return valor ? valor.slice(0, 10).split('-').reverse().join('/') : '—'; }
export function horario(valor) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}
export function cpf(valor) { return String(valor).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); }
export function somarDias(dataInicial, dias) {
  const dia = new Date(`${dataInicial}T00:00:00Z`);
  if (!Number.isFinite(dia.getTime()) || !Number.isInteger(dias) || dias < 1 || dias > 36500) return '';
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}
