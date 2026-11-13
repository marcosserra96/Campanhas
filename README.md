# Campanhas • CIPAA Energisa

Portal responsivo para gestão de campanhas solidárias, instituições, necessidades, recebimentos e ranking de doações.

## Executar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000 (portal público) e http://localhost:3000/cipaa (painel administrativo).

## Estado atual — protótipo funcional

- O painel permite criar e editar campanhas, cadastrar instituições e necessidades, lançar doações, escolher critérios de ranking, visualizar o portal público e baixar QR Code.
- Os dados são **exemplos** e são guardados em `localStorage` **somente neste navegador**. Não existe sincronização entre dispositivos, autenticação, banco de dados ou publicação de dados compartilhados.
- **Não utilize o lançamento local como registro oficial de arrecadações.** O ranking público ainda não é em tempo real entre dispositivos.
- O PIN aparece como recurso futuro, **não implementado**: habilitá-lo exige um backend com sessão e verificação no servidor. A URL /cipaa por enquanto **não está protegida**.
- Antes de uso real: conectar armazenamento e APIs persistentes com controle de escrita no servidor, criar proteção administrativa efetiva, guardar imagens no storage, registrar auditoria e atualizar o ranking em tempo real.
- Substituir instituição e metas de exemplo e publicar a campanha quando estiver pronta.

### Tecnologia

Next.js, React, TypeScript, CSS responsivo, lucide-react e qrcode.react.
