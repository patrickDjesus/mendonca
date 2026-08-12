export interface RedacaoTheme {
  id: string
  title: string
  fonte: string
  image: string
  info: string
  inspiracao: string[]
}

export type RedacaoMarkType = 'erro_ortografico' | 'coesao' | 'ponto_positivo'

export interface RedacaoMark {
  type: RedacaoMarkType
  start: number
  end: number
  text: string
  note: string
}

export interface RedacaoCompetencia {
  code: string
  name: string
  score: number
  feedback: string
}

export interface RedacaoCorrection {
  grade: number
  resumo: string
  competencias: RedacaoCompetencia[]
  marcas: RedacaoMark[]
  comentarios: string[]
  sugestoesReescrita: string[]
  conectivos: { usados: string[]; sugestao: string }
}

export interface Redacao {
  id: string
  themeId: string
  themeTitle: string
  themeFonte: string
  text: string
  grade: number
  correction: RedacaoCorrection
  createdAt: number
  updatedAt: number
}
