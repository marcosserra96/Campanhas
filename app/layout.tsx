import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Campanhas | CIPAA Energisa',description:'Portal de campanhas solidárias e arrecadação da CIPAA'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
