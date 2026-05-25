-- ════════════════════════════════════════════════════════════════
-- seed_sequencias.sql
-- 6 sequências padrão do sistema
-- Rodar APÓS migration 015 e seed_exercicios.sql
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ── IDs de exercícios (buscados pelo nome) ────────────────────
  ex_hundred             UUID;
  ex_roll_up             UUID;
  ex_leg_circle          UUID;
  ex_rolling             UUID;
  ex_single_leg_stretch  UUID;
  ex_double_leg_stretch  UUID;
  ex_spine_stretch       UUID;
  ex_open_leg_rocker     UUID;
  ex_corkscrew           UUID;
  ex_swan_prep           UUID;
  ex_swan_dive           UUID;
  ex_child_pose          UUID;
  ex_teaser              UUID;
  ex_side_kicks          UUID;
  ex_swimming            UUID;
  ex_leg_pull_front      UUID;
  ex_plank               UUID;
  ex_side_plank          UUID;

  ex_footwork_paralelo   UUID;
  ex_footwork_v          UUID;
  ex_stomach_massage     UUID;
  ex_short_box_round     UUID;
  ex_short_box_flat      UUID;
  ex_elephant            UUID;
  ex_rowing_front        UUID;
  ex_mermaid             UUID;
  ex_long_stretch        UUID;
  ex_arabesque           UUID;

  ex_agach_parede        UUID;
  ex_extensao_joelho     UUID;
  ex_flexao_joelho       UUID;
  ex_ponte               UUID;
  ex_ponte_uni           UUID;
  ex_abducao_quadril     UUID;
  ex_stepup              UUID;
  ex_agach_livre         UUID;
  ex_panturrilha         UUID;
  ex_plantar_excentrica  UUID;
  ex_apoio_uni           UUID;
  ex_tandem              UUID;

  ex_rot_ext_ombro       UUID;
  ex_rot_int_ombro       UUID;
  ex_elev_lateral        UUID;
  ex_elev_frontal        UUID;
  ex_remada_baixa        UUID;
  ex_diagonais           UUID;
  ex_pushup_mod          UUID;
  ex_extensao_triceps    UUID;
  ex_rosca_biceps        UUID;

  ex_resp_diafragmatica  UUID;
  ex_cat_cow             UUID;
  ex_mckenzie            UUID;
  ex_williams            UUID;
  ex_along_lombar        UUID;
  ex_dead_bug            UUID;
  ex_bird_dog            UUID;
  ex_prancha             UUID;
  ex_rotacao_tronco      UUID;
  ex_along_isquio        UUID;
  ex_foam_coluna         UUID;

