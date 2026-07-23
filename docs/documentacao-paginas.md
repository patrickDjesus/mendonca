# Mendonca - Documentacao Completa de Paginas e Features

Aplicacao web de estudos para o ENEM. Plataforma React + TypeScript com autenticacao via Supabase.

---

## 1. AuthPage (Tela de Login/Cadastro)

**Rota:** `/auth`

### Views
- **Login** (padrao): Formulario de email + senha
- **Cadastro**: Formulario de nome + email + senha + confirmar senha

### Features
- Animacao de transicao entre login e registro (papel caindo/chegando)
- Cena visual fantasia no lado esquerdo (componente `FantasyScene`)
- Animacao de carregamento (livro abrindo) apos login/cadastro bem-sucedido
- Toggle para mostrar/esconder senha
- Validacao: senhas devem coincidar no cadastro
- Mensagens de erro traduzidas (ex: "Este email ja esta registrado")
- Redirecionamento automatico para `/home` apos autenticacao

### Interacoes
- Digitar email/senha
- Clicar no olho para mostrar/esconher senha
- Clicar "criar uma" / "entrar" para alternar entre modos
- Submeter formulario (Enter ou botao)

---

## 2. HomePage (Layout Shell / Sidebar)

**Rota:** `/home` (layout pai com `<Outlet>`)

### Navegacao (Sidebar)
- **Visao geral** (`/home`) - icone casa
- **Documentos** (`/home/documentos`) - icone documento
- **Videos** (`/home/videos`) - icone play
- **Desafios** (`/home/desafios`) - icone estrela
- **Simulados** (`/home/simulados`) - icone livro
- **Perfil** (`/home/perfil`) - icone pessoa
- **Admin** (`/home/admin`) - icone escudo (apenas para admins)

### Features
- Sidebar fixa com logo, navegacao e botao de logout
- Indicador visual de pagina ativa (highlight dourado)
- Verificacao de role admin no mount (exibe aba Admin condicionalmente)
- Registro de acao de login ao acessar
- Botao "Sair" que faz signOut do Supabase e redireciona para `/auth`
- Passa `userName` como contexto para todas as paginas filhas via Outlet

---

## 3. VisaoGeral (Dashboard Principal)

**Rota:** `/home` (index)

### Layout
- Saudacao personalizada (Bom dia/Boa tarde/Boa noite + nome)
- Grid responsivo com cards

### Features

#### Countdown do ENEM
- Timer regressivo em tempo real (dias:horas:min:seg) ate 08/11/2026
- Atualiza a cada segundo
- Mostra data do ENEM

#### Frase do Dia (Filosofos)
- Frase rotativa de filosofos (troca a cada 15 segundos)
- Foto do filosofo + nome + frase
- Rotacao aleatoria ao carregar a pagina

#### Atividades Recentes
- Lista das ultimas atividades do usuario
- Icones contextualizados (livro, video, estrela)
- Timestamp relativo ("ha 5min", "ha 2h", "ha 3d")

#### Estatisticas de Progresso
- 3 cards: Documentos criados, Desafios feitos, Videos assistidos

#### Objetivos (Metas)
- Adicionar meta (input + botao "+")
- Marcar/desmarcar meta como concluida (checkbox)
- Editar meta (duplo clique ou botao de editar)
- Excluir meta (botao de lixeira)
- Ordenacao: nao-concluidas primeiro
- Mostra duracao entre criacao e conclusao da meta
- Persistencia no banco de dados

---

## 4. Documentos (Gerenciamento de Documentos)

**Rota:** `/home/documentos`

### Views
- **Galeria** (principal): Grid de cards de documentos
- **Editor de Documento**: Editor rico de texto (lazy-loaded `DocEditor`)
- **Visualizador PDF**: Overlay com PDF inline (lazy-loaded `PdfViewer`)

### Tabs
- **Meus Documentos**: Documentos criados pelo usuario (com opcoes de CRUD)
- **Documentos Publicos**: Documentos compartilhados (somente leitura, com scroll infinito)

### Features

#### Busca e Filtro
- Barra de busca por titulo/descricao (filtro em tempo real)
- Filtro por materia (chips coloridos, toggle)
- Botao "X" para limpar busca

#### Criar Documento
- Menu radial (wheel) com 2 opcoes:
  - **Criar**: Documento de texto rico
  - **Upload**: Arquivo PDF
- Modal com: nome, descricao (opcional), selecao de materia, toggle "Tornar publico"
- Gera thumbnail do PDF automaticamente apos upload
- Abre o editor apos criacao

#### Visualizar Documento
- Documentos de editor: Abre `DocEditor` em tela cheia
- PDFs: Abre `PdfViewer` em overlay com topbar (nome do arquivo + autor + botao fechar)
- PDFs sem URL: Mostra placeholder com informacoes do arquivo

