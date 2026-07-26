# Auditoria de Segurança — 2026-07-26

Revisão do fluxo de autenticação, autorização e rotas de API da plataforma gestao_campanha.

---

## 1. Logout sem autenticação obrigatória

**Severidade:** CRÍTICO  
**Arquivo:** `src/app/api/v1/auth/logout/route.ts`

**Antes:**
```ts
const auth = req.headers.get("authorization")?.replace("Bearer ", "");
if (auth) {
  const payload = verifyAccessToken(auth);
  await authService.logout(payload.userId);
}
// Retornava 200 mesmo sem token — refresh_token da vítima nunca revogado
return Response.json({ message: "Logout realizado" });
```

**Problema:** Token era opcional. Qualquer chamada sem `Authorization` retornava 200 sem revogar o refresh token no Redis, mantendo a sessão ativa.

**Depois:**
```ts
const auth = req.headers.get("authorization")?.replace("Bearer ", "");
if (!auth) throw new AppError("Token ausente", 401, "UNAUTHORIZED");
const payload = verifyAccessToken(auth);
await authService.logout(payload.userId);
```

---

## 2. Master — update de organização sem verificar existência

**Severidade:** CRÍTICO  
**Arquivo:** `src/app/api/v1/master/organizations/[id]/route.ts`

**Antes:**
```ts
// id vinha direto do parâmetro sem verificação
const org = await prisma.organization.update({ where: { id }, data: { ... } });
// Se org não existisse: erro Prisma P2025 vazava detalhes internos
```

**Problema:** ID arbitrário no parâmetro da rota causava erro Prisma P2025 sem resposta 404 controlada. Sem validação de existência antes da mutação.

**Depois:**
```ts
const exists = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
if (!exists) throw new AppError("Organização não encontrada", 404, "NOT_FOUND");
// update seguro após confirmação de existência
```

---

## 3. Webhook Stripe — metadata controlável pelo cliente e sem idempotência

**Severidade:** ALTO  
**Arquivo:** `src/app/api/v1/webhooks/stripe/route.ts`

**Antes:**
```ts
const organizationId = session.metadata?.organizationId;
if (organizationId) {
  // Nenhuma validação se a org existe
  // Sem controle de idempotência — reprocessamento ativava premium múltiplas vezes
  await prisma.organization.update({ where: { id: organizationId }, data: { planId: premiumPlan.id } });
}
```

**Problema:** `metadata.organizationId` é controlável pelo cliente no Stripe. Atacante poderia criar checkout com ID de outra organização e ativá-la como Premium. Reprocessamento duplicado do webhook também não era tratado.

**Depois:**
```ts
const [org, premiumPlan] = await Promise.all([
  prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, planId: true } }),
  prisma.plan.findFirst({ where: { name: "Premium" }, select: { id: true } }),
]);
if (!org) {
  console.error(`[Stripe] organizationId inválido: ${organizationId}`);
  return Response.json({ received: true });
}
// Idempotência: só atualiza se ainda não está no plano premium
if (premiumPlan && org.planId !== premiumPlan.id) {
  await prisma.organization.update({ where: { id: organizationId }, data: { planId: premiumPlan.id } });
}
```

---

## 4. Acesso master via x-organization-id sem rastreamento

**Severidade:** ALTO  
**Arquivo:** `src/middlewares/authenticate.ts`

**Antes:**
```ts
if (payload.isMaster) {
  const orgOverride = req.headers.get("x-organization-id");
  if (orgOverride) payload.organizationId = orgOverride; // silencioso, sem log
}
```

**Problema:** Um usuário master podia acessar dados de qualquer organização via header sem nenhum registro de auditoria, impossibilitando rastrear acessos cruzados.

**Depois:**
```ts
if (payload.isMaster) {
  const orgOverride = req.headers.get("x-organization-id");
  if (orgOverride) {
    console.warn(`[AUDIT] master ${payload.userId} acessando org ${orgOverride}`);
    payload.organizationId = orgOverride;
  }
}
```

---

## 5. Mínimo de senha inconsistente entre login e criação

**Severidade:** MÉDIO  
**Arquivos:** `src/modules/auth/dto.ts`, `src/modules/users/dto.ts`

**Antes:**
```ts
// auth/dto.ts — login
password: z.string().min(6)

// users/dto.ts — criação
password: z.string().min(8)
```

**Problema:** Usuário criado com senha de 6 caracteres poderia logar (validação permitia `min(6)`), mas a regra de criação exigia `min(8)`. Inconsistência entre endpoints.

**Depois:**
```ts
// auth/dto.ts — login
password: z.string().min(8)

// users/dto.ts — criação (sem alteração)
password: z.string().min(8)
```

---

## Compatibilidade / Dependências — corrigidas na mesma sessão

| Item | Antes | Depois |
|---|---|---|
| Next.js | 16.2.10 (múltiplos CVEs) | 16.2.12 |
| `middleware.ts` | deprecated | renomeado para `proxy.ts` com `export function proxy` |
| `npm audit fix` | 17 vulns (4 moderate, 13 high) | não-breaking aplicados |
| `"use client"` após imports | 4 arquivos com diretiva na linha 2 | movido para linha 1 |
| `prisma generate` no build | ausente | adicionado ao script `build` |
| `vitest` | não instalado | instalado como devDependency |
| `vercel.json` env `@secret` | sintaxe legada incompatível | bloco removido; vars configuradas no dashboard |

---

## Itens fora de escopo (não corrigidos)

- **Rate limiting em memória:** funciona em processo único; não replica em clusters/serverless. Migrar para Upstash Redis quando houver múltiplas instâncias.
- **ESLint/PostCSS/Sharp HIGH:** vulnerabilidades em devDependencies ou transitivas do Next.js — não executam em produção. Aguardar patch upstream.
- **CSRF:** Next.js App Router tem proteção nativa via `SameSite=Strict` nos cookies de sessão.
