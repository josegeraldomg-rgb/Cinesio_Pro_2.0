// Metadados da biblioteca de formulários clínicos
// Os campos detalhados são carregados sob demanda (no editor, ao duplicar)

// ─── Valores válidos de partes_corpo ──────────────────────────────────────────
// Zonas SVG do corpo:
//   'cabeca' | 'pescoco'
//   'ombro_e' | 'ombro_d'
//   'braco_e' | 'braco_d'
//   'cotovelo_e' | 'cotovelo_d'
//   'antebraco_e' | 'antebraco_d'
//   'punho_mao_e' | 'punho_mao_d'
//   'torax' | 'abdomen' | 'coluna_lombar'
//   'quadril_e' | 'quadril_d'
//   'coxa_e' | 'coxa_d'
//   'joelho_e' | 'joelho_d'
//   'perna_e' | 'perna_d'
//   'tornozelo_pe_e' | 'tornozelo_pe_d'
// Chips especiais:
//   'neurologia' | 'geral'

export interface FormularioMeta {
  id: string
  nome: string
  descricao: string
  categoria: string
  num_campos: number
  referencia?: string
  pontuavel?: boolean
  tags?: string[]
  partes_corpo: string[]  // regiões corporais relevantes para o filtro do mapa
}

// Todas as zonas corporais SVG (sem chips) — usada em escalas universais
const TODAS_REGIOES = [
  'cabeca', 'pescoco',
  'ombro_e', 'ombro_d',
  'braco_e', 'braco_d',
  'cotovelo_e', 'cotovelo_d',
  'antebraco_e', 'antebraco_d',
  'punho_mao_e', 'punho_mao_d',
  'torax', 'abdomen', 'coluna_lombar',
  'quadril_e', 'quadril_d',
  'coxa_e', 'coxa_d',
  'joelho_e', 'joelho_d',
  'perna_e', 'perna_d',
  'tornozelo_pe_e', 'tornozelo_pe_d',
]