#### Editar Propriedades
- Modal com: nome, descricao, materia, visibilidade publica
- Alteracoes salvas imediatamente

#### Excluir Documento
- Modal de confirmacao com titulo do documento
- Exclusao permanente com rollback otimista

#### Scroll Infinito (aba Publicos)
- Carrega 8 documentos por vez
- Usa IntersectionObserver para detectar fim da pagina

### Interacoes
- Clicar no card: Abre o documento
- Duplo clique no titulo: Modo edicao inline
- Tecla Escape: Fecha modais e overlays
- Arrastar scroll nos cards publicos

---

## 5. Videos (Videoaulas)

**Rota:** `/home/videos`

### Views
- **Galeria** (principal): Hero video + secoes por materia
- **Assistir Video**: Player + notas (layout duas colunas)

### Features

#### Galeria de Videos
- **Hero banner**: Video mais recente em destaque (thumbnail grande + titulo + descricao + autor + duracao + progresso)
- **Secoes por materia**: Filas horizontais scrollaveis com cards de video
- Setas de navegacao (esquerda/direita) para cada fila
- **Drag-to-scroll**: Arrastar mouse para navegar horizontalmente
- Busca por titulo/descricao

#### Cards de Video
- Thumbnail (YouTube ou placeholder por materia)
- Badge de duracao
- Barra de progresso (se ja assistiu antes)
- Titulo + autor + duracao + tempo salvo
- Protecao contra cliques acidentais apos drag

#### Assistir Video
- **Player de video**: Auto-play, controle de tempo
- **Pergunta de retomada**: "Continuar assistindo?" se tem tempo salvo > 10s
  - "Comecar do comeco" ou "Continuar" (faz seek)
- **Informacoes do video**: Titulo, autor, descricao
- **Estatisticas**: Tempo assistido, materia, numero de notas, duracao, progresso
- **Painel de notas** (coluna direita):
  - Criar notas com timestamp
  - Deletar notas
  - Clicar no timestamp faz seek no video
  - Notas agrupaveis em grupos
  - Sincronizacao com estado do video

#### Adicionar Video
- Modal com: URL (YouTube ou link direto), titulo, descricao, materia
- Extracao automatica de ID do YouTube para thumbnails
- Suporta qualquer link de video

#### Excluir Video
- Modal de confirmacao
- Exclui video + todas as suas notas

#### Rastreamento de Progresso
- Posicao salva no localStorage a cada 3 segundos
- Tempo real assistido acumulado (conta so quando esta tocando)
- Ao sair com > 1 minuto assistido, registra acao

### Interacoes
- Clicar no hero ou card: Abre o player
- Arrastar nas filas: Scroll horizontal
- Clicar setas: Navegar 70% da largura visivel
- Clicar timestamp na nota: Faz seek no video
- Botao "Voltar": Volta para a galeria
- Escape: Sai do player

---

## 6. Desafios (Quiz/Desafios)

**Rota:** `/home/desafios`

### Views (9 total)
1. **Lista**: Grid de desafios disponiveis
2. **Quiz**: Interface de resposta (tela cheia)
3. **Resultados**: Tela pos-quiz com estatisticas
4. **Criar Questao**: QuestionBuilder
5. **Editar Questao**: QuestionBuilder
6. **Criar Desafio**: ChallengeBuilder
7. **Editar Desafio**: ChallengeBuilder
8. **Listar Questoes**: Tabela com todas as questoes
9. **Listar Desafios**: Tabela com todos os desafios

### Tipos de Questao (6)

#### 1. Multipla Escolha (Unica)
- Opcoes A-F como botoes clicaveis
- Seleciona apenas uma opcao
- Clicar na mesma deseleciona

#### 2. Multipla Escolha (Multipla)
- Opcoes A-F como botoes clicaveis
- Seleciona multiplas opcoes (toggle)
- Todas as corretas devem ser selecionadas

#### 3. Verdadeiro ou Falso
- Lista de afirmacoes
- Cada uma com botoes "V" e "F"
- Todas devem ser respondidas

#### 4. Aberta (Auto-avaliacao)
- Textarea para resposta livre
- Apos confirmar: mostra "Resposta esperada" (se definida pelo professor)
- Botões de auto-avaliacao: "Acertei" / "Errei"
- Botao "Proxima" desabilitado ate avaliar
- O proprio aluno decide se acertou ou errou

#### 5. Ordem
- Itens embaralhados (Fisher-Yates)
- Aluno coloca na ordem correta

#### 6. Completar Frase
- Lacunas com inputs de texto
- Respostas comparadas case-insensitive

### Modificadores de Desafio

#### memoria_curta (Memoria Curta)
- Countdown de 15 segundos
- Questao some apos o tempo
- Barra de progresso visual do tempo restante
- Botao de cadeado com mensagem "Pergunta oculta!"

