// CinesioPro · integração com WhatsApp
//
// HOJE: stub que apenas gera link wa.me — não envia nada de fato.
// AMANHÃ: trocar enviarMensagem() por uma chamada à API oficial do WhatsApp
//         (WhatsApp Cloud API / Z-API / etc) sem mudar callsites.

import { telefoneE164 } from './ddis'

export interface EnviarMensagemInput {
  ddi: string
  telefone: string
  mensagem: string
}

export interface EnviarMensagemResult {
  link: string          // wa.me link — sempre retornado, copiável
  enviado: boolean      // true só quando API estiver configurada e a entrega der OK
  provider?: string
  erro?: string
}

export function gerarLinkWaMe({ ddi, telefone, mensagem }: EnviarMensagemInput): string {
  const numero = telefoneE164(ddi, telefone)
  const msg = encodeURIComponent(mensagem)
  return `https://wa.me/${numero}?text=${msg}`
}

export async function enviarMensagem(input: EnviarMensagemInput): Promise<EnviarMensagemResult> {
  const link = gerarLinkWaMe(input)

  // TODO: quando a API estiver configurada, fazer fetch para o provider
  // const apiKey = process.env.WHATSAPP_API_KEY
  // if (apiKey) { ... return { link, enviado: true, provider: 'whatsapp-cloud' } }

  return {
    link,
    enviado: false,
    provider: undefined,
  }
}

// ────────────────────────────────────────────
// Templates de mensagens prontas
// ────────────────────────────────────────────
export function msgConviteCompletarCadastro(opts: {
  nomePaciente: string
  nomeClinica: string
  link: string
}): string {
  return (
`Olá ${opts.nomePaciente}! 👋

Aqui é da clínica *${opts.nomeClinica}*.

Para finalizar seu cadastro, preencha seus dados nesse link único:
${opts.link}

Esse link é pessoal e expira em 7 dias.`
  )
}
