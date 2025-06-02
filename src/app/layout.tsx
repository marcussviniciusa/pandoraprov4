import type { Metadata } from "next";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Pandora Pro - Sistema Multicanal Inteligente",
  description: "Sistema Multicanal Inteligente para Escritórios de Advocacia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AuthSessionProvider session={null}>
          {children}
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
