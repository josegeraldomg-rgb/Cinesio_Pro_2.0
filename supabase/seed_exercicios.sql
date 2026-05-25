-- ════════════════════════════════════════════════════════════════
-- seed_exercicios.sql
-- ~80 exercícios padrão do sistema (Pilates, Fisioterapia, Core, Equilíbrio, Respiratório)
-- empresa_id = NULL, is_sistema = true
-- Rodar APÓS migration 014
-- ════════════════════════════════════════════════════════════════

INSERT INTO biblioteca_exercicios
  (id, empresa_id, is_sistema, nome, grupo_muscular, nivel, regiao_corporal, aparelho, objetivo, series_padrao, repeticoes_padrao, descricao)
VALUES

-- ── PILATES SOLO ────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Hundred',           'Core',           'moderado', 'Abdômen',         'Solo',    'Resistência e estabilização do core',          3, '100 pulsações', 'Supino com pernas em mesa, braços pulsando enquanto inspira 5 e expira 5.'),
(uuid_generate_v4(), NULL, true, 'Roll Up',            'Core/Coluna',   'moderado', 'Coluna',          'Solo',    'Flexibilidade e força da coluna',              3, '8',             'De supino, sobe articulando a coluna até sentar e desce controlado.'),
(uuid_generate_v4(), NULL, true, 'Single Leg Circle',  'Quadril/Core',  'leve',     'Quadril',         'Solo',    'Mobilidade do quadril e estabilidade pélvica', 3, '5 cada lado',   'Em supino, uma perna estendida no ar fazendo círculos; estabiliza pelve.'),
(uuid_generate_v4(), NULL, true, 'Rolling Like a Ball','Core/Coluna',   'moderado', 'Coluna',          'Solo',    'Massagem e mobilização da coluna',             3, '8',             'Sentado, agarra os joelhos e rola para trás e para frente.'),
(uuid_generate_v4(), NULL, true, 'Single Leg Stretch', 'Core/MMII',     'moderado', 'Abdômen',         'Solo',    'Resistência abdominal e coordenação',          3, '10 cada lado',  'Supino com cabeça fora, alterna pernas em diagonal.'),
(uuid_generate_v4(), NULL, true, 'Double Leg Stretch', 'Core',          'moderado', 'Abdômen',         'Solo',    'Resistência do core e coordenação',            3, '10',            'Supino, contrai e estende braços e pernas simultaneamente.'),
(uuid_generate_v4(), NULL, true, 'Spine Stretch Forward','Coluna/Core', 'leve',     'Coluna',          'Solo',    'Flexibilidade da cadeia posterior',            3, '8',             'Sentado com pernas abertas, inclina o tronco para frente articulando.'),
(uuid_generate_v4(), NULL, true, 'Open Leg Rocker',    'Core/Coluna',   'intenso',  'Coluna',          'Solo',    'Mobilização vertebral e equilíbrio',           3, '6',             'Sentado, segura os tornozelos e rola para trás mantendo forma de V.'),
(uuid_generate_v4(), NULL, true, 'Corkscrew',          'Core/Quadril',  'intenso',  'Abdômen',         'Solo',    'Força e controle do core',                     3, '6 cada lado',   'Supino, pernas juntas no ar descrevem espiral controlada.'),
(uuid_generate_v4(), NULL, true, 'Swan Prep',          'Coluna/MMSS',   'leve',     'Coluna',          'Solo',    'Extensão da coluna e abertura do tórax',       3, '8',             'Prono, apoia antebraços e eleva o tronco mobilizando a coluna.'),
(uuid_generate_v4(), NULL, true, 'Swan Dive',          'Coluna/MMSS',   'moderado', 'Coluna',          'Solo',    'Extensão da coluna e força posterior',         3, '6',             'Prono, balanço entre tórax e pernas estendidas.'),
(uuid_generate_v4(), NULL, true, 'Child Pose (Rest)',  'Coluna',        'leve',     'Coluna',          'Solo',    'Alongamento e recuperação',                    1, '30s',           'Sentado sobre os calcanhares, braços à frente no chão.'),
(uuid_generate_v4(), NULL, true, 'Teaser I',           'Core',          'intenso',  'Abdômen',         'Solo',    'Força e controle do core avançado',            3, '5',             'De supino, sobe braços e pernas a 45° simultaneamente.'),
(uuid_generate_v4(), NULL, true, 'Side Kicks',         'Quadril/Core',  'moderado', 'Quadril',         'Solo',    'Estabilidade lateral e força do quadril',      3, '10 cada lado',  'Deitado de lado, chuta perna para frente e para trás controlado.'),
(uuid_generate_v4(), NULL, true, 'Swimming',           'Core/Coluna',   'moderado', 'Coluna',          'Solo',    'Força extensora e coordenação',                3, '20 pulsações',  'Prono, alterna braço e perna opostos em batida de natação.'),
(uuid_generate_v4(), NULL, true, 'Leg Pull Front',     'Core/MMSS',     'intenso',  'Core',            'Solo',    'Estabilidade em prancha e força',              3, '6 cada lado',   'Posição de prancha, levanta perna alternada mantendo quadril estável.'),
(uuid_generate_v4(), NULL, true, 'Plank',              'Core/MMSS',     'moderado', 'Core',            'Solo',    'Estabilização global do core',                 3, '30s',           'Posição de prancha alta ou em antebraços mantendo alinhamento.'),
(uuid_generate_v4(), NULL, true, 'Side Plank',         'Core Lateral',  'moderado', 'Core',            'Solo',    'Força lateral e estabilidade',                 3, '20s cada lado', 'Prancha lateral em antebraço ou mão estendida.'),

