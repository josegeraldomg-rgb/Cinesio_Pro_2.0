'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { semana: 'Semana 1', real: 45, previsto: 50 },
  { semana: 'Semana 2', real: 58, previsto: 60 },
  { semana: 'Semana 3', real: 72, previsto: 70 },
  { semana: 'Semana 4', real: 80, previsto: 78 },
  { semana: 'Semana 5', real: 88, previsto: 85 },
  { semana: 'Semana 6', real: 92, previsto: 90 },
  { semana: 'Semana 7', real: 95, previsto: 93 },
  { semana: 'Semana 8', real: 98, previsto: 96 },
  { semana: 'Semana 9', real: 105, previsto: 100 },
  { semana: 'Semana 10', real: 110, previsto: 105 },
  { semana: 'Semana 11', real: 115, previsto: 110 },
  { semana: 'Semana 12', real: null, previsto: 115 },
]

export function GraficoRecuperacao() {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis
            dataKey="semana"
            tick={{ fontSize: 10, fill: '#7F8C8D' }}
            tickFormatter={(v) => v.replace('Semana ', 'S')}
          />
          <YAxis tick={{ fontSize: 10, fill: '#7F8C8D' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E8E8' }}
            labelStyle={{ color: '#2C3E50', fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="real"
            stroke="#4A3AE8"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#4A3AE8' }}
            connectNulls={false}
            name="Real (ADM°)"
          />
          <Line
            type="monotone"
            dataKey="previsto"
            stroke="#CBD5E1"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Previsto (ADM°)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
