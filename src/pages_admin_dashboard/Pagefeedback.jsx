import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/useAuth'              // ✅ أضفنا
import { mockFeedbacks } from '../mock/mockData'        // ✅ أضفنا

const TYPES = [
    { id: 'all', label: 'الكل', icon: 'fa-layer-group', color: '#6366f1' },
    { id: 'bug', label: 'مشكلة', icon: 'fa-bug', color: '#ef4444' },
    { id: 'suggest', label: 'اقتراح', icon: 'fa-lightbulb', color: '#f59e0b' },
    { id: 'compliment', label: 'إطراء', icon: 'fa-heart', color: '#10b981' },
]

const TYPE_META = {
    bug: { label: 'مشكلة', icon: 'fa-bug', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    suggest: { label: 'اقتراح', icon: 'fa-lightbulb', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    compliment: { label: 'إطراء', icon: 'fa-heart', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const STARS = [1, 2, 3, 4, 5]

export default function PageFeedback() {
    const { user } = useAuth()              // ✅ لمعرفة إن كان ضيفاً
    const [feedbacks, setFeedbacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    /* ── جلب البيانات: حقيقية من Firebase أو وهمية للضيف ── */
    useEffect(() => {
        // ✅ وضع الضيف
        if (user?.isGuest) {
            setFeedbacks(mockFeedbacks)
            setLoading(false)
            return
        }

        // وضع المستخدم الحقيقي
        const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'))
        const unsub = onSnapshot(q, snap => {
            setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            setLoading(false)
        })
        return () => unsub()
    }, [user])

    /* ── mark reviewed (للمستخدم الحقيقي فقط) ── */
    const markReviewed = async (id) => {
        if (user?.isGuest) {
            // في وضع الضيف نحدث الحالة محلياً
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, reviewed: true } : f))
            return
        }
        await updateDoc(doc(db, 'feedbacks', id), { reviewed: true })
    }

    /* ── derived ── */
    const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.type === filter)
    const countByType = type => feedbacks.filter(f => f.type === type).length
    const avgRating = feedbacks.length
        ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '—'
    const unreviewed = feedbacks.filter(f => !f.reviewed).length

    /* ── helpers ── */
    const timeAgo = (ts) => {
        if (!ts) return ''
        const date = ts?.toDate ? ts.toDate() : new Date(ts)
        const diff = Math.floor((Date.now() - date.getTime()) / 1000)
        if (diff < 60) return 'الآن'
        if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
        if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
        return `منذ ${Math.floor(diff / 86400)} ي`
    }

    const renderStars = (count) =>
        STARS.map(s => (
            <i key={s} className="fas fa-star" style={{
                color: s <= count ? '#f59e0b' : 'rgba(100,116,139,0.3)',
                fontSize: '0.75rem',
            }} />
        ))

    /* ── render ── */
    return (
        <div style={st.page}>

            {/* ══ KPI row ══ */}
            <div style={st.kpiRow}>
                <KpiCard icon="fa-comment-dots" color="#6366f1" label="إجمالي الآراء" value={feedbacks.length} />
                <KpiCard icon="fa-star" color="#f59e0b" label="متوسط التقييم" value={avgRating} suffix="/ 5" />
                <KpiCard icon="fa-bell" color="#a855f7" label="غير مراجَعة" value={unreviewed} />
                <KpiCard icon="fa-bug" color="#ef4444" label="المشاكل" value={countByType('bug')} />
                <KpiCard icon="fa-lightbulb" color="#f59e0b" label="الاقتراحات" value={countByType('suggest')} />
                <KpiCard icon="fa-heart" color="#10b981" label="الإطراءات" value={countByType('compliment')} />
            </div>

            {/* ══ Filter tabs ══ */}
            <div style={st.tabs}>
                {TYPES.map(t => (
                    <button key={t.id}
                        style={{
                            ...st.tab,
                            ...(filter === t.id
                                ? { background: `${t.color}18`, color: t.color, borderColor: `${t.color}40` }
                                : {})
                        }}
                        onClick={() => setFilter(t.id)}>
                        <i className={`fas ${t.icon}`} style={{ marginLeft: 6 }} />
                        {t.label}
                        <span style={{
                            ...st.badge,
                            background: filter === t.id ? t.color : 'rgba(255,255,255,0.08)',
                        }}>
                            {t.id === 'all' ? feedbacks.length : countByType(t.id)}
                        </span>
                    </button>
                ))}

                {unreviewed > 0 && (
                    <div style={st.unreviewedTag}>
                        <i className="fas fa-circle-exclamation" style={{ marginLeft: 5 }} />
                        {unreviewed} رأي جديد بانتظار المراجعة
                    </div>
                )}
            </div>

            {/* ══ States ══ */}
            {loading && (
                <div style={st.empty}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.6rem', color: '#6366f1' }} />
                    <div style={{ marginTop: 10 }}>جاري التحميل...</div>
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <div style={st.empty}>
                    <i className="fas fa-comment-slash" style={{ fontSize: '2rem', color: '#6366f1', marginBottom: 10 }} />
                    <div>لا توجد آراء بعد</div>
                </div>
            )}

            {/* ══ Grid ══ */}
            <div style={st.grid}>
                {filtered.map(fb => {
                    const meta = TYPE_META[fb.type] || TYPE_META.suggest
                    return (
                        <div key={fb.id} style={{
                            ...st.card,
                            borderRight: `3px solid ${meta.color}`,
                            opacity: fb.reviewed ? 0.65 : 1,
                        }}>
                            {/* Header */}
                            <div style={st.cardTop}>
                                <div style={{ ...st.avatar, background: meta.bg, color: meta.color }}>
                                    {(fb.userName || 'م')[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={st.name}>{fb.userName || 'مستخدم'}</div>
                                    <div style={st.email}>{fb.userEmail || ''}</div>
                                </div>
                                <div style={st.timeStr}>{timeAgo(fb.createdAt)}</div>
                            </div>

                            {/* Type + Stars */}
                            <div style={st.metaRow}>
                                <div style={{ ...st.typeBadge, background: meta.bg, color: meta.color }}>
                                    <i className={`fas ${meta.icon}`} style={{ marginLeft: 4 }} />
                                    {meta.label}
                                </div>
                                <div style={{ display: 'flex', gap: 2 }}>
                                    {renderStars(fb.rating)}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {fb.rating}/5
                                </span>
                            </div>

                            {/* Message */}
                            <div style={st.message}>{fb.message}</div>

                            {/* Footer */}
                            <div style={st.cardBottom}>
                                {fb.reviewed
                                    ? <div style={st.reviewedTag}>
                                        <i className="fas fa-circle-check" style={{ marginLeft: 4 }} />
                                        تمت المراجعة
                                    </div>
                                    : <button style={st.reviewBtn} onClick={() => markReviewed(fb.id)}>
                                        <i className="fas fa-check" style={{ marginLeft: 5 }} />
                                        تحديد كمراجَع
                                    </button>
                                }
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ── KPI Card ── */
function KpiCard({ icon, color, label, value, suffix = '' }) {
    return (
        <div style={kpi.card}>
            <div style={{ ...kpi.icon, background: `${color}18`, color }}>
                <i className={`fas ${icon}`} />
            </div>
            <div>
                <div style={kpi.val}>
                    {value}
                    <span style={kpi.suffix}>{suffix}</span>
                </div>
                <div style={kpi.label}>{label}</div>
            </div>
        </div>
    )
}

/* ══ Styles ══ */
const st = {
    page: { display: 'flex', flexDirection: 'column', gap: 18, direction: 'rtl' },

    kpiRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },

    tabs: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    tab: {
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 16px', borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-secondary)',
        fontSize: '0.82rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
        transition: 'all 0.15s',
    },
    badge: {
        minWidth: 22, height: 20, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 700, color: 'white', padding: '0 5px',
    },
    unreviewedTag: {
        marginRight: 'auto',
        background: 'rgba(168,85,247,0.12)',
        border: '1px solid rgba(168,85,247,0.25)',
        color: '#a855f7',
        borderRadius: 8, padding: '6px 12px',
        fontSize: '0.78rem', fontWeight: 600,
        display: 'flex', alignItems: 'center',
    },

    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 14,
    },
    card: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'opacity 0.2s',
    },

    cardTop: { display: 'flex', alignItems: 'center', gap: 10 },
    avatar: {
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '1rem', flexShrink: 0,
    },
    name: { fontSize: '0.87rem', fontWeight: 700, color: 'var(--text)' },
    email: { fontSize: '0.7rem', color: 'var(--text-secondary)' },
    timeStr: { fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 },

    metaRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    typeBadge: {
        padding: '3px 10px', borderRadius: 7,
        fontSize: '0.72rem', fontWeight: 700,
        display: 'flex', alignItems: 'center',
    },

    message: {
        fontSize: '0.84rem', color: 'var(--text-secondary)',
        lineHeight: 1.65,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8, padding: '10px 12px',
        border: '1px solid var(--border)',
    },

    cardBottom: { display: 'flex', alignItems: 'center' },
    reviewedTag: {
        fontSize: '0.74rem', color: '#10b981', fontWeight: 600,
        display: 'flex', alignItems: 'center',
    },
    reviewBtn: {
        padding: '6px 14px', borderRadius: 8,
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)',
        color: '#6366f1',
        fontSize: '0.78rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
        display: 'flex', alignItems: 'center',
        transition: 'all 0.15s',
    },

    empty: {
        textAlign: 'center', color: 'var(--text-secondary)',
        padding: '60px 20px', fontSize: '0.88rem',
    },
}

const kpi = {
    card: {
        flex: 1, minWidth: 130,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 13, padding: '13px 15px',
        display: 'flex', alignItems: 'center', gap: 12,
    },
    icon: {
        width: 40, height: 40, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', flexShrink: 0,
    },
    val: { fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 },
    suffix: { fontSize: '0.68rem', color: 'var(--text-secondary)', marginRight: 3 },
    label: { fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 },
}