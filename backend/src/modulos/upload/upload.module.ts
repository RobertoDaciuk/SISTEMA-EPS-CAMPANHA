import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { ArmazenamentoService } from './armazenamento.service';

/**
 * Módulo de upload - exporta o ArmazenamentoService para reutilização global.
 */
@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 }, // Limite global de 10MB.
    }),
  ],
  controllers: [UploadController],
  providers: [ArmazenamentoService],
  exports: [ArmazenamentoService], // Garante exportação para outros módulos
})
export class UploadModule {}