export const BIBLIOTECA: FormularioMeta[] = [
  // ── ANAMNESE E AVALIAÇÃO ──────────────────────────────────────────────────
  {
    id: 'bib-001', categoria: 'anamnese', num_campos: 18, pontuavel: false,
    nome: 'Anamnese Geral de Fisioterapia',
    descricao: 'Ficha completa com queixa principal, histórico da doença atual, antecedentes pessoais e familiares, medicamentos e hábitos de vida.',
    tags: ['anamnese', 'geral', 'inicial'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-002', categoria: 'anamnese', num_campos: 16, pontuavel: false,
    nome: 'Anamnese Ortopédica e Traumatológica',
    descricao: 'Avaliação focada em lesões musculoesqueléticas, histórico de cirurgias, fraturas, instabilidades articulares e limitações funcionais.',
    tags: ['ortopedia', 'trauma', 'músculo', 'osso'],
    partes_corpo: [
      'cabeca', 'pescoco',
      'ombro_e', 'ombro_d',
      'cotovelo_e', 'cotovelo_d',
      'punho_mao_e', 'punho_mao_d',
      'coluna_lombar',
      'quadril_e', 'quadril_d',
      'joelho_e', 'joelho_d',
      'tornozelo_pe_e', 'tornozelo_pe_d',
    ],
  },
  {
    id: 'bib-003', categoria: 'anamnese', num_campos: 15, pontuavel: false,
    nome: 'Anamnese Neurológica',
    descricao: 'Histórico de AVC, TCE, esclerose múltipla, Parkinson, déficits sensitivo-motores e comprometimentos funcionais associados.',
    tags: ['neurologia', 'AVC', 'Parkinson', 'neuromotor'],
    partes_corpo: ['neurologia'],
  },
  {
    id: 'bib-004', categoria: 'anamnese', num_campos: 14, pontuavel: false,
    nome: 'Anamnese Cardiorrespiratória',
    descricao: 'Avaliação de dispneia, tosse, capacidade funcional, histórico de cardiopatias, asma e DPOC para fisioterapia respiratória.',
    tags: ['respiratório', 'cardíaco', 'DPOC', 'asma'],
    partes_corpo: ['torax'],
  },
  {
    id: 'bib-005', categoria: 'anamnese', num_campos: 13, pontuavel: false,
    nome: 'Anamnese Dermatofuncional',
    descricao: 'Pele, tecido adiposo, circulação linfática, cicatrizes e histórico de procedimentos estéticos para fisioterapia dermatofuncional.',
    tags: ['estética', 'pele', 'linfático', 'cicatriz'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-006', categoria: 'anamnese', num_campos: 14, pontuavel: false,
    nome: 'Anamnese Uroginecológica',
    descricao: 'Queixas de perdas urinárias, paridade, histórico de cirurgias pélvicas, disfunções sexuais e sintomas do assoalho pélvico.',
    tags: ['uroginecologia', 'assoalho pélvico', 'incontinência'],
    partes_corpo: ['quadril_e', 'quadril_d', 'abdomen'],
  },
  {
    id: 'bib-007', categoria: 'anamnese', num_campos: 16, pontuavel: false,
    nome: 'Anamnese Pediátrica',
    descricao: 'Preenchida pelos pais/responsáveis. Cobre gestação, parto, marcos do desenvolvimento neuromotor e histórico de saúde da criança.',
    tags: ['pediatria', 'desenvolvimento', 'criança', 'pais'],
    partes_corpo: ['neurologia', 'geral'],
  },
  {
    id: 'bib-008', categoria: 'anamnese', num_campos: 14, pontuavel: false,
    nome: 'Avaliação Geriátrica Funcional',
    descricao: 'Histórico de quedas, polifarmácia, cognição, independência nas AVDs, condições do domicílio e rede de suporte social.',
    tags: ['geriatria', 'idoso', 'quedas', 'independência'],
    partes_corpo: ['neurologia', 'geral'],
  },
  {
    id: 'bib-009', categoria: 'anamnese', num_campos: 12, pontuavel: false,
    nome: 'Ficha de Avaliação Postural',
    descricao: 'Registro de desvios posturais nos planos sagital e coronal, compensações musculares, fotografia postural e análise de marcha.',
    tags: ['postura', 'coluna', 'alinhamento', 'análise postural'],
    partes_corpo: [
      'coluna_lombar', 'cabeca', 'pescoco',
      'joelho_e', 'joelho_d',
      'tornozelo_pe_e', 'tornozelo_pe_d',
    ],
  },

  // ── ESCALAS DE DOR ────────────────────────────────────────────────────────
  {
    id: 'bib-010', categoria: 'escalas_dor', num_campos: 6, pontuavel: true,
    referencia: 'Huskisson EC, 1974',
    nome: 'EVA — Escala Visual Analógica de Dor',
    descricao: 'Régua numérica de 0 a 10, mapa corporal para localização da dor, qualidade (constante/intermitente) e fatores de melhora e piora.',
    tags: ['EVA', 'dor', 'intensidade', 'NRS'],
    partes_corpo: [...TODAS_REGIOES, 'neurologia', 'geral'],  // escala universal
  },
  {
    id: 'bib-011', categoria: 'escalas_dor', num_campos: 14, pontuavel: true,
    referencia: 'Melzack R, 1987 — SF-MPQ',
    nome: 'Questionário de Dor de McGill (SF-MPQ)',
    descricao: 'Descritores sensoriais e afetivos da dor em 15 itens com escala de intensidade, além da EVA e avaliação da dor atual.',
    tags: ['McGill', 'qualidade da dor', 'neuropática', 'sensorial'],
    partes_corpo: ['coluna_lombar', 'quadril_e', 'quadril_d', 'joelho_e', 'joelho_d', 'ombro_e', 'ombro_d', 'neurologia', 'geral'],
  },
  {
    id: 'bib-012', categoria: 'escalas_dor', num_campos: 10, pontuavel: true,
    referencia: 'Bouhassira D et al., 2005',
    nome: 'DN4 — Rastreamento de Dor Neuropática',
    descricao: '10 itens para triagem de componente neuropático na dor: 7 sintomas relatados pelo paciente e 3 sinais verificados pelo profissional.',
    tags: ['DN4', 'neuropática', 'neuropatia', 'rastreamento'],
    partes_corpo: ['neurologia', 'coluna_lombar', 'tornozelo_pe_e', 'tornozelo_pe_d', 'punho_mao_e', 'punho_mao_d'],
  },
  {
    id: 'bib-013', categoria: 'escalas_dor', num_campos: 4, pontuavel: true,
    referencia: 'Wong DL & Baker CM, 1988',
    nome: 'Escala de Dor Faces (Wong-Baker) — Pediátrica',
    descricao: 'Escala com expressões faciais de 0 a 10 para avaliação da intensidade da dor em crianças a partir de 3 anos.',
    tags: ['pediatria', 'faces', 'dor', 'criança'],
    partes_corpo: ['geral', 'neurologia'],
  },

  // ── FUNCIONALIDADE E QUALIDADE DE VIDA ───────────────────────────────────
  {
    id: 'bib-014', categoria: 'funcionalidade', num_campos: 36, pontuavel: true,
    referencia: 'Ware JE & Sherbourne CD, 1992',
    nome: 'SF-36 — Qualidade de Vida',
    descricao: '36 itens distribuídos em 8 domínios: capacidade funcional, aspectos físicos, dor, estado geral, vitalidade, aspectos sociais, emocionais e saúde mental.',
    tags: ['SF-36', 'qualidade de vida', 'saúde geral', 'QV'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-015', categoria: 'funcionalidade', num_campos: 30, pontuavel: true,
    referencia: 'Hudak PL et al., 1996',
    nome: 'DASH — Membros Superiores',
    descricao: 'Disabilities of the Arm, Shoulder and Hand: 30 itens avaliando incapacidade funcional e sintomas em atividades cotidianas e de trabalho.',
    tags: ['DASH', 'ombro', 'braço', 'mão', 'MMSS'],
    partes_corpo: [
      'ombro_e', 'ombro_d',
      'braco_e', 'braco_d',
      'cotovelo_e', 'cotovelo_d',
      'antebraco_e', 'antebraco_d',
      'punho_mao_e', 'punho_mao_d',
    ],
  },
  {
    id: 'bib-016', categoria: 'funcionalidade', num_campos: 24, pontuavel: true,
    referencia: 'Bellamy N et al., 1988',
    nome: 'WOMAC — Osteoartrite de Joelho e Quadril',
    descricao: '24 itens em 3 subescalas: dor (5), rigidez (2) e função física (17), específicos para osteoartrite de joelho e quadril.',
    tags: ['WOMAC', 'joelho', 'quadril', 'osteoartrite', 'artrose'],
    partes_corpo: ['joelho_e', 'joelho_d', 'quadril_e', 'quadril_d', 'coxa_e', 'coxa_d'],
  },
  {
    id: 'bib-017', categoria: 'funcionalidade', num_campos: 10, pontuavel: true,
    referencia: 'Mahoney FI & Barthel DW, 1965',
    nome: 'Índice de Barthel — Independência Funcional',
    descricao: '10 atividades de vida diária (alimentação, banho, higiene, vestuário, continência, transferência e deambulação) com pontuação 0–100.',
    tags: ['Barthel', 'AVD', 'independência', 'neurologia', 'geriatria'],
    partes_corpo: ['neurologia'],
  },
  {
    id: 'bib-018', categoria: 'funcionalidade', num_campos: 14, pontuavel: true,
    referencia: 'Berg KO et al., 1992',
    nome: 'Escala de Equilíbrio de Berg',
    descricao: '14 tarefas funcionais de equilíbrio, pontuação 0–4 por item, total 0–56. Prediz risco de queda em idosos e pacientes neurológicos.',
    tags: ['Berg', 'equilíbrio', 'queda', 'neurologia', 'idoso'],
    partes_corpo: ['neurologia', 'tornozelo_pe_e', 'tornozelo_pe_d'],
  },
  {
    id: 'bib-019', categoria: 'funcionalidade', num_campos: 10, pontuavel: true,
    referencia: 'Fairbank JC et al., 1980',
    nome: 'Questionário de Incapacidade de Oswestry (ODI)',
    descricao: '10 seções sobre dor lombar: intensidade da dor, cuidados pessoais, levantamento de peso, caminhada, sentar, ficar em pé, sono, vida social, viagens e variação da dor.',
    tags: ['ODI', 'Oswestry', 'lombar', 'coluna', 'lombalgia'],
    partes_corpo: ['coluna_lombar'],
  },
  {
    id: 'bib-020', categoria: 'funcionalidade', num_campos: 10, pontuavel: true,
    referencia: 'Vernon H & Mior S, 1991',
    nome: 'Neck Disability Index (NDI)',
    descricao: '10 seções para avaliar incapacidade cervical: intensidade da dor, cuidados pessoais, levantamento de peso, leitura, cefaleia, concentração, trabalho, direção, sono e lazer.',
    tags: ['NDI', 'cervical', 'pescoço', 'cervicalgia'],
    partes_corpo: ['cabeca', 'pescoco'],
  },
  {
    id: 'bib-021', categoria: 'funcionalidade', num_campos: 42, pontuavel: true,
    referencia: 'Roos EM et al., 1998',
    nome: 'KOOS — Knee Injury and Osteoarthritis Outcome Score',
    descricao: '42 itens em 5 subescalas: dor, sintomas, AVDs, esporte/recreação e qualidade de vida relacionada ao joelho.',
    tags: ['KOOS', 'joelho', 'LCA', 'osteoartrite', 'menisco'],
    partes_corpo: ['joelho_e', 'joelho_d', 'coxa_e', 'coxa_d'],
  },
  {
    id: 'bib-022', categoria: 'funcionalidade', num_campos: 40, pontuavel: true,
    referencia: 'Nilsdotter A et al., 2003',
    nome: 'HOOS — Hip Disability and Osteoarthritis Outcome Score',
    descricao: '40 itens em 5 subescalas análogas ao KOOS, adaptados para avaliação de disfunções do quadril e osteoartrite.',
    tags: ['HOOS', 'quadril', 'osteoartrite', 'coxartrose'],
    partes_corpo: ['quadril_e', 'quadril_d', 'coxa_e', 'coxa_d'],
  },
  {
    id: 'bib-023', categoria: 'funcionalidade', num_campos: 21, pontuavel: true,
    referencia: 'Martin RL & Irrgang JJ, 2007',
    nome: 'FAAM — Foot and Ankle Ability Measure',
    descricao: '21 itens em 2 subescalas: atividades de vida diária (17) e esporte (4), avaliando função do pé e tornozelo.',
    tags: ['FAAM', 'tornozelo', 'pé', 'função', 'esporte'],
    partes_corpo: ['tornozelo_pe_e', 'tornozelo_pe_d', 'perna_e', 'perna_d'],
  },

  // ── RESPIRATÓRIO ──────────────────────────────────────────────────────────
  {
    id: 'bib-024', categoria: 'respiratorio', num_campos: 5, pontuavel: true,
    referencia: 'Fletcher CM et al., 1959',
    nome: 'mMRC — Escala de Dispneia',
    descricao: '5 graus de limitação funcional por falta de ar (0 = só ao esforço intenso; 4 = ao se vestir ou sair de casa). Usada em DPOC e insuficiência cardíaca.',
    tags: ['mMRC', 'dispneia', 'DPOC', 'respiratório'],
    partes_corpo: ['torax'],
  },
  {
    id: 'bib-025', categoria: 'respiratorio', num_campos: 8, pontuavel: true,
    referencia: 'Jones PW et al., 2009',
    nome: 'CAT — COPD Assessment Test',
    descricao: '8 itens que avaliam o impacto da DPOC na qualidade de vida: tosse, secreção, aperto no peito, falta de ar, atividades domésticas, confiança, sono e energia.',
    tags: ['CAT', 'DPOC', 'COPD', 'qualidade de vida'],
    partes_corpo: ['torax'],
  },
  {
    id: 'bib-026', categoria: 'respiratorio', num_campos: 9, pontuavel: false,
    nome: 'Diário Respiratório',
    descricao: 'Registro diário de sintomas respiratórios, uso de broncodilatador de resgate, pico de fluxo expiratório, presença de tosse e qualidade do sono.',
    tags: ['diário', 'respiratório', 'broncodilatador', 'asma'],
    partes_corpo: ['torax'],
  },

  // ── NEUROLOGIA ────────────────────────────────────────────────────────────
  {
    id: 'bib-027', categoria: 'neurologia', num_campos: 20, pontuavel: true,
    referencia: 'Fugl-Meyer AR et al., 1975',
    nome: 'Fugl-Meyer Assessment — Motor (Resumido)',
    descricao: 'Avaliação da recuperação motora pós-AVC: movimentos voluntários de membros superiores e inferiores, reflexos e coordenação, pontuação 0–2 por item.',
    tags: ['Fugl-Meyer', 'AVC', 'stroke', 'motor', 'recuperação'],
    partes_corpo: ['neurologia'],
  },
  {
    id: 'bib-028', categoria: 'neurologia', num_campos: 18, pontuavel: true,
    referencia: 'Keith RA et al., 1987',
    nome: 'MIF — Medida de Independência Funcional',
    descricao: '18 itens em 2 domínios: motor (13) e cognitivo (5). Avalia autocuidado, controle de esfíncteres, transferências, locomoção, comunicação e cognição social.',
    tags: ['MIF', 'FIM', 'independência', 'neurologia', 'reabilitação'],
    partes_corpo: ['neurologia'],
  },
  {
    id: 'bib-029', categoria: 'neurologia', num_campos: 8, pontuavel: true,
    referencia: 'Bohannon RW & Smith MB, 1987',
    nome: 'Escala de Ashworth Modificada',
    descricao: 'Gradação da espasticidade muscular de 0 a 4 (0 = tônus normal; 4 = rigidez em flexão ou extensão). Aplicada nos principais grupos musculares.',
    tags: ['Ashworth', 'espasticidade', 'tônus', 'neurologia'],
    partes_corpo: ['neurologia'],
  },

  // ── PILATES E EXERCÍCIO ───────────────────────────────────────────────────
  {
    id: 'bib-030', categoria: 'pilates', num_campos: 15, pontuavel: false,
    nome: 'Avaliação Inicial de Pilates Clínico',
    descricao: 'Objetivos do aluno, histórico de atividade física, lesões prévias, limitações osteoarticulares, nível de condicionamento e expectativas.',
    tags: ['pilates', 'avaliação', 'anamnese', 'condicionamento'],
    partes_corpo: ['coluna_lombar', 'geral'],
  },
  {
    id: 'bib-031', categoria: 'pilates', num_campos: 7, pontuavel: true,
    referencia: 'Thomas S et al., 1992',
    nome: 'PAR-Q+ — Prontidão para Atividade Física',
    descricao: '7 perguntas de triagem de risco cardiovascular e contraindicações ao exercício. Obrigatório antes de iniciar qualquer programa de atividade física.',
    tags: ['PAR-Q', 'triagem', 'exercício', 'cardiovascular', 'risco'],
    partes_corpo: ['torax', 'geral'],
  },
  {
    id: 'bib-032', categoria: 'pilates', num_campos: 10, pontuavel: false,
    nome: 'Ficha de Evolução de Pilates',
    descricao: 'Registro de exercícios realizados por sessão, progressão de carga e repetições, percepção subjetiva de esforço (Borg) e observações do fisioterapeuta.',
    tags: ['pilates', 'evolução', 'sessão', 'progressão'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-033', categoria: 'pilates', num_campos: 8, pontuavel: true,
    nome: 'Questionário de Satisfação com o Pilates',
    descricao: 'NPS de satisfação geral + perguntas qualitativas sobre resultados percebidos, adesão, motivação, dificuldades e sugestões.',
    tags: ['satisfação', 'NPS', 'pilates', 'feedback'],
    partes_corpo: ['geral'],
  },

  // ── UROGINECOLOGIA ────────────────────────────────────────────────────────
  {
    id: 'bib-034', categoria: 'uroginecologia', num_campos: 6, pontuavel: true,
    referencia: 'Avery K et al., 2004 — ICIQ-SF',
    nome: 'ICIQ-SF — Incontinência Urinária',
    descricao: '4 itens validados internacionalmente: frequência de perdas, quantidade de perda, impacto na qualidade de vida e situações em que ocorre.',
    tags: ['ICIQ', 'incontinência', 'urinária', 'assoalho pélvico'],
    partes_corpo: ['quadril_e', 'quadril_d', 'abdomen'],
  },
  {
    id: 'bib-035', categoria: 'uroginecologia', num_campos: 20, pontuavel: true,
    referencia: 'Barber MD et al., 2005',
    nome: 'PFDI-20 — Pelvic Floor Distress Inventory',
    descricao: '20 itens em 3 subescalas: POPDI (prolapso), CRADI (intestino/anorretal) e UDI (urinário). Avalia sintomas e angústia do assoalho pélvico.',
    tags: ['PFDI', 'assoalho pélvico', 'prolapso', 'anorretal'],
    partes_corpo: ['quadril_e', 'quadril_d', 'abdomen'],
  },

  // ── SAÚDE MENTAL E PSICOSSOCIAL ───────────────────────────────────────────
  {
    id: 'bib-036', categoria: 'saude_mental', num_campos: 9, pontuavel: true,
    referencia: 'Kroenke K et al., 2001',
    nome: 'PHQ-9 — Triagem de Depressão',
    descricao: '9 itens baseados nos critérios do DSM-IV para triagem de depressão. Pontuação 0–27: 0–4 (mínimo), 5–9 (leve), 10–14 (moderado), 15–19 (moderadamente grave), 20+ (grave).',
    tags: ['PHQ-9', 'depressão', 'saúde mental', 'triagem'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-037', categoria: 'saude_mental', num_campos: 7, pontuavel: true,
    referencia: 'Spitzer RL et al., 2006',
    nome: 'GAD-7 — Triagem de Ansiedade Generalizada',
    descricao: '7 itens para avaliação de ansiedade generalizada. Pontuação 0–21: 0–4 (mínima), 5–9 (leve), 10–14 (moderada), 15+ (grave).',
    tags: ['GAD-7', 'ansiedade', 'saúde mental', 'triagem'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-038', categoria: 'saude_mental', num_campos: 11, pontuavel: true,
    referencia: 'Woby SR et al., 2005 — TSK-11',
    nome: 'TSK-11 — Escala Tampa de Cinesiofobia',
    descricao: '11 itens que avaliam o medo do movimento e a catastrofização da dor em pacientes com dor crônica. Versão reduzida validada da Tampa Scale.',
    tags: ['TSK', 'cinesiofobia', 'medo do movimento', 'dor crônica'],
    partes_corpo: ['coluna_lombar', 'joelho_e', 'joelho_d', 'ombro_e', 'ombro_d'],
  },
  {
    id: 'bib-039', categoria: 'saude_mental', num_campos: 16, pontuavel: true,
    referencia: 'Waddell G et al., 1993',
    nome: 'FABQ — Crenças de Medo e Evitação',
    descricao: '16 itens em 2 subescalas: atividade física (4 itens) e trabalho (7 itens). Avalia crenças mal-adaptativas sobre dor e atividade.',
    tags: ['FABQ', 'medo', 'evitação', 'lombalgia', 'trabalho'],
    partes_corpo: ['coluna_lombar'],
  },

  // ── ALTA E RETORNO ────────────────────────────────────────────────────────
  {
    id: 'bib-040', categoria: 'retorno_alta', num_campos: 5, pontuavel: true,
    referencia: 'Stratford P et al., 1995',
    nome: 'PSFS — Escala de Função Específica do Paciente',
    descricao: 'O paciente elenca 3 atividades que está com dificuldade e as pontua de 0 (incapaz) a 10 (sem dificuldade). Sensível a mudanças clinicamente relevantes.',
    tags: ['PSFS', 'função específica', 'paciente', 'alta'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-041', categoria: 'retorno_alta', num_campos: 12, pontuavel: false,
    nome: 'Ficha de Alta Fisioterapêutica',
    descricao: 'Resumo do tratamento: diagnóstico, objetivos atingidos, evolução clínica, comparativo inicial vs. final, orientações de manutenção e encaminhamentos.',
    tags: ['alta', 'desfecho', 'resumo', 'encaminhamento'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-042', categoria: 'retorno_alta', num_campos: 12, pontuavel: true,
    referencia: 'Webster KE et al., 2008',
    nome: 'RSI — Retorno ao Esporte após Lesão',
    descricao: '12 itens avaliando prontidão psicológica para retorno ao esporte: confiança, medo de nova lesão, função, desempenho e apoio emocional.',
    tags: ['RSI', 'retorno ao esporte', 'psicológico', 'confiança'],
    partes_corpo: ['joelho_e', 'joelho_d', 'tornozelo_pe_e', 'tornozelo_pe_d', 'ombro_e', 'ombro_d'],
  },

  // ── CONSENTIMENTOS ────────────────────────────────────────────────────────
  {
    id: 'bib-043', categoria: 'consentimentos', num_campos: 8, pontuavel: false,
    nome: 'Termo de Consentimento Informado para Fisioterapia',
    descricao: 'LGPD-compliant. Autoriza o tratamento, coleta de dados, uso de imagem para fins clínicos e esclarece riscos e benefícios. Inclui assinatura digital.',
    tags: ['TCLE', 'consentimento', 'LGPD', 'assinatura'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-044', categoria: 'consentimentos', num_campos: 7, pontuavel: false,
    nome: 'Termo de Consentimento para Teleconsulta',
    descricao: 'Específico para atendimento remoto. Cobre privacidade da sessão, limitações do teleatendimento, tratamento de dados digitais e direito de cancelamento.',
    tags: ['teleconsulta', 'telemedicina', 'LGPD', 'remoto'],
    partes_corpo: ['geral'],
  },
  {
    id: 'bib-045', categoria: 'consentimentos', num_campos: 10, pontuavel: false,
    nome: 'Anamnese de Retorno / Follow-up',
    descricao: 'Para reavaliar pacientes após alta ou intervalo prolongado: mudanças no quadro, novos sintomas, adesão a exercícios domiciliares e novos objetivos.',
    tags: ['retorno', 'follow-up', 'reavaliação', 'pós-alta'],
    partes_corpo: ['geral'],
  },
]
