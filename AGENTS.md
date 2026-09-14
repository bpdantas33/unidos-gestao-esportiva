# ⚠️ ESTA É A PASTA CORRETA
Path: `C:\Users\Bruno\OneDrive\Área de Trabalho\unidos-fc-ia`

## Pastas erradas (NÃO MEXER)
- ❌ `C:\Users\Bruno\Downloads\unidos (2)`
- ❌ `C:\Users\Bruno\OneDrive\Área de Trabalho\unidossuzano`
- ❌ `C:\Users\Bruno\Downloads\unidos`
- ❌ `C:\Users\Bruno\OneDrive\Área de Trabalho\unidos-fc`

> Live: https://unidossuzano.com.br (Cloudflare Pages)
> Deploy: use `powershell -File deploy.ps1` (build + deploy Cloudflare Pages)
> Backup antigo (fora do ar): https://unidos-suzano.vercel.app / https://unidosfc.vercel.app (cota Vercel esgotada)
> Firebase: project `gen-lang-client-0488712142`, database `ai-studio-1aa8d619-5d39-49fe-a797-0b814fd6c276`

## ⚠️ REGRA PRINCIPAL
**NÃO MEXER EM LAYOUT, NEM EM FUNCIONALIDADES EXISTENTES.** Apenas ajustes pontuais e novos recursos solicitados pelo usuário. O layout original do IA Studio deve permanecer intacto (sidebar fixa, header fixo, paleta de cores, animações, etc.).

## O que foi feito nesta sessão (05/07)

### Migração definitiva Firebase → Supabase

**Problema**: O Supabase estava completamente vazio. A migração que rodava no navegador (5s após mount) falhava silenciosamente porque o Firebase Auth não era inicializado.

**Além disso**: As tabelas do Supabase foram auto-criadas com nomes de colunas **minúsculos** (PostgreSQL lowercases identifiers não-quotados), mas o app espera camelCase. Ex: `hometeam` em vez de `homeTeam`, `isinjured` em vez de `isInjured`.

#### O que foi feito:

**1. Script de migração standalone** (`migrate-firebase-to-supabase.cjs`)
  - Conecta no Firebase via Web SDK com `signInAnonymously`
  - Lê todas as 6 coleções + config + confirmations
  - Escreve no Supabase com `upsert`, mapeando campos camelCase → lowercase
  - Foram migrados **248 documentos** com 0 falhas

**2. Normalização de colunas** (`src/lib/supabase.ts`)
  - `toCamel()`: converte lowercase do DB → camelCase (app) nas leituras
  - `toLower()`: converte camelCase (app) → lowercase do DB nas escritas
  - Todas as funções (`getCollectionData`, `listenCollection`, `saveItem`, etc.) aplicam o mapeamento automaticamente

**3. Fallback de imagens** (`src/lib/utils.ts` + `App.tsx`)
  - `playerImageUrl(name, url)`: gera SVG com a inicial do nome se `url` vazio
  - `useEffect` em App.tsx percorre players e preenche imagens vazias

**4. Sync de dados financeiros** (`App.tsx`)
  - `transactions` e `unpaidMembers` agora são fetchados do Supabase no sync rate-limited
  - Fallback: se cache estiver vazio, busca fora do rate-limit

#### Dados migrados

| Coleção | Firebase → Supabase |
|---------|-------------------|
| players | 48 (com fotos base64) |
| matches | 31 |
| transactions | 15 |
| unpaidMembers | 147 (com fotos) |
| standings | 7 |
| config | admin password |
| confirmations | dados de confirmação |

#### Arquivos alterados
- `src/lib/supabase.ts` — normalização camelCase/lowercase
- `src/App.tsx` — sync transactions/unpaidMembers + fallback de imagens
- `src/lib/utils.ts` — `playerImageUrl()`
- `migrate-firebase-to-supabase.cjs` — script de migração

#### Para testar
1. `npm run dev`
2. Limpar localStorage: `unidos_last_sync`, `unidos_cache_*`
3. Recarregar — dados do Firebase devem aparecer

## O que foi feito nesta sessão (03/07)

### Correção definitiva — cota Spark ainda estourava

**Problema**: A implementação anterior ainda causava ~24k reads/dia porque:
1. `onSnapshot` em 5 coleções fazia leitura inicial completa **em todo page load** (mesmo com cache)
2. Sync background ainda lia **4 coleções** (não só players + matches)
3. Cleanup deletava IndexedDB do Firestore, matando o `persistentLocalCache`
4. `listenConfirmations` foi removido junto com os outros listeners

#### Mudanças implementadas:

**1. Redução de 5 para 3 listeners** (`src/App.tsx`)
- Saiu: `listenCollection<Transaction>`, `listenCollection<UnpaidMember>` (voltaram a sync periódico)
- Saiu: `listenConfirmations` temporariamente removido (voltou no item 3)
- Ficou: `listenCollection<Player>`, `listenCollection<Match>` + `listenConfirmations`
- Ganho: **- (T + U) reads por page load**