BEGIN

  -- ── Lookup de IDs pelo nome ──────────────────────────────────────
  SELECT id INTO ex_hundred            FROM biblioteca_exercicios WHERE nome = 'Hundred'                        AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_roll_up            FROM biblioteca_exercicios WHERE nome = 'Roll Up'                        AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_leg_circle         FROM biblioteca_exercicios WHERE nome = 'Single Leg Circle'              AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_rolling            FROM biblioteca_exercicios WHERE nome = 'Rolling Like a Ball'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_single_leg_stretch FROM biblioteca_exercicios WHERE nome = 'Single Leg Stretch'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_double_leg_stretch FROM biblioteca_exercicios WHERE nome = 'Double Leg Stretch'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_spine_stretch      FROM biblioteca_exercicios WHERE nome = 'Spine Stretch Forward'          AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_open_leg_rocker    FROM biblioteca_exercicios WHERE nome = 'Open Leg Rocker'               AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_corkscrew          FROM biblioteca_exercicios WHERE nome = 'Corkscrew'                     AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_swan_prep          FROM biblioteca_exercicios WHERE nome = 'Swan Prep'                     AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_swan_dive          FROM biblioteca_exercicios WHERE nome = 'Swan Dive'                     AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_child_pose         FROM biblioteca_exercicios WHERE nome = 'Child Pose (Rest)'             AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_teaser             FROM biblioteca_exercicios WHERE nome = 'Teaser I'                      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_side_kicks         FROM biblioteca_exercicios WHERE nome = 'Side Kicks'                    AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_swimming           FROM biblioteca_exercicios WHERE nome = 'Swimming'                      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_leg_pull_front     FROM biblioteca_exercicios WHERE nome = 'Leg Pull Front'                AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_plank              FROM biblioteca_exercicios WHERE nome = 'Plank'                         AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_side_plank         FROM biblioteca_exercicios WHERE nome = 'Side Plank'                    AND is_sistema = true LIMIT 1;

  SELECT id INTO ex_footwork_paralelo  FROM biblioteca_exercicios WHERE nome = 'Footwork – Paralelo'           AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_footwork_v         FROM biblioteca_exercicios WHERE nome = 'Footwork – V'                  AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_stomach_massage    FROM biblioteca_exercicios WHERE nome = 'Stomach Massage'               AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_short_box_round    FROM biblioteca_exercicios WHERE nome = 'Short Box – Round'             AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_short_box_flat     FROM biblioteca_exercicios WHERE nome = 'Short Box – Flat'              AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_elephant           FROM biblioteca_exercicios WHERE nome = 'Elephant'                      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_rowing_front       FROM biblioteca_exercicios WHERE nome = 'Rowing – Front'                AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_mermaid            FROM biblioteca_exercicios WHERE nome = 'Mermaid'                       AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_long_stretch       FROM biblioteca_exercicios WHERE nome = 'Long Stretch'                  AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_arabesque          FROM biblioteca_exercicios WHERE nome = 'Arabesque'                     AND is_sistema = true LIMIT 1;

  SELECT id INTO ex_agach_parede       FROM biblioteca_exercicios WHERE nome = 'Agachamento na Parede'         AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_extensao_joelho    FROM biblioteca_exercicios WHERE nome = 'Extensão de Joelho'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_flexao_joelho      FROM biblioteca_exercicios WHERE nome = 'Flexão de Joelho'              AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_ponte              FROM biblioteca_exercicios WHERE nome = 'Ponte Glútea'                  AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_ponte_uni          FROM biblioteca_exercicios WHERE nome = 'Ponte Glútea Unilateral'       AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_abducao_quadril    FROM biblioteca_exercicios WHERE nome = 'Abdução de Quadril'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_stepup             FROM biblioteca_exercicios WHERE nome = 'Step-up'                       AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_agach_livre        FROM biblioteca_exercicios WHERE nome = 'Agachamento Livre'             AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_panturrilha        FROM biblioteca_exercicios WHERE nome = 'Elevação de Panturrilha'       AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_plantar_excentrica FROM biblioteca_exercicios WHERE nome = 'Flexão Plantar Excêntrica'     AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_apoio_uni          FROM biblioteca_exercicios WHERE nome = 'Apoio Unipodal'                AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_tandem             FROM biblioteca_exercicios WHERE nome = 'Tandem Walk'                   AND is_sistema = true LIMIT 1;

  SELECT id INTO ex_rot_ext_ombro      FROM biblioteca_exercicios WHERE nome = 'Rotação Externa de Ombro'      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_rot_int_ombro      FROM biblioteca_exercicios WHERE nome = 'Rotação Interna de Ombro'      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_elev_lateral       FROM biblioteca_exercicios WHERE nome = 'Elevação Lateral'              AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_elev_frontal       FROM biblioteca_exercicios WHERE nome = 'Elevação Frontal'              AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_remada_baixa       FROM biblioteca_exercicios WHERE nome = 'Remada Baixa'                  AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_diagonais          FROM biblioteca_exercicios WHERE nome = 'Diagonais de Ombro'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_pushup_mod         FROM biblioteca_exercicios WHERE nome = 'Push-up Modificado'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_extensao_triceps   FROM biblioteca_exercicios WHERE nome = 'Extensão de Tríceps'           AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_rosca_biceps       FROM biblioteca_exercicios WHERE nome = 'Rosca Bíceps'                  AND is_sistema = true LIMIT 1;

  SELECT id INTO ex_resp_diafragmatica FROM biblioteca_exercicios WHERE nome = 'Respiração Diafragmática'      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_cat_cow            FROM biblioteca_exercicios WHERE nome = 'Cat-Cow'                       AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_mckenzie           FROM biblioteca_exercicios WHERE nome = 'McKenzie Extension'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_williams           FROM biblioteca_exercicios WHERE nome = 'Williams Flexion'              AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_along_lombar       FROM biblioteca_exercicios WHERE nome = 'Alongamento Lombar'            AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_dead_bug           FROM biblioteca_exercicios WHERE nome = 'Dead Bug'                      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_bird_dog           FROM biblioteca_exercicios WHERE nome = 'Bird Dog'                      AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_prancha            FROM biblioteca_exercicios WHERE nome = 'Prancha Abdominal'             AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_rotacao_tronco     FROM biblioteca_exercicios WHERE nome = 'Rotação de Tronco'             AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_along_isquio       FROM biblioteca_exercicios WHERE nome = 'Alongamento de Isquiotibiais'  AND is_sistema = true LIMIT 1;
  SELECT id INTO ex_foam_coluna        FROM biblioteca_exercicios WHERE nome = 'Foam Roller – Coluna'          AND is_sistema = true LIMIT 1;

  -- ════════════════════════════════════════════════════════════════
  -- SEQUÊNCIA 1 — Pilates Solo · Iniciante
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO sequencias_aula (empresa_id, is_sistema, nome, descricao, exercicios)
  VALUES (
    NULL, true,
    'Pilates Solo — Iniciante',
    'Protocolo de introdução ao método Pilates no solo. Foco em respiração, ativação de core e mobilidade básica. Indicado para alunos sem experiência prévia.',
    jsonb_build_array(
      jsonb_build_object('exercicio_id', ex_resp_diafragmatica, 'nome_exercicio', 'Respiração Diafragmática', 'series', 3, 'repeticoes', '10 respirações', 'carga', null, 'obs', 'Aquecimento — mão no abdômen, inspire expandindo a barriga'),
      jsonb_build_object('exercicio_id', ex_cat_cow,            'nome_exercicio', 'Cat-Cow',                  'series', 2, 'repeticoes', '10',             'carga', null, 'obs', 'Mobilização suave da coluna, ritmo respiratório'),
      jsonb_build_object('exercicio_id', ex_hundred,            'nome_exercicio', 'Hundred',                  'series', 3, 'repeticoes', '50 pulsações',   'carga', null, 'obs', 'Versão iniciante: pernas em mesa (tabletop); inspire 5, expire 5'),
      jsonb_build_object('exercicio_id', ex_leg_circle,         'nome_exercicio', 'Single Leg Circle',        'series', 3, 'repeticoes', '5 cada lado',    'carga', null, 'obs', 'Círculos pequenos — pelve completamente estável'),
      jsonb_build_object('exercicio_id', ex_rolling,            'nome_exercicio', 'Rolling Like a Ball',      'series', 3, 'repeticoes', '8',              'carga', null, 'obs', 'Evitar rolar sobre o pescoço; controle a descida'),
      jsonb_build_object('exercicio_id', ex_single_leg_stretch, 'nome_exercicio', 'Single Leg Stretch',       'series', 3, 'repeticoes', '8 cada lado',    'carga', null, 'obs', 'Cabeça fora, cotovelo no joelho oposto'),
      jsonb_build_object('exercicio_id', ex_swan_prep,          'nome_exercicio', 'Swan Prep',                'series', 3, 'repeticoes', '8',              'carga', null, 'obs', 'Cotovelos semiflexionados; extensão suave e progressiva'),
      jsonb_build_object('exercicio_id', ex_side_kicks,         'nome_exercicio', 'Side Kicks',               'series', 3, 'repeticoes', '8 cada lado',    'carga', null, 'obs', 'Quadril estável; movimento controlado'),
      jsonb_build_object('exercicio_id', ex_prancha,            'nome_exercicio', 'Prancha Abdominal',        'series', 3, 'repeticoes', '20s',            'carga', null, 'obs', 'Em antebraços para iniciantes; progride para palmas'),
      jsonb_build_object('exercicio_id', ex_child_pose,         'nome_exercicio', 'Child Pose (Rest)',         'series', 1, 'repeticoes', '30s',            'carga', null, 'obs', 'Encerramento — respiração livre, relaxamento total')
    )
  );

  -- ════════════════════════════════════════════════════════════════
  -- SEQUÊNCIA 2 — Pilates Solo · Intermediário
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO sequencias_aula (empresa_id, is_sistema, nome, descricao, exercicios)
  VALUES (
    NULL, true,
    'Pilates Solo — Intermediário',
    'Repertório clássico do método Pilates no solo com exercícios de intensidade moderada a alta. Indicado para alunos com 3+ meses de prática.',
    jsonb_build_array(
      jsonb_build_object('exercicio_id', ex_hundred,            'nome_exercicio', 'Hundred',              'series', 3, 'repeticoes', '100 pulsações',   'carga', null, 'obs', 'Pernas a 45°; inspire 5, expire 5'),
      jsonb_build_object('exercicio_id', ex_roll_up,            'nome_exercicio', 'Roll Up',              'series', 3, 'repeticoes', '8',               'carga', null, 'obs', 'Articula vértebra a vértebra; controle na descida'),
      jsonb_build_object('exercicio_id', ex_leg_circle,         'nome_exercicio', 'Single Leg Circle',    'series', 3, 'repeticoes', '5 cada lado',     'carga', null, 'obs', 'Círculos amplos mantendo pelve estável'),
      jsonb_build_object('exercicio_id', ex_rolling,            'nome_exercicio', 'Rolling Like a Ball',  'series', 3, 'repeticoes', '8',               'carga', null, 'obs', 'Forma de C perfeita; não libere os pés ao retornar'),
      jsonb_build_object('exercicio_id', ex_double_leg_stretch, 'nome_exercicio', 'Double Leg Stretch',   'series', 3, 'repeticoes', '10',              'carga', null, 'obs', 'Braços e pernas em oposição; lombar colada ao chão'),
      jsonb_build_object('exercicio_id', ex_spine_stretch,      'nome_exercicio', 'Spine Stretch Forward','series', 3, 'repeticoes', '8',               'carga', null, 'obs', 'Arqueie de cabeça a cauda; retorne com resistência'),
      jsonb_build_object('exercicio_id', ex_open_leg_rocker,    'nome_exercicio', 'Open Leg Rocker',      'series', 3, 'repeticoes', '6',               'carga', null, 'obs', 'Equilíbrio no V antes de rolar; não perca a forma'),
      jsonb_build_object('exercicio_id', ex_swan_dive,          'nome_exercicio', 'Swan Dive',            'series', 3, 'repeticoes', '6',               'carga', null, 'obs', 'Balanço controlado; não force o pescoço'),
      jsonb_build_object('exercicio_id', ex_swimming,           'nome_exercicio', 'Swimming',             'series', 3, 'repeticoes', '20 pulsações',    'carga', null, 'obs', 'Membros opostos; inspire 5, expire 5'),
      jsonb_build_object('exercicio_id', ex_side_plank,         'nome_exercicio', 'Side Plank',           'series', 3, 'repeticoes', '20s cada lado',   'carga', null, 'obs', 'Quadril elevado; progride para extensão de braço'),
      jsonb_build_object('exercicio_id', ex_teaser,             'nome_exercicio', 'Teaser I',             'series', 3, 'repeticoes', '5',               'carga', null, 'obs', 'Core ativo; ombros longe das orelhas; pernas a 45°'),
      jsonb_build_object('exercicio_id', ex_corkscrew,          'nome_exercicio', 'Corkscrew',            'series', 3, 'repeticoes', '6 cada lado',     'carga', null, 'obs', 'Controle pélvico rigoroso; amplitude progressiva')
    )
  );

  -- ════════════════════════════════════════════════════════════════
  -- SEQUÊNCIA 3 — Pilates no Reformer · Básico
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO sequencias_aula (empresa_id, is_sistema, nome, descricao, exercicios)
  VALUES (
    NULL, true,
    'Pilates no Reformer — Básico',
    'Introdução ao Reformer com ênfase em alinhamento postural, força de membros inferiores e mobilidade de coluna. Molas: 2–3 conforme exercício.',
    jsonb_build_array(
      jsonb_build_object('exercicio_id', ex_footwork_paralelo,  'nome_exercicio', 'Footwork – Paralelo',  'series', 3, 'repeticoes', '10',              'carga', '3 molas', 'obs', 'Calcanhar na plataforma; joelhos alinhados com os pés'),
      jsonb_build_object('exercicio_id', ex_footwork_v,         'nome_exercicio', 'Footwork – V',          'series', 3, 'repeticoes', '10',              'carga', '3 molas', 'obs', 'Posição Pilates; rotação externa suave de quadril'),
      jsonb_build_object('exercicio_id', ex_stomach_massage,    'nome_exercicio', 'Stomach Massage',       'series', 3, 'repeticoes', '10',              'carga', '2 molas', 'obs', 'C-curve profunda; não abra os joelhos além do ombro'),
      jsonb_build_object('exercicio_id', ex_short_box_round,    'nome_exercicio', 'Short Box – Round',     'series', 3, 'repeticoes', '8',               'carga', 'sem mola','obs', 'Rola para trás vértebra a vértebra; retorne com controle'),
      jsonb_build_object('exercicio_id', ex_short_box_flat,     'nome_exercicio', 'Short Box – Flat',      'series', 3, 'repeticoes', '8',               'carga', 'sem mola','obs', 'Inclinação como uma unidade; escápulas estáveis'),
      jsonb_build_object('exercicio_id', ex_elephant,           'nome_exercicio', 'Elephant',              'series', 3, 'repeticoes', '8',               'carga', '2 molas', 'obs', 'Flexão de quadril; pés paralelos; joelhos suaves'),
      jsonb_build_object('exercicio_id', ex_rowing_front,       'nome_exercicio', 'Rowing – Front',        'series', 3, 'repeticoes', '8',               'carga', '1 mola',  'obs', 'Remada à altura dos ombros; retração escapular controlada'),
      jsonb_build_object('exercicio_id', ex_mermaid,            'nome_exercicio', 'Mermaid',               'series', 2, 'repeticoes', '6 cada lado',     'carga', '1 mola',  'obs', 'Inclinação lateral pura; quadril fixo na caixa'),
      jsonb_build_object('exercicio_id', ex_long_stretch,       'nome_exercicio', 'Long Stretch',          'series', 3, 'repeticoes', '8',               'carga', '2 molas', 'obs', 'Prancha rígida; não deixe o quadril subir ou afundar'),
      jsonb_build_object('exercicio_id', ex_arabesque,          'nome_exercicio', 'Arabesque',             'series', 3, 'repeticoes', '6 cada lado',     'carga', '1 mola',  'obs', 'Extensão de quadril no plano sagital; pelve quadrada')
    )
  );

  -- ════════════════════════════════════════════════════════════════
  -- SEQUÊNCIA 4 — Reabilitação de Joelho (pós-cirúrgico / pós-lesão)
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO sequencias_aula (empresa_id, is_sistema, nome, descricao, exercicios)
  VALUES (
    NULL, true,
    'Reabilitação de Joelho',
    'Protocolo de fortalecimento progressivo pós-lesão ou pós-cirúrgico de joelho (LCA, menisco, artroplastia). Progrida conforme tolerância à dor e orientação médica.',
    jsonb_build_array(
      jsonb_build_object('exercicio_id', ex_agach_parede,       'nome_exercicio', 'Agachamento na Parede',       'series', 3, 'repeticoes', '30–60s',        'carga', null, 'obs', 'Fase inicial — flexão entre 0° e 60°; sem dor'),
      jsonb_build_object('exercicio_id', ex_extensao_joelho,    'nome_exercicio', 'Extensão de Joelho',          'series', 3, 'repeticoes', '15',             'carga', 'faixa leve', 'obs', 'Amplitude indolor; pode iniciar de 0° a 45° e progredir'),
      jsonb_build_object('exercicio_id', ex_flexao_joelho,      'nome_exercicio', 'Flexão de Joelho',            'series', 3, 'repeticoes', '15',             'carga', 'faixa leve', 'obs', 'Prono ou em pé com suporte; amplitude progressiva'),
      jsonb_build_object('exercicio_id', ex_ponte,              'nome_exercicio', 'Ponte Glútea',                'series', 3, 'repeticoes', '15',             'carga', null, 'obs', 'Ativa glúteo sem sobrecarregar o joelho; pés afastados'),
      jsonb_build_object('exercicio_id', ex_abducao_quadril,    'nome_exercicio', 'Abdução de Quadril',          'series', 3, 'repeticoes', '15 cada lado',   'carga', null, 'obs', 'Glúteo médio — controle dinâmico do joelho em cadeia fechada'),
      jsonb_build_object('exercicio_id', ex_ponte_uni,          'nome_exercicio', 'Ponte Glútea Unilateral',     'series', 3, 'repeticoes', '10 cada lado',   'carga', null, 'obs', 'Iniciar somente quando bilateral estiver confortável e sem dor'),
      jsonb_build_object('exercicio_id', ex_stepup,             'nome_exercicio', 'Step-up',                     'series', 3, 'repeticoes', '10 cada lado',   'carga', null, 'obs', 'Degrau de 10–15 cm na fase inicial; foco no controle excêntrico'),
      jsonb_build_object('exercicio_id', ex_agach_livre,        'nome_exercicio', 'Agachamento Livre',           'series', 3, 'repeticoes', '12',             'carga', null, 'obs', 'Joelhos alinhados com os pés; amplitude progride com evolução'),
      jsonb_build_object('exercicio_id', ex_panturrilha,        'nome_exercicio', 'Elevação de Panturrilha',     'series', 3, 'repeticoes', '20',             'carga', null, 'obs', 'Bilateral → unilateral conforme progressão funcional'),
      jsonb_build_object('exercicio_id', ex_plantar_excentrica, 'nome_exercicio', 'Flexão Plantar Excêntrica',   'series', 3, 'repeticoes', '15',             'carga', null, 'obs', 'Descida em 3 segundos (excêntrico); sobe com 2 pernas se necessário'),
      jsonb_build_object('exercicio_id', ex_apoio_uni,          'nome_exercicio', 'Apoio Unipodal',              'series', 3, 'repeticoes', '20s cada lado',  'carga', null, 'obs', 'Propriocepção — olhos abertos → fechados → superfície instável')
    )
  );

  -- ════════════════════════════════════════════════════════════════
  -- SEQUÊNCIA 5 — Reabilitação de Ombro (manguito rotador)
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO sequencias_aula (empresa_id, is_sistema, nome, descricao, exercicios)
  VALUES (
    NULL, true,
    'Reabilitação de Ombro — Manguito Rotador',
    'Protocolo de fortalecimento do manguito rotador e estabilização escapular. Indicado para síndrome do impacto, tendinopatia e pós-cirúrgico de ombro. Use resistência leve e progrida sem dor.',
    jsonb_build_array(
      jsonb_build_object('exercicio_id', ex_resp_diafragmatica, 'nome_exercicio', 'Respiração Diafragmática',  'series', 2, 'repeticoes', '8 respirações',  'carga', null,        'obs', 'Aquecimento — relaxamento cervical e ativação do core'),
      jsonb_build_object('exercicio_id', ex_rot_ext_ombro,      'nome_exercicio', 'Rotação Externa de Ombro', 'series', 3, 'repeticoes', '15',             'carga', 'elástico leve','obs', 'Cotovelo a 90° junto ao tronco; amplitude indolor; teres menor e infraespinhal'),
      jsonb_build_object('exercicio_id', ex_rot_int_ombro,      'nome_exercicio', 'Rotação Interna de Ombro', 'series', 3, 'repeticoes', '15',             'carga', 'elástico leve','obs', 'Amplitude indolor; subscapular; equilibrar com rotação externa'),
      jsonb_build_object('exercicio_id', ex_remada_baixa,       'nome_exercicio', 'Remada Baixa',             'series', 3, 'repeticoes', '12',             'carga', 'elástico leve','obs', 'Retração e depressão escapular; romboides e trapézio médio/inferior'),
      jsonb_build_object('exercicio_id', ex_elev_lateral,       'nome_exercicio', 'Elevação Lateral',         'series', 3, 'repeticoes', '12',             'carga', 'leve',         'obs', 'Não ultrapasse 90° na fase aguda; polegar levemente acima'),
      jsonb_build_object('exercicio_id', ex_elev_frontal,       'nome_exercicio', 'Elevação Frontal',         'series', 3, 'repeticoes', '12',             'carga', 'leve',         'obs', 'Polegar para cima (full can); escápula estável'),
      jsonb_build_object('exercicio_id', ex_diagonais,          'nome_exercicio', 'Diagonais de Ombro',       'series', 3, 'repeticoes', '10 cada lado',   'carga', 'elástico leve','obs', 'D1 e D2 com elástico; padrão funcional próximo ao cotidiano'),
      jsonb_build_object('exercicio_id', ex_pushup_mod,         'nome_exercicio', 'Push-up Modificado',       'series', 3, 'repeticoes', '10',             'carga', null,           'obs', 'Joelhos no chão — ativa serrátil anterior (protração escapular)'),
      jsonb_build_object('exercicio_id', ex_extensao_triceps,   'nome_exercicio', 'Extensão de Tríceps',      'series', 3, 'repeticoes', '12',             'carga', 'leve',         'obs', 'Cotovelo estável; amplitude total indolor'),
      jsonb_build_object('exercicio_id', ex_rosca_biceps,       'nome_exercicio', 'Rosca Bíceps',             'series', 3, 'repeticoes', '12',             'carga', 'leve',         'obs', 'Complemento para equilíbrio muscular do cotovelo')
    )
  );

  -- ════════════════════════════════════════════════════════════════
  -- SEQUÊNCIA 6 — Coluna Saudável (lombalgia crônica)
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO sequencias_aula (empresa_id, is_sistema, nome, descricao, exercicios)
  VALUES (
    NULL, true,
    'Coluna Saudável — Lombalgia Crônica',
    'Protocolo baseado em evidências para controle da lombalgia crônica inespecífica. Combina mobilização, estabilização segmentar e fortalecimento progressivo (McKenzie, Pilates e controle motor).',
    jsonb_build_array(
      jsonb_build_object('exercicio_id', ex_resp_diafragmatica, 'nome_exercicio', 'Respiração Diafragmática',    'series', 3, 'repeticoes', '10 respirações', 'carga', null, 'obs', 'Ativa o transverso do abdômen (core profundo); base de toda a sessão'),
      jsonb_build_object('exercicio_id', ex_cat_cow,            'nome_exercicio', 'Cat-Cow',                     'series', 2, 'repeticoes', '10',             'carga', null, 'obs', 'Mobilização segmentar suave; sincronize com a respiração'),
      jsonb_build_object('exercicio_id', ex_along_lombar,       'nome_exercicio', 'Alongamento Lombar',          'series', 2, 'repeticoes', '30s',            'carga', null, 'obs', 'Joelhos ao peito; oscilação suave; alívio da tensão inicial'),
      jsonb_build_object('exercicio_id', ex_mckenzie,           'nome_exercicio', 'McKenzie Extension',          'series', 3, 'repeticoes', '10',             'carga', null, 'obs', 'Centralização da dor; pare se sintomas periféricos aumentarem'),
      jsonb_build_object('exercicio_id', ex_williams,           'nome_exercicio', 'Williams Flexion',            'series', 3, 'repeticoes', '10',             'carga', null, 'obs', 'Alternativo ao McKenzie; indicado para lordose aumentada e estenose'),
      jsonb_build_object('exercicio_id', ex_ponte,              'nome_exercicio', 'Ponte Glútea',                'series', 3, 'repeticoes', '15',             'carga', null, 'obs', 'Estabilização lombopélvica fundamental; glúteo + multífidos'),
      jsonb_build_object('exercicio_id', ex_dead_bug,           'nome_exercicio', 'Dead Bug',                    'series', 3, 'repeticoes', '10 cada lado',   'carga', null, 'obs', 'Lombar colada ao chão durante todo o movimento; movimento lento'),
      jsonb_build_object('exercicio_id', ex_bird_dog,           'nome_exercicio', 'Bird Dog',                    'series', 3, 'repeticoes', '10 cada lado',   'carga', null, 'obs', 'Coluna neutra; não eleve além do alinhamento horizontal'),
      jsonb_build_object('exercicio_id', ex_prancha,            'nome_exercicio', 'Prancha Abdominal',           'series', 3, 'repeticoes', '30s',            'carga', null, 'obs', 'Inicia em joelhos; progride para posição completa conforme evolução'),
      jsonb_build_object('exercicio_id', ex_rotacao_tronco,     'nome_exercicio', 'Rotação de Tronco',           'series', 2, 'repeticoes', '10 cada lado',   'carga', null, 'obs', 'Sentado; quadril fixo; melhora mobilidade rotacional — prevenção'),
      jsonb_build_object('exercicio_id', ex_along_isquio,       'nome_exercicio', 'Alongamento de Isquiotibiais','series', 2, 'repeticoes', '30s cada lado',  'carga', null, 'obs', 'Isquiotibiais curtos aumentam retroversão e sobrecarregam a lombar'),
      jsonb_build_object('exercicio_id', ex_foam_coluna,        'nome_exercicio', 'Foam Roller – Coluna',        'series', 1, 'repeticoes', '60s',            'carga', null, 'obs', 'Encerramento — liberação miofascial toracolombar; braços abertos')
    )
  );

END $$;
