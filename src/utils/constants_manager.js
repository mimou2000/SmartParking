// ══════════════════════════════════════════════════════
//  src/utils/constants_manager.js
//  ثوابت ودوال مشتركة بين صفحات ManagerDashboard
// ══════════════════════════════════════════════════════

export const STATUS_LABELS = { pending: 'معلق', confirmed: 'مؤكد', active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي' }
export const STATUS_BADGE  = { pending: 'badge-pending', confirmed: 'badge-confirmed', active: 'badge-active', completed: 'badge-completed', cancelled: 'badge-cancelled' }
export const SPOT_COLOR    = { AVAILABLE: '#10b981', OCCUPIED: '#ef4444', RESERVED: '#f59e0b', MAINTENANCE: '#64748b' }
export const SPOT_LABEL    = { AVAILABLE: 'متاح', OCCUPIED: 'مشغول', RESERVED: 'محجوز', MAINTENANCE: 'صيانة' }
export const TYPE_LABEL    = { STANDARD: 'عادي', VIP: 'VIP', DISABLED: 'ذوي احتياجات', ELECTRIC: 'كهربائي', MOTORCYCLE: 'دراجة' }

export const toDate    = (ts) => ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null
export const toDateStr = (ts) => { const d = toDate(ts); return d ? d.toISOString().slice(0,10) : '' }
export const occColor  = (p)  => p >= 80 ? '#ef4444' : p >= 50 ? '#f59e0b' : '#10b981'

export const S = {
    layout:     { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
    main:       { flex: 1, marginRight: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', minWidth: 0 },
    content:    { flex: 1, padding: '22px 24px', overflowX: 'hidden' },
    kpiGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 },
    kpiCard:    { background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', borderTop: '4px solid', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 },
    kpiIcon:    { width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
    kpiVal:     { fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 },
    kpiLbl:     { fontSize: '0.75rem', color: '#64748b', marginTop: 2, marginBottom: 4 },
    chartTitle: { fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
}
