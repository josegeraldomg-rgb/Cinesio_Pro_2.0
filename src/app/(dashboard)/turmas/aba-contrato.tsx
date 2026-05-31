'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Clock, Banknote, BookOpen, FileX, Shield, MapPin,
  Save, Eye, Check, AlertCircle, ChevronDown, ChevronUp, Loader2,
  FileText, Settings2,
} from 'lucide-react'
import type { ContratoConfig } from '@/lib/contrato-pdf'
import { gerarPDFContrato, abrirContratoPDF } from '@/lib/contrato-pdf'
import { buscarConfigContratoAction, salvarConfigContratoAction } from './contrato-actions'

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder, required, small,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  small?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider">
        {label}{required && <span className="text-[#E74C3C] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-[#E8E8E8] rounded-lg outline-none focus:border-[#4A3AE8] bg-white text-sm text-[#2C3E50] placeholder:text-[#C0C0C0] transition-colors
          ${small ? 'h-8 px-2.5 text-xs' : 'h-9 px-3'}`}
      />
    </div>
  )
}

function NumField({
  label, value, onChange, min = 0, max, unit, placeholder,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  unit?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-9 px-3 border border-[#E8E8E8] rounded-lg outline-none focus:border-[#4A3AE8] bg-white text-sm text-[#2C3E50] transition-colors"
        />
        {unit && <span className="text-xs text-[#7F8C8D] whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-medium text-[#2C3E50]">{label}</p>
        {desc && <p className="text-[11px] text-[#7F8C8D] mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#4A3AE8]' : 'bg-[#D0D0D0]'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function CheckItem({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <div
        onClick={() => onChange(!value)}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${value ? 'bg-[#4A3AE8] border-[#4A3AE8]' : 'border-[#D0D0D0] bg-white'}`}
      >
        {value && <Check size={9} className="text-white" />}
      </div>
      <span className="text-sm text-[#2C3E50]">{label}</span>
    </label>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 border border-[#E8E8E8] rounded-lg outline-none focus:border-[#4A3AE8] bg-white text-sm text-[#2C3E50] transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Section({
  icon: Icon, title, desc, children, defaultOpen = true,
}: {
  icon: React.ElementType; title: string; desc: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F8F9FA] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[#4A3AE8]/8 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-[#4A3AE8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#2C3E50]">{title}</p>
          <p className="text-[11px] text-[#7F8C8D] truncate">{desc}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-[#7F8C8D] flex-shrink-0" /> : <ChevronDown size={14} className="text-[#7F8C8D] flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#F0F0F0] space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function GridTwo({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AbaContrato() {
  const [config, setConfig]     = useState<ContratoConfig | null>(null)
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')

  // Carrega config ao montar
  useEffect(() => {
    buscarConfigContratoAction().then(r => {
      if ('error' in r) {
        showToast(r.error, false)
      } else {
        setConfig(r.config)
      }
      setLoading(false)
    })
  }, [])

  // Preview atualizado com debounce (300ms)
  useEffect(() => {
    if (!config) return
    const timer = setTimeout(() => {
      setPreviewHtml(gerarPDFContrato(config))
    }, 300)
    return () => clearTimeout(timer)
  }, [config])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function set<K extends keyof ContratoConfig>(key: K, val: ContratoConfig[K]) {
    setConfig(prev => prev ? { ...prev, [key]: val } : prev)
  }

  async function handleSalvar() {
    if (!config) return
    setSalvando(true)
    const r = await salvarConfigContratoAction(config)
    setSalvando(false)
    showToast('error' in r ? r.error : 'Configurações salvas com sucesso!', !('error' in r))
  }

  function handleVisualizarPDF() {
    if (!config) return
    abrirContratoPDF(gerarPDFContrato(config))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#7F8C8D]">
        <Loader2 size={22} className="animate-spin mr-2" />
        <span className="text-sm">Carregando configurações…</span>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-24 text-[#7F8C8D]">
        <AlertCircle size={18} className="mr-2 text-[#E74C3C]" />
        <span className="text-sm">Erro ao carregar configurações.</span>
      </div>
    )
  }

  return (
    <div className="flex gap-5 items-start">

      {/* ══════════════════ PAINEL ESQUERDO (FORM) ══════════════════ */}
      <div className="w-[420px] flex-shrink-0 space-y-3">

        {/* Header do painel */}
        <div className="bg-white rounded-xl border border-[#E8E8E8] px-4 py-3 flex items-center gap-2">
          <Settings2 size={15} className="text-[#4A3AE8]" />
          <div>
            <p className="font-bold text-sm text-[#2C3E50]">Configurações de Contrato</p>
            <p className="text-[11px] text-[#7F8C8D]">As alterações são refletidas na pré-visualização em tempo real</p>
          </div>
        </div>

        {/* ── Dados da Empresa ── */}
        <Section icon={Building2} title="Dados da Empresa" desc="Informações legais da contratada">
          <Field
            label="Razão Social"
            value={config.razao_social}
            onChange={v => set('razao_social', v)}
            placeholder="Nome da Clínica / Empresa"
          />
          <GridTwo>
            <Field
              label="CNPJ / CPF"
              value={config.cnpj}
              onChange={v => set('cnpj', v)}
              placeholder="00.000.000/0001-00"
            />
            <Field
              label="CREF / Registro"
              value={config.registro_profissional}
              onChange={v => set('registro_profissional', v)}
              placeholder="000000-G/XX"
            />
          </GridTwo>
          <Field
            label="Responsável Técnico"
            value={config.responsavel_tecnico}
            onChange={v => set('responsavel_tecnico', v)}
            placeholder="Nome do profissional"
          />
          <Field
            label="Endereço"
            value={config.endereco}
            onChange={v => set('endereco', v)}
            placeholder="Rua, número, bairro"
          />
          <GridTwo>
            <Field
              label="Cidade"
              value={config.cidade_empresa}
              onChange={v => set('cidade_empresa', v)}
              placeholder="São Paulo"
            />
            <Field
              label="Estado"
              value={config.estado_empresa}
              onChange={v => set('estado_empresa', v)}
              placeholder="SP"
              small
            />
          </GridTwo>
          <GridTwo>
            <Field
              label="Telefone"
              value={config.telefone_empresa}
              onChange={v => set('telefone_empresa', v)}
              placeholder="(00) 00000-0000"
            />
            <Field
              label="E-mail"
              value={config.email_empresa}
              onChange={v => set('email_empresa', v)}
              placeholder="contato@clinica.com.br"
            />
          </GridTwo>
        </Section>

        {/* ── Vigência e Renovação ── */}
        <Section icon={Clock} title="Vigência e Renovação" desc="Prazos e comportamento de renovação">
          <Toggle
            label="Renovação Automática"
            desc="Ativa novo período após o término"
            value={config.renovacao_automatica}
            onChange={v => set('renovacao_automatica', v)}
          />
          <GridTwo>
            <SelectField
              label="Vigência Padrão"
              value={String(config.vigencia_meses)}
              onChange={v => set('vigencia_meses', Number(v))}
              options={[
                { value: '1', label: '1 mês' },
                { value: '3', label: '3 meses' },
                { value: '6', label: '6 meses' },
                { value: '12', label: '12 meses' },
                { value: '24', label: '24 meses' },
              ]}
            />
            <NumField
              label="Aviso Prévio (Dias)"
              value={config.aviso_previo_dias}
              onChange={v => set('aviso_previo_dias', v)}
              min={1}
              unit="dias"
            />
          </GridTwo>
        </Section>

        {/* ── Políticas Financeiras ── */}
        <Section icon={Banknote} title="Políticas Financeiras" desc="Multas, juros e forma de pagamento" defaultOpen={false}>
          <GridTwo>
            <NumField
              label="Dia de Vencimento"
              value={config.dia_vencimento}
              onChange={v => set('dia_vencimento', v)}
              min={1}
              max={31}
              unit="do mês"
            />
            <NumField
              label="Multa por Atraso (%)"
              value={config.multa_atraso_pct}
              onChange={v => set('multa_atraso_pct', v)}
              min={0}
              max={10}
              unit="%"
            />
          </GridTwo>
          <GridTwo>
            <NumField
              label="Juros Mensais (%)"
              value={config.juros_mes_pct}
              onChange={v => set('juros_mes_pct', v)}
              min={0}
              max={5}
              unit="% a.m."
            />
            <NumField
              label="Prazo Inadimplência"
              value={config.prazo_inadimplencia_dias}
              onChange={v => set('prazo_inadimplencia_dias', v)}
              min={1}
              unit="dias"
            />
          </GridTwo>

          <div className="space-y-1 pt-1">
            <p className="text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider">Formas de Pagamento Aceitas</p>
            <CheckItem label="PIX" value={config.forma_pagamento_pix} onChange={v => set('forma_pagamento_pix', v)} />
            {config.forma_pagamento_pix && (
              <Field
                label="Chave PIX"
                value={config.chave_pix}
                onChange={v => set('chave_pix', v)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                small
              />
            )}
            <CheckItem label="Boleto Bancário" value={config.forma_pagamento_boleto} onChange={v => set('forma_pagamento_boleto', v)} />
            <CheckItem label="Transferência Bancária" value={config.forma_pagamento_transferencia} onChange={v => set('forma_pagamento_transferencia', v)} />
            {config.forma_pagamento_transferencia && (
              <div className="grid grid-cols-3 gap-2 pl-6">
                <Field label="Banco" value={config.banco} onChange={v => set('banco', v)} placeholder="001" small />
                <Field label="Agência" value={config.agencia} onChange={v => set('agencia', v)} placeholder="0001" small />
                <Field label="Conta" value={config.conta} onChange={v => set('conta', v)} placeholder="00000-0" small />
              </div>
            )}
            <CheckItem label="Cartão de Crédito/Débito" value={config.forma_pagamento_cartao} onChange={v => set('forma_pagamento_cartao', v)} />
          </div>

          <GridTwo>
            <SelectField
              label="Índice de Reajuste"
              value={config.indice_reajuste}
              onChange={v => set('indice_reajuste', v)}
              options={[
                { value: 'IPCA', label: 'IPCA' },
                { value: 'IGP-M', label: 'IGP-M' },
                { value: 'INPC', label: 'INPC' },
                { value: 'Fixo', label: 'Percentual Fixo' },
              ]}
            />
            <NumField
              label="% Fixo (se aplicável)"
              value={config.percentual_reajuste_fixo}
              onChange={v => set('percentual_reajuste_fixo', v)}
              min={0}
              unit="%"
            />
          </GridTwo>
        </Section>

        {/* ── Políticas de Aulas ── */}
        <Section icon={BookOpen} title="Políticas de Aulas" desc="Faltas, reposições e pontualidade" defaultOpen={false}>
          <GridTwo>
            <NumField
              label="Aviso de Falta"
              value={config.aviso_falta_horas}
              onChange={v => set('aviso_falta_horas', v)}
              min={1}
              unit="horas"
            />
            <NumField
              label="Prazo de Atestado"
              value={config.prazo_atestado_horas}
              onChange={v => set('prazo_atestado_horas', v)}
              min={1}
              unit="horas"
            />
          </GridTwo>
          <GridTwo>
            <NumField
              label="Suspensão Médica Mínima"
              value={config.prazo_suspensao_medica_dias}
              onChange={v => set('prazo_suspensao_medica_dias', v)}
              min={1}
              unit="dias"
            />
            <NumField
              label="Tolerância de Atraso"
              value={config.tolerancia_atraso_minutos}
              onChange={v => set('tolerancia_atraso_minutos', v)}
              min={0}
              unit="minutos"
            />
          </GridTwo>
          <GridTwo>
            <NumField
              label="Aviso Cancelamento Aula"
              value={config.aviso_cancelamento_aula_horas}
              onChange={v => set('aviso_cancelamento_aula_horas', v)}
              min={1}
              unit="horas"
            />
            <SelectField
              label="Canal de Comunicação"
              value={config.canal_comunicacao}
              onChange={v => set('canal_comunicacao', v)}
              options={[
                { value: 'WhatsApp', label: 'WhatsApp' },
                { value: 'Telefone', label: 'Telefone' },
                { value: 'E-mail', label: 'E-mail' },
                { value: 'Aplicativo', label: 'Aplicativo' },
              ]}
            />
          </GridTwo>
          <Field
            label="Método (ex.: Pilates, Funcional)"
            value={config.nome_metodo}
            onChange={v => set('nome_metodo', v)}
            placeholder="Pilates"
          />
        </Section>

        {/* ── Rescisão ── */}
        <Section icon={FileX} title="Rescisão" desc="Prazos e multas de rescisão" defaultOpen={false}>
          <GridTwo>
            <NumField
              label="Aviso pelo Contratante"
              value={config.prazo_rescisao_contratante_dias}
              onChange={v => set('prazo_rescisao_contratante_dias', v)}
              min={1}
              unit="dias"
            />
            <NumField
              label="Aviso pela Empresa"
              value={config.prazo_rescisao_empresa_dias}
              onChange={v => set('prazo_rescisao_empresa_dias', v)}
              min={1}
              unit="dias"
            />
          </GridTwo>
          <GridTwo>
            <NumField
              label="Multa Rescisória"
              value={config.percentual_multa_rescisoria}
              onChange={v => set('percentual_multa_rescisoria', v)}
              min={0}
              max={100}
              unit="%"
            />
            <NumField
              label="Limite da Multa"
              value={config.limite_multa_mensalidades}
              onChange={v => set('limite_multa_mensalidades', v)}
              min={1}
              unit="mensalidades"
            />
          </GridTwo>
          <NumField
            label="Prazo para Restituição"
            value={config.prazo_restituicao_dias}
            onChange={v => set('prazo_restituicao_dias', v)}
            min={1}
            unit="dias corridos"
          />
        </Section>

        {/* ── LGPD ── */}
        <Section icon={Shield} title="Proteção de Dados (LGPD)" desc="E-mail DPO e prazo de retenção" defaultOpen={false}>
          <Field
            label="E-mail DPO / Responsável"
            value={config.email_dpo}
            onChange={v => set('email_dpo', v)}
            placeholder="dpo@clinica.com.br"
          />
          <NumField
            label="Prazo de Retenção dos Dados"
            value={config.prazo_retencao_dados_anos}
            onChange={v => set('prazo_retencao_dados_anos', v)}
            min={1}
            max={20}
            unit="anos após encerramento"
          />
        </Section>

        {/* ── Foro ── */}
        <Section icon={MapPin} title="Foro" desc="Comarca para resolução de litígios" defaultOpen={false}>
          <GridTwo>
            <Field
              label="Cidade do Foro"
              value={config.cidade_foro}
              onChange={v => set('cidade_foro', v)}
              placeholder="São Paulo"
            />
            <Field
              label="Estado"
              value={config.estado_foro}
              onChange={v => set('estado_foro', v)}
              placeholder="SP"
              small
            />
          </GridTwo>
          <p className="text-[11px] text-[#7F8C8D]">
            Se não preenchido, será usada a cidade da empresa.
          </p>
        </Section>

        {/* Botões de ação */}
        <div className="flex gap-2">
          <button
            onClick={handleVisualizarPDF}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-[#4A3AE8] text-[#4A3AE8] text-sm font-semibold hover:bg-[#4A3AE8]/5 transition-colors"
          >
            <Eye size={14} /> Visualizar PDF
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#4A3AE8] text-white text-sm font-semibold hover:bg-[#3D2ED6] disabled:opacity-50 transition-colors shadow-sm"
          >
            {salvando
              ? <><Loader2 size={14} className="animate-spin" /> Salvando…</>
              : <><Save size={14} /> Salvar Alterações</>}
          </button>
        </div>
      </div>

      {/* ══════════════════ PAINEL DIREITO (PRÉ-VISUALIZAÇÃO) ══════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
        {/* Header preview */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#F0F1FF] border border-[#C7D2FE] rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-[#4A3AE8]" />
            <span className="text-[11px] font-bold text-[#4A3AE8] uppercase tracking-wider">Pré-visualização do Contrato</span>
          </div>
          <span className="text-[10px] text-[#7F8C8D]">Atualiza automaticamente</span>
        </div>

        {/* Iframe */}
        <div className="flex-1 min-h-0 border-x border-b border-[#C7D2FE] rounded-b-xl overflow-hidden bg-white">
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-none"
              title="Pré-visualização do contrato"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#7F8C8D]">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-sm">Gerando pré-visualização…</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.ok ? 'bg-[#27AE60]' : 'bg-[#E74C3C]'}`}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
