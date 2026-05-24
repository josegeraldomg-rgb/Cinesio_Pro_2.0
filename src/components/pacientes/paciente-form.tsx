'use client'

import { useState } from 'react'
import { X, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react'
import { DDISelector } from './ddi-selector'
import { ResponsavelSelector, type PacienteResumo } from './responsavel-selector'
import { salvarPacienteAction, excluirPacienteAction } from '@/app/(dashboard)/pacientes/actions'

export interface PacienteCompleto {
  id: string
  nome: string
  cpf: string | null
  email: string | null
  data_nascimento: string | null
  sexo_biologico: string | null
  ddi: string | null
  telefone: string | null
  responsavel_id: string | null
  contato_emergencia: string | null
  observacoes: string | null
  endereco: any
}

interface Props {
  paciente: PacienteCompleto | null
  pacientes: PacienteResumo[]
  onClose: () => void
}

export function PacienteForm({ paciente, pacientes, onClose }: Props) {
  const isEdit = !!paciente

  const [ddi, setDdi]               = useState(paciente?.ddi ?? '55')
  const [telefone, setTelefone]     = useState(paciente?.telefone ?? '')
  const [isDependente, setIsDep]    = useState(!!paciente?.responsavel_id)
  const [responsavelId, setRespId]  = useState(paciente?.responsavel_id ?? '')
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState<string | null>(null)
  const [ok, setOk]                 = useState<string | null>(null)

  const end = paciente?.endereco ?? {}

  function onDependenteChange(checked: boolean) {
    setIsDep(checked)
    if (!checked) {
      setRespId('')
    }
  }

  function onResponsavelChange(id: string, tel: string, novoDdi: string) {
    setRespId(id)
    if (id) {
      // Herda telefone e DDI do responsável
      setTelefone(tel)
      setDdi(novoDdi)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setErr(null); setOk(null)
    const fd = new FormData(e.currentTarget)
    const r = await salvarPacienteAction(fd)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else {
      setOk('Paciente salvo com sucesso!')
      setTimeout(() => { onClose(); window.location.reload() }, 800)
    }
  }

  async function handleDelete() {
    if (!paciente) return
    if (!confirm(`Excluir o paciente "${paciente.nome}"? Isso é definitivo.`)) return
    setLoading(true)
    const r = await excluirPacienteAction(paciente.id)
    setLoading(false)
    if (r?.error) setErr(r.error)
    else { onClose(); window.location.reload() }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 className="font-bold text-[#2C3E50] text-lg">
            {isEdit ? 'Editar Paciente' : 'Novo Paciente'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F8F9FA] text-[#7F8C8D]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isEdit && <input type="hidden" name="id" value={paciente!.id} />}

          {/* Nome + CPF */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Nome *</label>
              <input
                name="nome"
                required
                defaultValue={paciente?.nome ?? ''}
                placeholder="Nome completo"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">CPF</label>
              <input
                name="cpf"
                defaultValue={paciente?.cpf ?? ''}
                placeholder="000.000.000-00"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          {/* Email + Data Nasc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={paciente?.email ?? ''}
                placeholder="email@exemplo.com"
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
              {!isEdit && (
                <p className="text-[11px] text-[#7F8C8D] mt-1">
                  Se informado, cria conta com perfil paciente e envia convite.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Data de nascimento</label>
              <input
                name="data_nascimento"
                type="date"
                defaultValue={paciente?.data_nascimento ?? ''}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              />
            </div>
          </div>

          {/* Sexo + Toggle dependente */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Sexo biológico</label>
              <select
                name="sexo_biologico"
                defaultValue={paciente?.sexo_biologico ?? ''}
                className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm bg-white outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
              >
                <option value="">Selecione…</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="intersexo">Intersexo</option>
              </select>
            </div>

            <label className="flex items-center gap-2 h-10 cursor-pointer">
              <input
                type="checkbox"
                name="dependente"
                checked={isDependente}
                onChange={(e) => onDependenteChange(e.target.checked)}
                className="peer sr-only"
              />
              <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#3498DB] peer-checked:bg-[#3498DB] transition-colors">
                <span className="block w-2.5 h-2.5 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
              </span>
              <span className="text-sm font-medium text-[#2C3E50]">Paciente é Dependente?</span>
            </label>
          </div>

          {/* Bloco Dependente x Telefone Próprio */}
          {isDependente ? (
            <div className="space-y-3 bg-[#3498DB]/5 border border-[#3498DB]/20 rounded-xl p-3">
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">
                  Responsável (titular do telefone) *
                </label>
                <ResponsavelSelector
                  pacientes={pacientes}
                  responsavelId={responsavelId}
                  onChange={onResponsavelChange}
                  excluirId={paciente?.id}
                />
              </div>
              {responsavelId && (
                <div>
                  <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">
                    Telefone (herdado do responsável)
                  </label>
                  <DDISelector
                    ddi={ddi}
                    telefone={telefone}
                    onDDIChange={setDdi}
                    onTelefoneChange={setTelefone}
                    disabled
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Telefone (WhatsApp) *</label>
              <DDISelector
                ddi={ddi}
                telefone={telefone}
                onDDIChange={setDdi}
                onTelefoneChange={setTelefone}
                required
              />
            </div>
          )}

          {/* Contato de emergência */}
          <div>
            <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Contato de emergência</label>
            <input
              name="contato_emergencia"
              defaultValue={paciente?.contato_emergencia ?? ''}
              placeholder="Nome do contato - (11) 99999-9999"
              className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
            />
          </div>

          {/* ── Endereço ── */}
          <div className="pt-3 border-t border-[#E8E8E8]">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-3">Endereço</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">CEP</label>
                <input
                  name="cep"
                  defaultValue={end.cep ?? ''}
                  placeholder="00000-000"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Rua</label>
                <input
                  name="rua"
                  defaultValue={end.rua ?? ''}
                  placeholder="Rua / Avenida"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Número</label>
                <input
                  name="numero"
                  defaultValue={end.numero ?? ''}
                  placeholder="123"
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Bairro</label>
                <input
                  name="bairro"
                  defaultValue={end.bairro ?? ''}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Cidade</label>
                <input
                  name="cidade"
                  defaultValue={end.cidade ?? ''}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7F8C8D] mb-1 block">Estado</label>
                <input
                  name="estado"
                  defaultValue={end.estado ?? ''}
                  placeholder="SP"
                  maxLength={2}
                  className="w-full h-10 px-3 rounded-lg border border-[#E8E8E8] text-sm uppercase outline-none focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10"
                />
              </div>
            </div>
          </div>

          {err && (
            <div className="flex items-start gap-2 text-xs text-[#E74C3C] bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {ok && (
            <div className="flex items-start gap-2 text-xs text-[#27AE60] bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span>{ok}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8] sticky bottom-0 bg-white rounded-b-3xl">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-[#E74C3C] hover:bg-[#E74C3C]/10 px-3 py-2 rounded-full font-semibold disabled:opacity-50"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#7F8C8D] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#4A3AE8] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#3829c7] disabled:opacity-50 shadow-md"
              >
                {loading ? 'Salvando…' : 'Salvar paciente'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
