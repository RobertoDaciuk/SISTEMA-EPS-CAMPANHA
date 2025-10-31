import React from "react";
import AuthLayout from "@/components/layout/AuthLayout";

/**
 * Layout para rotas de autenticação
 * 
 * Este layout será aplicado automaticamente a todas as
 * páginas dentro do grupo (auth):
 * - /login
 * - /registro
 * - /recuperar-senha
 * - etc.
 */
export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}