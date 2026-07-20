# Documentos — Documentação Completa

## Visão Geral

A página "Documentos" é um sistema completo de criação, organização e visualização de materiais de estudo. Ela permite criar documentos de texto com um editor rich-text (BlockNote), fazer upload de PDFs, filtrar por disciplina, busca por texto, e compartilhar documentos publicamente.

**Stack:** React 19 + TypeScript + Vite + BlockNote 0.51.4 + Mantine 9.4.1
**Armazenamento:** Estado local (mock/sample) — sem integração com banco de dados

---

## Estrutura de Arquivos

```
src/
├── types/
│   └── doc.ts                    # Tipos, interfaces e constantes
├── components/
│   ├── AddDocCard.tsx             # Card "+" para criar novo documento
│   ├── DocCard.tsx                # Card de documento existente
│   └── DocEditor.tsx              # Editor full-screen com BlockNote
├── pages/
│   └── home/
│       └── Documentos.tsx         # Página principal (orquestra tudo)
└── styles/
    └── documentos.css             # Todos os estilos (~1600 linhas)
```

---

## Tipos (`src/types/doc.ts`)

### `DocType`
```ts
type DocType = 'editor' | 'pdf'
```
- `'editor'` — Documento de texto editável com BlockNote
- `'pdf'` — Arquivo PDF (upload ou placeholder)

### `Subject`
```ts
type Subject = 'Física' | 'Química' | 'Biologia' | 'Matemática' | 'Linguagens' | 'Geografia' | 'História' | 'Filosofia'
```
8 disciplinas disponíveis, cada uma com cor associada em `SUBJECT_COLORS`.

### `PaperStyle`
```ts
type PaperStyle = 'default' | 'white'
```
- `'default'` — Papel marrom com linhas, furos e margem vermelha (estilo caderno)
- `'white'` — Papel branco limpo com linhas azuis

### `DocMeta`
Interface principal que representa um documento:
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | ID único (gerado por `Date.now + random`) |
| `title` | `string` | Sim | Nome do documento |
| `description` | `string` | Não | Descrição para busca futura |
| `type` | `DocType` | Sim | `'editor'` ou `'pdf'` |
| `content` | `Block[]` | Não | Blocos do BlockNote (só para type editor) |
| `subject` | `Subject` | Não | Disciplina associada |
| `paperStyle` | `PaperStyle` | Não | Estilo do papel (`'default'` se omitido) |
| `fileName` | `string` | Não | Nome original do arquivo PDF |
| `fileUrl` | `string` | Não | Blob URL do PDF uploadado |
| `fileSize` | `number` | Não | Tamanho em bytes |
| `thumbnail` | `string` | Não | (reservado, não usado) |
| `createdAt` | `number` | Sim | Timestamp de criação |
| `updatedAt` | `number` | Sim | Timestamp da última atualização |
| `isPublic` | `boolean` | Sim | Se é visível na aba pública |
| `authorName` | `string` | Não | Nome do autor (dados públicos sample) |

### `DocTab`
```ts
type DocTab = 'mine' | 'public'
```

---

## Componentes

### 1. `Documentos.tsx` — Página Principal (682 linhas)

É o orquestrador central. Gerencia todo o estado e rendereiza todas as views.

#### Estado
| Variável | Tipo | Função |
|---|---|---|
| `activeTab` | `DocTab` | Aba ativa: "Meus Documentos" ou "Públicos" |
| `myDocs` | `DocMeta[]` | Documentos do usuário |
| `publicDocs` | `DocMeta[]` | Documentos públicos de exemplo (read-only) |
| `searchQuery` | `string` | Texto da busca |
| `subjectFilter` | `Subject \| null` | Filtro de disciplina |
| `editingDoc` | `DocMeta \| null` | Documento aberto no editor |
| `viewingPdf` | `DocMeta \| null` | PDF aberto no viewer |
| `deleteTarget` | `DocMeta \| null` | Documento marcado para exclusão |
| `editPropsDoc` | `DocMeta \| null` | Documento sendo editado (propriedades) |
| `subjectPicker` | `'create' \| 'upload' \| null` | Tipo de picker aberto |
| `pickerForm` | `PickerForm` | Formulário de criação/upload |
| `propsForm` | `PickerForm` | Formulário de edição de propriedades |
| `wheelState` | `{ open, rect }` | Estado da animação wheel |
| `galleryKey` | `number` | Key para forçar re-mount (animação de tab) |

#### Fluxo de Dados

```
allDocs = myDocs + publicDocs   (memoizado)
    ↓
docs = activeTab === 'mine' ? myDocs : allDocs.filter(isPublic)   (memoizado)
    ↓
filtered = docs.filter(search + subject)   (computado a cada render)
    ↓
rendered → DocCard[] + AddDocCard (se aba 'mine')
```

#### Fluxo de Criação de Documento

