export interface Achievement {
  id: string
  category: 'Geral' | 'Vídeos' | 'Simulados' | 'Desafios' | 'Documentos'
  name: string
  description: string
  icon: string
  xpBonus: number
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primeiro_passo',
    category: 'Geral',
    name: 'Primeiro Passo',
    description: 'Fazer login na plataforma pelo primeiro dia.',
    icon: '🚪',
    xpBonus: 10,
  },
  {
    id: 'foco_de_aco',
    category: 'Geral',
    name: 'Foco de Aço',
    description: 'Acessar a plataforma e consumir algum conteúdo por 7 dias consecutivos.',
    icon: '🔥',
    xpBonus: 10,
  },
  {
    id: 'o_cinefilo',
    category: 'Vídeos',
    name: 'O Cinéfilo dos Estudos',
    description: 'Assistir a 50 videoaulas completas.',
    icon: '🎬',
    xpBonus: 10,
  },
  {
    id: 'polimata',
    category: 'Vídeos',
    name: 'Polímata',
    description: 'Assistir a pelo menos uma videoaula de cada matéria disponível.',
    icon: '🧠',
    xpBonus: 10,
  },
  {
    id: 'escriba_digital',
    category: 'Vídeos',
    name: 'Escriba Digital',
    description: 'Criar anotações em 10 vídeos diferentes.',
    icon: '✍️',
    xpBonus: 10,
  },
  {
    id: 'sessao_pipoca',
    category: 'Vídeos',
    name: 'Sessão Pipoca',
    description: 'Assistir a 5 videoaulas em um único dia.',
    icon: '🍿',
    xpBonus: 10,
  },
  {
    id: 'maratonista_enem',
    category: 'Simulados',
    name: 'Maratonista do ENEM',
    description: 'Concluir um simulado completo do ENEM (aprox. 180 questões).',
    icon: '🏃',
    xpBonus: 10,
  },
  {
    id: 'viajante_tempo',
    category: 'Simulados',
    name: 'Viajante do Tempo',
    description: 'Completar todos os simulados oficiais de 2019 a 2024.',
    icon: '⏳',
    xpBonus: 10,
  },
  {
    id: 'precisao_cirurgica',
    category: 'Simulados',
    name: 'Precisão Cirúrgica',
    description: 'Alcançar 80% ou mais de acertos em um simulado completo.',
    icon: '🎯',
    xpBonus: 10,
  },
  {
    id: 'resistencia_ferro',
    category: 'Simulados',
    name: 'Resistência de Ferro',
    description: 'Finalizar dois simulados completos em uma única semana.',
    icon: '💪',
    xpBonus: 10,
  },
  {
    id: 'aceitando_desafio',
    category: 'Desafios',
    name: 'Aceitando o Desafio',
    description: 'Completar o seu primeiro desafio criado por outro usuário.',
    icon: '⚔️',
    xpBonus: 10,
  },
  {
    id: 'mestre_cerimonias',
    category: 'Desafios',
    name: 'Mestre de Cerimônias',
    description: 'Criar um desafio que seja jogado por pelo menos 10 usuários diferentes.',
    icon: '👑',
    xpBonus: 10,
  },
  {
    id: 'modo_hardcore',
    category: 'Desafios',
    name: 'Modo Hardcore',
    description: 'Vencer um desafio na dificuldade máxima com pelo menos 2 modificadores negativos ativados.',
    icon: '💀',
    xpBonus: 10,
  },
  {
    id: 'masoquista',
    category: 'Desafios',
    name: 'Masoquista',
    description: 'Falhar em um desafio 3 vezes seguidas e conseguir passar na quarta tentativa.',
    icon: '😈',
    xpBonus: 10,
  },
  {
    id: 'arquivista',
    category: 'Documentos',
    name: 'Arquivista',
    description: 'Gerar o seu primeiro arquivo PDF ou DOC de estudo.',
    icon: '📁',
    xpBonus: 10,
  },
  {
    id: 'biblioteca_alexandria',
    category: 'Documentos',
    name: 'A Biblioteca de Alexandria',
    description: 'Criar 20 documentos ou PDFs de estudo na plataforma.',
    icon: '📚',
    xpBonus: 10,
  },
  {
    id: 'material_ouro',
    category: 'Documentos',
    name: 'Material de Ouro',
    description: 'Criar um documento com mais de 10 páginas de conteúdo consolidado.',
    icon: '🥇',
    xpBonus: 10,
  },
]

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]))

export const ACHIEVEMENT_CATEGORIES = ['Geral', 'Vídeos', 'Simulados', 'Desafios', 'Documentos'] as const

export const CATEGORY_ICONS: Record<string, string> = {
  Geral: '⭐',
  'Vídeos': '🎬',
  Simulados: '📝',
  Desafios: '⚔️',
  Documentos: '📄',
}
