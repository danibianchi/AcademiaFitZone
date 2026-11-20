import { requisitar } from './api.js';
import { escapar as e, moeda, data, horario, cpf, somarDias } from './formatacao.js';

const $ = seletor => document.querySelector(seletor);
const estado = { tela: 'atendimento', planos: [], alunos: [], aluno: null, resultado: null, saude: null, ocupado: false, pronto: false };
let sequenciaBusca = 0;
let temporizadorBusca;
let confirmarOperacao;
const nomePlano = id => estado.planos.find(p => p.id_plano === id)?.nome ?? 'Plano indisponível';
const selo = aluno => `<span class="selo ${aluno.status_matricula === 'ATIVO' ? 'ativo' : 'cancelado'}">${aluno.status_matricula === 'ATIVO' ? 'Ativa' : 'Cancelada'}</span>`;
const botao = (acao, id, nome, classe = 'acao-texto') => `<button type="button" class="${classe}" data-acao="${acao}" data-id="${id}">${nome}</button>`;

function mensagem(texto, erro = false, formulario) {
  const alvo = formulario ? formulario.querySelector('.erro-form') : $('#mensagem');
  alvo.textContent = texto;
  alvo.hidden = false;
  alvo.classList.toggle('erro', erro);
  alvo.setAttribute('role', erro ? 'alert' : 'status');
}
function limparMensagem() { $('#mensagem').hidden = true; }