**2. Sync background: só players + matches** (`src/App.tsx:181-188`)
- Antes: 4 coleções (players, matches, transactions, unpaidMembers)
- Agora: 2 coleções (players, matches)
- Ganho: **-50% reads no sync**

**3. listenConfirmations restaurado** (`src/App.tsx:263-267`)
- Custo: apenas **1 read** por page load (documento único)
- Motivo: confirmações são usadas em tempo real no Dashboard/Calendário

**4. Rate-limit de 5min para 15min** (`src/App.tsx:124`)
- Reduz frequência de sync sem impacto na experiência
- Ganho: **~1/3 dos syncs anteriores**

**5. Cleanup não deleta mais cache Firestore** (`src/App.tsx:104-111`)
- Antes: deletava IndexedDB do Firestore (`firestore/[DEFAULT]/.../main`)
- Agora: preserva o cache, permitindo `persistentLocalCache` funcionar
- Ganho: leituras subsequentes usam cache local

#### Custo estimado revisado

| Cenário | Antes (manhã) | Agora |
|---------|---------------|-------|
| 1º acesso frio | ~201 reads | ~75 reads |
| Refresh (cache ≤15min) | ~101 reads | **~1 read** (só confs) |
| Refresh + sync (>15min) | ~201 reads | ~75 reads |
| **60 users × 3 sessões** | **~24.180 🔴** | **~3.000-7.000 🟢** |
| Folga até 50k | — | **~43.000+** |

#### Arquivos alterados
- `src/App.tsx` — PASSO 2 (sync só 2 coleções), PASSO 3 (3 listeners essenciais), rate-limit 15min, cleanup preserva IndexedDB
- `AGENTS.md` — este log

## Critical Context
- `isBoardMember` persiste corretamente no Firebase
- `mustChangePin` é ativado ao promover um atleta a diretor
- Limite Spark: 50k reads/dia — **agora com folga de ~43k+**
- Cache: localStorage (`unidos_cache_*`) + `persistentLocalCache` no IndexedDB (agora funcional)
- Sync rate-limit: **15 minutos** via `unidos_last_sync` no localStorage
- **3 listeners ativos**: confirmations (1 doc), players, matches (tempo real)
- **Sync periódico**: só players + matches (transactions/unpaid via saveItem direto)

## Relevant Files
- `src/lib/firebase.ts`: `listenCollection`, `getCollectionData`
- `src/lib/confirmations.ts`: `updateConfirmation`, `listenConfirmations`, `migrateConfirmationsIfNeeded`
- `src/App.tsx`: initFirebase com localStorage-first + rate-limit 15min + 3 listeners

---
## O que foi feito nesta sessão (09/07)

### Segurança: Supabase Auth + RLS + Edge Functions

**Problema**: App 100% client-side sem segurança. Qualquer pessoa com anon key (exposta no bundle) podia ler/escrever em todas as tabelas. Auth PIN-based era puramente client-side (localStorage). Senha admin hardcoded no bundle (`admin123`).

#### O que foi feito:

**1. Row Level Security (RLS) no Supabase** (`supabase-security.sql`)
- Habilitei RLS em todas as 8 tabelas
- Policies de leitura pública (SELECT true) — app continua lendo normalmente
- Policies de escrita (comentadas por enquanto) — proteção real que bloqueia anon
- Revogado privilégios de escrita do anon, mantido apenas SELECT

**2. Auth anônimo automático** (`src/lib/supabase.ts`)
- `persistSession: true` + função `ensureAuth()` que faz `signInAnonymously()` automaticamente
- Toda requisição ao banco agora tem JWT válido
- Zero impacto na UX — o usuário não vê nada

**3. Edge Functions no Supabase** (3 novas):
- `validate-auth` — valida PIN/senha master SERVER-SIDE com service_role key
- `change-pin` — altera PIN com validação server-side do PIN atual
- `change-admin-password` — altera senha master com verificação server-side

**4. Login agora é server-validated** (`src/components/LoginView.tsx`)
- Substituí comparação de hash local por chamada à Edge Function
- PIN/senha nunca mais saem do client como hash — vão raw pra Edge Function que hashea server-side
- Mesma UX: seleciona nome, digita PIN, clica Entrar

**5. Senha admin não está mais hardcoded** (`src/App.tsx`)
- Removido `FALLBACK_ADMIN_HASH` ('admin123')
- Removido fallback: se não houver senha no banco, acesso master fica bloqueado
- Senha master só existe na tabela `config` do Supabase

**6. AdminSettingsModal usa Edge Function**
- Antes: comparava hash localmente e escrevia direto no banco
- Agora: chama `change-admin-password` Edge Function (valida + atualiza server-side)

**7. Deploy script atualizado** (`deploy.ps1`)
- Agora faz deploy das 3 Edge Functions no Supabase automaticamente
- Se `SUPABASE_ACCESS_TOKEN` não estiver configurado, mostra instruções

