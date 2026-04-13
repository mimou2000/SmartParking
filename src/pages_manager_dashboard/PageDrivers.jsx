// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageDrivers.jsx
//  ✅ يعتمد فقط على myReservations – لا يطلب صلاحيات إضافية
// ══════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react'
import { toDate } from '../utils/constants_manager'

export function PageDrivers({ myReservations }) {
    const [search, setSearch] = useState('')

    // استخراج السائقين الفريدين من الحجوزات مباشرة
    const drivers = useMemo(() => {
        const map = new Map()

        myReservations.forEach(res => {
            // التأكد من أن الحجز مرتبط بمستخدم مسجل (ليس دخولاً سريعاً)
            if (!res.user_id || res.user_id === 'WALK_IN') return
            // نأخذ الحجوزات النشطة أو المكتملة فقط
            if (!['active', 'completed', 'COMPLETED'].includes(res.status || '')) return

            const userId = res.user_id
            if (!map.has(userId)) {
                map.set(userId, {
                    user_id:    userId,
                    full_name:  res.full_name || res.user_name || '—',
                    email:      res.user_email || res.email || '—',
                    phone:      res.user_phone || res.phone || '—',
                    res_count:  0,
                    total_paid: 0,
                    last_res:   null,
                })
            }

            const driver = map.get(userId)
            driver.res_count++
            driver.total_paid += parseFloat(res.total_cost ?? res.total_price ?? 0)

            const d = toDate(res.created_at)
            if (d && (!driver.last_res || d > driver.last_res)) {
                driver.last_res = d
            }
        })

        return Array.from(map.values())
            .sort((a, b) => b.res_count - a.res_count)
            .filter(d => !search || d.full_name.toLowerCase().includes(search.toLowerCase()))
    }, [myReservations, search])

    return (
        <div className="fade-in">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-users" style={{ color: 'var(--primary)' }} /> السائقون الذين استخدموا موقفي
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>{drivers.length} سائق</span>
                    </div>
                    <input className="form-input" placeholder="بحث..." value={search}
                           onChange={e => setSearch(e.target.value)}
                           style={{ padding: '7px 12px', fontSize: '0.84rem', width: 180 }} />
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>السائق</th>
                            <th>البريد</th>
                            <th>الهاتف</th>
                            <th>عدد الزيارات</th>
                            <th>إجمالي المدفوع</th>
                            <th>آخر زيارة</th>
                        </tr>
                        </thead>
                        <tbody>
                        {drivers.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                    <i className="fas fa-users-slash" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 8 }} />
                                    لا يوجد سائقون من التطبيق بعد
                                </td>
                            </tr>
                        ) : drivers.map((d, i) => (
                            <tr key={d.user_id}>
                                <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="avatar">{(d.full_name || '?').charAt(0)}</div>
                                        <div style={{ fontWeight: 700 }}>{d.full_name}</div>
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{d.email}</td>
                                <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{d.phone}</td>
                                <td>
                                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                                            {d.res_count} زيارة
                                        </span>
                                </td>
                                <td>
                                    <strong style={{ color: '#10b981' }}>{d.total_paid.toFixed(2)} دج</strong>
                                </td>
                                <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    {d.last_res ? d.last_res.toISOString().slice(0, 10) : '—'}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}