function renderizarAlunos() {
  const lista = estado.alunos;
  $('#quantidade-atendimento').textContent = `${lista.length} resultado${lista.length === 1 ? '' : 's'}${lista.length === 100 ? ' (limite da consulta)' : ''}`;
  $('#lista-atendimento').innerHTML = lista.length ? lista.map(a => `<div class="linha-aluno ${estado.aluno?.id_aluno === a.id_aluno ? 'selecionado' : ''}"><span class="avatar" aria-hidden="true">${e(a.nome.split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase())}</span><div class="dados"><strong>${e(a.nome)}</strong><small>${e(cpf(a.cpf))} · ${a.status_matricula === 'ATIVO' ? 'Ativa' : 'Cancelada'}</small></div>${botao('selecionar', a.id_aluno, 'Selecionar', 'secundario')}</div>`).join('') : '<div class="vazio"><h2>Nenhum aluno encontrado</h2><p>Confira a busca ou cadastre um novo aluno para começar o atendimento.</p></div>';
  $('#tabela-alunos').innerHTML = lista.length ? lista.map(a => `<tr><td><strong>${e(a.nome)}</strong><small>${e(cpf(a.cpf))}</small></td><td>${e(nomePlano(a.id_plano))}</td><td>${data(a.data_vencimento)}</td><td>${selo(a)}</td><td class="acoes-linha">${botao('selecionar', a.id_aluno, 'Atender')}${botao('editar-aluno', a.id_aluno, 'Editar')}${botao('excluir-aluno', a.id_aluno, 'Excluir', 'acao-texto excluir')}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum aluno encontrado. Ajuste a busca ou cadastre um aluno.</td></tr>';
}

function renderizarFicha() {
  const aluno = estado.aluno;
  if (!aluno) return;
  const resultado = estado.resultado;
  const decisao = resultado ? `<div class="resultado ${!resultado.permitido ? 'bloqueado' : resultado.alerta_emitido ? 'alerta' : 'permitido'}" role="status"><strong>${!resultado.permitido ? 'Entrada bloqueada' : resultado.alerta_emitido ? 'Entrada permitida com alerta' : 'Entrada permitida'}</strong><p>${e(resultado.motivo_bloqueio ?? (resultado.alerta_emitido ? `Mensalidade com ${resultado.dias_atraso} dia(s) de atraso.` : 'Mensalidade em dia.'))}</p><p>Tentativa registrada no histórico.</p></div>` : '';
  $('#ficha').innerHTML = `<div class="ficha-conteudo"><div class="ficha-topo"><div><h2>${e(aluno.nome)}</h2><p>CPF ${e(cpf(aluno.cpf))}</p></div>${selo(aluno)}</div><dl><div><dt>Plano vigente</dt><dd>${e(nomePlano(aluno.id_plano))}</dd></div><div><dt>Vencimento</dt><dd>${data(aluno.data_vencimento)}</dd></div><div><dt>Telefone</dt><dd>${e(aluno.telefone)}</dd></div><div><dt>Início do plano</dt><dd>${data(aluno.data_inicio_plano)}</dd></div></dl>${decisao}<div class="ficha-botoes">${botao('checkin', aluno.id_aluno, 'Registrar check-in', '')}${botao('pagamento', aluno.id_aluno, 'Registrar pagamento', 'secundario')}${botao(aluno.status_matricula === 'CANCELADO' ? 'reativar' : 'trocar-plano', aluno.id_aluno, aluno.status_matricula === 'CANCELADO' ? 'Reativar matrícula' : 'Trocar plano', 'secundario')}${botao('historico', aluno.id_aluno, 'Ver históricos', 'secundario')}</div><div class="ficha-links">${botao('editar-aluno', aluno.id_aluno, 'Editar cadastro')}${aluno.status_matricula === 'ATIVO' ? botao('cancelar', aluno.id_aluno, 'Cancelar matrícula', 'acao-texto excluir') : ''}</div></div>`;
}

function renderizarPlanos() {
  $('#tabela-planos').innerHTML = estado.planos.length ? estado.planos.map(p => `<tr><td><strong>${e(p.nome)}</strong></td><td>${moeda(p.valor)}</td><td>${p.duracao_dias} dias</td><td><span class="selo ${p.ativo ? 'ativo' : 'cancelado'}">${p.ativo ? 'Disponível' : 'Desativado'}</span></td><td class="acoes-linha">${botao('editar-plano', p.id_plano, 'Editar')}${botao('excluir-plano', p.id_plano, 'Excluir', 'acao-texto excluir')}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum plano cadastrado. Cadastre um plano para vincular alunos.</td></tr>';
}

function mostrarTela(tela) {
  estado.tela = tela;
  const titulos = { atendimento: 'Atendimento', alunos: 'Alunos', planos: 'Planos', historicos: 'Históricos' };
  $('#titulo-tela').textContent = titulos[tela];
  document.querySelectorAll('nav [data-tela]').forEach(b => {
    if (b.dataset.tela === tela) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  Object.keys(titulos).forEach(t => { $(`#tela-${t}`).hidden = t !== tela; });
  $('#barra-busca').hidden = !['atendimento', 'alunos'].includes(tela);
  if (tela === 'historicos') carregarHistoricos().catch(error => mensagem(error.message, true));
}

async function carregarAlunos() {
  const seq = ++sequenciaBusca;
  const parametros = new URLSearchParams({ busca: $('#busca-aluno').value, status: $('#filtro-status').value });
  const alunos = await requisitar(`/alunos?${parametros}`);
  if (seq !== sequenciaBusca) return;
  estado.alunos = alunos; renderizarAlunos();
}

async function carregarTudo() {
  const [saude, planos] = await Promise.all([requisitar('/saude'), requisitar('/planos')]);
  estado.saude = saude; estado.planos = planos; estado.pronto = true;
  $('#conexao').textContent = saude.demonstracao ? 'Demonstração' : 'Conectado ao MySQL';
  $('#aviso-demo').hidden = !saude.demonstracao;
  $('#data-operacional').textContent = `Data do atendimento: ${data(saude.data_operacional)}`;
  renderizarPlanos(); await carregarAlunos();
  if (estado.aluno) {
    try { estado.aluno = await requisitar(`/alunos/${estado.aluno.id_aluno}`); renderizarFicha(); }
    catch (error) { estado.aluno = null; estado.resultado = null; $('#ficha').innerHTML = '<div class="vazio"><h2>Selecione um aluno</h2><p>O cadastro não está disponível. Atualize a busca e selecione novamente.</p></div>'; throw error; }
  }
}

async function selecionar(id) {
  estado.aluno = await requisitar(`/alunos/${id}`);
  estado.resultado = null; renderizarFicha(); renderizarAlunos(); mostrarTela('atendimento');
}

async function carregarHistoricos() {
  const aluno = estado.aluno;
  const alvo = $('#historicos');
  if (!aluno) { alvo.innerHTML = '<div class="painel vazio"><h2>Selecione um aluno primeiro</h2><p>Escolha o cadastro no atendimento para consultar pagamentos e tentativas de entrada.</p></div>'; return; }
  const alunoId = aluno.id_aluno;
  alvo.innerHTML = '<div class="painel vazio">Consultando os históricos…</div>';
  const [pagamentos, checkins] = await Promise.all([requisitar(`/alunos/${alunoId}/pagamentos`), requisitar(`/alunos/${alunoId}/checkins`)]);
  if (estado.aluno?.id_aluno !== alunoId) return;
  alvo.innerHTML = `<div class="historico-topo"><div><h2>${e(aluno.nome)}</h2><p>Últimos 100 registros de cada histórico · horários de São Paulo</p></div>${botao('selecionar', alunoId, 'Voltar ao atendimento', 'secundario')}</div><div class="painel historico-bloco"><h2>Pagamentos</h2><div class="rolagem-tabela"><table><thead><tr><th>Data</th><th>Valor recebido</th><th>Vencimento anterior</th><th>Novo vencimento</th></tr></thead><tbody>${pagamentos.length ? pagamentos.map(p => `<tr><td>${horario(p.data_pagamento)}</td><td>${moeda(p.valor_pago)}</td><td>${data(p.vencimento_anterior)}</td><td>${data(p.novo_vencimento)}</td></tr>`).join('') : '<tr><td colspan="4">Nenhum pagamento registrado.</td></tr>'}</tbody></table></div></div><div class="painel historico-bloco"><h2>Tentativas de entrada</h2><div class="rolagem-tabela"><table><thead><tr><th>Data</th><th>Resultado</th><th>Atraso</th><th>Observação</th></tr></thead><tbody>${checkins.length ? checkins.map(c => `<tr><td>${horario(c.data_hora)}</td><td><span class="selo ${c.permitido ? 'ativo' : 'cancelado'}">${c.permitido ? 'Permitido' : 'Bloqueado'}</span></td><td>${c.dias_atraso} dia(s)</td><td>${e(c.motivo_bloqueio ?? (c.alerta_emitido ? 'Alerta de mensalidade vencida.' : 'Sem pendência.'))}</td></tr>`).join('') : '<tr><td colspan="4">Nenhuma tentativa registrada.</td></tr>'}</tbody></table></div></div>`;
}

function abrirDialog(nome) {
  const dialog = $(`#dialog-${nome}`);
  dialog.querySelector('.erro-form').hidden = true;
  dialog.showModal();
  dialog.querySelector('input:not([type=hidden]), select, button[type=submit]')?.focus();
}
function opcoesPlano(selecionado) {
  const ativos = estado.planos.filter(p => p.ativo);
  return '<option value="">Selecione um plano</option>' + ativos.map(p => `<option value="${p.id_plano}" ${p.id_plano === Number(selecionado) ? 'selected' : ''}>${e(p.nome)} · ${moeda(p.valor)} · ${p.duracao_dias} dias</option>`).join('');
}
function atualizarVencimentoInicial() {
  const plano = estado.planos.find(p => p.id_plano === Number($('#aluno-plano').value));
  if (plano && $('#aluno-inicio').value) $('#aluno-vencimento').value = somarDias($('#aluno-inicio').value, plano.duracao_dias);
}
function atualizarResumoVinculo() {
  const plano = estado.planos.find(p => p.id_plano === Number($('#vinculo-plano').value));
  $('#resumo-vinculo').textContent = plano ? `A vigência será contada a partir de ${data(estado.saude.data_operacional)}, com vencimento em ${data(somarDias(estado.saude.data_operacional, plano.duracao_dias))}. Esta alteração não registra um pagamento.` : 'A alteração recalcula o vencimento a partir da data do atendimento.';
}

async function abrirAluno(id) {
  const form = $('#form-aluno'); form.reset();
  const aluno = id ? await requisitar(`/alunos/${id}`) : null;
  form.elements.id_aluno.value = aluno?.id_aluno ?? '';
  $('#titulo-aluno').textContent = aluno ? 'Editar aluno' : 'Cadastrar aluno';
  $('#vinculo-inicial').hidden = Boolean(aluno); $('#vinculo-inicial').disabled = Boolean(aluno);
  $('#aluno-nascimento').max = estado.saude.data_operacional;
  for (const campo of ['nome', 'cpf', 'telefone', 'data_nascimento']) form.elements[campo].value = aluno?.[campo] ?? '';
  $('#aluno-plano').innerHTML = opcoesPlano();
  if (!aluno) {
    if (!estado.planos.some(p => p.ativo)) { mostrarTela('planos'); mensagem('Cadastre ou ative um plano antes de cadastrar um aluno.', true); return; }
    $('#aluno-inicio').value = estado.saude.data_operacional;
  }
  abrirDialog('aluno');
}
function abrirPlano(id) {
  const form = $('#form-plano'); form.reset();
  const plano = estado.planos.find(p => p.id_plano === id);
  form.elements.id_plano.value = plano?.id_plano ?? '';
  $('#titulo-plano').textContent = plano ? 'Editar plano' : 'Cadastrar plano';
  for (const campo of ['nome', 'valor', 'duracao_dias']) form.elements[campo].value = plano?.[campo] ?? '';
  form.elements.ativo.checked = plano ? Boolean(plano.ativo) : true;
  abrirDialog('plano');
}
function abrirPagamento() {
  const plano = estado.planos.find(p => p.id_plano === estado.aluno.id_plano);
  if (!plano) throw new Error('Atualize os dados antes de registrar o pagamento.');
  $('#form-pagamento').reset();
  $('#resumo-pagamento').textContent = `${estado.aluno.nome} · ${plano.nome} · valor do plano: ${moeda(plano.valor)}.`;
  $('#pagamento-valor').value = plano.valor;
  $('#aviso-cancelado').hidden = estado.aluno.status_matricula !== 'CANCELADO';
  abrirDialog('pagamento');
}
function abrirVinculo(reativar) {
  $('#form-vinculo').reset();
  $('#titulo-vinculo').textContent = reativar ? 'Reativar matrícula' : 'Trocar plano';
  $('#form-vinculo').elements.reativar.value = reativar ? 'sim' : 'nao';
  $('#vinculo-plano').innerHTML = opcoesPlano(); atualizarResumoVinculo(); abrirDialog('vinculo');
}
function confirmar(titulo, texto, operacao) {
  $('#titulo-confirmar').textContent = titulo; $('#texto-confirmar').textContent = texto;
  confirmarOperacao = operacao; abrirDialog('confirmar');
}

async function executar(operacao, form) {
  if (estado.ocupado) return;
  estado.ocupado = true; document.body.classList.add('ocupado');
  const botoes = [...document.querySelectorAll('button')].map(b => [b, b.disabled]);
  botoes.forEach(([b]) => { b.disabled = true; });
  try { await operacao(); }
  catch (error) { mensagem(error.message, true, form?.closest('dialog')?.open ? form : undefined); }
  finally { estado.ocupado = false; document.body.classList.remove('ocupado'); botoes.forEach(([b, anterior]) => { b.disabled = anterior; }); }
}

document.addEventListener('click', event => {
  const b = event.target.closest('button');
  if (!b || estado.ocupado) return;
  if (b.hasAttribute('data-fechar')) { b.closest('dialog').close(); return; }
  if (b.dataset.tela) { limparMensagem(); mostrarTela(b.dataset.tela); return; }
  const acao = b.dataset.acao; if (!acao) return;
  if (!estado.pronto && acao !== 'atualizar') { mensagem('Aguarde a conexão ou use Atualizar para tentar novamente.', true); return; }
  const id = Number(b.dataset.id);
  executar(async () => {
    limparMensagem();
    if (acao === 'atualizar') { await carregarTudo(); if (estado.tela === 'historicos') await carregarHistoricos(); mensagem('Dados atualizados.'); }
    if (acao === 'novo-aluno' || acao === 'editar-aluno') await abrirAluno(acao === 'novo-aluno' ? null : id);
    if (acao === 'novo-plano' || acao === 'editar-plano') abrirPlano(acao === 'novo-plano' ? null : id);
    if (acao === 'selecionar') await selecionar(id);
    if (acao === 'historico') mostrarTela('historicos');
    if (acao === 'pagamento') abrirPagamento();
    if (acao === 'trocar-plano' || acao === 'reativar') abrirVinculo(acao === 'reativar');
    if (acao === 'checkin') { estado.resultado = await requisitar(`/alunos/${id}/checkins`, 'POST', {}); renderizarFicha(); }
    if (acao === 'cancelar') confirmar('Cancelar matrícula', `Cancelar a matrícula de ${estado.aluno.nome}? Os históricos serão mantidos e novas entradas ficarão bloqueadas até a reativação.`, async () => { await requisitar(`/alunos/${id}/cancelamento`, 'POST', {}); estado.resultado = null; });
    if (acao === 'excluir-aluno' || acao === 'excluir-plano') confirmar('Excluir cadastro', 'Excluir este cadastro? A exclusão só será permitida se não houver vínculos. Para preservar o histórico, prefira cancelar a matrícula ou desativar o plano.', async () => {
      await requisitar(`/${acao === 'excluir-aluno' ? 'alunos' : 'planos'}/${id}`, 'DELETE');
      if (acao === 'excluir-aluno' && estado.aluno?.id_aluno === id) { estado.aluno = null; estado.resultado = null; $('#ficha').innerHTML = '<div class="vazio"><h2>Selecione um aluno</h2><p>Escolha um cadastro para iniciar o atendimento.</p></div>'; }
    });
  });
});

document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target;
  if (estado.ocupado || !form.reportValidity()) return;
  executar(async () => {
    const valores = Object.fromEntries(new FormData(form));
    let sucesso = 'Operação concluída.';
    if (form.id === 'form-aluno') {
      const editar = Boolean(valores.id_aluno);
      if (!editar) valores.id_plano = Number(valores.id_plano);
      const aluno = await requisitar(editar ? `/alunos/${valores.id_aluno}` : '/alunos', editar ? 'PATCH' : 'POST', valores);
      estado.aluno = aluno; estado.resultado = null; sucesso = editar ? 'Cadastro atualizado.' : 'Aluno cadastrado. Agora você pode registrar o pagamento e o check-in.';
    }
    if (form.id === 'form-plano') {
      await requisitar(valores.id_plano ? `/planos/${valores.id_plano}` : '/planos', valores.id_plano ? 'PUT' : 'POST', { ...valores, duracao_dias: Number(valores.duracao_dias), ativo: form.elements.ativo.checked });
      sucesso = 'Plano salvo.';
    }
    if (form.id === 'form-pagamento') {
      const pagamento = await requisitar(`/alunos/${estado.aluno.id_aluno}/pagamentos`, 'POST', valores);
      estado.resultado = null; sucesso = `Pagamento registrado. Novo vencimento: ${data(pagamento.novo_vencimento)}.`;
    }
    if (form.id === 'form-vinculo') {
      await requisitar(`/alunos/${estado.aluno.id_aluno}/${valores.reativar === 'sim' ? 'reativacao' : 'plano'}`, 'POST', { id_plano: Number(valores.id_plano) });
      estado.resultado = null; sucesso = valores.reativar === 'sim' ? 'Matrícula reativada.' : 'Plano alterado.';
    }
    if (form.id === 'form-confirmar') await confirmarOperacao();
    form.closest('dialog').close();
    // Confirmar o sucesso antes da atualização: se a consulta falhar, não
    // sugerir repetir um pagamento que o servidor já confirmou.
    mensagem(sucesso);
    try { await carregarTudo(); if (estado.tela === 'historicos') await carregarHistoricos(); }
    catch { mensagem(`${sucesso} Não foi possível atualizar a consulta. Use Atualizar antes de realizar outra operação.`, true); }
  }, form);
});

$('#busca-aluno').addEventListener('input', () => {
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(() => carregarAlunos().catch(error => mensagem(error.message, true)), 250);
});
$('#filtro-status').addEventListener('change', () => carregarAlunos().catch(error => mensagem(error.message, true)));
$('#aluno-plano').addEventListener('change', atualizarVencimentoInicial);
$('#aluno-inicio').addEventListener('change', atualizarVencimentoInicial);
$('#vinculo-plano').addEventListener('change', atualizarResumoVinculo);

carregarTudo().catch(error => { estado.pronto = false; $('#conexao').textContent = 'Sem conexão'; mensagem(error.message, true); });
