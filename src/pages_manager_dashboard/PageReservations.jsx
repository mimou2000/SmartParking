// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageReservations.jsx
//  ✅ الإصلاح: عرض الحجوزات حتى للقديمة التي بدون zone_id
//             + زر ترحيل للأدمن لإصلاح البيانات القديمة
// ══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useData } from '../context/useData';
import { useAuth } from '../context/useAuth';
import { STATUS_LABELS, STATUS_BADGE, toDate } from '../utils/constants_manager';
import { reservationsAPI } from '../api/firebaseApi';

export function PageReservations() {
    const { user } = useAuth();
    const {
        reservations,
        confirmReservation,
        cancelReservation,
        completeReservation
    } = useData();

    const [msg, setMsg] = useState({ text: '', ok: false });
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(null);
    const [migrating, setMigrating] = useState(false);

    const showMsg = (text, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg({ text: '', ok: false }), 4000);
    };

    // ✅ الإصلاح الرئيسي:
    // المدير يرى حجوزات منطقته (zone_id مطابق)
    // + الحجوزات القديمة التي لا تحتوي على zone_id أصلاً (بدل إخفائها)
    const myReservations = user?.role === 'MANAGER'
        ? reservations.filter(r =>
            r.zone_id === user?.zone_id ||   // حجوزات منطقته ✅
            !r.zone_id                        // حجوزات قديمة بدون zone_id (مؤقتاً) ⚠️
        )
        : reservations;  // ADMIN يرى الكل

    const updateStatus = async (resId, newStatus) => {
        setLoading(resId);
        try {
            if (newStatus === 'confirmed') await confirmReservation(resId);
            else if (newStatus === 'completed') await completeReservation(resId);
            else if (newStatus === 'cancelled') await cancelReservation(resId);
            showMsg(
                {
                    confirmed: 'تم تأكيد دخول السيارة ✅',
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

    // ✅ دالة الترحيل: تُشغَّل مرة واحدة فقط من قِبَل الأدمن
    //    تقرأ كل spot_id في الحجوزات القديمة وتجد zone_id المناسب
    const handleMigrate = async () => {
        if (!window.confirm('سيتم إضافة zone_id لكل الحجوزات القديمة. هل أنت متأكد؟')) return;
        setMigrating(true);
        try {
            const result = await reservationsAPI.migrateZoneIds();
            showMsg(`✅ تم ترحيل ${result.migrated} حجز بنجاح`);
        } catch (err) {
            showMsg('❌ فشل الترحيل: ' + err.message, false);
        } finally {
            setMigrating(false);
        }
    };

    const filtered = myReservations.filter(
        (r) =>
            (!filter || (r.status || '') === filter) &&
            (!search || (r.full_name || '').toLowerCase().includes(search.toLowerCase()))
    );

    // عدد الحجوزات القديمة التي تحتاج ترحيل (للإشعار)
    const withoutZoneCount = reservations.filter(r => !r.zone_id).length;

    return (
        <div className="fade-in">
            {msg.text && (
                <div className={`notify ${msg.ok ? 'notify-ok' : 'notify-err'}`}>
                    <i className={`fas ${msg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} /> {msg.text}
                </div>
            )}

            {/* ✅ تحذير للأدمن عند وجود حجوزات بدون zone_id */}
            {user?.role === 'ADMIN' && withoutZoneCount > 0 && (
                <div style={{
                    background: '#fffbeb',
                    border: '1px solid #f59e0b',
                    borderRadius: 10,
                    padding: '12px 18px',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                }}>
                    <span style={{ color: '#92400e', fontSize: '0.88rem' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginLeft: 6 }} />
                        يوجد <strong>{withoutZoneCount}</strong> حجز قديم بدون <code>zone_id</code> — المدراء لن يروا هذه الحجوزات
                    </span>
                    <button
                        className="btn btn-sm"
                        style={{ background: '#f59e0b', color: '#fff', fontWeight: 700 }}
                        onClick={handleMigrate}
                        disabled={migrating}
                    >
                        {migrating
                            ? <><i className="fas fa-spinner fa-spin" /> جارٍ الترحيل...</>
                            : <><i className="fas fa-magic" /> إصلاح البيانات القديمة</>
                        }
                    </button>
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
                                        <td><strong>{r.full_name || r.user_name || '—'}</strong>
                                            {/* ✅ شارة لتمييز حجوزات التطبيق */}
                                            {r.source === 'APP' && (
                                                <span style={{ marginRight: 5, fontSize: '0.68rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                                        تطبيق
                                                    </span>
                                            )}
                                        </td>
                                        <td>
                                            {r.spot_number || <span style={{ color: '#94a3b8' }}>—</span>}
                                            {/* ⚠️ تحذير مرئي للحجوزات القديمة بدون zone_id */}
                                            {!r.zone_id && (
                                                <span title="هذا الحجز لا يحتوي على zone_id — شغّل الإصلاح من لوحة الأدمن"
                                                      style={{ marginRight: 5, color: '#f59e0b', fontSize: '0.75rem' }}>
                                                        <i className="fas fa-exclamation-triangle" />
                                                    </span>
                                            )}
                                        </td>
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
                                                    <button className="btn btn-sm" style={{ background: '#f0fdf4', color: '#15803d' }} onClick={() => updateStatus(r.reservation_id, 'confirmed')} disabled={loading === r.reservation_id}>
                                                        <i className="fas fa-car" /> {r.source === 'APP' ? 'تأكيد دخول السيارة' : 'تأكيد'}
                                                    </button>}
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