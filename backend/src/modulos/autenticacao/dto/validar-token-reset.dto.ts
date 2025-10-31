import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ValidarTokenResetDto {
  @IsEmail({}, { message: 'Formato de email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @Length(64, 64, { message: 'Token deve ter 64 caracteres' })
  token: string;
}
