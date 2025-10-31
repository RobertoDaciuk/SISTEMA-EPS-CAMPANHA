import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

/**
 * DTO para troca de senha pelo próprio usuário.
 */
export class AtualizarSenhaDto {
  /** Senha atual para verificação */
  @IsString()
  @IsNotEmpty()
  senhaAtual: string;

  /** Nova senha (mínimo 8 caracteres, ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial) */
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'A nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.',
  })
  novaSenha: string;
}
