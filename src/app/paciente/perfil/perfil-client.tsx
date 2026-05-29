'use client'

import { useState } from 'react'
import { User, Phone, Mail, MapPin, Calendar, Edit3, Check, X, ChevronLeft, Loader2, Lock } from 'lucide-react'
import { salvarPerfilAction } from './actions'

interface DadosPerfil {
  nome: string
  email: string
  telefone: string
  ddi: string
  data_nascimento: string
  cpf: string
  foto_url: string | null
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
}

interface Props {
  pacienteId: string
  dados: DadosPerfil
  clinicaNome: string
}

export default function PerfilClient({ pacienteId, dados, clinicaNome }: Props) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<DadosPerfil>(dados)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  function handleChange(field: keyof DadosPerfil, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro('')
    const r = await salvarPerfilAction(pacienteId, form)
    setSalvando(false)
    if (r?.error) {
      setErro(r.error)
    } else {
      setSucesso(true)
      setEditando(false)
      setTimeout(() => setSucesso(false), 3000)
    }
  }

  function handleCancelar() {
    setForm(dados)
    setEditando(false)
    setErro('')
  }

  const inputClass = (disabled?: boolean) =>
    `w-full h-11 px-3 rounded-xl border text-sm outline-none transition ${
      disabled
        ? 'bg-[#F8F9FA] border-[#E8E8E8] text-[#7F8C8D] cursor-not-allowed'
        : 'bg-white border-[#E8E8E8] text-[#2C3E50] focus:border-[#4A3AE8] focus:ring-2 focus:ring-[#4A3AE8]/10'
    }`

  return (
    <div className="px-4 pt-5 pb-2 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/paciente/home" className="text-[#7F8C8D] hover:text-[#2C3E50] transition">
            <ChevronLeft size={20} />
          </a>
          <h1 className="text-lg font-bold text-[#2C3E50]">Meu Perfil</h1>
        </div>
        {!editando ? (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A3AE8]/10 text-[#4A3AE8] text-xs font-semibold hover:bg-[#4A3AE8]/20 transition"
          >
            <Edit3 size={13} /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelar}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F0F0F0] text-[#7F8C8D] text-xs font-semibold hover:bg-[#E8E8E8] transition"
            >
              <X size={13} /> Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A3AE8] text-white text-xs font-semibold hover:bg-[#3829c7] disabled:opacity-50 transition"
            >
              {salvando
                ? <Loader2 size={13} className="animate-spin" />
                : <Check size={13} />
              }
              Salvar
            </button>
          </div>
        )}
      </div>

      {/* Avatar + nome */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8E8E8] text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-[#4A3AE8]/10 flex items-center justify-center mb-3">
          {form.foto_url ? (
            <img src={form.foto_url} alt={form.nome} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-[#4A3AE8]">
              {form.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <p className="font-bold text-[#2C3E50]">{form.nome}</p>
        <p className="text-xs text-[#7F8C8D]">{clinicaNome}</p>
      </div>

      {/* Feedback */}
      {sucesso && (
        <div className="flex items-center gap-2 bg-[#27AE60]/10 border border-[#27AE60]/30 text-[#27AE60] rounded-xl px-4 py-3 text-sm font-medium">
          <Check size={15} /> Perfil atualizado com sucesso!
        </div>
      )}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {erro}
        </div>
      )}

      {/* Dados Pessoais */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} className="text-[#4A3AE8]" />
          <span className="text-sm font-semibold text-[#2C3E50]">Dados Pessoais</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Nome completo</label>
            <input
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={(e) => handleChange('data_nascimento', e.target.value)}
                disabled={!editando}
                className={inputClass(!editando)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#7F8C8D] mb-1">
                CPF <Lock size={9} className="text-[#7F8C8D]" />
              </label>
              <input
                value={form.cpf || '—'}
                disabled
                className={inputClass(true)}
                title="CPF não pode ser alterado"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8] space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Phone size={14} className="text-[#4A3AE8]" />
          <span className="text-sm font-semibold text-[#2C3E50]">Contato</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">E-mail</label>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-[#7F8C8D] flex-shrink-0" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!editando}
              className={`flex-1 ${inputClass(!editando)}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Telefone / WhatsApp</label>
          <div className="flex gap-2">
            <select
              value={form.ddi}
              onChange={(e) => handleChange('ddi', e.target.value)}
              disabled={!editando}
              className={`w-20 ${inputClass(!editando)}`}
            >
              <option value="55">🇧🇷 +55</option>
              <option value="1">🇺🇸 +1</option>
              <option value="351">🇵🇹 +351</option>
            </select>
            <input
              value={form.telefone}
              onChange={(e) => handleChange('telefone', e.target.value)}
              placeholder="(00) 00000-0000"
              disabled={!editando}
              className={`flex-1 ${inputClass(!editando)}`}
            />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8E8E8] space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-[#4A3AE8]" />
          <span className="text-sm font-semibold text-[#2C3E50]">Endereço</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">CEP</label>
            <input
              value={form.cep}
              onChange={(e) => handleChange('cep', e.target.value)}
              placeholder="00000-000"
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Rua</label>
            <input
              value={form.rua}
              onChange={(e) => handleChange('rua', e.target.value)}
              placeholder="Rua / Avenida"
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Nº</label>
            <input
              value={form.numero}
              onChange={(e) => handleChange('numero', e.target.value)}
              placeholder="123"
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Bairro</label>
            <input
              value={form.bairro}
              onChange={(e) => handleChange('bairro', e.target.value)}
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">Cidade</label>
            <input
              value={form.cidade}
              onChange={(e) => handleChange('cidade', e.target.value)}
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7F8C8D] mb-1">UF</label>
            <input
              value={form.estado}
              onChange={(e) => handleChange('estado', e.target.value.toUpperCase())}
              placeholder="SP"
              maxLength={2}
              disabled={!editando}
              className={inputClass(!editando)}
            />
          </div>
        </div>
      </div>

      {/* LGPD */}
      <div className="bg-[#F8F9FA] rounded-2xl p-4 text-center">
        <p className="text-[10px] text-[#7F8C8D] leading-relaxed">
          🔒 Seus dados são protegidos conforme a{' '}
          <strong>LGPD (Lei 13.709/2018)</strong> e são utilizados exclusivamente
          para fins de atendimento clínico em {clinicaNome}.
        </p>
      </div>

    </div>
  )
}
