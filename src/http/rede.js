import { isIP } from 'node:net';

export function hostPermitido(req, redeLocal = false) {
  const nomes = ['127.0.0.1', 'localhost', '[::1]'];
  if (redeLocal) {
    // Usar o endereço da conexão recebida, não nomes arbitrários enviados
    // pelo navegador. Assim, todos os IPs locais da máquina podem atender.
    const endereco = req.socket.localAddress?.replace(/^::ffff:/, '');
    if (isIP(endereco ?? '')) nomes.push(isIP(endereco) === 6 ? `[${endereco}]` : endereco);
  }
  const host = req.headers.host?.toLowerCase();
  return nomes.some(nome => host === `${nome}:${req.socket.localPort}`
    || (req.socket.localPort === 80 && host === nome));
}

export function mesmaOrigem(req, redeLocal = false) {
  if (!hostPermitido(req, redeLocal)) return false;
  try {
    return req.headers.origin === new URL(`http://${req.headers.host}`).origin;
  } catch { return false; }
}
