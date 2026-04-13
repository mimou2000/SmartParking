// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageStats.jsx
// ══════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { STATUS_LABELS, STATUS_BADGE, toDate, toDateStr, occColor, S } from '../utils/constants_manager'

export function PageStats({ myZone, myReservations, spots }) {
    const now        = new Date()
    const todayStr   = now.toISOString().slice(0,10)
    const weekAgo    = new Date(now - 7  * 86400000)
    const monthStart = now.toISOString().slice(0,8) + '01'

    const totalSpots = spots.length
    const occupied   = spots.filter(s => s.status === 'OCCUPIED').length
    const available  = spots.filter(s => s.status === 'AVAILABLE').length
    const pending    = myReservations.filter(r => r.status === 'pending').length
    const pct        = totalSpots > 0 ? Math.round((occupied / totalSpots) * 100) : 0

    const completed = myReservations.filter(r => r.status === 'completed')
    const todayRev  = completed.filter(r => toDateStr(r.created_at) === todayStr).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
    const weekRev   = completed.filter(r => toDate(r.created_at) >= weekAgo).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
    const monthRev  = completed.filter(r => toDateStr(r.created_at) >= monthStart).reduce((s,r) => s + parseFloat(r.total_price||0), 0)
    const totalRev  = completed.reduce((s,r) => s + parseFloat(r.total_price||0), 0)

    const traffic = useMemo(() => {
        const counts = {}
        myReservations.forEach(r => {
            const d = toDate(r.start_time || r.created_at)
            if (!d) return
            const h = d.getHours()
            counts[h] = (counts[h] || 0) + 1
        })
        return Array.from({length:24}, (_,i) => ({ h: `${i}:00`, cnt: counts[i]||0 }))
    }, [myReservations])

    return (
        <div className="fade-in">
            <div style={S.kpiGrid}>
                {[
                    { icon: 'fa-parking',      val: totalSpots, label: 'إجمالي الأماكن', color: '#6366f1', bg: '#eff6ff' },
                    { icon: 'fa-check-circle', val: available,  label: 'أماكن متاحة',   color: '#10b981', bg: '#f0fdf4' },
                    { icon: 'fa-car',          val: occupied,   label: 'أماكن مشغولة',  color: '#ef4444', bg: '#fef2f2' },
                    { icon: 'fa-clock',        val: pending,    label: 'حجوزات معلقة',  color: '#f59e0b', bg: '#fffbeb' },
                    { icon: 'fa-coins',           val: todayRev.toFixed(2), label: 'إيرادات اليوم (دج)',    color: '#6366f1', bg: '#ede9fe' },
                    { icon: 'fa-calendar-week',   val: weekRev.toFixed(2),  label: 'إيرادات الأسبوع (دج)', color: '#8b5cf6', bg: '#f5f3ff' },
                    { icon: 'fa-calendar-alt',    val: monthRev.toFixed(2), label: 'إيرادات الشهر (دج)',   color: '#ec4899', bg: '#fdf2f8' },
                    { icon: 'fa-money-bill-wave', val: totalRev.toFixed(2), label: 'الإجمالي الكلي (دج)',  color: '#14b8a6', bg: '#ccfbf1' },
                ].map(k => (
                    <div key={k.label} style={{ ...S.kpiCard, borderTopColor: k.color }}>
                        <div style={{ ...S.kpiIcon, background: k.bg, color: k.color }}><i className={`fas ${k.icon}`} /></div>
                        <div><div style={{ ...S.kpiVal, fontSize: '1.3rem' }}>{k.val}</div><div style={S.kpiLbl}>{k.label}</div></div>
                    </div>
                ))}
            </div>
            {myZone && (
                <div className="card" style={{ marginBottom: 22 }}>
                    <div className="section-title"><i className="fas fa-parking" /> موقفي</div>
                    <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{myZone.zone_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                    <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }} /> {myZone.location}
                                </div>
                            </div>
                            <span style={{ background: myZone.is_active ? '#f0fdf4' : '#fef2f2', color: myZone.is_active ? '#15803d' : '#dc2626', padding: '3px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                    {myZone.is_active ? 'نشط' : 'معطّل'}
                  </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                            {[['إجمالي', totalSpots, '#0284c7', '#f0f9ff'], ['متاح', available, '#15803d', '#f0fdf4'], ['مشغول', occupied, '#dc2626', '#fef2f2'], ['بالساعة', `${myZone.hourly_rate?.toFixed(0)} دج`, '#7c3aed', '#f5f3ff']].map(([l,v,c,bg]) => (
                                <div key={l} style={{ textAlign: 'center', padding: '12px 8px', background: bg, borderRadius: 10 }}>
                                    <div style={{ fontWeight: 800, color: c, fontSize: '1.2rem' }}>{v}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{l}</div>
                                </div>
                            ))}
                        </div>
                        <div className="occ-bar"><div className="occ-bar-fill" style={{ width: `${pct}%`, background: occColor(pct) }} /></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: 4 }}>
                            <span style={{ color: '#64748b' }}>نسبة الإشغال</span>
                            <span style={{ fontWeight: 700, color: occColor(pct) }}>{pct}%</span>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={S.chartTitle}><i className="fas fa-chart-bar" style={{ color: 'var(--primary)' }} /> حركة الحجوزات (24 ساعة)</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={traffic}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="h" tick={{ fontSize: 9, fontFamily: 'Tajawal' }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={v => [v, 'حجوزات']} />
                            <Bar dataKey="cnt" fill="#6366f1" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={S.chartTitle}><i className="fas fa-chart-pie" style={{ color: '#10b981' }} /> حالة الأماكن</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={[{name:'متاح',value:available,fill:'#10b981'},{name:'مشغول',value:occupied,fill:'#ef4444'}]}
                                 cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                                <Cell fill="#10b981" /><Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6 }}>
                        {[['متاح', available, '#10b981'], ['مشغول', occupied, '#ef4444']].map(([l,v,c]) => (
                            <span key={l} style={{ fontSize: '0.75rem', fontWeight: 700, color: c, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} /> {l}: {v}
                  </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px 14px', fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-list" style={{ color: 'var(--primary)' }} /> آخر الحجوزات
                </div>
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>#</th><th>العميل</th><th>المكان</th><th>وقت البدء</th><th>التكلفة</th><th>الحالة</th></tr></thead>
                        <tbody>
                        {myReservations.slice(0,8).length === 0
                            ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>لا توجد حجوزات</td></tr>
                            : myReservations.slice(0,8).map((r,i) => {
                                const d = toDate(r.start_time || r.created_at)
                                return (
                                    <tr key={r.reservation_id||i}>
                                        <td style={{ color: '#94a3b8' }}>{i+1}</td>
                                        <td><strong>{r.full_name || r.user_name || '—'}</strong></td>
                                        <td>{r.spot_number || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{d ? d.toLocaleString('ar-DZ') : '—'}</td>
                                        <td><strong style={{ color: '#10b981' }}>{parseFloat(r.total_price||0).toFixed(2)} دج</strong></td>
                                        <td><span className={`badge ${STATUS_BADGE[r.status]||''}`}>{STATUS_LABELS[r.status]||r.status}</span></td>
                                    </tr>
                                )
                            })
                        }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════