#### cronometro_em_chamas (Cronometro em Chamas)
- Tempo reduzido pela metade
- Barra de tempo colorida:
  - Verde (>50% restante)
  - Amarelo/laranja (20-50%)
  - Vermelho pulsante (<20%)

### Sistema de Pontuacao
- Base por dificuldade: Facil=100, Medio=150, Dificil=200
- Bonus de tempo: ate 500 pontos (inversamente proporcional ao tempo)
- XP ganho = pontuacao * 0.8

### Sistema de Streak (Sequencia)
- Sequencia atual incrementa ao ganhar (acertar mais que errar)
- Reseta ao perder
- Maior sequencia registrada
- Exibida na tela principal com icone de raio

### Fluxo do Quiz
1. Clicar em desafio: Inicia o quiz
2. Responder questao: Confirmar
3. Feedback: Ver explicacao (se houver)
4. Proxima questao ou Ver resultado
5. Tela de resultados: Acertos, Erros, Pontos, Tempo, Acuracia

### Desafio Diario
- Banner especial no topo da lista
- Desafio marcado como "isDaily"
- Exibido apenas se nao foi respondido hoje

### Tela de Resultados
- Titulo: "Parabens!" (>=70%) ou "Continue tentando!"
- 4 cards: Acertos, Erros, Pontos, Tempo
- Porcentagem de acuracia em destaque

### Tabela de Questoes
- Busca por titulo/materia/tipo
- Filtro por materia
- Colunas: Titulo, Materia, Tipo, Dificuldade, Acoes (editar/excluir)
- Modal de confirmacao para exclusao

### Tabela de Desafios
- Busca por titulo/materia
- Filtro por materia
- Colunas: Titulo, Materia, Dificuldade, Questoes, XP, Acoes (ver questoes/editar/excluir)
- Modal de visualizacao de questoes do desafio (expandivel por questao)

### Visualizacao de Questoes do Desafio
- Lista numerada com expand/collapse
- Mostra alternativas corretas destacadas
- Mostra explicacao
- Overlay com botao fechar

---

## 7. Simulados (Simulados ENEM)

**Rota:** `/home/simulados`

### Views
- **Galeria**: Grid de anos disponiveis
- **Prova**: Interface de simulado (tela cheia)

### Features

#### Galeria de Anos
- 15 anos listados (2009-2023)
- Apenas 2019-2023 disponiveis (5 provas)
- Anos indisponiveis mostram "Em breve" e ficam desabilitados
- Card com informacoes: ate 180 questoes, sem tempo limite, multipla escolha
- Botao "Iniciar" nos anos disponiveis

#### Carregamento de Questoes
- Busca paginada da API do ENEM (50 questoes por pagina)
- Mostra spinner durante carregamento ("Isso pode levar alguns segundos")

#### Interface de Prova
- Layout duas colunas: Questoes (scrollavel) + Navegador lateral (fixo)
- **Timer**: Mostra tempo decorrido (MM:SS, atualiza a cada 200ms)
- **Contador**: "{respondidas}/{total} respondidas"
- **Botao "Finalizar"**: Aparece so quando todas respondidas

#### Questoes
- Classificacao automatica de materia por palavras-chave (9 materias)
- Contexto renderizado como Markdown customizado (negrito, imagens, citacoes)
- Opcoes A-E como botoes (toggle: clicar na mesma deseleciona)
- Questao destacada quando respondida
- Imagens clicaveis abrem lightbox

#### Navegador Lateral
- Grid numerado de questoes
- Clicar faz smooth-scroll para a questao
- Indicadores visuais: respondida/nao-respondida

#### Lightbox de Imagens
- Imagem ampliada em tela cheia
- Fecha com botao X, clique no overlay, ou Escape

#### Classificacao Automatica de Materias
- Sistema de pontuacao por palavras-chave
- 50+ palavras por materia (Fisica, Quimica, Biologia, Matematica, etc.)
- Classifica a partir da disciplina ampla do ENEM
- Fallback para disciplina ampla ou "Linguagens"

#### Dificuldade Estimada
- Baseada no indice da questao:
  - 1-5: Facil
  - 6-31: Medio
  - 32+: Dificil

### Interacoes
- Selecionar ano: Inicia o simulado
- Clicar opcao: Seleciona/deseleciona
- Clicar numero no navegador: Vai para a questao
- Clicar imagem: Abre lightbox
- Finalizar: Registra score e volta para galeria
- Voltar: Abandona o simulado

---

## 8. Perfil (Perfil do Usuario)

**Rota:** `/home/perfil`

### Layout
- Hero card com avatar, nome, email, data de cadastro
- Barra de nivel/rank com XP
- Cards de estatisticas
- Secao de conquistas
- Secao de materias mais estudadas
- Feed de atividade recente