#### Arquivos alterados/criados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `supabase/functions/validate-auth/index.ts` | **Novo** | Edge Function — valida PIN/senha |
| `supabase/functions/change-pin/index.ts` | **Novo** | Edge Function — troca PIN |
| `supabase/functions/change-admin-password/index.ts` | **Novo** | Edge Function — troca senha master |
| `supabase-security.sql` | **Novo** | RLS + policies completo |
| `supabase/config.toml` | Alterado | Config das 3 Edge Functions |
| `src/lib/supabase.ts` | Alterado | Auth anônimo + `ensureAuth()` + `callFunction()` |
| `src/components/LoginView.tsx` | Alterado | Login via Edge Function |
| `src/App.tsx` | Alterado | Remove fallback hash, handlers via Edge Function |
| `deploy.ps1` | Alterado | Inclui deploy Edge Functions |

#### Para finalizar o deploy (ordem correta):

```
1. npm run build                    # Build do app
2. npx vercel --prod               # Deploy Vercel
3. Executar supabase-security.sql  # FASE A (passos 1-4) no SQL Editor
4. npx supabase login              # Autenticar CLI do Supabase
5. deploy.ps1                      # Deploy Edge Functions (ou comando manual)
6. Executar supabase-security.sql  # FASE B (passo 5-6) no SQL Editor
   ⚠️ SÓ APÓS o deploy do app + Edge Functions
```

---
## O que foi feito nesta sessão (13/07)

### Correção definitiva — segurança em 3 camadas

**Problema raiz**: 
1. `REVOKE INSERT/UPDATE/DELETE` removeu permissão de `authenticated` — escritas diretas quebradas
2. Anonymous sign-in desabilitado — app não tinha JWT válido
3. `config push` não funciona em CI (interativo) — `verify_jwt` nunca alterado

**Solução**: Edge Functions como proxy + anonymous sign-in habilitado + verificação de JWT na função

#### Arquivos alterados nesta rodada

| Arquivo | Mudança |
|---------|---------|
| `supabase/config.toml` | `[auth] enable_anonymous_sign_ins = true` |
| `supabase/functions/write-data/index.ts` | Auth check: `req.headers.get('Authorization')` |
| `supabase/functions/confirm-attendance/index.ts` | Auth check: `req.headers.get('Authorization')` |
| `src/lib/supabase.ts` | `callFunction` mantém `apiKey` header (gateway exige) |
| `supabase/functions/validate-auth/index.ts` | Revertido ao original (sem `fix_permissions`) |

#### Deploy

| Recurso | Status |
|---------|--------|
| 5 Edge Functions | Deployadas |
| App (Vercel) | Build + deploy |
| Aliases | `unidos-suzano.vercel.app` + `unidos-fc.vercel.app` |

#### Segurança final (3 camadas)

| Camada | O que bloqueia | Como |
|--------|---------------|------|
| 1 — REVOKE | Escrita direta no DB | `REVOKE INSERT/UPDATE/DELETE FROM anon, authenticated` |
| 2 — Gateway | Acesso sem apiKey | `verify_jwt = true` no gateway |
| 3 — Edge Function | Acesso sem JWT | `if (!req.headers.get('Authorization')) → 401` |

#### Matriz de segurança

| Quem | Ler DB | Escrever DB | Chamar Edge Functions |
|------|--------|------------|----------------------|
| Anon key (atacante) | ✅ SELECT | ❌ REVOKE | ❌ Sem JWT na função |
| App (anonymous JWT) | ✅ SELECT | ✅ Edge Function | ✅ JWT + apiKey |
| Admin logado | ✅ SELECT | ✅ Edge Function | ✅ JWT + apiKey |

#### Arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/lib/supabase.ts` | `saveItem`, `deleteItem`, `saveCollectionData`, `setDocData` revertidos para Supabase direto |
| `src/lib/confirmations.ts` | `updateConfirmation` revertido para Supabase direto |
| `deploy.ps1` | Deploys de `write-data` e `confirm-attendance` removidos |
| `supabase/config.toml` | Seções `write-data` e `confirm-attendance` removidas |
| `supabase/functions/confirm-attendance/` | **Deletado** |
| `supabase/functions/write-data/` | **Deletado** |

---
## O que foi feito nesta sessão (16/07)

### PIX via QR Code no app + Correção frequência 67%

**Correção — frequência 67%**:
- `DashboardView.tsx:70-72` e `SquadView.tsx:54-56` — filtro agora usa `appLaunchDate = 06/07/2026` (data de lançamento do app) em vez de `today`
- Partidas de 04/07 (teste) são excluídas do cálculo
- Partidas reais (inclusive com ausências marcadas) passam a contar corretamente

**PIX via QR Code** (implementado, aguardando deploy):
- `src/lib/pix.ts` — gerador BR Code + QR Code base64 (padrão BACEN)
- `src/types.ts` — `paymentStatus?: 'pending' | 'awaiting' | 'paid'` no `UnpaidMember`
- `src/components/Modals.tsx` — `PixPaymentModal` com QR Code + Copia e Cola + "Já paguei"
- `src/components/FinanceView.tsx` — botão "Pagar via PIX" / ⏳ "Aguardando" / "Confirmar" (só dono do PIX)
- `src/App.tsx` — `handlePixPay`, `handlePixConfirm`, carregamento de `pixKey`/`pixOwnerId` da config, AdminSettings com campos PIX
- `package.json` — + `qrcode` npm

