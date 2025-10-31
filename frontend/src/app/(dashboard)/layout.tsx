import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

/**
 * Layout para rotas do dashboard
 * 
 * Este layout será aplicado automaticamente a todas as
 * páginas dentro do grupo (dashboard):
 * - / (home/dashboard)
 * - /campanhas
 * - /ranking
 * - /premios
 * - /historico
 * - /perfil
 * - /configuracoes
 */
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}