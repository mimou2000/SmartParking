// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/SpotStatusModal.jsx
// ══════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { SPOT_COLOR, SPOT_LABEL, TYPE_LABEL } from '../utils/constants_manager'

// ── مكوّنات مساعدة ──
function InfoRow({ icon, label, value, valueColor, wide }) {
    return (
        <div style={{ gridColumn: wide ? 'span 2' : 'span 1', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <i className={`fas ${icon}`} style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2, flexShrink: 0 }} />
            <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.82rem', color: valueColor || '#0f172a', fontWeight: 700, marginTop: 1 }}>{value}</div>
            </div>
        </div>
    )
}

function btnStyle(from, to, outline = false) {
    return {
        width: '100%', padding: '11px 16px', borderRadius: 10,
        border: outline ? `2px solid ${from}` : 'none',
        background: outline ? 'white' : `linear-gradient(135deg, ${from}, ${to})`,
        color: outline ? from : 'white',
        fontFamily: 'Tajawal, sans-serif', fontSize: '0.9rem', fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8, transition: 'opacity .15s',
    }
}

const labelStyle = {
    fontSize: '0.78rem', fontWeight: 700, color: '#475569',
    display: 'block', marginBottom: 6,
}

const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: '0.9rem',
    borderRadius: 10, border: '1px solid #e2e8f0',
    fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box',
}

