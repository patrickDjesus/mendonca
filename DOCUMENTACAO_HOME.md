# Documentacao — Tela Home (Dashboard)

## Visao Geral da Arquitetura

A tela home e composta por dois componentes principais:

- **`HomePage.tsx`** — Layout principal com sidebar + area de conteudo (usa `<Outlet>` do React Router)
- **`VisaoGeral.tsx`** — Pagina de visao geral renderizada dentro do `<Outlet>`

---

## Sidebar (`HomePage.tsx`)

### Comportamento de Colapso
- **Fechada (padrao):** 80px de largura, mostra apenas icones centralizados
- **Expandida (hover):** 220px de largura, mostra icone + texto do link
- Transicao suave de 0.25s via CSS `transition: width`

### Logo
- Exibe `/logo.png` com 36px quando minimizada
- Aumenta para 72px quando a sidebar e expandida (hover)
- Transicao de tamanho incluida

### Itens de Navegacao
Cada item e um `<NavLink>` do React Router com layout vertical (icone em cima, texto embaixo):
- **Visao geral** (`/home`) — icone de casa
- **Documentos** (`/home/documentos`) — icone de documento
- **Videos** (`/home/videos`) — icone de play
- **Desafios** (`/home/desafios`) — icone de estrela
- **Perfil** (`/home/perfil`) — icone de pessoa

O item ativo recebe uma barra lateral esquerda dourada e fundo mais claro.

### Logout
- Botao "Sair" na parte inferior da sidebar
- Chama `supabase.auth.signOut()` e redireciona para `/auth`

### Autenticacao
- Ao carregar, busca o usuario logado via `supabase.auth.getUser()`
- Se nao houver usuario, redireciona para `/auth`
- O nome do usuario e extraido de `user.user_metadata.name` (fallback: email)

---

## Pagina de Visao Geral (`VisaoGeral.tsx`)

### Layout do Grid
A area de conteudo usa um layout de grid flexivel:

```
+------------------------------------------+
|              HEADER (saudacao)            |
+------------------------------------------+
|   CONTADOR ENEM    |   CITACAO FILOSOFICA |
|   (card dourado)   |   (card com foto)    |
+------------------------------------------+
|   ATIVIDADES        |  SEU PROGRESSO     |
|   RECENTES          |  (3 metricas)      |
|   (caderno)         |--------------------|
|                      |  OBJETIVOS         |
|                      |  (checklist)       |
+------------------------------------------+
```

---

### 1. Header — Saudacao

- Exibe "Ola, **[Nome]**" em tipografia Caveat (fonte manuscrita)
- Saudacao variavel (Bom dia/Boa tarde/Boa noite) foi removida em favor de "Ola"
- O nome vem do contexto do React Router (`useOutletContext`)

---

### 2. Contador Regressivo ENEM

- **Data alvo:** 8 de novembro de 2026, 13h30 (horario de Brasilia)
- Atualiza a cada 1 segundo via `setInterval`
- Exibe: **DIAS : HORAS : MIN : SEG**
- Numeros grandes (52px) com tabular-nums para alinhamento
- Badge dourado "ENEM 2026" no topo esquerdo
- Data "8 de novembro" no topo direito
- Quando chega a zero, todos os valores ficam em "00"

---

### 3. Citacao de Filosofo

- Fonte de dados: `src/data/philosophers.json` (20 filosofos com frase, nome e URL de foto)
- **Rotacao automatica:** a cada 15 segundos troca para o proximo filosofo
- Comeca com um indice aleatorio ao carregar a pagina
- Layout horizontal:
  - **Esquerda:** foto do filosofo com efeito grayscale + fade para a direita (degradê)
  - **Direita:** frase entre aspas (fonte Caveat) + nome do filosofo em destaque dourado
- **Fallback:** se a imagem falhar ao carregar, ela e escondida automaticamente (`onError`)
- Altura fixa (260px desktop, 220px tablet, 300px mobile) para nao pular o layout

---

### 4. Atividades Recentes

- **Estilo visual:** simula uma pagina de caderno
  - Linhas horizontais de fundo (repeating-linear-gradient a cada 48px)
  - Margem vermelha vertical no lado esquerdo
  - Padding-left de 52px para deslocar o conteudo da margem
- Cada linha tem exatamente 48px de altura, alinhada ao centro entre as linhas
- Icones coloridos por tipo:
  - **Livro** (azul `#508cc8`) — apostilas e notas
  - **Video** (vermelho `#c85050`) — videoaulas
  - **Estrela** (roxo `#b450b4`) — desafios
