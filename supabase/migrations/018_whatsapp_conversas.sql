-- ─── Conversas WhatsApp (uma linha por contato/JID) ─────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_conversas (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  jid              text        NOT NULL,   -- e.g. 5531999999999@s.whatsapp.net
  telefone         text        NOT NULL,   -- apenas dígitos, sem @
  nome_contato     text,                   -- pushName do WhatsApp
  paciente_id      uuid        REFERENCES pacientes(id) ON DELETE SET NULL,
  ultima_mensagem  text,
  ultima_msg_at    timestamptz,
  ultima_de_mim    boolean     NOT NULL DEFAULT false,
  ultima_tipo      text        NOT NULL DEFAULT 'text',
  nao_lidas        int         NOT NULL DEFAULT 0,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, jid)
);

-- ─── Mensagens individuais ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id   uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conversa_id  uuid        NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  message_id   text,                   -- ID externo da UAZAPI (dedup)
  de_mim       boolean     NOT NULL DEFAULT false,
  tipo         text        NOT NULL DEFAULT 'text', -- text | audio | image | video | document
  conteudo     text,
  media_url    text,
  status       text        NOT NULL DEFAULT 'sent', -- sent | delivered | read | failed
  enviado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_empresa  ON whatsapp_conversas(empresa_id, ultima_msg_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wa_conv_paciente ON whatsapp_conversas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_conversa  ON whatsapp_mensagens(conversa_id, enviado_em ASC);

-- ─── RPC para incrementar nao_lidas atomicamente ─────────────────────────────
CREATE OR REPLACE FUNCTION wa_inc_nao_lidas(p_empresa_id uuid, p_jid text)
RETURNS void LANGUAGE sql AS $$
  UPDATE whatsapp_conversas
  SET nao_lidas = nao_lidas + 1
  WHERE empresa_id = p_empresa_id AND jid = p_jid;
$$;
