// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageReservations.jsx
//  ✅ استخدام DataContext و AuthContext بدلاً من props
// ══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useData } from '../context/useData';
import { useAuth } from '../context/useAuth';
import { STATUS_LABELS, STATUS_BADGE, toDate } from '../utils/constants_manager';

export function PageReservations() {
    const { user } = useAuth();
    const {
        reservations,        // جميع الحجوزات من Firestore
        confirmReservation,
        cancelReservation,
        completeReservation
    } = useData();

    const [msg, setMsg] = useState({ text: '', ok: false });
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(null);

    const showMsg = (text, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg({ text: '', ok: false }), 4000);
    };

    // تصفية الحجوزات حسب منطقة المدير (إذا كان MANAGER)
    const myReservations = user?.role === 'MANAGER'
        ? reservations.filter(r => r.zone_id === user?.zone_id)
        : reservations;  // ADMIN يرى الكل

    const updateStatus = async (resId, newStatus) => {
        setLoading(resId);
        try {
            if (newStatus === 'confirmed') await confirmReservation(resId);
            else if (newStatus === 'completed') await completeReservation(resId);
            else if (newStatus === 'cancelled') await cancelReservation(resId);
            showMsg(
                {
                    confirmed: 'تم تأكيد الحجز',
                    completed: 'تم إنهاء الحجز',
                    cancelled: 'تم إلغاء الحجز',
                }[newStatus] || 'تم التحديث'
            );
        } catch (err) {
            showMsg(err.message, false);
        } finally {
            setLoading(null);
        }
    };

    const filtered = myReservations.filter(
        (r) =>
            (!filter || (r.status || '') === filter) &&
            (!search || (r.full_name || '').toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fade-in">
            {msg.text && (
                <div className={`notify ${msg.ok ? 'notify-ok' : 'notify-err'}`}>
                    <i className={`fas ${msg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} /> {msg.text}
                </div>
            )}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-calendar-check" style={{ color: 'var(--primary)' }} /> إدارة الحجوزات
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>{myReservations.length} حجز</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '7px 12px', fontSize: '0.84rem' }}>
                            <option value="">كل الحالات</option>
                            <option value="pending">معلق</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="active">نشط</option>
                            <option value="completed">مكتمل</option>
                            <option value="cancelled">ملغي</option>
                        </select>
                        <input className="form-input" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '7px 12px', fontSize: '0.84rem', width: 180 }} />
                    </div>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr><th>#</th><th>العميل</th><th>المكان</th><th>البدء</th><th>الانتهاء</th><th>التكلفة</th><th>الحالة</th><th>الإجراءات</th></tr>
                        </thead>
                        <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>لا توجد حجوزات</td></tr>
                        ) : (
                            filtered.map((r, i) => {
                                const startD = toDate(r.start_time || r.created_at);
                                const endD = toDate(r.end_time);
                                return (
                                    <tr key={r.reservation_id || i}>
                                        <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                                        <td><strong>{r.full_name || r.user_name || '—'}</strong></td>
                                        <td>{r.spot_number || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                                        <td style={{ fontSize: '0.78rem' }}>{startD ? startD.toLocaleString('ar-DZ') : '—'}</td>
                                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            {endD ? endD.toLocaleString('ar-DZ') :
                                                ['cancelled', 'CANCELLED'].includes(r.status || '') ? <span style={{ color: '#ef4444' }}>ملغي</span> :
                                                    ['completed', 'COMPLETED'].includes(r.status || '') ? <span style={{ color: '#64748b' }}>—</span> :
                                                        <span style={{ color: '#10b981' }}>جارٍ</span>}
                                        </td>
                                        <td><strong style={{ color: '#10b981' }}>{parseFloat(r.total_cost ?? r.total_price ?? 0).toFixed(2)} دج</strong></td>
                                        <td><span className={`badge ${STATUS_BADGE[r.status || ''] || ''}`}>{STATUS_LABELS[r.status || ''] || (r.status || '—')}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                {(r.status || '') === 'pending' &&
                                                    <button className="btn btn-sm" style={{ background: '#f0fdf4', color: '#15803d' }} onClick={() => updateStatus(r.reservation_id, 'confirmed')} disabled={loading === r.reservation_id}><i className="fas fa-check" /> تأكيد</button>}
                                                {['active', 'confirmed', 'CONFIRMED'].includes(r.status || '') &&
                                                    <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#1d4ed8' }} onClick={() => updateStatus(r.reservation_id, 'completed')} disabled={loading === r.reservation_id}><i className="fas fa-flag-checkered" /> إنهاء</button>}
                                                {['pending', 'confirmed', 'active'].includes(r.status || '') &&
                                                    <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => updateStatus(r.reservation_id, 'cancelled')} disabled={loading === r.reservation_id}><i className="fas fa-times" /> إلغاء</button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}