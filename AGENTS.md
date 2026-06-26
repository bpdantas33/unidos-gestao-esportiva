# Sessão anterior — Resumo

> Projeto ativo: `C:\Users\Bruno\OneDrive\Área de Trabalho\unidos-fc-ia`
> Live: https://unidos-fc.vercel.app (aliased do deploy mais recente)
> Deploy: use `powershell -File deploy.ps1` (cuida do build + alias automático)
> Firebase: project `gen-lang-client-0488712142`, database `ai-studio-1aa8d619-5d39-49fe-a797-0b814fd6c276`

## ⚠️ REGRA PRINCIPAL
**NÃO MEXER EM LAYOUT, NEM EM FUNCIONALIDADES EXISTENTES.** Apenas ajustes pontuais e novos recursos solicitados pelo usuário. O layout original do IA Studio deve permanecer intacto (sidebar fixa, header fixo, paleta de cores, animações, etc.).

## O que foi feito

### 1. Dashboard — Próximo jogo
- Filtro de `nextMatch` agora verifica data futura (`DashboardView.tsx`)
- Correção do nome/logo do adversário: todas as 14 comparações `=== 'Unidos'` trocadas para `.includes('Unidos')` (nos 4 arquivos)

### 2. Edição de partidas
- `EditMatchModal` criado em `Modals.tsx` com campos: nome do adv, URL do logo, casa/fora, data, hora, estádio, campeonato, placar (auto-status)
- `onMatchClick` habilitado no `CalendarView` (admin/diretores)
- `handleUpdateMatch` em `App.tsx`
- `selectedMatch` state adicionado

### 3. Edição de atleta (PlayerDetailsModal)
- Seção "Dados do Atleta (Admin)" com campos editáveis: nome, posição (dropdown), nº camisa, categoria (Master/Veterano), idade

### 4. Jogos passados deletados
- Script `clear-past-matches.cjs` removeu 53 partidas com data anterior a hoje
- Só restam jogos futuros no Firebase

### 5. Gestão financeira
- Firebase limpo: `transactions` (7 docs) e `unpaidMembers` (2 docs) deletados
- `AddTransactionModal`: valor padrão R$70, campo de data DD/MM/AAAA para lançamentos passados
- `handleAddTransaction` aceita data customizada do modal
- Botão "Gerar Mensalidade R$70" na FinanceView (admin/diretores)
  - Cria débito de R$70 para cada jogador do elenco atual
  - Confirmação com total antes de gerar
- `handleGenerateMonthlyFee` em `App.tsx`
- `useState` de `transactions` e `unpaidMembers` agora começam como `[]` (sem localStorage)
- Firebase sync não re-popula financeiro do localStorage
- Custos fixos da diretoria zerados (eram R$80, R$250, R$65, R$600, R$320 → R$0)

### 6. Informações do time
- Nome: "Unidos Suzano Futebol Master"
- Lema/motto: "Unidade acima de tudo e Churrasco acima de todos!"
- Mensalidade: R$70 por jogador

### 7. Segurança — Edição por role
- `Modals.tsx`: Campos de telefone, condição, lesão e foto agora são **read-only** para não-admin/não-self. Só admin ou o próprio atleta pode editar ("Aplicar Boletim").
- `App.tsx`: Atleta logado (role `player`) tem `currentSquad` forçado para o squad dele. Não consegue trocar.
- `Header.tsx`: Toggle Master/Veterano só aparece para `role === 'admin'`.

### 8. Lema corrigido
- Padronizado para "Unidade acima de tudo e Churrasco acima de todos!" — com "e", sem vírgula, com "!".
- Rodapé do login: removido CSS `uppercase` (estava em caixa alta indevida).

### 9. Deploy script
- `deploy.ps1`: build + deploy + alias automático para `unidos-fc.vercel.app`. Evita o alias incorreto `unidos-gestao-esportiva`.

## Próximos passos (pendentes / sugeridos)
- (Aguardar o usuário listar os próximos ajustes)