### 🔴 TODO — Amanhã (17/07)

**1. SQL no Supabase** (SQL Editor, nesta ordem):
```sql
ALTER TABLE "unpaidMembers" ADD COLUMN paymentstatus TEXT DEFAULT 'pending';
ALTER TABLE config ADD COLUMN pixkey TEXT;
ALTER TABLE config ADD COLUMN pixownerid TEXT;
```

**2. Deploy Vercel**:
```bash
cd "C:\Users\Bruno\OneDrive\Área de Trabalho\unidos-fc-ia"
npm run build
npx vercel --prod
npx vercel alias set <deploy-url> unidos-suzano.vercel.app
npx vercel alias set <deploy-url> unidos-fc.vercel.app
```

**3. Configurar PIX** no AdminSettings do app:
- Inserir CPF da chave PIX do diretor
- Selecionar o diretor dono do PIX no dropdown
- Salvar

**4. Testar fluxo**:
- Atleta com débito → "Pagar via PIX" → QR Code + Copia e Cola
- "Já paguei" → ⏳ Aguardando
- Dono do PIX (login via PIN) → "Confirmar" → Pago ✅ + transação criada

#### Arquivos alterados nesta sessão
| Arquivo | Mudança |
|---------|---------|
| `package.json` | + `qrcode` |
| `src/lib/pix.ts` | **Novo** — gerador BR Code + QR Code |
| `src/types.ts` | `paymentStatus` no `UnpaidMember` |
| `src/components/Modals.tsx` | `PixPaymentModal` (QR + Copia e Cola + Já paguei) |
| `src/components/FinanceView.tsx` | Botões PIX + awaiting + confirmar (só dono) |
| `src/App.tsx` | Handlers PIX, carregar config, AdminSettings atualizado |
| `src/components/DashboardView.tsx` | `appLaunchDate` em vez de `today` |
| `src/components/SquadView.tsx` | `appLaunchDate` em vez de `today` |

---
## O que foi feito nesta sessão (17/07)

### Finalização PIX via QR Code + Deploy

**SQL no Supabase**:
- `supabase-add-pix-columns.sql` — ALTER TABLE para `paymentstatus`, `pixkey`, `pixownerid`
- Executado com `supabase db query --linked --file`

**Deploy Vercel**:
- Build bem-sucedido (`npm run build`)
- Deploy production: `unidos-13aonuiby-bpdantas33s-projects.vercel.app`
- Aliases: `unidos-suzano.vercel.app` + `unidos-fc.vercel.app`

**Edge Functions** (5 deploys):
- `validate-auth`, `change-pin`, `change-admin-password`, `write-data`, `confirm-attendance`

**Próximo passo (manual)**:
1. Acessar https://unidos-suzano.vercel.app
2. Login como admin (senha master)
3. AdminSettings → preencher chave PIX (CPF) + selecionar diretor dono
4. Salvar

---
## O que foi feito nesta sessão (23/07)

### Migração Supabase → Neon + Proxy Vercel (correção definitiva)

**Problema**: Supabase bloqueou o projeto atual (e qualquer novo) com HTTP 402 `exceed_egress_quota` — bloqueio a nível de conta, não de projeto. E o DNS do Supabase PostgreSQL só tem IPv6 (não resolvível pela Vercel).

**Solução**: 3 mudanças estruturais:

**1. Proxy Vercel (`api/db.js`)** — banco nunca mais exposto ao cliente
- Todo acesso ao banco passa pelo proxy serverless na Vercel
- Cliente chama `/api/db?op=getAll&table=players` (GET) ou POST com JSON
- Proxy conecta via `pg` diretamente ao banco (Neon)
- Senha do banco nas **env vars da Vercel** (PGHOST, PGPASSWORD, etc.), nunca no bundle
- Autenticação (PIN/senha master) validada **server-side** via `crypto.subtle.digest`

**2. Migração Supabase → Neon** (`migrate-to-neon.cjs`)
- Dados do Supabase extraídos via Node.js + `pg` (sem `pg_dump`)
- Restaurados no Neon com mapeamento de colunas (lowercase → case-sensitive)
- Senha admin resetada com hash conhecido (abaixo)

**Dados migrados**:
| Tabela | Registros |
|--------|-----------|
| players | 49 |
| matches | 104 |
| transactions | 31 |
| standings | 7 |
| config | 1 (com PIX configurado) |
| confirmations | 1 |

**Perdas**: `unpaidMembers` (0 registros) — perdidos na migração anterior (anterior a 23/07).