- Itens no momento sao estaticos (dados hardcoded)

---

### 5. Seu Progresso (Estatisticas)

- Grid 3 colunas com metricas:
  - **Documentos** (icone azul) — valor: 0
  - **Desafios** (icone roxo) — valor: 0
  - **Videos** (icone vermelho) — valor: 0
- Cada caixa tem fundo semi-transparente, borda sutil e efeito hover (fundo mais claro + borda visivel)
- Valores ainda estaticos (placeholder)

---

### 6. Objetivos (Checklist Interativo)

#### Funcionalidades

| Acao | Como fazer |
|------|-----------|
| **Adicionar meta** | Digitar no input + clicar no botao "+" ou Enter |
| **Marcar como concluido** | Clicar no checkbox (checkmark verde) |
| **Desmarcar** | Clicar novamente no checkbox |
| **Editar meta** | Clicar no icone de lapis OU dar double-click no texto |
| **Salvar edicao** | Enter ou clicar fora (onBlur) |
| **Cancelar edicao** | Pressionar Escape |
| **Excluir meta** | Clicar no icone de lixeira (aparece no hover) |

#### Comportamento de Ordenacao
- Metas pendentes aparecem primeiro (ordem de criacao)
- Metas concluidas descem para o final da lista
- A ordenacao e refeita a cada atualizacao de estado

#### Dados por Meta
Cada objetivo armazena:
- `id` — timestamp de criacao (Date.now())
- `text` — texto da meta
- `done` — booleano (concluida ou nao)
- `createdAt` — timestamp de criacao
- `completedAt` — timestamp da conclusao (null se nao concluiu)

#### Duracao
- Quando uma meta e marcada como concluida, exibe um badge verde com o tempo total
- Formato: `Xd Xh`, `Xh Xmin`, `Xmin` ou `Xs`
- Calculado como `completedAt - createdAt`

#### Limitacoes
- Card tem altura fixa (240px) — a lista de metas rola internamente (overflow-y: auto)
- Metas NAO sao persistidas — ao recarregar a pagina, todas as metas sao perdidas (estado apenas em memoria)

---

## Tema Visual

- **Paleta escura:** fundo `#1a1410`, texto `#e8dcc8`, acentos `#daa03c` (dourado)
- **Fonte principal:** Inter (sans-serif)
- **Fonte decorativa:** Caveat (manuscrita) — usada em titulos, citacoes e contadores
- **Cards:** fundo semi-transparente `rgba(200, 180, 140, 0.05)`, borda sutil
- **Hover nos cards:** scale(1.015), fundo e borda mais visiveis, transicao 0.25s

---

## Responsividade

| Breakpoint | Comportamento |
|-----------|---------------|
| **>768px** | Layout completo: 2 colunas em ambas as rows |
| **<=768px** | Sidebar 70px, grid 1 coluna, foto do filosofo 120px |
| **<=480px** | Sidebar 0px (aparece no hover), padding reduzido, card citacao vira vertical |

---

## Arquivos Envolvidos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/home/HomePage.tsx` | Layout principal (sidebar + Outlet) |
| `src/pages/home/VisaoGeral.tsx` | Pagina de visao geral com todos os widgets |
| `src/pages/home/Documentos.tsx` | Pagina placeholder |
| `src/pages/home/Videos.tsx` | Pagina placeholder |
| `src/pages/home/Desafios.tsx` | Pagina placeholder |
| `src/pages/home/Perfil.tsx` | Pagina placeholder |
| `src/styles/home.css` | Todos os estilos do dashboard e sidebar |
| `src/data/philosophers.json` | Banco de dados de filosofos (20 registros) |
| `src/App.tsx` | Rotas aninhadas (`/home/*`) |
| `src/lib/supabase.ts` | Cliente Supabase (autenticacao) |

---

## Pendencias / Possiveis Melhorias

- [ ] Persistir objetivos (localStorage ou Supabase)
- [ ] Conectar estatisticas (Documentos, Desafios, Videos) a dados reais do Supabase
- [ ] Tornar atividades recentes dinamicas (buscar do Supabase)
- [ ] Adicionar loading skeleton enquanto carrega dados do usuario
- [ ] Pagina de Documentos, Videos, Desafios e Perfil com conteudo real