-- ── PILATES APARELHO (Reformer/Cadillac/Chair) ───────────────────
(uuid_generate_v4(), NULL, true, 'Footwork – Paralelo',  'MMII',         'leve',    'Pernas',          'Reformer','Força e alinhamento de MMII',                 3, '10',            'Deitado no Reformer, empurra plataforma com os pés em paralelo.'),
(uuid_generate_v4(), NULL, true, 'Footwork – V',         'MMII/Quadril', 'leve',    'Pernas',          'Reformer','Força de MMII com rotação externa',            3, '10',            'Posição Pilates (calcanhares juntos, dedos afastados).'),
(uuid_generate_v4(), NULL, true, 'Elephant',             'Core/Coluna',  'moderado','Coluna',          'Reformer','Flexibilidade isquiotibial e força do core',   3, '8',             'Em pé no Reformer, inclina tronco e empurra plataforma com pés.'),
(uuid_generate_v4(), NULL, true, 'Short Box – Round',    'Core/Coluna',  'moderado','Coluna',          'Reformer','Flexão da coluna e force abdominal',           3, '8',             'Sentado na caixa curta, rola tronco para trás controlado.'),
(uuid_generate_v4(), NULL, true, 'Short Box – Flat',     'Coluna/Core',  'moderado','Coluna',          'Reformer','Extensão da coluna e força posterior',         3, '8',             'Sentado na caixa, inclinação do tronco como uma unidade.'),
(uuid_generate_v4(), NULL, true, 'Long Stretch',         'Core/MMSS',    'intenso', 'Core',            'Reformer','Estabilidade em prancha dinâmica',             3, '8',             'Prancha com mãos na barra, empurra e traciona plataforma.'),
(uuid_generate_v4(), NULL, true, 'Rowing – Front',       'MMSS/Core',    'moderado','Ombros/Core',     'Reformer','Força de ombros e extensão de coluna',         3, '8',             'Sentado, remada com resistência de molas.'),
(uuid_generate_v4(), NULL, true, 'Arabesque',            'Quadril/Core', 'intenso', 'Quadril',         'Reformer','Extensão de quadril e equilíbrio',             3, '6 cada lado',   'Em pé no Reformer, estende uma perna para trás em arabesque.'),
(uuid_generate_v4(), NULL, true, 'Mermaid',              'Coluna Lateral','leve',   'Coluna',          'Reformer','Alongamento lateral da coluna',                2, '6 cada lado',   'Sentado de lado na caixa, inclinação lateral da coluna.'),
(uuid_generate_v4(), NULL, true, 'Stomach Massage',      'Core/MMII',    'moderado','Coluna/Pernas',   'Reformer','Estabilidade e força em posição encurvada',    3, '10',            'Sentado em C-curve, empurra plataforma com os pés.'),
(uuid_generate_v4(), NULL, true, 'Tendon Stretch',       'Core/MMII',    'intenso', 'Core',            'Chair',   'Força e controle avançado',                    3, '6',             'Em pé na cadeira, mantém corpo rígido enquanto desça pedal.'),
(uuid_generate_v4(), NULL, true, 'Tower',                'Core/Coluna',  'moderado','Coluna',          'Cadillac','Mobilização vertebral assistida',              3, '8',             'Supino no Cadillac, leva pernas sobre a cabeça com suporte de mola.'),

