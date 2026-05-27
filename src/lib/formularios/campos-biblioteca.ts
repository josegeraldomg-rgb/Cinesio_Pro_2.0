// Campos detalhados da Biblioteca de Formulários Clínicos
// Cada entrada mapeia bib-XXX → CampoFormulario[]
// Adicionados por categoria conforme implementação progressiva.

import type { CampoFormulario } from './tipos'

export const CAMPOS_BIBLIOTECA: Record<string, CampoFormulario[]> = {

  // ════════════════════════════════════════════════════════════════════════════
  // ANAMNESE E AVALIAÇÃO
  // ════════════════════════════════════════════════════════════════════════════

  // ── bib-001: Anamnese Geral de Fisioterapia ──────────────────────────────
  'bib-001': [
    { id: 'b01c01', tipo: 'secao',    label: 'Identificação e Queixa' },
    { id: 'b01c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b01c03', tipo: 'texto_curto', label: 'Profissional Avaliador' },
    { id: 'b01c04', tipo: 'texto_longo', label: 'Queixa Principal', obrigatorio: true,
      descricao: 'Descreva em suas próprias palavras o motivo da consulta.' },
    { id: 'b01c05', tipo: 'texto_longo', label: 'História da Doença Atual',
      descricao: 'Quando começou, como evoluiu, tratamentos realizados.' },
    { id: 'b01c06', tipo: 'secao',    label: 'Localização e Características da Dor' },
    { id: 'b01c07', tipo: 'mapa_dor', label: 'Localização da Dor / Desconforto',
      descricao: 'Clique nas regiões do corpo onde sente dor ou desconforto.' },
    { id: 'b01c08', tipo: 'escala_numerica', label: 'Intensidade da Dor (EVA)', min: 0, max: 10,
      rotulos: { min: 'Sem dor', max: 'Dor insuportável' } },
    { id: 'b01c09', tipo: 'selecao_unica', label: 'Início dos Sintomas',
      opcoes: ['Súbito (trauma/evento)', 'Gradual (semanas/meses)', 'Pós-cirurgia', 'Sem causa identificada'] },
    { id: 'b01c10', tipo: 'texto_longo', label: 'Fatores de Melhora',
      descricao: 'Ex: repouso, calor, medicamentos, posição.' },
    { id: 'b01c11', tipo: 'texto_longo', label: 'Fatores de Piora',
      descricao: 'Ex: movimento específico, frio, prolongado em pé.' },
    { id: 'b01c12', tipo: 'secao',    label: 'Antecedentes e Comorbidades' },
    { id: 'b01c13', tipo: 'selecao_multipla', label: 'Patologias Associadas',
      opcoes: ['Hipertensão Arterial (HAS)', 'Diabetes Mellitus (DM)', 'Cardiopatia', 'Osteoporose',
               'Artrite/Artrose', 'DPOC/Asma', 'Doença renal', 'Nenhuma'] },
    { id: 'b01c14', tipo: 'texto_longo', label: 'Cirurgias e Internações Prévias' },
    { id: 'b01c15', tipo: 'texto_longo', label: 'Medicamentos em Uso Contínuo' },
    { id: 'b01c16', tipo: 'texto_curto', label: 'Alergias Conhecidas' },
    { id: 'b01c17', tipo: 'secao',    label: 'Hábitos de Vida' },
    { id: 'b01c18', tipo: 'selecao_unica', label: 'Pratica Atividade Física Regular?',
      opcoes: ['Sim', 'Não'] },
    { id: 'b01c19', tipo: 'texto_curto', label: 'Qual atividade / frequência semanal' },
    { id: 'b01c20', tipo: 'selecao_unica', label: 'Tabagismo',
      opcoes: ['Não fumante', 'Ex-fumante', 'Fumante atual'] },
    { id: 'b01c21', tipo: 'assinatura', label: 'Assinatura do Paciente' },
  ],

  // ── bib-002: Anamnese Ortopédica e Traumatológica ────────────────────────
  'bib-002': [
    { id: 'b02c01', tipo: 'secao',    label: 'Informações do Atendimento' },
    { id: 'b02c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b02c03', tipo: 'mapa_dor', label: 'Localização da Lesão / Dor', obrigatorio: true,
      descricao: 'Marque a região afetada no mapa corporal.' },
    { id: 'b02c04', tipo: 'selecao_unica', label: 'Mecanismo de Lesão',
      opcoes: ['Trauma direto', 'Entorse / Torção', 'Fratura', 'Pós-cirúrgico', 'Sobrecarga repetitiva', 'Gradual / Degenerativo'] },
    { id: 'b02c05', tipo: 'texto_longo', label: 'Descrição da Lesão / Queixa', obrigatorio: true },
    { id: 'b02c06', tipo: 'escala_numerica', label: 'Dor em Repouso (0–10)', min: 0, max: 10,
      rotulos: { min: 'Sem dor', max: 'Insuportável' } },
    { id: 'b02c07', tipo: 'escala_numerica', label: 'Dor ao Movimento (0–10)', min: 0, max: 10,
      rotulos: { min: 'Sem dor', max: 'Insuportável' } },
    { id: 'b02c08', tipo: 'secao',    label: 'Histórico Cirúrgico e Clínico' },
    { id: 'b02c09', tipo: 'texto_longo', label: 'Cirurgias Ortopédicas Prévias',
      descricao: 'Descreva procedimentos, local e data aproximada.' },
    { id: 'b02c10', tipo: 'selecao_multipla', label: 'Instabilidades Articulares Conhecidas',
      opcoes: ['Ombro', 'Cotovelo', 'Punho / Mão', 'Quadril', 'Joelho', 'Tornozelo / Pé', 'Nenhuma'] },
    { id: 'b02c11', tipo: 'texto_longo', label: 'Fraturas e Luxações Anteriores' },
    { id: 'b02c12', tipo: 'secao',    label: 'Função e Limitações' },
    { id: 'b02c13', tipo: 'texto_longo', label: 'Atividades Limitadas pela Lesão',
      descricao: 'Ex: subir escadas, levantar peso, dormir.' },
    { id: 'b02c14', tipo: 'selecao_unica', label: 'Uso de Órtese / Imobilizador',
      opcoes: ['Sim', 'Não'] },
    { id: 'b02c15', tipo: 'texto_curto', label: 'Qual órtese / desde quando' },
    { id: 'b02c16', tipo: 'selecao_unica', label: 'Em uso de medicação para dor?',
      opcoes: ['Sim', 'Não'] },
    { id: 'b02c17', tipo: 'texto_curto', label: 'Qual medicação / dosagem' },
    { id: 'b02c18', tipo: 'assinatura', label: 'Assinatura do Paciente' },
  ],

  // ── bib-003: Anamnese Neurológica ────────────────────────────────────────
  'bib-003': [
    { id: 'b03c01', tipo: 'secao',    label: 'Histórico Neurológico' },
    { id: 'b03c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b03c03', tipo: 'selecao_unica', label: 'Diagnóstico Neurológico Principal', obrigatorio: true,
      opcoes: ['AVC / AVE', 'TCE — Traumatismo Cranioencefálico', 'Doença de Parkinson', 'Esclerose Múltipla',
               'Lesão Medular', 'Neuropatia Periférica', 'Paralisia Cerebral', 'Outro'] },
    { id: 'b03c04', tipo: 'texto_curto', label: 'Outro diagnóstico / CID-10' },
    { id: 'b03c05', tipo: 'data',     label: 'Data do Diagnóstico / Evento' },
    { id: 'b03c06', tipo: 'secao',    label: 'Déficits e Comprometimentos' },
    { id: 'b03c07', tipo: 'selecao_multipla', label: 'Déficits Presentes',
      opcoes: ['Motor (paresia/plegia)', 'Sensitivo', 'Cognitivo', 'Linguagem / Fala (afasia/disartria)',
               'Visual / Oculomotor', 'Equilíbrio / Coordenação', 'Disfagia'] },
    { id: 'b03c08', tipo: 'mapa_dor', label: 'Localização dos Déficits / Acometimento',
      descricao: 'Marque as regiões afetadas.' },
    { id: 'b03c09', tipo: 'texto_longo', label: 'Descrição dos Déficits Funcionais' },
    { id: 'b03c10', tipo: 'selecao_unica', label: 'Marcha',
      opcoes: ['Independente', 'Com dispositivo auxiliar', 'Dependente de assistência', 'Não deambula'] },
    { id: 'b03c11', tipo: 'texto_curto', label: 'Dispositivo auxiliar utilizado (se houver)' },
    { id: 'b03c12', tipo: 'secao',    label: 'Condição Geral' },
    { id: 'b03c13', tipo: 'selecao_multipla', label: 'Comorbidades',
      opcoes: ['HAS', 'DM2', 'Cardiopatia', 'Epilepsia / Convulsões', 'Depressão / Ansiedade', 'Disfunção vesical / intestinal'] },
    { id: 'b03c14', tipo: 'texto_longo', label: 'Medicamentos em Uso' },
    { id: 'b03c15', tipo: 'selecao_unica', label: 'Nível de Dependência para AVDs',
      opcoes: ['Independente', 'Assistência parcial', 'Dependente total'] },
    { id: 'b03c16', tipo: 'texto_longo', label: 'Objetivos do Paciente / Família para o Tratamento' },
    { id: 'b03c17', tipo: 'assinatura', label: 'Assinatura do Paciente / Responsável' },
  ],

  // ── bib-004: Anamnese Cardiorrespiratória ────────────────────────────────
  'bib-004': [
    { id: 'b04c01', tipo: 'secao',    label: 'Queixa Respiratória / Cardíaca' },
    { id: 'b04c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b04c03', tipo: 'selecao_unica', label: 'Diagnóstico Principal', obrigatorio: true,
      opcoes: ['DPOC', 'Asma', 'Insuficiência Cardíaca Congestiva', 'Fibrose Pulmonar',
               'Bronquiectasia', 'Pós-COVID / Long COVID', 'Outro'] },
    { id: 'b04c04', tipo: 'texto_curto', label: 'Outro diagnóstico / CID-10' },
    { id: 'b04c05', tipo: 'texto_longo', label: 'Queixa Principal e Evolução' },
    { id: 'b04c06', tipo: 'escala_numerica', label: 'Grau de Dispneia (mMRC 0–4)', min: 0, max: 4,
      descricao: '0 = só aos grandes esforços  /  4 = ao se vestir ou sair de casa',
      rotulos: { min: 'Mínima (0)', max: 'Grave (4)' } },
    { id: 'b04c07', tipo: 'secao',    label: 'Sintomas Respiratórios' },
    { id: 'b04c08', tipo: 'selecao_multipla', label: 'Sintomas Presentes',
      opcoes: ['Dispneia ao esforço', 'Dispneia em repouso', 'Tosse seca', 'Tosse produtiva',
               'Chiado / Sibilância', 'Cianose', 'Edema MMII', 'Ortopneia (piora deitado)'] },
    { id: 'b04c09', tipo: 'texto_curto', label: 'Secreção (cor, consistência, quantidade)' },
    { id: 'b04c10', tipo: 'selecao_unica', label: 'Uso de Oxigênio Suplementar',
      opcoes: ['Não', 'Sim — domiciliar 24h', 'Sim — apenas noturno', 'Sim — sob demanda'] },
    { id: 'b04c11', tipo: 'secao',    label: 'Histórico e Tratamento' },
    { id: 'b04c12', tipo: 'selecao_unica', label: 'Tabagismo',
      opcoes: ['Nunca fumou', 'Ex-fumante', 'Fumante atual'] },
    { id: 'b04c13', tipo: 'texto_curto', label: 'Carga tabágica (maços/ano — se aplicável)' },
    { id: 'b04c14', tipo: 'texto_longo', label: 'Internações por Descompensação (quando/quantas)' },
    { id: 'b04c15', tipo: 'texto_longo', label: 'Medicamentos em Uso (broncodilatadores, diuréticos etc.)' },
    { id: 'b04c16', tipo: 'assinatura', label: 'Assinatura do Paciente' },
  ],

  // ── bib-005: Anamnese Dermatofuncional ──────────────────────────────────
  'bib-005': [
    { id: 'b05c01', tipo: 'secao',    label: 'Queixa e Objetivo' },
    { id: 'b05c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b05c03', tipo: 'selecao_unica', label: 'Principal Área de Interesse', obrigatorio: true,
      opcoes: ['Gordura localizada / Adiposidade', 'Flacidez cutânea', 'Estrias', 'Fibroedema Geloide (Celulite)',
               'Cicatriz', 'Pós-operatório / Pós-bariátrico', 'Drenagem linfática'] },
    { id: 'b05c04', tipo: 'texto_longo', label: 'Queixa Detalhada e Expectativa Estética', obrigatorio: true },
    { id: 'b05c05', tipo: 'mapa_dor', label: 'Regiões de Interesse / Queixa',
      descricao: 'Marque as regiões no mapa corporal.' },
    { id: 'b05c06', tipo: 'secao',    label: 'Histórico Clínico Dermatofuncional' },
    { id: 'b05c07', tipo: 'selecao_multipla', label: 'Procedimentos Estéticos Anteriores',
      opcoes: ['Cirurgia plástica', 'Toxina botulínica', 'Preenchimento', 'Peeling',
               'Laserterapia / Radiofrequência', 'Criolipólise', 'Nenhum'] },
    { id: 'b05c08', tipo: 'texto_curto', label: 'Último procedimento e data aproximada' },
    { id: 'b05c09', tipo: 'selecao_unica', label: 'Padrão de Cicatrização',
      opcoes: ['Normal', 'Queloidiana', 'Hipertrófica', 'Não sei informar'] },
    { id: 'b05c10', tipo: 'selecao_multipla', label: 'Comorbidades Relevantes',
      opcoes: ['Diabetes', 'Insuficiência venosa / varizes', 'Linfedema', 'Hipotireoidismo', 'Doença autoimune', 'Nenhuma'] },
    { id: 'b05c11', tipo: 'texto_longo', label: 'Medicamentos em Uso (anticoagulantes, hormônios, corticoides)' },
    { id: 'b05c12', tipo: 'selecao_unica', label: 'Gestação ou Amamentação',
      opcoes: ['Não', 'Grávida — trimestre: ___', 'Amamentando'] },
    { id: 'b05c13', tipo: 'secao',    label: 'Hábitos de Vida' },
    { id: 'b05c14', tipo: 'selecao_unica', label: 'Hidratação Diária',
      opcoes: ['Menos de 1 litro', '1 a 2 litros', 'Mais de 2 litros'] },
    { id: 'b05c15', tipo: 'selecao_unica', label: 'Prática de Exercícios Físicos',
      opcoes: ['Sedentário', '1–2 vezes/semana', '3 ou mais vezes/semana'] },
    { id: 'b05c16', tipo: 'assinatura', label: 'Assinatura do Paciente' },
  ],

  // ── bib-006: Anamnese Uroginecológica ───────────────────────────────────
  'bib-006': [
    { id: 'b06c01', tipo: 'secao',    label: 'Histórico Uroginecológico' },
    { id: 'b06c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b06c03', tipo: 'selecao_unica', label: 'Queixa Principal', obrigatorio: true,
      opcoes: ['Incontinência urinária de esforço', 'Urgência urinária / Bexiga hiperativa',
               'Incontinência mista', 'Prolapso de órgãos pélvicos', 'Dor pélvica crônica',
               'Disfunção sexual', 'Constipação intestinal', 'Outro'] },
    { id: 'b06c04', tipo: 'selecao_unica', label: 'Paridade',
      opcoes: ['Nulípara (sem partos)', '1 parto normal', '2 ou mais partos normais',
               'Parto cesáreo (apenas)', 'Normal e cesáreo'] },
    { id: 'b06c05', tipo: 'selecao_multipla', label: 'Histórico Cirúrgico Pélvico',
      opcoes: ['Histerectomia', 'Correção de prolapso', 'Colpoperineoplastia', 'Cesariana', 'Nenhum'] },
    { id: 'b06c06', tipo: 'secao',    label: 'Sintomas Urinários' },
    { id: 'b06c07', tipo: 'escala_numerica', label: 'Impacto na Qualidade de Vida (0–10)', min: 0, max: 10,
      rotulos: { min: 'Nenhum impacto', max: 'Impacto muito grande' } },
    { id: 'b06c08', tipo: 'selecao_unica', label: 'Frequência Urinária Diurna',
      opcoes: ['Menos de 6 vezes', '6 a 8 vezes', 'Mais de 8 vezes'] },
    { id: 'b06c09', tipo: 'selecao_unica', label: 'Noctúria (urinar durante a noite)',
      opcoes: ['Não', '1 vez', '2 vezes', '3 ou mais vezes'] },
    { id: 'b06c10', tipo: 'selecao_unica', label: 'Uso de Absorvente por Perda Urinária',
      opcoes: ['Não usa', '1 absorvente/dia', '2 ou mais absorventes/dia'] },
    { id: 'b06c11', tipo: 'secao',    label: 'Histórico Hormonal e Geral' },
    { id: 'b06c12', tipo: 'selecao_unica', label: 'Status Hormonal',
      opcoes: ['Menacme (ciclo regular)', 'Gestante', 'Pós-menopausa', 'Em terapia hormonal'] },
    { id: 'b06c13', tipo: 'texto_curto', label: 'Medicamentos (diuréticos, antidepressivos, outros)' },
    { id: 'b06c14', tipo: 'selecao_multipla', label: 'Comorbidades',
      opcoes: ['Diabetes', 'Obesidade (IMC > 30)', 'Constipação intestinal crônica', 'Tosse crônica', 'Doença neurológica', 'Nenhuma'] },
    { id: 'b06c15', tipo: 'texto_longo', label: 'Observações Complementares' },
    { id: 'b06c16', tipo: 'assinatura', label: 'Assinatura do Paciente' },
  ],

  // ── bib-007: Anamnese Pediátrica ────────────────────────────────────────
  'bib-007': [
    { id: 'b07c01', tipo: 'secao',    label: 'Dados do Paciente e Responsável' },
    { id: 'b07c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b07c03', tipo: 'texto_curto', label: 'Nome do Responsável', obrigatorio: true },
    { id: 'b07c04', tipo: 'selecao_unica', label: 'Grau de Parentesco',
      opcoes: ['Mãe', 'Pai', 'Avó / Avô', 'Tutor legal', 'Outro'] },
    { id: 'b07c05', tipo: 'secao',    label: 'Histórico Gestacional e Neonatal' },
    { id: 'b07c06', tipo: 'selecao_unica', label: 'Tipo de Parto',
      opcoes: ['Normal / Vaginal', 'Cesáreo', 'Fórceps / Vácuo-extração'] },
    { id: 'b07c07', tipo: 'selecao_unica', label: 'Idade Gestacional no Nascimento',
      opcoes: ['Pré-termo (< 37 semanas)', 'A termo (37–41 semanas)', 'Pós-termo (> 41 semanas)'] },
    { id: 'b07c08', tipo: 'selecao_unica', label: 'Intercorrências no Parto / Período Neonatal',
      opcoes: ['Nenhuma', 'Sofrimento fetal', 'Internação em UTI Neonatal', 'Icterícia intensa', 'Outras'] },
    { id: 'b07c09', tipo: 'texto_longo', label: 'Descreva as intercorrências (se houver)' },
    { id: 'b07c10', tipo: 'secao',    label: 'Marcos do Desenvolvimento Neuromotor' },
    { id: 'b07c11', tipo: 'selecao_unica', label: 'Sustentação de Cabeça',
      opcoes: ['Dentro do esperado', 'Atrasado', 'Não realiza'] },
    { id: 'b07c12', tipo: 'selecao_unica', label: 'Sentar Sem Apoio',
      opcoes: ['Dentro do esperado', 'Atrasado', 'Não realiza'] },
    { id: 'b07c13', tipo: 'selecao_unica', label: 'Andar Independente',
      opcoes: ['Dentro do esperado', 'Atrasado', 'Não realiza'] },
    { id: 'b07c14', tipo: 'secao',    label: 'Histórico de Saúde' },
    { id: 'b07c15', tipo: 'selecao_multipla', label: 'Condições de Saúde',
      opcoes: ['Asma / Bronquite', 'Refluxo gastroesofágico', 'Epilepsia', 'Cardiopatia congênita',
               'Paralisia cerebral', 'Síndrome genética', 'Autismo (TEA)', 'Nenhuma'] },
    { id: 'b07c16', tipo: 'texto_curto', label: 'Medicamentos em Uso Contínuo' },
    { id: 'b07c17', tipo: 'texto_longo', label: 'Queixa Atual / Motivo do Encaminhamento', obrigatorio: true },
    { id: 'b07c18', tipo: 'texto_longo', label: 'Objetivos da Família para o Tratamento' },
    { id: 'b07c19', tipo: 'assinatura', label: 'Assinatura do Responsável Legal' },
  ],

  // ── bib-008: Avaliação Geriátrica Funcional ──────────────────────────────
  'bib-008': [
    { id: 'b08c01', tipo: 'secao',    label: 'Cognição e Estado Mental' },
    { id: 'b08c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b08c03', tipo: 'escala_numerica', label: 'Mini-Exame do Estado Mental (MEEM)', min: 0, max: 30,
      descricao: 'Escore 0–30. ≥ 24 = normal (escolaridade ≥ 8 anos); ≥ 19 = normal (< 8 anos).',
      rotulos: { min: 'Déficit grave (0)', max: 'Normal (30)' } },
    { id: 'b08c04', tipo: 'selecao_unica', label: 'Avaliação Cognitiva Clínica',
      opcoes: ['Sem déficit aparente', 'Déficit leve (esquecimentos ocasionais)', 'Déficit moderado', 'Déficit grave'] },
    { id: 'b08c05', tipo: 'secao',    label: 'Histórico de Quedas' },
    { id: 'b08c06', tipo: 'selecao_unica', label: 'Quedas nos Últimos 12 Meses', obrigatorio: true,
      opcoes: ['Nenhuma', '1 queda', '2 quedas', '3 ou mais quedas'] },
    { id: 'b08c07', tipo: 'texto_curto', label: 'Circunstâncias da última queda (onde, como)' },
    { id: 'b08c08', tipo: 'selecao_unica', label: 'Medo de Cair (Síndrome Pós-queda)',
      opcoes: ['Não tem medo', 'Tem medo mas não limita atividades', 'Medo limita atividades cotidianas'] },
    { id: 'b08c09', tipo: 'secao',    label: 'Independência e Mobilidade' },
    { id: 'b08c10', tipo: 'selecao_unica', label: 'Nível de Independência (Índice de Barthel)',
      opcoes: ['Independente (81–100)', 'Dependência leve (61–80)', 'Dependência moderada (41–60)', 'Dependência grave (≤ 40)'] },
    { id: 'b08c11', tipo: 'selecao_unica', label: 'Dispositivo de Marcha',
      opcoes: ['Nenhum', 'Bengala', 'Andador', 'Muletas', 'Cadeira de rodas'] },
    { id: 'b08c12', tipo: 'selecao_multipla', label: 'Medicamentos em Uso (marque os tipos)',
      opcoes: ['Até 4 medicamentos', '5–9 medicamentos', '10 ou mais medicamentos',
               'Anticoagulante', 'Psicotrópico / Benzodiazepínico', 'Hipoglicemiante', 'Anti-hipertensivo'] },
    { id: 'b08c13', tipo: 'secao',    label: 'Contexto Social e Domiciliar' },
    { id: 'b08c14', tipo: 'selecao_unica', label: 'Reside',
      opcoes: ['Sozinho', 'Com familiar / cuidador', 'Instituição de Longa Permanência (ILPI)'] },
    { id: 'b08c15', tipo: 'selecao_unica', label: 'Adaptações de Segurança no Domicílio',
      opcoes: ['Sim (barras, tapetes, iluminação)', 'Parcialmente', 'Não'] },
    { id: 'b08c16', tipo: 'texto_longo', label: 'Comorbidades e Observações Clínicas' },
    { id: 'b08c17', tipo: 'assinatura', label: 'Assinatura do Paciente / Responsável' },
  ],

  // ── bib-009: Ficha de Avaliação Postural ────────────────────────────────
  'bib-009': [
    { id: 'b09c01', tipo: 'secao',    label: 'Avaliação Postural Global' },
    { id: 'b09c02', tipo: 'data',     label: 'Data da Avaliação', obrigatorio: true },
    { id: 'b09c03', tipo: 'selecao_unica', label: 'Padrão Postural — Vista Anterior',
      opcoes: ['Simétrico', 'Desvio lateral de tronco à direita', 'Desvio lateral de tronco à esquerda',
               'Ombros assimétricos', 'Pelve assimétrica', 'Joelhos valgos', 'Joelhos varos'] },
    { id: 'b09c04', tipo: 'selecao_unica', label: 'Padrão Postural — Vista Lateral',
      opcoes: ['Normal', 'Hiperlordose cervical', 'Hipercifose torácica', 'Hiperlordose lombar',
               'Retificação lombar', 'Postura antálgica anterior (espondilite)'] },
    { id: 'b09c05', tipo: 'selecao_unica', label: 'Padrão Postural — Vista Posterior',
      opcoes: ['Simétrico', 'Escoliose funcional', 'Escoliose estrutural', 'Gibosidade', 'Assimetria escapular'] },
    { id: 'b09c06', tipo: 'secao',    label: 'Avaliação Regional e Compensações' },
    { id: 'b09c07', tipo: 'mapa_dor', label: 'Localização das Queixas / Pontos de Compensação',
      descricao: 'Marque os pontos de dor ou tensão identificados na avaliação.' },
    { id: 'b09c08', tipo: 'selecao_multipla', label: 'Alterações Posturais Identificadas',
      opcoes: ['Anteriorização de cabeça', 'Ombros protruídos / Protração', 'Escápulas aladas',
               'Hipercifose torácica', 'Hiperlordose lombar', 'Retificação lombar',
               'Assimetria pélvica', 'Joelho varo', 'Joelho valgo', 'Pé plano', 'Pé cavo'] },
    { id: 'b09c09', tipo: 'texto_longo', label: 'Análise de Marcha',
      descricao: 'Descreva padrão, cadência, comprimento do passo, compensações observadas.' },
    { id: 'b09c10', tipo: 'secao',    label: 'Registro Fotográfico e Conclusão' },
    { id: 'b09c11', tipo: 'instrucao', label: 'Fotos Posturais',
      descricao: 'Registre o nome ou link das fotos tiradas em vista anterior, posterior e lateral para o prontuário.' },
    { id: 'b09c12', tipo: 'texto_curto', label: 'Referência das fotos (nome do arquivo ou link)' },
    { id: 'b09c13', tipo: 'texto_longo', label: 'Observações e Hipótese Diagnóstica Postural', obrigatorio: true },
    { id: 'b09c14', tipo: 'assinatura', label: 'Assinatura do Fisioterapeuta' },
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // CONSENTIMENTOS
  // ════════════════════════════════════════════════════════════════════════════

  // ── bib-043: Termo de Consentimento Informado para Fisioterapia ──────────
  'bib-043': [
    {
      id: 'b43c01', tipo: 'instrucao',
      label: 'Leia atentamente antes de assinar',
      descricao:
        'Eu, abaixo identificado(a), declaro que fui devidamente esclarecido(a) pelo(a) fisioterapeuta ' +
        'sobre os objetivos, procedimentos, possíveis desconfortos e benefícios do tratamento fisioterapêutico. ' +
        'Compreendo que tenho o direito de interromper o tratamento a qualquer momento, sem prejuízo no meu atendimento.\n\n' +
        'Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), autorizo o tratamento dos ' +
        'meus dados pessoais e de saúde exclusivamente para fins clínicos e de acompanhamento terapêutico. ' +
        'Esses dados serão armazenados com segurança e não serão compartilhados com terceiros sem meu consentimento prévio.\n\n' +
        'Em caso de dúvidas, entre em contato com a clínica antes de assinar.',
    },
    { id: 'b43c02', tipo: 'secao', label: 'Identificação do Paciente' },
    {
      id: 'b43c03', tipo: 'texto_curto', label: 'Nome Completo do Paciente',
      obrigatorio: true, descricao: 'Conforme documento de identidade.',
    },
    { id: 'b43c04', tipo: 'data', label: 'Data de Nascimento', obrigatorio: true },
    { id: 'b43c05', tipo: 'texto_curto', label: 'CPF', descricao: 'Formato: 000.000.000-00', obrigatorio: true },
    { id: 'b43c06', tipo: 'secao', label: 'Declarações e Autorizações' },
    {
      id: 'b43c07', tipo: 'selecao_unica',
      label: 'Autorizo a realização do tratamento fisioterapêutico proposto.',
      obrigatorio: true,
      opcoes: ['Sim, autorizo', 'Não autorizo'],
    },
    {
      id: 'b43c08', tipo: 'selecao_unica',
      label: 'Autorizo o tratamento dos meus dados pessoais e de saúde para fins clínicos (LGPD).',
      obrigatorio: true,
      opcoes: ['Sim, autorizo', 'Não autorizo'],
    },
    {
      id: 'b43c09', tipo: 'selecao_unica',
      label: 'Autorizo o registro de imagens e vídeos da avaliação/tratamento para uso clínico e educacional interno.',
      opcoes: ['Sim, autorizo', 'Não autorizo'],
    },
    {
      id: 'b43c10', tipo: 'texto_longo',
      label: 'Restrições, condições especiais ou observações',
      descricao: 'Informe caso haja condições que limitem algum procedimento ou restrições específicas.',
    },
    { id: 'b43c11', tipo: 'data', label: 'Data', obrigatorio: true },
    { id: 'b43c12', tipo: 'assinatura', label: 'Assinatura do Paciente (ou responsável)', obrigatorio: true },
  ],

  // ── bib-044: Termo de Consentimento para Teleconsulta ───────────────────
  'bib-044': [
    {
      id: 'b44c01', tipo: 'instrucao',
      label: 'Informações sobre o Atendimento Remoto',
      descricao:
        'A teleconsulta é uma modalidade de atendimento fisioterapêutico realizada à distância por meio de ' +
        'plataformas de videoconferência, autorizada pela Resolução COFFITO nº 516/2018. ' +
        'Declaro ciência de que:\n\n' +
        '• O atendimento online possui limitações em relação à avaliação física presencial;\n' +
        '• A sessão ocorrerá em plataforma segura e as imagens não serão gravadas sem meu consentimento;\n' +
        '• Sou responsável por garantir um local privado, silencioso e com boa iluminação durante a sessão;\n' +
        '• Meus dados serão tratados em conformidade com a LGPD (Lei nº 13.709/2018);\n' +
        '• Posso solicitar o cancelamento do atendimento a qualquer momento, sem prejuízo.\n\n' +
        'Em caso de emergência durante a sessão, ligue imediatamente para o SAMU (192).',
    },
    { id: 'b44c02', tipo: 'secao', label: 'Identificação do Paciente' },
    {
      id: 'b44c03', tipo: 'texto_curto', label: 'Nome Completo do Paciente',
      obrigatorio: true,
    },
    { id: 'b44c04', tipo: 'data', label: 'Data de Nascimento', obrigatorio: true },
    { id: 'b44c05', tipo: 'texto_curto', label: 'CPF', obrigatorio: true },
    { id: 'b44c06', tipo: 'secao', label: 'Condições do Atendimento Remoto' },
    {
      id: 'b44c07', tipo: 'selecao_unica',
      label: 'Confirmo que estarei em um local privado, com boa iluminação e conexão de internet estável durante a sessão.',
      obrigatorio: true,
      opcoes: ['Sim, confirmo', 'Não consigo garantir'],
    },
    {
      id: 'b44c08', tipo: 'selecao_unica',
      label: 'Plataforma de videoconferência que será utilizada:',
      opcoes: ['Google Meet', 'Zoom', 'WhatsApp Videochamada', 'Microsoft Teams', 'Outra'],
    },
    {
      id: 'b44c09', tipo: 'selecao_unica',
      label: 'Autorizo a gravação da sessão exclusivamente para revisão clínica e arquivamento no prontuário.',
      opcoes: ['Sim, autorizo', 'Não autorizo'],
    },
    { id: 'b44c10', tipo: 'secao', label: 'Consentimento' },
    {
      id: 'b44c11', tipo: 'selecao_unica',
      label: 'Autorizo a realização do atendimento fisioterapêutico por teleconsulta e o tratamento dos meus dados (LGPD).',
      obrigatorio: true,
      opcoes: ['Sim, autorizo', 'Não autorizo'],
    },
    { id: 'b44c12', tipo: 'data', label: 'Data', obrigatorio: true },
    { id: 'b44c13', tipo: 'assinatura', label: 'Assinatura do Paciente', obrigatorio: true },
  ],

  // ── bib-045: Anamnese de Retorno / Follow-up ─────────────────────────────
  'bib-045': [
    { id: 'b45c01', tipo: 'secao', label: 'Informações do Retorno' },
    { id: 'b45c02', tipo: 'data', label: 'Data do Retorno', obrigatorio: true },
    { id: 'b45c03', tipo: 'texto_curto', label: 'Data do Último Atendimento (aproximada)',
      descricao: 'Ex: 01/03/2025' },
    {
      id: 'b45c04', tipo: 'secao', label: 'Evolução Clínica',
    },
    {
      id: 'b45c05', tipo: 'escala_numerica',
      label: 'Intensidade da Dor Atual (0–10)',
      min: 0, max: 10,
      rotulos: { min: 'Sem dor', max: 'Dor insuportável' },
      obrigatorio: true,
    },
    {
      id: 'b45c06', tipo: 'selecao_unica',
      label: 'Como você avalia sua evolução desde o último atendimento?',
      obrigatorio: true,
      opcoes: [
        'Muito melhor — melhora significativa',
        'Melhor — melhora perceptível',
        'Igual — sem alteração',
        'Pior — piora leve',
        'Muito pior — piora importante',
      ],
    },
    {
      id: 'b45c07', tipo: 'selecao_unica',
      label: 'Realizou os exercícios domiciliares prescritos?',
      opcoes: ['Sim, todos os dias', 'Sim, alguns dias', 'Raramente', 'Não realizei', 'Não foram prescritos'],
    },
    {
      id: 'b45c08', tipo: 'texto_longo',
      label: 'O que mudou desde o último atendimento?',
      descricao: 'Descreva qualquer melhora, piora ou alteração que percebeu no seu quadro.',
    },
    { id: 'b45c09', tipo: 'secao', label: 'Novos Sintomas e Intercorrências' },
    {
      id: 'b45c10', tipo: 'texto_longo',
      label: 'Novos sintomas ou queixas que surgiram no período?',
      descricao: 'Informe qualquer sintoma novo, mesmo que não relacionado ao tratamento principal.',
    },
    {
      id: 'b45c11', tipo: 'selecao_unica',
      label: 'Realizou consulta médica ou de outros profissionais de saúde no período?',
      opcoes: ['Não', 'Sim — médico clínico geral', 'Sim — ortopedista', 'Sim — neurologista', 'Sim — outro especialista'],
    },
    {
      id: 'b45c12', tipo: 'texto_curto',
      label: 'Novos medicamentos iniciados ou alterados?',
      descricao: 'Informe nome e dose se souber.',
    },
    { id: 'b45c13', tipo: 'secao', label: 'Objetivos e Satisfação' },
    {
      id: 'b45c14', tipo: 'texto_longo',
      label: 'Quais são seus objetivos para este período de tratamento?',
      descricao: 'Ex: retornar ao esporte, diminuir dor, melhorar mobilidade.',
    },
    {
      id: 'b45c15', tipo: 'escala_numerica',
      label: 'Satisfação geral com o tratamento até o momento (0–10)',
      min: 0, max: 10,
      rotulos: { min: 'Insatisfeito', max: 'Muito satisfeito' },
    },
    { id: 'b45c16', tipo: 'assinatura', label: 'Assinatura do Paciente' },
  ],

}
