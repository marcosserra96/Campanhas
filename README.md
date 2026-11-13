# Campanhas CIPAA • Energisa

Portal responsivo de campanhas solidárias, hospedável na Vercel e conectado ao Supabase.

## Situação da integração

- O banco Supabase `kgbnapstffmqdwhtslwt` contém as tabelas `campaigns`, `institutions`, `needs`, `donations` e `portal_settings`.
- Uma campanha `natal-2026` foi criada como **rascunho**, sem instituições de exemplo.
- O painel administrativo consulta e grava dados reais por rotas de servidor; a página dos colaboradores consulta apenas campanhas **publicadas**.
- A página pública atualiza os indicadores automaticamente a cada **8 segundos** quando está visível (polling, não Supabase Realtime por WebSocket).
- O acesso administrativo usa um **link reservado** com token, sem login tradicional; o token gera um cookie HttpOnly com validade de sete dias. O PIN adicional continua planejado.
- O registro de doações inclui o nome do responsável pelo recebimento e o doador, que **não são enviados pela API pública**.
- Ainda falta validar o build e os fluxos no ambiente Vercel. Não usar como sistema oficial antes dessa validação.

## Configuração na Vercel

Em **Project → Settings → Environment Variables**, configure para Production, Preview e Development conforme necessidade:

| Variável | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://kgbnapstffmqdwhtslwt.supabase.co` |
| `SUPABASE_SECRET_KEY` | chave **secret** obtida em Supabase → Project Settings → API Keys |
| `ADMIN_ACCESS_TOKEN` | valor aleatório com pelo menos 32 caracteres |

**Nunca coloque `SUPABASE_SECRET_KEY` ou `ADMIN_ACCESS_TOKEN` em variáveis com prefixo `NEXT_PUBLIC_`, no GitHub ou em mensagens públicas.**

O endereço reservado para os membros da CIPAA é:

```text
https://campanhas-chi.vercel.app/cipaa#access=SEU_ADMIN_ACCESS_TOKEN
```

A chave fica no fragmento da URL, é enviada uma vez por POST à aplicação e é removida da barra de endereço após a troca por cookie de sessão. Compartilhe a URL somente com membros autorizados. Se vazar, troque `ADMIN_ACCESS_TOKEN` na Vercel e faça um novo deploy; isso também invalida as sessões antigas.

Para visualizar a campanha após a publicação:

```text
https://campanhas-chi.vercel.app/campanha/natal-2026
```

A campanha inicial está em rascunho, por isso não aparece publicamente até que um administrador altere seu status para **Publicada** e clique em **Salvar campanha**.

## Rodar localmente

1. Copie `.env.example` para `.env.local` e preencha as chaves.
2. Execute `npm install`, depois `npm run dev`.
3. Abra `http://localhost:3000/cipaa#access=SEU_TOKEN`.

## Segurança e limitações

- RLS habilitado. Leitura pública limitada a campanhas publicadas, sem leitura pública direta da tabela de doações.
- Gravações via rotas Next.js exigem cookie assinado e verificação de origem.
- O token compartilhado não identifica individualmente os administradores; registra-se o nome informado pelo membro da CIPAA.
- O link privado não substitui uma autenticação individual para processos com requisitos mais rígidos de auditoria.
- Faltam upload de logos/imagens no Storage, histórico de alterações em todas as entidades, PIN adicional, testes automatizados e travas de taxa contra tentativas abusivas.
- Para metas com unidades diferentes (itens, kg, R$), não utilize a soma numérica simples como indicador único: priorize o progresso por item/instituição até implementar normalização de metas.