-- ── FISIOTERAPIA MMII ────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Agachamento Livre',    'MMII/Core',    'moderado','Pernas',          'Solo',    'Força de MMII e padrão funcional',             3, '12',            'Em pé, agacha mantendo joelhos alinhados com os pés.'),
(uuid_generate_v4(), NULL, true, 'Agachamento Unilateral','MMII',        'intenso', 'Pernas',          'Solo',    'Força e equilíbrio de MMII',                   3, '8 cada lado',   'Pistol ou agachamento parcial unipodal.'),
(uuid_generate_v4(), NULL, true, 'Ponte Glútea',         'Glúteo/Core',  'leve',    'Quadril',         'Solo',    'Fortalecimento glúteo e estabilidade lombar',  3, '15',            'Supino, eleva o quadril contraindo glúteos.'),
(uuid_generate_v4(), NULL, true, 'Ponte Glútea Unilateral','Glúteo/Core','moderado','Quadril',         'Solo',    'Força unilateral de glúteo',                   3, '10 cada lado',  'Supino, estende uma perna e faz ponte com a outra.'),
(uuid_generate_v4(), NULL, true, 'Abdução de Quadril',   'Glúteo Médio', 'leve',    'Quadril',         'Solo',    'Fortalecimento do glúteo médio',               3, '15 cada lado',  'Deitado de lado, eleva a perna de cima com controle.'),
(uuid_generate_v4(), NULL, true, 'Adução de Quadril',    'Adutores',     'leve',    'Quadril',         'Solo',    'Fortalecimento dos adutores',                  3, '15 cada lado',  'Deitado de lado, eleva a perna de baixo com controle.'),
(uuid_generate_v4(), NULL, true, 'Step-up',              'MMII',         'moderado','Pernas',          'Solo',    'Força funcional de MMII',                      3, '10 cada lado',  'Sobe e desce um degrau ou caixa com controle.'),
(uuid_generate_v4(), NULL, true, 'Extensão de Joelho',   'Quadríceps',   'leve',    'Joelho',          'Solo',    'Fortalecimento do quadríceps',                 3, '15',            'Sentado, estende o joelho com resistência (haltere ou faixa).'),
(uuid_generate_v4(), NULL, true, 'Flexão de Joelho',     'Isquiotibiais','leve',    'Joelho',          'Solo',    'Fortalecimento dos isquiotibiais',             3, '15',            'Prono ou em pé, flexiona o joelho com resistência.'),
(uuid_generate_v4(), NULL, true, 'Elevação de Panturrilha','Panturrilha', 'leve',   'Tornozelo',       'Solo',    'Força de panturrilha e propriocepção',         3, '20',            'Em pé (ou unipodal), eleva o calcanhar controlado.'),
(uuid_generate_v4(), NULL, true, 'Agachamento Sumô',     'MMII/Adutores','moderado','Pernas',          'Solo',    'Força de MMII com foco em adutores',           3, '12',            'Agachamento com pés afastados e virados para fora.'),
(uuid_generate_v4(), NULL, true, 'Avanço (Lunge)',       'MMII',         'moderado','Pernas',          'Solo',    'Força e equilíbrio de MMII',                   3, '10 cada lado',  'Avança um passo à frente e desce o joelho traseiro.'),
(uuid_generate_v4(), NULL, true, 'Flexão Plantar Excêntrica','Panturrilha','leve',  'Tornozelo',       'Solo',    'Reabilitar tendão de Aquiles',                 3, '15',            'Sobe na ponta dos pés e desce devagar (excêntrico).'),
(uuid_generate_v4(), NULL, true, 'Marcha Estacionária',  'MMII/Core',    'leve',    'Pernas',          'Solo',    'Ativação global e aquecimento',                2, '30s',           'Marcha no lugar elevando os joelhos.'),
(uuid_generate_v4(), NULL, true, 'Agachamento na Parede','MMII',         'leve',    'Pernas',          'Solo',    'Isometria de quadríceps e reabilitação de joelho',3,'30-60s',       'Encostado na parede a 90° de flexão de joelho.'),