### Features

#### Hero Card
- Avatar com iniciais do nome (ou "?")
- Anel colorido baseado no rank atual
- Badge com nivel numerico
- Nome do usuario + email
- Data de "Membro desde" formatada
- Contador de conquistas desbloqueadas

#### Sistema de Nivel/Rank
- Barra de progresso de XP
- Exibe nivel atual e XP necessario para proximo
- Titulo do rank com cor tematica
- XP total formatado com separador de milhar

#### Cards de Estatisticas (4)
- Sequencia (raio, dourado)
- Documentos (azul)
- Videos (vermelho)
- Desafios (roxo)

#### Conquistas
- Grid de todas as conquistas disponiveis
- Filtro por categoria (botoes de categoria)
- Cada conquista mostra: icone, nome, descricao
- Status visual: desbloqueada (check verde) ou bloqueada (cadeado)
- Bonus XP total baseado em conquistas desbloqueadas (10% cada)
- Contador "{desbloqueadas}/{total}"

#### Materias Mais Estudadas
- Barras horizontais por materia
- Contagem de atividades por materia
- Cores tematicas por materia
- Ordenadas por quantidade (mais estudada primeiro)

#### Atividade Recente
- Lista das ultimas 20 atividades
- Icones contextualizados
- Timestamp relativo

---

## 9. Admin (Painel Administrativo)

**Rota:** `/home/admin`

### Controle de Acesso
- Verifica `checkIsAdmin()` no mount
- Se nao for admin: Tela "Acesso Negado" com botao voltar
- Se for admin: Exibe painel completo

### Tabs (3)

#### Tab 1: Usuarios
- **Busca**: Filtro por nome ou email
- **Tabela de usuarios**:
  - Colunas: Usuario (avatar + nome), Email, Papel (Admin/Usuario), Criado em, Acoes
  - Avatar: Primeira letra, dourado se admin, azul se usuario
- **Editar usuario**: Modal com selecao de papel (Admin/Usuario)
- **Deletar usuario**: Confirmacao nativa + exclusao permanente

#### Tab 2: Ferramentas
- **Selecao de usuario**: Dropdown com todos os usuarios + XP
- **Aviso de migracao**: Se todos usuarios tiverem XP=0, mostra aviso para rodar SQL
- **5 Cards de ferramentas**:

  1. **Informacoes**: Nome, email, papel, XP, streak, dias. Botao toggle admin
  2. **XP**: Input numerico + "Definir XP"
  3. **Apagar em Massa** (2x2): Deletar Docs/Videos/Notas/Desafios do usuario
  4. **Zona de Perigo**: Resetar streak+conquistas, Purgar todos os dados (2x confirmacao)
  5. **Conquistas**: Grid toggleavel de todas as conquistas (clique para desbloquear/bloquear)

#### Tab 3: Estatisticas
- 4 cards: Total de Usuarios, Documentos, Desafios, Videos

---

## Componentes Compartilhados (Resumo)

| Componente | Usado em | Funcao |
|---|---|---|
| `QuestionBuilder` | Desafios | Construtor de questoes (6 tipos) |
| `ChallengeBuilder` | Desafios | Construtor de desafios (selecao de questoes + modificadores) |
| `NotesPanel` | Videos | Painel de anotacoes com timestamps e agrupamento |
| `VideoPlayer` | Videos | Player de video customizado |
| `DocEditor` | Documentos | Editor rico de texto (lazy-loaded) |
| `PdfViewer` | Documentos | Visualizador de PDF inline (lazy-loaded) |
| `DocCard` | Documentos | Card de documento na galeria |
| `AddDocCard` | Documentos | Card "+" para criar documento |
| `NotificationProvider` | Global | Sistema de notificacoes push in-app |
| `FantasyScene` | Auth | Cena visual animada na tela de login |
| `LoadingBook` | Auth | Animacao de carregamento (livro) |

---

## Fluxos Transversais

### Gamificacao
- Sistema de XP com niveis e ranks
- Conquistas desbloqueaveis por acoes
- Streak de desafios (sequencia diaria)
- Bonus de XP por conquistas (+10% cada)
- Bonus de tempo no scoring de desafios

### Tracking de Atividade
- Todas as acoes principais sao logadas
- Atividades recentes aparecem no Dashboard e Perfil
- Contadores de progresso: docs, videos, desafios

### Modifiers System (Desafios)
- Modificadores adicionam dificuldade/regras
- Modifiers: memoria_curta, cronometro_em_chamas, morte_subita, contagem_regressiva_cegante, fio_da_navalha, ponte_de_vidro, aposta_cega
- Contagem de modificadores afeta scoring

### Sistema de Notificacoes
- Notificacoes in-app temporarias
- Titulo + mensagem + icone + cor
- Auto-dismiss apos alguns segundos
