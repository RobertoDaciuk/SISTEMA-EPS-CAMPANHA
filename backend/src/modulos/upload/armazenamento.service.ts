import { Injectable, Logger } from '@nestjs/common';

/**
 * Serviço DUMMY genérico para simulação de upload. Não salva arquivos fisicamente.
 */
@Injectable()
export class ArmazenamentoService {
  private readonly logger = new Logger(ArmazenamentoService.name);

  /**
   * Realiza upload "falso" de qualquer arquivo e retorna uma URL simulada.
   * @param buffer Conteúdo do arquivo
   * @param mimetype Mimetype do arquivo (ex: image/jpeg)
   * @param pastaDestino Nome da pasta virtual (ex: 'avatars' ou 'premios')
   * @param nomeBaseArquivo Base para nome do arquivo (geralmente ID ou slug)
   * @returns URL simulada do arquivo armazenado
   */
  async uploadArquivo(
    buffer: Buffer,
    mimetype: string,
    pastaDestino: string,
    nomeBaseArquivo: string,
  ): Promise<string> {
    const extensao = mimetype.split('/')[1] ?? 'png';
    const nomeArquivo = `${pastaDestino}/${nomeBaseArquivo}-${Date.now()}.${extensao}`;
    this.logger.log(
      `[ARMAZENAMENTO DUMMY] Simulating upload for: ${nomeArquivo}, Size: ${buffer.length} bytes`
    );
    return `https://storage.googleapis.com/eps-campanhas-fake-bucket/${nomeArquivo}`;
  }

  /**
   * Wrapper específico para upload de avatar, que delega ao método genérico.
   * @param fileBuffer Conteúdo do arquivo
   * @param mimetype Mimetype do arquivo
   * @param usuarioId ID do usuário
   * @returns URL simulada do avatar
   */
  async uploadAvatar(fileBuffer: Buffer, mimetype: string, usuarioId: string): Promise<string> {
    return this.uploadArquivo(fileBuffer, mimetype, 'avatars', usuarioId);
  }
}
