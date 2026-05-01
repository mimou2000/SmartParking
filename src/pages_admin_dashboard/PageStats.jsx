import React, { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../components/StatCard'
import { useData } from '../context/useData'

const STATUS_LABELS = { pending: 'معلق', confirmed: 'مؤكد', active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي' }
const STATUS_BADGE  = { pending: 'badge-pending', confirmed: 'badge-confirmed', active: 'badge-active', completed: 'badge-completed', cancelled: 'badge-cancelled' }

const toDate = (ts) => {
    if (!ts) return null
    return ts?.toDate ? ts.toDate() : new Date(ts)
}
const toDateStr = (ts) => {
    const d = toDate(ts)
    return d ? d.toISOString().slice(0, 10) : ''
}

export default function PageStats() {
    const { users, zones, reservations, spots, loading } = useData()

    // عرض سبينر فقط عندما تكون البيانات قيد التحميل من Firebase
    // في وضع الضيف loading سيكون false مباشرة
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
                <div className="spinner" style={{ width: 44, height: 44, borderWidth: 4 }} />
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'Tajawal, sans-serif' }}>جارٍ تحميل الإحصائيات...</div>
            </div>
        )
    }

    // الحسابات مباشرة من spots (أماكن الوقوف الفعلية أو الوهمية)
    const s = useMemo(() => {
        const totalSpots     = spots.length
        const occupiedSpots  = spots.filter(s => s.status === 'OCCUPIED').length
        const availableSpots = spots.filter(s => s.status === 'AVAILABLE').length
        const occupancyRate  = totalSpots > 0 ? ((occupiedSpots / totalSpots) * 100).toFixed(1) : 0

        const activeRes    = reservations.filter(r => r.status === 'active').length
        const pendingRes   = reservations.filter(r => r.status === 'pending').length
        const completedRes = reservations.filter(r => r.status === 'completed').length
        const cancelledRes = reservations.filter(r => r.status === 'cancelled').length

        const completed    = reservations.filter(r => r.status === 'completed')
        const totalRevenue = completed.reduce((sum, r) => sum + parseFloat(r.total_price || r.total_cost || 0), 0)

        const today      = new Date().toISOString().slice(0, 10)
        const weekAgo    = new Date(Date.now() - 7  * 86400000).toISOString().slice(0, 10)
        const monthStart = new Date().toISOString().slice(0, 8) + '01'

        const todayRevenue = completed.filter(r => toDateStr(r.created_at) === today)
            .reduce((sum, r) => sum + parseFloat(r.total_price || r.total_cost || 0), 0)
        const weekRevenue  = completed.filter(r => toDateStr(r.created_at) >= weekAgo)
            .reduce((sum, r) => sum + parseFloat(r.total_price || r.total_cost || 0), 0)
        const monthRevenue = completed.filter(r => toDateStr(r.created_at) >= monthStart)
            .reduce((sum, r) => sum + parseFloat(r.total_price || r.total_cost || 0), 0)

        const avgRevPerRes  = completedRes > 0 ? totalRevenue / completedRes : 0
        const totalManagers = users.filter(u => u.role === 'MANAGER').length
        const totalDrivers  = users.filter(u => u.role === 'DRIVER' || u.role === 'USER').length

        return {
            totalSpots, availableSpots, occupiedSpots, occupancyRate,
            totalZones: zones.length,
            totalRes: reservations.length, activeRes, pendingRes, completedRes, cancelledRes,
            totalRevenue, todayRevenue, weekRevenue, monthRevenue, avgRevPerRes,
            totalUsers: users.length, totalManagers, totalDrivers,
        }
    }, [users, zones, spots, reservations])

    const trafficByHour = useMemo(() => {
        const counts = {}
        reservations.forEach(r => {
            const d = toDate(r.start_time || r.created_at)
            if (!d) return
            const hr = d.getHours()
            counts[hr] = (counts[hr] || 0) + 1
        })
        return Array.from({ length: 24 }, (_, i) => ({ hr: i, cnt: counts[i] || 0 }))
    }, [reservations])

    const resByDay = useMemo(() => {
        const counts = {}
        const days   = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(Date.now() - i * 86400000)
            return d.toISOString().slice(0, 10)
        }).reverse()
        reservations.forEach(r => {
            const day = toDateStr(r.created_at)
            if (days.includes(day)) counts[day] = (counts[day] || 0) + 1
        })
        return days.map(day => ({ day, cnt: counts[day] || 0 }))
    }, [reservations])

    const statusData = [
        { name: 'نشط',   value: s.activeRes,    fill: '#10b981' },
        { name: 'معلق',  value: s.pendingRes,   fill: '#f59e0b' },
        { name: 'مكتمل', value: s.completedRes, fill: '#6366f1' },
        { name: 'ملغي',  value: s.cancelledRes, fill: '#ef4444' },
    ]

    const occData = [
        { name: 'مشغول', value: s.occupiedSpots,  fill: '#ef4444' },
        { name: 'متاح',  value: s.availableSpots, fill: '#10b981' },
    ]

    return (
        <div className="fade-in">
            {/* KPI Cards */}
            <div style={styles.statsGrid}>
                <StatCard icon="fa-car"            value={s.totalSpots.toLocaleString()}     label="إجمالي أماكن الوقوف"  badge={`${s.occupancyRate}% إشغال`} color="blue"   />
                <StatCard icon="fa-parking"        value={s.availableSpots.toLocaleString()} label="أماكن متاحة الآن"    badge="متاحة"  color="green"  />
                <StatCard icon="fa-car"            value={s.occupiedSpots.toLocaleString()}  label="أماكن مشغولة"         badge="مشغولة" color="red"    />
                <StatCard icon="fa-map-marked-alt" value={s.totalZones.toLocaleString()}     label="مناطق المواقف"        color="purple" />
                <StatCard icon="fa-calendar-check" value={s.totalRes.toLocaleString()}       label="إجمالي الحجوزات"      badge={`${s.activeRes} نشطة`} color="cyan" />
                <StatCard icon="fa-users"          value={s.totalUsers.toLocaleString()}     label="إجمالي المستخدمين"    color="orange" />
                <StatCard icon="fa-user-tie"       value={s.totalManagers.toLocaleString()}  label="مديرو المواقف"         color="pink"   />
                <StatCard icon="fa-id-card"        value={s.totalDrivers.toLocaleString()}   label="السائقون المسجلون"    color="indigo" />
            </div>

            {/* Revenue Cards */}
            <div style={styles.revGrid}>
                {[
                    { label: 'إجمالي الإيرادات', amount: s.totalRevenue,  sub: 'منذ البداية',                          color: '#6366f1' },
                    { label: 'إيرادات اليوم',   amount: s.todayRevenue,  sub: new Date().toLocaleDateString('ar-DZ'), color: '#10b981' },
                    { label: 'إيرادات الأسبوع', amount: s.weekRevenue,   sub: 'آخر 7 أيام',                          color: '#f59e0b' },
                    { label: 'إيرادات الشهر',   amount: s.monthRevenue,  sub: 'الشهر الحالي',                        color: '#06b6d4' },
                ].map(r => (
                    <div key={r.label} style={{ ...styles.revCard, borderTopColor: r.color }}>
                        <div style={{ ...styles.revPeriod, color: r.color }}>{r.label}</div>
                        <div style={styles.revAmount}>{r.amount.toLocaleString('ar-DZ', { minimumFractionDigits: 2 })}</div>
                        <div style={styles.revUnit}>دج <span style={{ color: '#94a3b8' }}>| {r.sub}</span></div>
                    </div>
                ))}
            </div>

            {/* Traffic summary */}
            <div style={styles.trafficRow}>
                {[
                    { icon: 'fa-car',          num: s.activeRes,    label: 'سيارات داخل الموقف',  color: '#6366f1' },
                    { icon: 'fa-check-circle', num: s.completedRes, label: 'زيارة مكتملة',         color: '#10b981' },
                    { icon: 'fa-clock',        num: s.pendingRes,   label: 'حجز بانتظار التأكيد', color: '#f59e0b' },
                    { icon: 'fa-times-circle', num: s.cancelledRes, label: 'حجز ملغى',            color: '#ef4444' },
                ].map(t => (
                    <div key={t.label} style={styles.trafficItem}>
                        <div style={{ ...styles.trafficIcon, color: t.color }}><i className={`fas ${t.icon}`} /></div>
                        <div style={styles.trafficNum}>{t.num.toLocaleString()}</div>
                        <div style={styles.trafficLabel}>{t.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div style={styles.chartsGrid}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={styles.chartTitle}><i className="fas fa-chart-line" style={{ color: 'var(--primary)' }} /> الحركة المرورية (آخر 24 ساعة)</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trafficByHour}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="hr" tick={{ fontSize: 11, fontFamily: 'Tajawal' }} tickFormatter={v => `${v}:00`} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [v, 'حجوزات']} labelFormatter={v => `الساعة ${v}:00`} />
                            <Line type="monotone" dataKey="cnt" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={styles.chartTitle}><i className="fas fa-calendar-alt" style={{ color: 'var(--primary)' }} /> الحجوزات اليومية (آخر 7 أيام)</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={resByDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Tajawal' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [v, 'حجوزات']} />
                            <Bar dataKey="cnt" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ ...styles.chartsGrid, gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 24 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={styles.chartTitle}><i className="fas fa-trophy" style={{ color: '#f59e0b' }} /> حالة الحجوزات</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                                 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={styles.chartTitle}><i className="fas fa-parking" style={{ color: '#ef4444' }} /> نسبة الإشغال</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={occData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                                {occData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{s.occupancyRate}%</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>نسبة الإشغال الكلية</div>
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={styles.chartTitle}><i className="fas fa-coins" style={{ color: '#10b981' }} /> متوسط الإيراد</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                        {[
                            { label: 'متوسط الإيراد/حجز', value: `${s.avgRevPerRes.toFixed(2)} دج`,           color: '#6366f1' },
                            { label: 'إيرادات اليوم',     value: `${s.todayRevenue.toLocaleString()} دج`,       color: '#10b981' },
                            { label: 'إجمالي الإيرادات',  value: `${(s.totalRevenue / 1000).toFixed(0)} K دج`, color: '#f59e0b' },
                        ].map(r => (
                            <div key={r.label} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRight: `3px solid ${r.color}` }}>
                                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>{r.label}</span>
                                <span style={{ fontSize: '1rem', fontWeight: 800, color: r.color }}>{r.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Reservations */}
            <div className="card">
                <div className="section-title">
                    <i className="fas fa-history" /> آخر الحجوزات
                    <span style={{ marginRight: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>آخر 8 حجوزات</span>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr><th>#</th><th>العميل</th><th>الموقف</th><th>المكان</th><th>وقت البدء</th><th>التكلفة</th><th>الحالة</th></tr>
                        </thead>
                        <tbody>
                        {reservations.slice(0, 8).map((r, i) => {
                            const startDate = toDate(r.start_time || r.created_at)
                            return (
                                <tr key={r.reservation_id || i}>
                                    <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                                    <td><strong>{r.full_name || r.user_name || '—'}</strong></td>
                                    <td>{r.zone_name || '—'}</td>
                                    <td>{r.spot_number || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                                    <td style={{ fontSize: '0.8rem' }}>{startDate ? startDate.toLocaleString('ar-DZ') : '—'}</td>
                                    <td><strong style={{ color: '#10b981' }}>{parseFloat(r.total_price || r.total_cost || 0).toFixed(2)} دج</strong></td>
                                    <td><span className={`badge ${STATUS_BADGE[r.status] || ''}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const styles = {
    statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 },
    revGrid:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 },
    revCard:     { background: 'white', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--border)', borderTop: '4px solid', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
    revPeriod:   { fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 },
    revAmount:   { fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' },
    revUnit:     { fontSize: '0.78rem', color: '#475569', marginTop: 3 },
    trafficRow:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22, background: 'white', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
    trafficItem: { textAlign: 'center', padding: '10px 8px' },
    trafficIcon: { fontSize: '1.6rem', marginBottom: 8 },
    trafficNum:  { fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' },
    trafficLabel:{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 },
    chartsGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 },
    chartTitle:  { fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
}