-- ── FISIOTERAPIA MMSS ────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Rosca Bíceps',         'Bíceps',       'leve',    'Cotovelo',        'Solo',    'Fortalecimento do bíceps',                     3, '12',            'Flexão do cotovelo com haltere ou faixa elástica.'),
(uuid_generate_v4(), NULL, true, 'Extensão de Tríceps',  'Tríceps',      'leve',    'Cotovelo',        'Solo',    'Fortalecimento do tríceps',                    3, '12',            'Extensão do cotovelo com resistência acima da cabeça.'),
(uuid_generate_v4(), NULL, true, 'Remada Baixa',         'Trapézio/Romboide','leve','Escápula',        'Solo',    'Estabilização escapular e postura',            3, '12',            'Traciona elástico ou haltere em direção ao abdômen.'),
(uuid_generate_v4(), NULL, true, 'Elevação Lateral',     'Deltóide Médio','leve',   'Ombro',           'Solo',    'Fortalecimento do deltóide médio',             3, '12',            'Eleva os braços lateralmente a 90° com resistência.'),
(uuid_generate_v4(), NULL, true, 'Elevação Frontal',     'Deltóide Anterior','leve','Ombro',           'Solo',    'Fortalecimento do deltóide anterior',          3, '12',            'Eleva os braços à frente a 90° com resistência.'),
(uuid_generate_v4(), NULL, true, 'Rotação Externa de Ombro','Manguito Rotador','leve','Ombro',         'Solo',    'Reabilitar manguito rotador',                  3, '15',            'Cotovelo a 90°, rotaciona externamente com elástico.'),
(uuid_generate_v4(), NULL, true, 'Rotação Interna de Ombro','Manguito Rotador','leve','Ombro',         'Solo',    'Reabilitar manguito rotador',                  3, '15',            'Cotovelo a 90°, rotaciona internamente com elástico.'),
(uuid_generate_v4(), NULL, true, 'Push-up Modificado',   'Peitoral/Tríceps','leve', 'Ombro',           'Solo',    'Força de MMSS e estabilidade escapular',       3, '10',            'Flexão de braço com joelhos apoiados no chão.'),
(uuid_generate_v4(), NULL, true, 'Push-up Completo',     'Peitoral/Tríceps','moderado','Ombro',        'Solo',    'Força de MMSS e estabilidade escapular',       3, '12',            'Flexão de braço em posição de prancha completa.'),
(uuid_generate_v4(), NULL, true, 'Diagonais de Ombro',   'Ombro/Core',   'leve',    'Ombro',           'Solo',    'Mobilidade e coordenação de ombro',            3, '10 cada lado',  'Movimentos diagonais com faixa elástica (D1 e D2).'),