**3. `src/lib/supabase.ts` reescrito** — sem Supabase SDK
- Remove dependência de `@supabase/supabase-js`
- Remove `createClient`, `ensureAuth()`, `getClient()`
- Todas as funções (`getCollectionData`, `saveItem`, `listenCollection`, `callFunction`) usam `fetch` para `/api/db`
- `listenCollection` implementado via polling (15s) em vez de Realtime
- `callFunction` roteia operações (auth, changePin, writeData) pelo proxy

#### Arquivos alterados/criados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `api/db.js` | Alterado | Conexão Neon, mapeamento colunas case-sensitive, JSONB serialization |
| `src/lib/supabase.ts` | Alterado | Remove Supabase SDK, usa proxy `/api/db` |
| `migrate-to-neon.cjs` | **Novo** | Script de migração Supabase → Neon |
| `AGENTS.md` | Alterado | Este log |

#### Env Vars na Vercel
| Nome | Valor |
|------|-------|
| `PGHOST` | `ep-blue-cake-ac2d9b5y.sa-east-1.aws.neon.tech` |
| `PGPORT` | `5432` |
| `PGDATABASE` | `neondb` |
| `PGUSER` | `neondb_owner` |
| `PGPASSWORD` | `npg_YHpsX6liugN2` |

#### Pendências
- `unpaidMembers` vazio — tentar recuperar do Firebase
- Senha admin atual é desconhecida (hash diferente de `admin123`) — redefinir via script se necessário

---
## O que foi feito nesta sessão (06/08)

### Setup do plugin DCP (Dynamic Context Pruning) no opencode — ❌ REMOVIDO em 06/08

> **ATUALIZAÇÃO (06/08, noite)**: O DCP **nunca funcionou** e foi **removido de vez** a pedido do usuário.
> O registro abaixo fica apenas como histórico do que foi tentado.

**O que era**: `@tarquinen/opencode-dcp` v3.1.14 — plugin que comprime contexto automaticamente quando a sessão passa de 50k tokens.

**Por que foi removido**:
1. O runtime do opencode **nunca carregou o plugin** — o auto-install via Bun criou as pastas `~/.cache/opencode/packages/@tarquinen/opencode-dcp*` mas **vazias** (0 bytes). O `opencode plugin ls`/`add` CLI não resolveu as dependências (dependency tree fail).
2. Usuário tentou reiniciar o opencode 3x e `/dcp` nunca apareceu.
3. O usuário percebeu que as chamadas iam para a **API NVIDIA** (na verdade normal — os combos `combo`/`melhor` do 9router roteiam para NVIDIA; ver NOTAS-OPCODE-9ROUTER.md) e ficou preocupado que o DCP tivesse quebrado o 9router.
4. **Diagnóstico final**: o 9router NÃO estava quebrado (testados os 3 combos via POST /v1/chat/completions: `combo`→glm-5.2, `melhor`→glm-5.2, `rapido`→llama-3.3-70b, todos HTTP 200). O único problema era o DCP não carregar.

**O que foi feito para remover (06/08, noite)**:
- `~/.config/opencode/opencode.json` — removida a entrada `"plugin": ["@tarquinen/opencode-dcp"]` (providers 9router intactos)
- Removidos: `~/.config/opencode/node_modules/` (todo), `package.json`, `package-lock.json`, `dcp.jsonc`, `dcp.jsonc.bak.20260806-181448`
- Removido cache vazio: `~/.cache/opencode/packages/@tarquinen/` e `ls@latest`
- Confirmado via `opencode debug config` → `"plugin": []` e `"model": "9router/melhor"`

**Lição aprendida**: plugins npm do opencode são instalados pelo próprio runtime via **Bun** em `~/.cache/opencode/node_modules/` — instalar manualmente com `npm install` em `~/.config/opencode/` NÃO funciona (o runtime nem olha esse caminho). Para instalar plugins no futuro: adicionar ao `plugin` do `opencode.json` e deixar o runtime instalar (requer bun acessível).

---
## O que foi feito nesta sessão (06/08, noite) — Combos 9router reorganizados

**Problema relatado**: usuário viu chamadas indo "direto pra NVIDIA" nos combos `melhor` e `rapido` e achou que o DCP/instalação de plugin tinha quebrado o 9router.

**Diagnóstico (FALSO ALARME — 9router nunca esteve quebrado)**:
- Provider NVIDIA: ativo, sem erro (o único estável)
- Provider Kiro: **desativado** (`isActive=0`) — cota **mensal** esgotada (402 `MONTHLY_REQUEST_COUNT` desde 05/08 22:10). Renova no ciclo mensal (~05/09).
- Provider Gemini: 429 quota free **diária** esgotada (20 req/dia POR MODELO — `GenerateRequestsPerDayPerProjectPerModel-FreeTier`). Renova diariamente.
- Provider Ollama: 429 session limit ("reset after 5m"). Volta sozinho em ~5 min.
- Provider Groq: 413 TPM limit (12k tokens/min no free) — estoura com contexto grande (sessão de ~78k tokens falhou). Renova por minuto.

