// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageReports.jsx
// ══════════════════════════════════════════════════════
import React from 'react'
import { BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toDate, toDateStr, S } from '../utils/constants_manager'

export function PageReports({ myReservations }) {
    const now        = new Date()
    const todayStr   = now.toISOString().slice(0,10)
    const weekAgo    = new Date(now - 7 * 86400000)
    const monthStart = now.toISOString().slice(0,8) + '01'

    const completed  = myReservations.filter(r => r.status === 'completed')
    const todayRev   = completed.filter(r => toDateStr(r.created_at) === todayStr).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
    const weekRev    = completed.filter(r => toDate(r.created_at) >= weekAgo).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
    const monthRev   = completed.filter(r => toDateStr(r.created_at) >= monthStart).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
    const totalRev   = completed.reduce((s,r) => s + parseFloat(r.total_price||0), 0)

    const statusData = [
        { name: 'نشط',   value: myReservations.filter(r => r.status === 'active').length,    fill: '#10b981' },
        { name: 'مكتمل', value: completed.length,                                             fill: '#6366f1' },
        { name: 'ملغي',  value: myReservations.filter(r => r.status === 'cancelled').length, fill: '#ef4444' },
    ]

    const last7 = Array.from({length:7}, (_,i) => {
        const d   = new Date(now - (6-i) * 86400000)
        const str = d.toISOString().slice(0,10)
        const rev = completed.filter(r => toDateStr(r.created_at) === str).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
        return { day: str.slice(5), rev }
    })

    return (
        <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={S.chartTitle}><i className="fas fa-chart-bar" style={{ color: 'var(--primary)' }} /> حالات الحجوزات</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={statusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Tajawal' }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[6,6,0,0]}>{statusData.map((d,i) => <Cell key={i} fill={d.fill} />)}</Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={S.chartTitle}><i className="fas fa-coins" style={{ color: '#f59e0b' }} /> إيرادات آخر 7 أيام</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={last7}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Tajawal' }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={v => [`${v.toLocaleString()} دج`, 'إيراد']} />
                            <Line type="monotone" dataKey="rev" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={S.kpiGrid}>
                {[
                    { icon: 'fa-list',    val: myReservations.length,                                   label: 'إجمالي الحجوزات', color: '#6366f1', bg: '#eff6ff' },
                    { icon: 'fa-check',   val: completed.length,                                        label: 'مكتملة',          color: '#10b981', bg: '#f0fdf4' },
                    { icon: 'fa-spinner', val: myReservations.filter(r=>r.status==='active').length,    label: 'نشطة الآن',       color: '#f59e0b', bg: '#fffbeb' },
                    { icon: 'fa-times',   val: myReservations.filter(r=>r.status==='cancelled').length, label: 'ملغاة',           color: '#ef4444', bg: '#fef2f2' },
                ].map(k => (
                    <div key={k.label} style={{ ...S.kpiCard, borderTopColor: k.color }}>
                        <div style={{ ...S.kpiIcon, background: k.bg, color: k.color }}><i className={`fas ${k.icon}`} /></div>
                        <div><div style={S.kpiVal}>{k.val}</div><div style={S.kpiLbl}>{k.label}</div></div>
                    </div>
                ))}
            </div>
            <div className="card">
                <div className="section-title"><i className="fas fa-coins" style={{ color: '#f59e0b' }} /> ملخص الإيرادات</div>
                <div style={{ display: 'grid', gap: 10 }}>
                    {[['اليوم', todayRev, '#6366f1'], ['الأسبوع', weekRev, '#8b5cf6'], ['الشهر', monthRev, '#ec4899'], ['الإجمالي', totalRev, '#14b8a6']].map(([l,v,c]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, borderRight: `3px solid ${c}` }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{l}</span>
                            <strong style={{ color: c, fontSize: '1rem' }}>{v.toLocaleString('ar-DZ', { minimumFractionDigits: 2 })} دج</strong>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════