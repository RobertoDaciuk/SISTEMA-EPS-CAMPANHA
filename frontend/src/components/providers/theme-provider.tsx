"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Provedor de Tema para gerenciar Light/Dark Mode
 * 
 * Utiliza a biblioteca next-themes para persistir a preferência
 * do usuário e sincronizar com a classe 'dark' no elemento HTML.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}