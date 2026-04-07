import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Yez Store — Loja Colaborativa',
  description: 'Produtos locais, artesanato e variedade',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}