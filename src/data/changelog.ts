export interface ChangelogEntry {
  id: string
  date: string
  title: string
  description: string
  features: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 'treino-redacao',
    date: '14/08/2026',
    title: 'Treino',
    description: 'Nova área para praticar escrita de redação e, em breve, matemática.',
    features: [
      'Menu "Mais opções" na barra lateral com acesso a Perfil e Treino',
      'Treino de Redação: cole um modelo, escreva por cima do texto e as letras vão sumindo conforme você acerta',
      'Guarde seus modelos de redação e importe quando quiser',
      'Treino de Matemática com níveis escolhíveis (em breve)',
    ],
  },
  {
    id: 'perfil-sidebar',
    date: '14/08/2026',
    title: 'Barra lateral',
    description: 'Organização nova para as opções da conta.',
    features: [
      'Perfil agora fica dentro de "Mais opções"',
      'Painel de opções com animação suave ao lado do menu',
    ],
  },
]