```
1. Usuário clica no card "Novo Documento" (AddDocCard)
   ↓
2. Card captura sua posição (getBoundingClientRect) → onOpenWheel(rect)
   ↓
3. Wheel overlay aparece com animação de círculo expandindo
   ├── Lado esquerdo: "Criar" (documento de texto)
   └── Lado direito: "Upload" (arquivo PDF)
   ↓
4. Usuário clica em uma opção → handleWheelSelect(action)
   ↓
5. Wheel fecha → após 200ms, subject picker abre
   ↓
6. Formulário com: Nome, Descrição, Disciplina, Toggle Público
   ↓
7. Usuário preenche e confirma
   ├── create → handleCreateWithSubject(subject)
   │   → Cria DocMeta tipo 'editor' → setEditingDoc → abre DocEditor
   └── upload → handleUploadWithSubject(subject)
       → Abre file dialog → cria DocMeta tipo 'pdf' → adiciona em myDocs
```

#### Fluxo de Edição de Propriedades

```
1. Usuário clica no botão ⋮ (doc-card-edit) de um card
   ↓
2. openEditProps(doc) → preenche propsForm com dados atuais
   ↓
3. Dialog abre com formulário idêntico ao de criação
   ↓
4. Usuário edita → saveEditProps()
   → Atualiza myDocs.map() → fecha dialog
```

#### Busca

A busca filtra por `title` e `description` (case-insensitive):
```ts
const matchSearch = !q || d.title.toLowerCase().includes(q) || 
  (d.description && d.description.toLowerCase().includes(q))
```

#### Teclas de Atalho

| Tecla | Ação |
|---|---|
| `Escape` | Fecha qualquer modal/diálogo aberto |
| `Escape` | No editor: salva e volta |

---

### 2. `AddDocCard.tsx` — Card de Criação (35 linhas)

Card normal no grid que, ao clicar, dispara a animação wheel.

```tsx
interface AddDocCardProps {
  onOpenWheel: (rect: DOMRect) => void
}
```

- Renderiza como um `doc-card` com borda tracejada dourada
- Ícone "+" centralizado
- Ao clicar: captura `getBoundingClientRect()` e passa para o pai
- O pai posiciona o wheel overlay no centro do card

**CSS:** `.add-doc-card`, `.add-doc-preview`, `.add-doc-icon`

---

### 3. `DocCard.tsx` — Card de Documento (100 linhas)

Card clicável que exibe preview e metadados de um documento.

```tsx
interface DocCardProps {
  doc: DocMeta
  onClick: () => void
  onDelete?: () => void      // Só aparece na aba "Meus Documentos"
  onEditProps?: () => void   // Só aparece na aba "Meus Documentos"
}
```

**Estrutura visual:**
```
┌─────────────────────────┐
│  [⋮] [🗑]    [Public]  │  ← Preview area (paper-bg ou PDF thumb)
│                         │
│    📄 ou ✏️             │
├─────────────────────────┤
│ Nome do documento       │  ← Info area
│ Descrição (2 linhas)    │
│ 12 jan. 2026 · 200 KB   │
│              [Física]   │
└─────────────────────────┘
```

**Funcionalidades:**
- `paper-bg` — Background de caderno para docs do tipo editor
- `doc-card-badge` — Badge "Public" se `isPublic === true`
- `doc-card-edit` — Botão ⋮ (3 pontos) → `onEditProps`
- `doc-card-delete` — Botão 🗑 → `onDelete` (com stopPropagation)
- `doc-card-desc` — Snippet da descrição (2 linhas, ellipsis)
- `doc-card-subject` — Badge colorido da disciplina

**Helpers:**
- `formatDate(ts)` → "12 jan. 2026" (pt-BR)
- `fileSizeLabel(bytes)` → "200 KB", "1.5 MB"

---

### 4. `DocEditor.tsx` — Editor Full-Screen (256 linhas)

Editor de documentos com BlockNote, toolbar de formatação, e papel notebook.

#### Props
```tsx
interface DocEditorProps {
  doc: DocMeta
  onSave: (doc: DocMeta) => void
}
```

#### Toolbar (topo)

| Botão | Ação |
|---|---|
| ← Voltar | Salva e fecha o editor |
| Input do título | Edita o título (ref, defaultValue) |
| Salvar | Salva e fecha |
| Toggle papel | Alterna entre marrom e branco |

#### Format Bar (abaixo da toolbar)

| Grupo | Botões | Ação |
|---|---|---|
| Bloco | ¶ H1 H2 H3 | Tipo de bloco |
| Estilo | **B** *I* <u>U</u> ~~S~~ 🖍 | Formatação inline |
| Lista | • - ☑ | Listas |
| Código | `</>` | Código inline |

#### Paper Styles

**Default (marrom):**
- Background marrom escuro (`#2a2520`)
- Linhas horizontais azuis (28px spacing)
- Margem vermelha vertical
- 3 furos decorativos
- Texto claro (`#e8dcc8`)
- Fonte Caveat para títulos

