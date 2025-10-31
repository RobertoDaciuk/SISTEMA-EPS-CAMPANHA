import { Module } from '@nestjs/common';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PerfilController],
  providers: [PerfilService, PrismaService],
  exports: [PerfilService],
})
export class PerfilModule {}
