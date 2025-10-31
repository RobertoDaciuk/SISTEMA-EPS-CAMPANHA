import { Module } from '@nestjs/common';
import { PremioController } from './premio.controller';
import { PremioService } from './premio.service';
import { UploadModule } from '../upload/upload.module';

/**
 * Módulo de Prêmios - agora importa UploadModule para acesso ao ArmazenamentoService.
 */
@Module({
  imports: [UploadModule],
  controllers: [PremioController],
  providers: [PremioService],
})
export class PremioModule {}