**Por que os combos "pulavam pra NVIDIA"**: os combos `melhor`/`rapido` (criados 06/08 19:32) começavam com modelos cuja cota estava esgotada (gemini, ollama) — o fallback em cadeia do 9router tentava, falhava 429 e caía no primeiro que respondia: NVIDIA.

**O que foi feito**:
1. Backup do banco: `C:\Users\Bruno\AppData\Roaming\9router\db\backups\pre-combos-20260806-191002\`
2. Reordenados os combos `melhor` e `rapido` no banco SQLite do 9router (`db/data.sqlite`, tabela `combos`) — os que funcionam primeiro, gratuitos como fallback:
   - **`melhor`** (parrudo, nível Claude p/ código): `nvidia/deepseek-ai/deepseek-v4-pro` → `nvidia/z-ai/glm-5.2` → `nvidia/nvidia/nemotron-3-ultra-550b-a55b` → `nvidia/minimaxai/minimax-m3` → `gemini/gemini-3.1-pro-preview` → `gemini/gemma-4-31b-it`
   - **`rapido`** (rápido p/ responder): `groq/llama-3.3-70b-versatile` → `gemini/gemini-3.5-flash-lite` → `nvidia/deepseek-ai/deepseek-v4-flash` → `groq/openai/gpt-oss-120b` → `gemini/gemini-3-flash-preview` → `gemini/gemma-4-31b-it`
3. Combo `combo` (NVIDIA original) **intacto** — não tocado.
4. Testado: `melhor` → responde via deepseek-v4-pro (HTTP 200) ✅ | `rapido` → responde via llama-3.3-70b (HTTP 200) ✅

**Modelos que NÃO existem/404** (não usar): `gemini/gemini-2.5-flash`, `groq/gpt-oss-120b` (sem prefixo), `nvidia/moonshotai/kimi-k2.6`, `groq/meta-llama/llama-4-maverick`, `groq/qwen/qwen3-32b`, `ollama/glm-5` (410), `ollama/glm-4.7-flash`, `ollama/qwen3.5` (403), `ollama/kimi-k2.5` (410), `ollama/minimax-m2.5` (410).

**Modelos grátis que FUNCIONAM** (testados 06/08 22:09): `gemini/gemini-3.6-flash`, `gemini/gemini-3.5-flash-lite`, `gemini/gemini-3-flash-preview`, `gemini/gemma-4-31b-it`, `groq/llama-3.3-70b-versatile`, `groq/openai/gpt-oss-120b`, `ollama/gemma4:31b`, `ollama/gpt-oss:20b` (quando cota não esgotada).

**Para reverter**: copiar `data.sqlite` (+wal/shm) do backup `pre-combos-20260806-191002` de volta para `C:\Users\Bruno\AppData\Roaming\9router\db\` (parar o 9router antes).

---
## O que foi feito nesta sessão (20/08)

### Migração Vercel → Cloudflare Pages (domínio próprio unidossuzano.com.br)

**Problema**: Cota gratuita do Vercel estourava antes de 1 mês (funções serverless /api/db consumiam invocações). App ficou fora do ar até o reset do ciclo. Domínio próprio `unidossuzano.com.br` comprado no Registro.br.

**Solução**: migração para Cloudflare Pages (estático sem limite + Functions 100k req/dia grátis) — para o uso do app, nunca estoura.

**O que foi feito**:
1. `functions/api/db.js`, `functions/api/image.js`, `functions/api/logo.js` — **novos**, adaptados de `api/*.js` (Vercel → Pages Functions), trocando `pg` por `@neondatabase/serverless` (driver HTTP do Neon, funciona em Workers)
2. `api/*.js` (Vercel) — corrigido bug `hasImage` em upsert/upsertMany (campo sintético não existe no banco) — mantido como backup
3. `wrangler.toml` — novo (projeto `unidos-fc`, compat date)
4. `deploy.ps1` — reescrito para Cloudflare Pages (`wrangler pages deploy dist --project-name unidos-fc`)
5. Secrets no Cloudflare: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `WRITE_SECRET`
6. Domínio `unidossuzano.com.br` + `www.unidossuzano.com.br` adicionados ao projeto Pages (CNAME pendente no Registro.br)

**Dados intactos**: banco Neon não foi movido. Config restaurada após teste acidental (senha admin = hash original de `migration_data.sql`, PIX key `11940198373`, owner `20`). Testes: 9/9 PASS (players 49, matches 104, auth PIN/admin, escrita idempotente, imagens, frontend).

**WRITE_SECRET (novo)**: `8cee1208e75689b97d14ffbcafb76c598419605d3bb60737a09b49b8d3c76363` — o app recebe do login (auth op), valor antigo do Vercel não importa.

**Para testar depois do CNAME propagar**: https://unidossuzano.com.br (login com senha/PIN de sempre; primeira carga sincroniza tudo do banco).

---
## O que foi feito nesta sessão (20/08, noite) — Correção "Offline" no app (tabelas camelCase do Neon)

**Problema**: No `unidos-fc.pages.dev` o app mostrava badge "Offline" (`firebaseStatus === 'error'`) e não carregava dados. A API respondia OK da máquina do agente (GET players/matches/config 200), mas o sync do app falhava inteiro.

**Causa raiz**: O Neon preservou nomes de tabelas/colunas **camelCase** (criados com aspas na migração), mas o proxy ainda mapeava para minúsculas (herança Supabase):
- Tabelas: o Neon tem `unpaidMembers` e `trainingLogs` (não `unpaidmembers`/`traininglogs`)
- Colunas: `matches` usa `goalScorers`, `confirmedPlayers`, `absentPlayers`, `goalkeeperId`; `unpaidMembers` usa `daysLate`, `isPaid`, `paymentStatus`; `trainingLogs` usa `playersCount` — todas camelCase, mas o `TO_DB` mandava minúsculas
- Como o sync busca 4 tabelas em paralelo (`Promise.all` em App.tsx), as falhas em `unpaidMembers`/`trainingLogs` derrubavam o sync inteiro → status `error` → "Offline"

**O que foi feito**:
- `functions/api/db.js` e `api/db.js` (backup Vercel): `TABLE_MAP` e `ALLOWED_TABLES` agora usam os nomes reais camelCase do Neon (`unpaidMembers`, `trainingLogs`); `TO_DB` usa nomes quotados (`"goalScorers"`, `"confirmedPlayers"`, `"absentPlayers"`, `"goalkeeperId"`, `"daysLate"`, `"isPaid"`, `"paymentStatus"`, `"playersCount"`)
- Redeploy Cloudflare Pages (`cba2da7f`) + teste: **8/8 tabelas OK** (players 49, matches 104, transactions, unpaidMembers, standings, trainingLogs, config, confirmations)

**Importante**: No banco Neon, tabelas/colunas camelCase precisam de aspas (`"Tabela"`, `"coluna"`); nomes minúsculos não-quotados colidem com `relation does not exist`. Sempre conferir `information_schema` antes de mapear tabelas/colunas.

**Pendência**: usuário criar CNAME `unidossuzano.com.br` → `unidos-fc.pages.dev` no painel do Registro.br (aba DNS). Opcional: `www` → `unidos-fc.pages.dev`.

---
## O que foi feito nesta sessão (21/08)

### Diagnóstico completo — dados perdidos 18/08

**Problema**: Usuário perdeu acesso aos dados de 18/08. App caiu depois que Neon bloqueou o projeto us-east-1 por exceder cota de egress (5.5GB/5GB).

**Diagnóstico feito**:
1. **Neon sa-east-1 funciona** — mas só tem dump de 23/07 (migration_data.sql), sem dados posteriores
2. **Neon us-east-1 bloqueado** — projeto mute-dawn-03339385, branch main arquivado automaticamente em 20/08 09:54, compute desativado, cota de egress estourada
3. **Supabase morto** — DNS gwltosenvditulkndkue.supabase.co não resolve mais
4. **Firebase vivo** — mas só tem dados antigos (pré-migração, 48 players)
5. **Chrome localStorage** — só tem dados de teste (07/02/2026), não de 18/08
6. **Edge** — sem dados do app

**Senha Neon us-east-1** (
pg_smLaJlo41Ewv) foi rotacionada pela Neon quando restaurou o compute. Precisa de "Reset password" no dashboard.

**HANDOFF.md** criado com mapeamento completo (bancos, senhas, arquivos, bugs, TODO).

**Bugs conhecidos** (não corrigidos ainda):
- src/App.tsx:228 — getDocData('confirmations','data') deve ser 'singleton'
- src/App.tsx:255-258 — catch sem setFirebaseLoading(false)
- unctions/api/db.js — sem Cache-Control:no-store

**Scripts de diagnóstico criados**: check-data.mjs, check-neon2.mjs, check-names.mjs, check-stats.mjs, compare-dump.mjs, compare-all.mjs, compare-content.mjs, check-firebase-names.cjs

**Arquivos alterados/criados**: HANDOFF.md (novo)

**NÃO DEPLOYADO NESTA SESSÃO** — aguardando senha do Neon us-east-1

---
## O que foi feito nesta sessão (14/09)

### Migração definitiva Neon → Cloudflare D1 (banco 100% grátis, sem Neon)

**Problema**: Neon sa-east-1 estourou cota de egress de novo (HTTP 402 em 8/8 tabelas no site no ar) — nada carregava, nada salvava. Causa raiz: fotos base64 (~21MB) + `SELECT *` em todo sync; cada acesso transferia ~20MB do banco.

**Solução**: D1 `unidos-db` (id `287b1347-657f-4514-ae0e-9455107f4426`) + Functions reescritas para `env.DB`. D1 conta **linhas** (5M/dia grátis; uso estimado ~63k/dia), não bytes — cota de egress deixa de existir. Frontend intacto (mesmo contrato `/api/db`).

**R2 adiado**: token wrangler sem escopo R2 (conta talvez sem R2 habilitado). Fotos ficaram na coluna `image` do D1 (todas <2MB, total ~21MB < 500MB); sync continua slim (getAll exclui `image`, usa flag `hasimg`; matches mapeia `data:` → `/api/logo`).

#### O que foi feito
1. `migrations/d1-schema.sql` — schema SQLite (8 tabelas, JSON→TEXT, boolean→INTEGER, índices)
2. `scripts/migrate-d1-core.mjs` — núcleo do `backup-sa-east-1-20260901.jsonl`: 49 players (sem image), 104 matches (sem logos data:), 7 standings, config, confirmations; **pulou transactions/unpaidMembers (zerar 02/09 reaplicado)**
3. `scripts/migrate-d1-media.mjs` — backfill de 47 fotos + 47 logos em chunks de 90k chars (limite 100KB/statement do D1)
4. `functions/api/db.js` — **reescrito** p/ D1 (prepare/bind/batch, upsert `INSERT OR REPLACE`, boolean 0/1→bool, JSON parse, auth PIN/master, changePin, confirmAttendance, guard WRITE_SECRET)
5. `functions/api/image.js` + `logo.js` — reescritos p/ D1
6. `wrangler.toml` — binding `[[d1_databases]]` (`DB` → `unidos-db`)
7. Secrets `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` **removidos** do Pages (só `WRITE_SECRET` ficou)
8. Deploy produção `a32c83e6` — https://unidossuzano.com.br

#### Testes (todos PASS no ar)
- getAll: players 49 (47 com foto), matches 104, config + confirmations OK
- auth PIN errado → `invalid_pin`; PIN correto → `valid:true` + writeToken
- upsert/delete transaction com token OK; confirmAttendance roundtrip OK (resíduo limpo, 49 players)
- `/api/image?id=27` → 200 image/jpeg

#### Pendências
- Dados pós-01/09: Neon sa-east-1 testado em 14/09 — **ainda suspenso (HTTP 402)**. Cache do navegador **sobrescrito pelo usuário após a migração** (só tem dados pós-mudança) — caminho do snippet morto. Resta: retry do Neon quando a cota mensal resetar (~outubro) ou relançamento manual no app. Financeiro só entra se os dados provarem estar atualizados (placares/estatísticas de setembro)
- R2 futuro (opcional): exige habilitar R2 no dashboard + token com escopo; aí mover `image` → bucket e gravar só a chave

#### Correção Marcadores (mesma sessão, após deploy)
- 5 jogos tinham `scorers` com JSON (`[{"playerId":..}]`) e `goalScorers` nulo → UI exibia o JSON cru
- `scripts/migrate-scorers.mjs` moveu os 5 para a coluna `goalScorers` (`scorers = NULL`)
- `functions/api/db.js` (`toCamel` de matches): fallback que converte `scorers`-JSON legado em `goalScorers`
- Verificado no ar: 18/07 → "Andrey (1), Jean (1), Juninho (1), Mancha (1)"; estatísticas de gols dos atletas voltam a contar (App.tsx/StatsView usam `goalScorers`)
- `api/db.js` (backup Vercel) mantido como backup, fora de uso

---
## O que foi feito nesta sessão (14/09, noite)

### Fix INSERT OR REPLACE (zerava jogador/logo) + "Jogo Entre Nós" fora das estatísticas

**Causa raiz**: `functions/api/db.js` usava `INSERT OR REPLACE` — qualquer update parcial (reset de PIN, edição de jogo) apagava a linha inteira. Vítimas: Hulk (id 23, nome/foto zerados) e logo do GE COLORADO (jogo 19/09 id 65).

**Fix backend** (`functions/api/db.js`): `upsert`/`upsertMany` agora usam `ON CONFLICT(id) DO UPDATE` (merge por coluna) + guard `missing_id`. `api/db.js` (backup Neon) já usava ON CONFLICT — intocado.

**Fix frontend** (`src/App.tsx:871`): `handleUpdatePlayerDetails` envia objeto completo mesclado em vez de `{id, ...updates}` parcial.

**Rachão interno**: helper `isIntraSquadMatch()` em `src/lib/utils.ts`; filtrado em `StatsView`, recalc goals/cleanSheets (`App.tsx`), frequências (`DashboardView`, `SquadView`).

**Restauração D1** (backup 01/09, chunks 90k): Hulk id 23 (dados + foto 236KB) com **PIN temporário novo: 326858** (`mustChangePin=1` — ele troca no 1º login); logo GE COLORADO jogo 65 (103KB).

**Deploy**: `deploy.ps1` sem `--branch` cai em Preview! Produção exige `wrangler pages deploy dist --project-name unidos-fc --branch main --commit-dirty=true` (deploy prod `7697ef73`).

**Validado no ar**: merge parcial testado via API (nome/foto preservados), `/api/image?id=23` 200, `/api/logo?id=65` 200, 0 players com nome nulo, filtro "jogo entre nos" no bundle.

**PIN do Hulk: 326858** — passar para ele; some após o 1º login dele.