**White (branco):**
- Background branco (`#ffffff`)
- Linhas azuis mais fortes
- Margem vermelha
- Furos com borda cinza
- Texto escuro (`#1a1714`)
- Fonte Caveat para títulos

#### Salvar

```ts
handleSave() {
  // 1. Pega blocos do editor
  // 2. Extrai título do input ou do primeiro bloco
  // 3. Chama onSave({ ...doc, title, content, paperStyle, updatedAt })
  // 4. Fecha o editor
}
```

Título é extraído do input se preenchido, senão do primeiro bloco de texto.

#### Atalhos do Editor

| Atalho | Ação |
|---|---|
| `Ctrl+S` / `Cmd+S` | Salvar |
| `Escape` | Salvar e voltar |
| `Ctrl+B` | Negrito |
| `Ctrl+I` | Itálico |
| `Ctrl+U` | Sublinhado |

---

## Animações

### Wheel (Círculo)

Sequência de animação ao clicar em "Novo Documento":

1. **Backdrop** — Fundo escurece (0.3s)
2. **Círculo** — Expande do centro do card (0.4s, spring easing)
3. **Divisor** — Linha vertical cresce (0.3s, delay 0.35s)
4. **Semiesquerdas** — Desliza para esquerda (0.4s, delay 0.3s)
5. **Semidireita** — Desliza para direita (0.4s, delay 0.3s)
6. **Ícones** — Surgem com scale (0.35s, delay 0.5s)
7. **Labels** — Surgem com slide-up (0.35s, delay 0.55s)

### Tab Switch

Ao trocar de aba:
- `key={galleryKey}` força re-mount do wrapper
- `galleryFadeIn` — fade + slide-up (0.35s)

### Modals/Dialogs

- `doc-confirm-overlay` — fade in (backdrop blur 4px)
- `doc-confirm-modal` — scale + fade
- `doc-subject-picker` — scale + fade
- `pdf-viewer-overlay` — fade in

---

## CSS — Hierarquia de Z-Index

| z-index | Elemento |
|---|---|
| 5 | `doc-card-delete`, `doc-card-edit` |
| 50 | `add-doc-popover` (removido) |
| 200 | `doc-editor-overlay` |
| 250 | `pdf-viewer-overlay` |
| 300 | `wheel-overlay` |
| 301 | `wheel-container` |
| 310 | `doc-confirm-overlay` (delete, picker, props) |

---

## Dados Sample

### Meus Documentos (SAMPLE_DOCS)
3 documentos de exemplo:
1. Apostila de Matemática — Cap. 3 (editor, Matemática)
2. Notas de Literatura — Modernismo (editor, Linguagens)
3. Resumo de História — Brasil Colônia (editor, História)

### Documentos Públicos (SAMPLE_PUBLIC)
4 documentos públicos de exemplo:
1. Química Orgânica — Resumo Geral (editor, Química, Maria S.)
2. Lista de Exercícios — Física Mecânica (pdf, Física, João P.)
3. Geografia — Mapas Mentais do ENEM (editor, Geografia, Ana L.)
4. Redação — Modelos de Texto Dissertativo (pdf, Linguagens, Carlos M.)

---

## Fluxos de Exclusão

```
1. Usuário clica 🗑 no card
   ↓
2. Delete confirmation modal abre
   ├── Clica "Cancelar" ou backdrop ou Escape → fecha
   └── Clica "Deletar" → handleDelete(id)
       → setMyDocs(prev.filter(d => d.id !== id))
       → fecha modal
```

---

## Fluxos de Visualização de PDF

```
1. Usuário clica em card PDF
   ↓
2. PDF viewer overlay abre (z-index: 250)
   ├── Se fileUrl existe → <iframe> com blob URL
   └── Se não existe → placeholder com info do arquivo
   ↓
3. Topbar com nome, autor, botão fechar
4. Escape fecha o viewer
```

---

## Notas Técnicas

### Performance
- `allDocs` é memoizado com `useMemo` para evitar re-renders desnecessários
- `docs` (filtrado por tab) também é memoizado
- `galleryKey` força re-mount apenas na troca de tab (animação)
- BlockNote é carregado via `lazy()` + `Suspense`

### Geração de IDs
```ts
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
```
Base36 do timestamp + 6 caracteres aleatórios. Não é UUID, mas suficiente para uso local.

### Upload de PDF
- Usa `<input type="file" accept=".pdf">` hidden
- `URL.createObjectURL(file)` gera blob URL para visualização
- O blob URL fica em memória (não persiste entre reloads)

### Substituições CSS
O BlockNote tem estilos internos que são sobrescritos com `!important`:
- Background transparente em todos os containers
- Heights auto/min-height unset/max-height none
- Overflow visible
- Cores de texto customizadas por paper style
