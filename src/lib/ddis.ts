// DDIs internacionais com bandeira (emoji) e máscara sugerida.
// Lista priorizando América Latina + países lusófonos + grandes mercados.

export interface DDI {
  codigo: string   // sem o '+', ex: "55"
  pais: string
  flag: string     // emoji
  formato?: string // dica de máscara (apenas visual)
}

export const DDIS: DDI[] = [
  { codigo: '55',  pais: 'Brasil',        flag: '🇧🇷', formato: '(00) 00000-0000' },
  { codigo: '351', pais: 'Portugal',      flag: '🇵🇹', formato: '000 000 000' },
  { codigo: '1',   pais: 'EUA / Canadá',  flag: '🇺🇸', formato: '(000) 000-0000' },
  { codigo: '54',  pais: 'Argentina',     flag: '🇦🇷', formato: '00 0000-0000' },
  { codigo: '56',  pais: 'Chile',         flag: '🇨🇱', formato: '0 0000 0000' },
  { codigo: '57',  pais: 'Colômbia',      flag: '🇨🇴', formato: '000 000 0000' },
  { codigo: '52',  pais: 'México',        flag: '🇲🇽', formato: '00 0000 0000' },
  { codigo: '598', pais: 'Uruguai',       flag: '🇺🇾', formato: '0 000 0000' },
  { codigo: '595', pais: 'Paraguai',      flag: '🇵🇾', formato: '000 000 000' },
  { codigo: '34',  pais: 'Espanha',       flag: '🇪🇸', formato: '000 000 000' },
  { codigo: '44',  pais: 'Reino Unido',   flag: '🇬🇧', formato: '0000 000000' },
  { codigo: '33',  pais: 'França',        flag: '🇫🇷', formato: '0 00 00 00 00' },
  { codigo: '49',  pais: 'Alemanha',      flag: '🇩🇪', formato: '000 00000000' },
  { codigo: '39',  pais: 'Itália',        flag: '🇮🇹', formato: '000 0000000' },
  { codigo: '244', pais: 'Angola',        flag: '🇦🇴', formato: '000 000 000' },
  { codigo: '258', pais: 'Moçambique',    flag: '🇲🇿', formato: '00 000 0000' },
]

export const DDI_PADRAO = '55'

export function getDDI(codigo: string): DDI {
  return DDIS.find(d => d.codigo === codigo) ?? DDIS[0]
}

// E.164 sem o '+' — usado para wa.me e API do WhatsApp
export function telefoneE164(ddi: string, telefone: string): string {
  const so_digitos = (telefone ?? '').replace(/\D/g, '')
  return `${ddi}${so_digitos}`
}
