export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: 'admin' | 'comandante' | 'operador' | 'militar';
  militar_id?: number;
  unidade_id?: number;
  unidade_nome?: string;
}

export interface Unidade {
  id: number;
  nome: string;
  sigla: string;
  endereco?: string;
  telefone?: string;
  total_militares?: number;
}

export interface Militar {
  id: number;
  nome: string;
  cpf: string;
  rg?: string;
  matricula?: string;
  posto_graduacao: string;
  unidade_id?: number;
  unidade_nome?: string;
  unidade_sigla?: string;
  email?: string;
  telefone?: string;
  data_ingresso?: string;
  data_nascimento?: string;
  sexo?: 'M' | 'F';
  ativo: boolean;
  observacoes?: string;
}

export interface TipoAfastamento {
  id: number;
  nome: string;
  descricao?: string;
  prazo_maximo_dias?: number;
  fundamentacao_legal?: string;
}

export interface Afastamento {
  id: number;
  militar_id: number;
  tipo_id: number;
  data_inicio: string;
  data_fim: string;
  dias_total: number;
  motivo?: string;
  observacoes?: string;
  status: 'pendente' | 'aprovado' | 'reprovado' | 'em_andamento' | 'concluido' | 'cancelado';
  documento_gerado_url?: string;
  documento_assinado_url?: string;
  militar_nome?: string;
  posto_graduacao?: string;
  cpf?: string;
  rg?: string;
  matricula?: string;
  unidade_nome?: string;
  unidade_sigla?: string;
  tipo_nome?: string;
  tipo_descricao?: string;
  fundamentacao_legal?: string;
  aprovado_por_nome?: string;
  aprovado_em?: string;
  created_by_nome?: string;
  created_at?: string;
  // Campos do Livro de Afastamento (Termo de Início de Gozo)
  termo_numero?: string;
  termo_funcao?: string;
  termo_bi?: string;
  termo_periodo_aquisitivo?: string;
  termo_data_apresentacao?: string;
  termo_endereco?: string;
  termo_telefone?: string;
  termo_url?: string;
  termo_url_assinado?: string;
  ferias_ano_base?: number;
  ferias_ano_exercicio?: number;
}

export interface PlanoFerias {
  id?: number;
  militar_id: number;
  ano: number;
  periodo1_inicio?: string;
  periodo1_fim?: string;
  periodo2_inicio?: string;
  periodo2_fim?: string;
  periodo3_inicio?: string;
  periodo3_fim?: string;
  dias_total?: number;
  observacoes?: string;
  status?: string;
  nome?: string;
  posto_graduacao?: string;
  matricula?: string;
  unidade_nome?: string;
  unidade_sigla?: string;
}

export const POSTOS_GRADUACOES = [
  'Coronel PM',
  'Tenente-Coronel PM',
  'Major PM',
  'Capitão PM',
  '1º Tenente PM',
  '2º Tenente PM',
  'Aspirante a Oficial PM',
  'Subtenente PM',
  '1º Sargento PM',
  '2º Sargento PM',
  '3º Sargento PM',
  'Cabo PM',
  'Soldado PM 1ª Classe',
  'Soldado PM 2ª Classe',
  'Soldado PM 3ª Classe',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};
