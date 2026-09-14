# DECISIONS

## 2026-09-14 — Backup automático semanal do D1 (GitHub Action)
- **Decisão**: Workflow `.github/workflows/backup-d1.yml` — toda segunda 03:00 BRT (cron) + botão manual (`workflow_dispatch`): `wrangler d1 export unidos-db --remote` → gzip com data → force-push de commit único na branch `backups-d1`. Secret necessário: `CLOUDFLARE_API_TOKEN` (template API token: Account → D1 → Read). Account ID fixo no workflow (não é segredo).
- **Motivo**: Verificado que nunca existiu rotina de backup (0 workflows no repo, deploy.ps1 só build+deploy, Pages sem cron). Após o susto dos dados de setembro, backup semanal automático impede nova perda total.
- **Status**: vigente (divergência main resolvida via merge 14/09; arquivo do workflow pendente de push na branch local `backup-d1` — credencial do agente sem scope `workflow`, usuário precisa subir; secret `CLOUDFLARE_API_TOKEN` ainda por criar)

## 2026-09-14 — Migração definitiva Neon → Cloudflare D1 + R2 (100% grátis)
- **Decisão**: Aposentar o Neon (cota 5GB/mês estourada 2x, erro 402 em 8/8 tabelas, app fora do ar) e migrar para **D1** (dados) + **R2** (fotos), tudo no grátis Cloudflare. Base = `backup-sa-east-1-20260901.jsonl` + zerar financeiro de 02/09 reaplicado. Frontend intacto (mesmo contrato `/api/db`). Ordem: D1 núcleo (config/players sem image/matches/confirmations) → Functions → deploy liberando confirmação → R2 + fotos → tabelas restantes → remover secrets PG.
- **Motivo**: Usuário pediu forma sem mais problemas e com urgência (jogadores sem conseguir confirmar próximo jogo). Causa raiz: fotos base64 (~21MB) + `SELECT *` estouram egress do Neon; D1 conta linhas (uso ~1,3% do limite) e R2 tem egress grátis.
- **Status**: vigente (em execução — D1 + Functions no ar; R2 adiado: token wrangler sem escopo R2, fotos ficaram na coluna `image` do D1 com sync slim via `hasimg`, sem risco de cota pois D1 conta linhas, não bytes)

## 2026-09-09 — Link Almoxarifado com acesso direto (só diretoria + master)
- **Decisão**: Nova aba "Almoxarifado" na sidebar, visível só para `session.role === 'admin'` (diretores com `isBoardMember` + master). Acesso direto sem digitar senha via proxy: `functions/api/almox/[[path]].js` serve o app Netlify (`https://almoxarifado-unidos-fc.netlify.app`) pela nossa origem e injeta auto-login; `functions/api/almox-token.js` valida admin server-side (master sem playerId OU `players.isboardmember = true`) e faz `signInWithPassword` no Supabase do almoxarifado no servidor, devolvendo só o JWT temporário. Credenciais como secrets Cloudflare `ALMOX_EMAIL`/`ALMOX_PASSWORD`, nunca no bundle/repo.
- **Motivo**: Usuário pediu link do almoxarifado restrito à diretoria, sem que diretores precisem da senha da página. Sem acesso ao código do Netlify, proxy + JWT foi a única via sem senha no client.
- **Status**: vigente

## 2026-09-01 — Restauração dados 18/08 com nomes curtos Veterano + Bruno
- **Decisão**: Merge incremental (upsert) no Neon sa-east-1 (ep-blue-cake), preservando todos os dados atuais (49 players, 104 matches, 32 transactions, 60 unpaidMembers). Nomes curtos aplicados apenas para Veterano/Esporte (23 registros) + Bruno (id 6). Ex: Andrey, Arthur, Rato, Eduardo, Elliakin, Erick, Ewerton, Mancha, Jean, Hulk, Jose Roberto, Junho, Lucas, Amorim, Juninho, Marinho, Matheus, Paulo, Igari, Roni, Washington, Raphael, Netinho. Backup prévio em `backup-sa-east-1-20260901.jsonl`.
- **Motivo**: Usuário confirmou banco liberado e pediu não perder dados. Projeto us-east-1 (mute-dawn) permanece arquivado com quota 5.5GB/5GB excedida e retention 6h, impossível extrair 18/08 via compute. Sa-east-1 já é fonte da verdade (live) e contém evolução pós-23/07 (unpaid 60 vs 0 no dump). Nomes curtos servem para identificação no app.
- **Status**: superada por zerar financeiro 02/09

## 2026-09-01 — Correção encoding Jose Roberto
- **Decisão**: Usar "Jose Roberto" sem acento para id 25 devido a driver @neondatabase/serverless em Workers retornar mojibake para UTF-8 acentuado (ex "JosAc"). Verificado em `check-jose.mjs` vs live API.
- **Motivo**: Evitar quebra visual no app live sem alterar lógica de DB.
- **Status**: vigente

## 2026-09-01 — Cache v4 e deploy 07a6b446
- **Decisão**: Bump `unidos_cache_migrated_to_neon_v3` → `v4` em `src/App.tsx:168` + `console.log('[cache] v4 migrado 18/08')` para forçar hash `BdK4Cdne` e invalidar cache Cloudflare (deploy 07a6b446).
- **Motivo**: v3 não gerou hash novo (C42zGSLa idêntico), Cloudflare deduplicou como 0 files. Usuário relatou dados antigos mesmo após refresh/aba anônima em `unidos-fc.pages.dev`.
- **Status**: superada por v6

## 2026-09-02 — Zerar financeiro para relançar manual
- **Decisão**: Hard DELETE em `sa-east-1` ep-blue-cake: `DELETE FROM transactions` (32 rows) e `DELETE FROM "unpaidMembers"` (60 rows) via `zerar-financeiro-neon.mjs` (neon direct), preservando `players 49`, `matches 104`, `standings 7`, `config`, `confirmations`. Backup prévio `backup-sa-east-1-20260901.jsonl` (49/104/32/60). Cache bump `v5→v6` em `src/App.tsx:168` (`unidos_cache_migrated_to_neon_v6`) para limpar `unidos_cache_transactions/unpaid` no client, deploy `a2fbe013` (`index-BmTfahYI.js`).
- **Motivo**: Saldo `-R$202` era passado (23/07) e `us-east-1` segue arquivado com `data transfer 5.5GB`; usuário pediu só zerar financeiro para inserir manual via app (`FinanceView` `Registrar Lançamento` / `Gerar Mensalidade`).
- **Status**: superada por v7

## 2026-09-02 — Seguro contra cota (guard 15min + debounce)
- **Decisão**: `src/App.tsx:197` guard `if (hasCache && Date.now()-lastSync < 15*60*1000) return` usando `unidos_cache_players` + `unidos_last_sync` (restaura `AGENTS.md:125`), `src/App.tsx:715` `handleRefresh` debounce 30s via `lastRefreshRef`, `src/lib/supabase.ts:30` `cache: no-store` + `functions/api/db.js:71` `no-store` mantidos, `hasImage` proxy `functions/api/db.js:127` mantido. Cache bump `v6→v7` em `src/App.tsx:168` (`unidos_cache_migrated_to_neon_v7`) para limpar 7 caches, deploy `v7` seguro.
- **Motivo**: Sem guard `60 users×10 F5×7 = 4200 req/dia` → `630MB/dia` (`0.57GB/mês` com proxy vs `5.52GB` sem) estouraria `Free 5GB`; confirmações `POST confirmAttendance` `functions/api/db.js:258` seguem instantâneas (escrita não passa pelo guard).
- **Status**: vigente
