export class ErroDeNegocio extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.name = 'ErroDeNegocio';
    this.codigo = codigo;
  }
}