-- ── CORE E COLUNA ────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Dead Bug',             'Core',         'moderado','Abdômen',         'Solo',    'Estabilização lombopélvica',                   3, '10 cada lado',  'Supino, braço oposto à perna estendidos alternando.'),
(uuid_generate_v4(), NULL, true, 'Bird Dog',             'Core/Coluna',  'moderado','Coluna',          'Solo',    'Estabilização lombar e coordenação',           3, '10 cada lado',  'Em quatro apoios, estende braço oposto à perna.'),
(uuid_generate_v4(), NULL, true, 'Prancha Abdominal',    'Core',         'moderado','Abdômen',         'Solo',    'Estabilização global do core',                 3, '30-60s',        'Em antebraços ou palmas, mantém alinhamento do corpo.'),
(uuid_generate_v4(), NULL, true, 'Crunch Abdominal',     'Reto Abdominal','leve',   'Abdômen',         'Solo',    'Fortalecimento do reto abdominal',             3, '15',            'Flexão parcial de tronco em supino.'),
(uuid_generate_v4(), NULL, true, 'Abdominal Oblíquo',    'Oblíquos',     'leve',    'Abdômen',         'Solo',    'Fortalecimento dos oblíquos',                  3, '12 cada lado',  'Crunch com torção do tronco.'),
(uuid_generate_v4(), NULL, true, 'McKenzie Extension',   'Coluna',       'leve',    'Coluna',          'Solo',    'Centralização e extensão lombar',              3, '10',            'Prono, extensão passiva de coluna com apoio das mãos.'),
(uuid_generate_v4(), NULL, true, 'Williams Flexion',     'Coluna/Core',  'leve',    'Coluna',          'Solo',    'Flexão lombar e fortalecimento',               3, '10',            'Supino, joelhos ao peito ou flexão de tronco.'),
(uuid_generate_v4(), NULL, true, 'Alongamento Lombar',   'Coluna',       'leve',    'Coluna',          'Solo',    'Alívio da tensão lombar',                      2, '30s',           'Supino, joelhos ao peito com suave oscilação.'),
(uuid_generate_v4(), NULL, true, 'Rotação de Tronco',    'Oblíquos/Coluna','leve',  'Coluna',          'Solo',    'Mobilidade rotacional da coluna',              2, '10 cada lado',  'Sentado ou em pé, rota o tronco mantendo quadril fixo.'),
(uuid_generate_v4(), NULL, true, 'Extensão Lombar em Decúbito','Coluna', 'leve',    'Coluna',          'Solo',    'Fortalecimento dos extensores lombares',       3, '12',            'Prono, eleva o tronco alternando com extensão de pernas.'),
(uuid_generate_v4(), NULL, true, 'Cat-Cow',              'Coluna',       'leve',    'Coluna',          'Solo',    'Mobilização segmentar da coluna',              2, '10',            'Em quatro apoios, alterna flexão e extensão de coluna.'),
(uuid_generate_v4(), NULL, true, 'Quadrupedia – Extensão','Core/Coluna', 'leve',    'Coluna',          'Solo',    'Estabilização em quatro apoios',               3, '10 cada lado',  'Em quatro apoios, estende braço e perna ipsilaterais.'),

-- ── EQUILÍBRIO E PROPRIOCEPÇÃO ───────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Apoio Unipodal',       'Tornozelo/Core','leve',   'Tornozelo',       'Solo',    'Propriocepção e equilíbrio',                   3, '30s cada lado', 'Em pé em um pé, mantém equilíbrio (olhos abertos/fechados).'),
(uuid_generate_v4(), NULL, true, 'Tandem Walk',          'Tornozelo/Core','leve',   'Tornozelo',       'Solo',    'Equilíbrio dinâmico',                          3, '10 passos',     'Caminha em linha reta colocando calcanhar à ponta dos pés.'),
(uuid_generate_v4(), NULL, true, 'Bosu – Equilíbrio',    'Tornozelo/Core','moderado','Tornozelo',      'Bosu',    'Propriocepção em superfície instável',         3, '30s',           'Em pé sobre o Bosu, mantém equilíbrio bilateral.'),
(uuid_generate_v4(), NULL, true, 'Bosu – Unipodal',      'Tornozelo/Core','intenso','Tornozelo',       'Bosu',    'Propriocepção avançada unilateral',            3, '20s cada lado', 'Em pé sobre o Bosu em um só pé.'),
(uuid_generate_v4(), NULL, true, 'Alcance de Tronco',    'Core/Tornozelo','moderado','Core',           'Solo',    'Estabilidade dinâmica e coordenação',          3, '8 cada direção','Em pé em um pé, alcança à frente, lateral e diagonal.'),
(uuid_generate_v4(), NULL, true, 'Marcha com Obstáculos','MMII/Core',   'moderado','Pernas',          'Solo',    'Equilíbrio dinâmico e agilidade',             2, '10 passos',     'Passa por cima de cones ou steps alternando os pés.'),
(uuid_generate_v4(), NULL, true, 'Propriocepção no Rolo','Core/Coluna', 'leve',    'Core',            'Solo',    'Ativação do core em superfície instável',     3, '30s',           'Sentado sobre o rolo de foam, mantém equilíbrio.'),
(uuid_generate_v4(), NULL, true, 'Swing de Kettlebell',  'Glúteo/Core', 'moderado','Quadril',         'Solo',    'Força potente e estabilidade dinâmica',        3, '12',            'Com kettlebell, oscila entre as pernas ativando glúteo.'),

