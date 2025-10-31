import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { ArmazenamentoService } from './armazenamento.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Controller para upload de avatar, protegido por autenticação JWT.
 */
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly armazenamentoService: ArmazenamentoService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Endpoint para upload de avatar. Atualiza o campo avatarUrl do usuário.
   * @param file Arquivo enviado
   * @param req Request com JWT (req.user.id)
   * @returns avatarUrl atualizado
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    ) file: Express.Multer.File,
    @Req() req,
  ) {
    const usuarioId = req.user.id;
    const url = await this.armazenamentoService.uploadAvatar(file.buffer, file.mimetype, usuarioId);
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { avatarUrl: url } });
    return { avatarUrl: url };
  }
}
