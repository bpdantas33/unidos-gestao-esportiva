# Guia da Diretoria — Unidos FC App

## 1. Acessar o App

Abra o link no celular ou computador:
```
https://unidos-suzano.vercel.app
```

**Instalar como aplicativo no celular:**

*No iPhone (Safari):*
- Abre o link no Safari
- Clica no ícone **compartilhar** (quadrado com seta pra cima)
- Rola pra baixo e clica em **"Adicionar à Tela de Início"**
- Clica em **"Adicionar"** (canto superior direito)

*No Android (Chrome):*
- Abre o link no Chrome
- Clica nos **3 pontinhos** (canto superior direito)
- Clica em **"Adicionar à tela inicial"**
- Clica em **"Adicionar"**

---

## 2. Login como Diretoria

Na tela de entrada:
1. Clica em **"Diretoria (Admin)"**
2. Clica em **"Acesso Geral (Master)"**
3. Digita a **senha master** da diretoria
4. Pronto — você está no painel administrativo

> Se precisar trocar a senha master, vai em **Configurações** (engrenagem no canto direito do Header) → "Alterar Senha Master"

---

## 3. Início — Dashboard

A aba **"Início"** mostra:
- **Próximo jogo** — card com data, adversário e local do próximo confronto
- **Time do mês** — jogadores com melhor condição física
- **Confirmações** — quem já confirmou presença no próximo jogo
- **Aniversariantes do mês**
- **Ações rápidas** — atalho para treino, calendário, etc.

---

## 4. Calendário — Gerenciar Partidas

Aba **"Calendário"**:

### Agendar nova partida
- Clica em **"Agendar Partida"**
- Preenche: nome do adversário, logo (URL), casa/fora, data, horário, estádio, campeonato
- A partida aparece automaticamente para os atletas confirmarem presença

### Editar partida
- Clica no card da partida
- Altera: adversário, logo, data, horário, estádio, placar
- O status atualiza automaticamente (CONFIRMADO / ACONTECENDO / FINALIZADO)

### Ver confirmações
- Cada partida mostra quantos atletas confirmaram
- Clica no card para ver a lista de quem vai e quem está ausente

---

## 5. Elenco — Gerenciar Atletas

Aba **"Elenco"**:

### Adicionar atleta
- Clica no card **"Novo Atleta"** ou no botão **"+"**
- Preenche: nome, posição, número da camisa, idade, categoria (Master / Veterano)
- O atleta recebe um PIN gerado automaticamente para login

### Editar ficha do atleta
- Clica no card do atleta
- Na janela que abrir, vai em **"Dados do Atleta (Admin)"**
- Pode editar: nome, posição, número, categoria, condição física, lesão, telefone, foto (URL)

### Excluir atleta
- Passa o mouse sobre o card (ou segura no celular)
- Clica no ícone de **lixeira** no canto superior esquerdo
- Confirma a exclusão

---

## 6. Estatísticas

Aba **"Estatísticas"**:

### Adicionar gol na artilharia
- Na seção **"Artilharia"**, clica no **"+"** ao lado do nome do atleta
- Cada clique adiciona 1 gol

### Classificação
- Tabela do campeonato com pontos, jogos, saldo de gols
- Atualiza manualmente conforme os resultados das partidas

---

## 7. Financeiro

Aba **"Financeiro"**:

### Adicionar lançamento
- Clica em **"Novo Lançamento"**
- Escolhe: descrição, valor, categoria (RECEITA / DESPESA), data (DD/MM/AAAA)
- Pode marcar "Ratear entre os atletas" para compras de uniforme, churrasco, etc.

### Gerar mensalidade (R$70)
- Clica em **"Gerar Mensalidade R$70"**
- O app pergunta confirmação com o total
- Gera um débito de R$70 para cada atleta do elenco atual

### Baixar pagamento
- Na lista de **"Mensalidades em Aberto"**, clica em **"Pago"** ao lado do nome do atleta
- Gera automaticamente um registro de receita no extrato

### Ver extrato
- Histórico completo de entradas e saídas
- Totais do mês e saldo atual

---

## 8. Treinos

Aba **"Início"** → botão **"Nova Sessão"**:

- **Tático**: chance de +1 no rating do atleta, -5 na condição física
- **Físico**: -12 na condição física (treino pesado)
- **Recuperação**: +18 na condição física (ideal depois de um jogo)

---

## 9. Atualizar Dados

Na sidebar à esquerda, botão **"Atualizar Dados"** (ícone de refresh).

- Re-busca todos os dados do Firebase (partidas, atletas, financeiro)
- Não precisa dar F5 na página
- Mostra toast "Atualizando dados..." e "Dados atualizados com sucesso!"
- Útil quando outro diretor ou atleta fez alterações e você quer ver

---

## 10. Suporte e Sair

- **Suporte** — botão na sidebar para contato com a diretoria
- **Sair** — botão na sidebar para logout (volta pra tela de login)