-- ── RESPIRATÓRIO ─────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Respiração Diafragmática','Diafragma', 'leve',   'Tórax',           'Solo',    'Ativação do diafragma e relaxamento',          3, '10 respirações','Supino com mão no abdômen, inspira expandindo a barriga.'),
(uuid_generate_v4(), NULL, true, 'Expansão Costal Lateral','Diafragma',  'leve',   'Tórax',           'Solo',    'Mobilidade costal e capacidade respiratória',  3, '8 respirações', 'Mãos nas costelas laterais, expande as costelas na inspiração.'),
(uuid_generate_v4(), NULL, true, 'Respiração em 3 Tempos','Diafragma',  'leve',   'Tórax',           'Solo',    'Coordenação respiratória e relaxamento',       3, '6 respirações', 'Inspira em 3 tempos (abdômen, costelas, clavícula), expira longo.'),
(uuid_generate_v4(), NULL, true, 'Huffing (Expiração Forçada)','Pulmão', 'leve',   'Tórax',           'Solo',    'Higiene brônquica e expansão pulmonar',        3, '5 repetições',  'Inspiração profunda e expiração forçada curta ("huf").'),
(uuid_generate_v4(), NULL, true, 'Freno Labial',         'Pulmão',       'leve',   'Tórax',           'Solo',    'Controle do fluxo expiratório e DPOC',         3, '8 respirações', 'Expira lentamente com lábios semi-cerrados.'),

-- ── ALONGAMENTOS ─────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'Alongamento de Isquiotibiais','Isquiotibiais','leve','Pernas',       'Solo',    'Flexibilidade posterior',                      2, '30s cada lado', 'Supino, sobe uma perna estendida puxando com as mãos.'),
(uuid_generate_v4(), NULL, true, 'Alongamento de Iliopsoas','Iliopsoas',  'leve',   'Quadril',         'Solo',    'Alongamento do flexor de quadril',             2, '30s cada lado', 'Posição de cavaleiro, avança o quadril.'),
(uuid_generate_v4(), NULL, true, 'Alongamento de Piriformis','Glúteo',   'leve',   'Quadril',         'Solo',    'Alívio do piriforme e dor ciática',            2, '30s cada lado', 'Supino, cruza tornozelo sobre joelho e puxa a perna.'),
(uuid_generate_v4(), NULL, true, 'Alongamento de Peitoral','Peitoral',   'leve',   'Ombro/Tórax',     'Solo',    'Abertura do tórax e postura',                  2, '30s',           'Braços apoiados na porta ou atrás do corpo, abre o peito.'),
(uuid_generate_v4(), NULL, true, 'Alongamento de Trapézio','Trapézio',   'leve',   'Pescoço',         'Solo',    'Alívio de tensão cervical',                    2, '30s cada lado', 'Inclina a cabeça lateralmente com suave pressão da mão.'),
(uuid_generate_v4(), NULL, true, 'Foam Roller – Coluna', 'Coluna',       'leve',   'Coluna',          'Solo',    'Mobilização e relaxamento toracolombar',       1, '60s',           'Deitado longitudinalmente no rolo, expande os braços.'),
(uuid_generate_v4(), NULL, true, 'Foam Roller – MMII',   'MMII',         'leve',   'Pernas',          'Solo',    'Liberação miofascial de MMII',                 1, '60s cada segmento','Rola o rolo sob quadríceps, IT band, panturrilha.')

ON CONFLICT DO NOTHING;
