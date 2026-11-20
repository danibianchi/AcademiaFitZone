export async function requisitar(caminho, metodo = 'GET', dados) {
  const controller = new AbortController();
  const limite = setTimeout(() => controller.abort(), 15000);
  try {
    const resposta = await fetch(`/api${caminho}`, {
      method: metodo, signal: controller.signal,
      headers: dados === undefined ? {} : { 'Content-Type': 'application/json' },
      body: dados === undefined ? undefined : JSON.stringify(dados),
    });
    if (resposta.status === 204) return null;
    const conteudo = await resposta.json();
    if (!resposta.ok) throw new Error(conteudo.mensagem ?? 'Não foi possível concluir a operação.');
    return conteudo;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw new Error(metodo === 'GET' ? 'Não foi possível consultar o sistema. Verifique a conexão e tente atualizar.' : 'Não foi possível confirmar a operação. Consulte o cadastro ou histórico antes de tentar novamente.');
    }
    throw error;
  } finally { clearTimeout(limite); }
}