export function SpotStatusModal({ spot, onClose, onConfirm, loading, myZone }) {
    const [step,          setStep]          = useState('options') // 'options' | 'form' | 'reserved'
    const [fullName,      setFullName]      = useState('')
    const [vehicleNumber, setVehicleNumber] = useState('')
    const [resData,       setResData]       = useState(null)
    const [resLoading,    setResLoading]    = useState(false)
    const [resId,         setResId]         = useState(null)

    // ── إحداثيات المكان ──
    const [spotLat,     setSpotLat]     = useState('')
    const [spotLng,     setSpotLng]     = useState('')
    const [coordSaving, setCoordSaving] = useState(false)
    const [showCoords,  setShowCoords]  = useState(false)   // ✅ FIX: missing state

    // ── حقول التسعير اليدوي ──
    const [rateType, setRateType] = useState('hourly')  // 'hourly' | 'daily' | 'weekly'
    const [duration, setDuration] = useState(1)

    // ── عند فتح مكان محجوز: جلب بيانات الحجز ──
    useEffect(() => {
        if (!spot) { setStep('options'); return }
        if (spot.status === 'RESERVED') {
            setStep('reserved')
            setResLoading(true)
            setResData(null)
            const fetchReservation = async () => {
                try {
                    const q = query(
                        collection(db, 'reservations'),
                        where('spot_id', '==', spot.spot_id),
                        where('status', 'in', ['confirmed', 'CONFIRMED', 'active', 'pending', 'PENDING'])
                    )
                    const snap = await getDocs(q)
                    if (!snap.empty) {
                        const sorted = snap.docs.sort((a, b) => {
                            const ta = a.data().created_at?.toMillis?.() || 0
                            const tb = b.data().created_at?.toMillis?.() || 0
                            return tb - ta
                        })
                        setResData(sorted[0].data())
                        setResId(sorted[0].id)
                    }
                } catch (err) {
                    console.error('fetchReservation error:', err)
                } finally {
                    setResLoading(false)
                }
            }
            fetchReservation()
        } else {
            setStep('options')
        }
        // تهيئة الإحداثيات من بيانات المكان
        setSpotLat(spot?.latitude  || '')
        setSpotLng(spot?.longitude || '')
    }, [spot])

    if (!spot) return null

    // ══════════════════════════════════════
    //  منطق التسعير
    // ══════════════════════════════════════
    const rates = {
        hourly: { label: 'ساعي',   unit: 'ساعة',  rate: myZone?.hourly_rate || 0 },
        daily:  { label: 'يومي',   unit: 'يوم',   rate: myZone?.daily_rate  || 0 },
        weekly: { label: 'أسبوعي', unit: 'أسبوع', rate: myZone?.weekly_rate || 0 },
    }

    const durationOptions = {
        hourly: [0.5, 1, 2, 3, 4, 6, 8, 12, 24],
        daily:  [1, 2, 3, 4, 5, 6, 7],
        weekly: [1, 2, 3, 4],
    }

    const fmtDuration = (v) => {
        if (rateType === 'hourly') return v === 0.5 ? 'نصف ساعة' : `${v} ساعة`
        if (rateType === 'daily')  return `${v} يوم`
        return `${v} أسبوع`
    }

    const calcCost = () => {
        const d = Math.max(parseFloat(duration) || 1, 0.5)
        const r = rates[rateType].rate
        if (rateType === 'hourly') return Math.ceil(d) * r
        return d * r
    }
    const totalCost = calcCost()

    // ══════════════════════════════════════
    //  Handlers
    // ══════════════════════════════════════
    const options = [
        { value: 'AVAILABLE',   label: 'متاح',  icon: 'fa-check-circle', color: '#10b981', border: '#10b981', bg: '#f0fdf4' },
        { value: 'OCCUPIED',    label: 'مشغول', icon: 'fa-car',          color: '#ef4444', border: '#ef4444', bg: '#fef2f2' },
        { value: 'MAINTENANCE', label: 'صيانة', icon: 'fa-tools',        color: '#64748b', border: '#e2e8f0', bg: '#f8fafc' },
    ]

    const handleOptionClick = (value) => {
        if (value === spot.status) return
        if (value === 'OCCUPIED'  && spot.status === 'AVAILABLE') { setStep('form');     return }
        if (value === 'AVAILABLE' && spot.status === 'OCCUPIED')  { setStep('checkout'); return }
        onConfirm(spot, value, {})
    }

    const handleOccupiedSubmit = () => {
        const d = Math.max(parseFloat(duration) || 1, 0.5)
        const endTime = new Date()
        if (rateType === 'hourly') endTime.setTime(endTime.getTime() + d * 3600000)
        if (rateType === 'daily')  endTime.setTime(endTime.getTime() + d * 86400000)
        if (rateType === 'weekly') endTime.setTime(endTime.getTime() + d * 7 * 86400000)

        onConfirm(spot, 'OCCUPIED', {
            full_name:      fullName.trim() || 'زائر',
            vehicle_number: vehicleNumber.trim() || '',
            rate_type:      rateType,
            duration:       d,
            total_cost:     totalCost,
            end_time:       endTime,
        })
    }

    const handleSaveSpotCoords = async () => {
        if (!spotLat || !spotLng) return
        const lat = parseFloat(spotLat)
        const lng = parseFloat(spotLng)
        if (isNaN(lat) || isNaN(lng)) return
        setCoordSaving(true)
        try {
            await updateDoc(doc(db, 'zones', myZone.zone_id, 'parking_spots', spot.spot_id), {
                latitude:   spotLat.toString(),
                longitude:  spotLng.toString(),
                updated_at: serverTimestamp(),
            })
        } catch (err) { console.error(err) }
        finally { setCoordSaving(false) }
    }

    const handleClose = () => {
        setStep('options')
        setFullName('')
        setVehicleNumber('')
        setResData(null)
        setRateType('hourly')
        setDuration(1)
        onClose()
    }

    const fmtTime = (ts) => {
        if (!ts) return '—'
        const d = ts.toDate ? ts.toDate() : new Date(ts)
        return d.toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' })
    }

    const calcDuration = (start, end) => {
        if (!start) return null
        const s = start.toDate ? start.toDate() : new Date(start)
        const e = end ? (end.toDate ? end.toDate() : new Date(end)) : new Date()
        const diff = Math.abs(e - s)
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        return h > 0 ? `${h} ساعة ${m} دقيقة` : `${m} دقيقة`
    }

    // ══════════════════════════════════════
    //  Render: reserved
    // ══════════════════════════════════════
    const renderReserved = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: 10, display: 'block' }} />
                    جارٍ تحميل بيانات الحجز...
                </div>
            ) : resData ? (
                <>
                    {/* معلومات الحاجز */}
                    <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 16px', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="fas fa-user-circle" style={{ color: '#f59e0b' }} /> معلومات الحاجز
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <InfoRow icon="fa-user"    label="الاسم"       value={resData.full_name      || '—'} />
                            <InfoRow icon="fa-car"     label="رقم السيارة" value={resData.vehicle_number || '—'} />
                            <InfoRow icon="fa-phone"   label="الهاتف"      value={resData.phone          || '—'} />
                            <InfoRow icon="fa-id-card" label="المصدر"      value={resData.source === 'MANUAL' ? 'يدوي' : 'تطبيق'} />
                        </div>
                    </div>

                    {/* تفاصيل الحجز */}
                    <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="fas fa-clock" style={{ color: '#10b981' }} /> تفاصيل الحجز
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <InfoRow icon="fa-calendar-plus"  label="وقت الحجز"   value={fmtTime(resData.created_at)} wide />
                            <InfoRow icon="fa-play-circle"    label="بداية الحجز" value={fmtTime(resData.start_time)} wide />
                            <InfoRow icon="fa-stop-circle"    label="نهاية الحجز" value={fmtTime(resData.end_time)}   wide />
                            <InfoRow icon="fa-hourglass-half" label="المدة"       value={calcDuration(resData.start_time, resData.end_time) || '—'} />
                            <InfoRow icon="fa-money-bill"     label="التكلفة"     value={resData.total_cost != null ? `${resData.total_cost} دج` : '—'} valueColor="#10b981" />
                        </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                        <button onClick={() => onConfirm(spot, 'OCCUPIED', {
                            full_name:      resData.full_name      || 'زائر',
                            vehicle_number: resData.vehicle_number || '',
                            total_cost:     resData.total_cost     || 0,
                            end_time:       resData.end_time?.toDate?.() || null,
                        })} disabled={loading} style={btnStyle('#ef4444', '#dc2626')}>
                            {loading
                                ? <><i className="fas fa-spinner fa-spin" /> جارٍ التسجيل...</>
                                : <><i className="fas fa-car" /> تسجيل دخول السيارة</>}
                        </button>
                        <button onClick={() => onConfirm(spot, 'MAINTENANCE', {})} disabled={loading}
                                style={btnStyle('#64748b', '#475569')}>
                            <i className="fas fa-pause-circle" /> تعليق الحجز مؤقتاً
                        </button>
                        <button onClick={() => onConfirm(spot, 'AVAILABLE', {})} disabled={loading}
                                style={btnStyle('#f59e0b', '#d97706', true)}>
                            <i className="fas fa-times-circle" /> إلغاء الحجز وتحرير المكان
                        </button>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                    <i className="fas fa-exclamation-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: 8 }} />
                    لم يتم العثور على بيانات الحجز
                </div>
            )}
            <button onClick={handleClose}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 }}>
                إغلاق
            </button>
        </div>
    )

    // ══════════════════════════════════════
    //  Render: form — الدخول اليدوي + التسعير
    // ══════════════════════════════════════
    const renderForm = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* وقت الدخول */}
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #fecaca' }}>
                <i className="fas fa-clock" style={{ color: '#ef4444' }} />
                <span style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>
                    وقت الدخول: <strong>{new Date().toLocaleTimeString('ar-DZ')}</strong>
                </span>
            </div>

            {/* نوع التعريفة */}
            <div>
                <label style={labelStyle}>
                    <i className="fas fa-tags" style={{ marginLeft: 5, color: '#6366f1' }} />
                    نوع التعريفة
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {Object.entries(rates).map(([key, r]) => (
                        <button key={key}
                                onClick={() => { setRateType(key); setDuration(durationOptions[key][1] || 1) }}
                                style={{ padding: '10px 6px', borderRadius: 10, border: `2px solid ${rateType === key ? '#6366f1' : '#e2e8f0'}`, background: rateType === key ? '#eff6ff' : 'white', color: rateType === key ? '#6366f1' : '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.82rem', fontWeight: rateType === key ? 800 : 600, cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                            <div>{r.label}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>{r.rate} دج/{r.unit}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* المدة */}
            <div>
                <label style={labelStyle}>
                    <i className="fas fa-hourglass-half" style={{ marginLeft: 5, color: '#6366f1' }} />
                    المدة
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {durationOptions[rateType].map(v => (
                        <button key={v} onClick={() => setDuration(v)}
                                style={{ padding: '7px 12px', borderRadius: 8, border: `2px solid ${duration === v ? '#6366f1' : '#e2e8f0'}`, background: duration === v ? '#eff6ff' : 'white', color: duration === v ? '#6366f1' : '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.8rem', fontWeight: duration === v ? 800 : 600, cursor: 'pointer', transition: 'all .15s' }}>
                            {fmtDuration(v)}
                        </button>
                    ))}
                </div>
            </div>

            {/* التكلفة المحسوبة */}
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 12, padding: '14px 18px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                    <i className="fas fa-calculator" style={{ marginLeft: 6 }} />
                    {fmtDuration(duration)} × {rates[rateType].rate} دج
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a' }}>
                    {totalCost} <span style={{ fontSize: '0.8rem' }}>دج</span>
                </div>
            </div>

            {/* اسم السائق */}
            <div>
                <label style={labelStyle}>
                    <i className="fas fa-user" style={{ marginLeft: 5, color: '#6366f1' }} />
                    اسم السائق <span style={{ color: '#94a3b8', fontWeight: 400 }}>(اختياري)</span>
                </label>
                <input className="form-input" placeholder="مثال: أحمد محمد"
                       value={fullName} onChange={e => setFullName(e.target.value)}
                       style={inputStyle} />
            </div>

            {/* رقم السيارة */}
            <div>
                <label style={labelStyle}>
                    <i className="fas fa-car" style={{ marginLeft: 5, color: '#6366f1' }} />
                    رقم السيارة <span style={{ color: '#94a3b8', fontWeight: 400 }}>(اختياري)</span>
                </label>
                <input className="form-input" placeholder="مثال: 123-456-27"
                       value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)}
                       style={inputStyle} />
            </div>

            {/* أزرار */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep('options')}
                        style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 }}>
                    <i className="fas fa-arrow-right" style={{ marginLeft: 6 }} /> رجوع
                </button>
                <button onClick={handleOccupiedSubmit} disabled={loading}
                        style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loading
                        ? <><i className="fas fa-spinner fa-spin" /> جارٍ التسجيل...</>
                        : <><i className="fas fa-car" /> تسجيل الدخول — {totalCost} دج</>}
                </button>
            </div>
        </div>
    )


    // ══════════════════════════════════════
    //  Render: checkout — إنهاء أو إلغاء
    // ══════════════════════════════════════
    const renderCheckout = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* معلومات المكان */}
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: '12px 16px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-car" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 700 }}>
                    المكان {spot.spot_number} مشغول حالياً — اختر الإجراء
                </div>
            </div>

            {/* زر الإنهاء */}
            <button onClick={() => onConfirm(spot, 'AVAILABLE', { action: 'complete' })} disabled={loading}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1 }}>
                <i className="fas fa-flag-checkered" style={{ fontSize: '1rem' }} />
                <div style={{ textAlign: 'right' }}>
                    <div>إنهاء الجلسة وتسجيل الإيراد</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: 2 }}>يحسب التكلفة تلقائياً بناءً على المدة</div>
                </div>
            </button>

            {/* زر الإلغاء */}
            <button onClick={() => onConfirm(spot, 'AVAILABLE', { action: 'cancel' })} disabled={loading}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid #ef4444', background: 'white', color: '#ef4444', fontFamily: 'Tajawal, sans-serif', fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1 }}>
                <i className="fas fa-times-circle" style={{ fontSize: '1rem' }} />
                <div style={{ textAlign: 'right' }}>
                    <div>إلغاء وتحرير المكان بدون إيراد</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: 2 }}>لا يُسجَّل أي مبلغ</div>
                </div>
            </button>

            {/* رجوع */}
            <button onClick={() => setStep('options')}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <i className="fas fa-arrow-right" /> رجوع
            </button>
        </div>
    )

    // ══════════════════════════════════════
    //  Main render
    // ══════════════════════════════════════
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}
             onClick={handleClose}>
            <div style={{ background: 'white', borderRadius: 18, padding: '28px 28px 20px', width: step === 'reserved' ? 440 : 420, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', animation: 'fadeInUp .2s ease' }}
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#6366f1' }}>
                            <i className="fas fa-parking" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                                {step === 'form'     ? 'بيانات الدخول اليدوي:'  :
                                    step === 'reserved' ? 'تفاصيل الحجز:'          :
                                        'تغيير حالة المكان:'}
                                {' '}<span style={{ color: '#6366f1' }}>{spot.spot_number}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>
                                {TYPE_LABEL[spot.spot_type] || spot.spot_type} — الحالة الحالية:{' '}
                                <strong style={{ color: SPOT_COLOR[spot.status] }}>{SPOT_LABEL[spot.status]}</strong>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#64748b' }}>✕</button>
                </div>

                {step === 'reserved' && renderReserved()}
                {step === 'form'     && renderForm()}
                {step === 'checkout' && renderCheckout()}

                {step === 'options' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                        {/* خيارات الحالة */}
                        {options.map(opt => (
                            <button key={opt.value} onClick={() => handleOptionClick(opt.value)}
                                    disabled={loading || opt.value === spot.status}
                                    style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: `2px solid ${opt.value === spot.status ? opt.border : '#e2e8f0'}`, background: opt.value === spot.status ? opt.bg : 'white', color: opt.value === spot.status ? opt.color : '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: '0.92rem', fontWeight: 700, cursor: loading || opt.value === spot.status ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, opacity: loading ? 0.7 : 1, transition: 'all .15s' }}>
                                <i className={`fas ${opt.icon}`} style={{ color: opt.color, fontSize: '1rem' }} />
                                {opt.label}
                                {opt.value === spot.status && (
                                    <span style={{ marginRight: 'auto', fontSize: '0.7rem', background: opt.color, color: 'white', borderRadius: 6, padding: '2px 8px' }}>الحالة الحالية</span>
                                )}
                            </button>
                        ))}

                        {/* ── قسم الإحداثيات ── */}
                        <button
                            onClick={() => setShowCoords(!showCoords)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: 10,
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                color: '#0369a1',
                                fontFamily: 'Tajawal, sans-serif',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                marginTop: 4,
                            }}>
                            <i className="fas fa-map-marker-alt" />
                            ضبط الإحداثيات
                        </button>

                        {showCoords && (
                            <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 14px', border: '1px solid #bae6fd' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>خط العرض</div>
                                        <input
                                            placeholder="36.3651"
                                            value={spotLat}
                                            onChange={e => setSpotLat(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'monospace', direction: 'ltr', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>خط الطول</div>
                                        <input
                                            placeholder="6.6147"
                                            value={spotLng}
                                            onChange={e => setSpotLng(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'monospace', direction: 'ltr', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveSpotCoords}
                                    disabled={coordSaving}
                                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, cursor: coordSaving ? 'not-allowed' : 'pointer', opacity: coordSaving ? 0.7 : 1 }}>
                                    {coordSaving ? <><i className="fas fa-spinner fa-spin" /> جارٍ الحفظ...</> : 'حفظ الإحداثيات'}
                                </button>
                            </div>
                        )}

                        <button onClick={handleClose}
                                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600, marginTop: 2 }}>
                            إغلاق
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}