// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageSpots.jsx
// ══════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { spotsAPI } from '../api/firebaseApi'
import { SpotStatusModal } from './SpotStatusModal'
import { SPOT_COLOR, SPOT_LABEL, TYPE_LABEL, S } from '../utils/constants_manager'

export function PageSpots({ myZone, spots, setSpots }) {
    const [changing,      setChanging]      = useState(null)
    const [msg,           setMsg]           = useState({ text: '', ok: false })
    const [modalSpot,     setModalSpot]     = useState(null)
    const [search,        setSearch]        = useState('')
    const [filterStatus,  setFilterStatus]  = useState('')
    const [showAddForm,   setShowAddForm]   = useState(false)
    const [addSaving,     setAddSaving]     = useState(false)
    const [addForm,       setAddForm]       = useState({ spot_type: 'STANDARD', count: 1 })
    const [enrichedSpots, setEnrichedSpots] = useState([])   // ← الأماكن بعد دمج الحجوزات

    const showMsg = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: false }), 4000) }

    // ══════════════════════════════════════════════════
    //  دمج حالة الحجوزات من تطبيق الهاتف مع الأماكن
    //  يُشغَّل كلما تغيّرت قائمة الـ spots أو المنطقة
    // ══════════════════════════════════════════════════
    useEffect(() => {
        if (!spots.length || !myZone?.zone_id) {
            setEnrichedSpots(spots)
            return
        }

        const syncReservations = async () => {
            try {
                const now = new Date()

                // جلب الحجوزات النشطة أو المؤكدة للمنطقة
                const q = query(
                    collection(db, 'reservations'),
                    where('zone_id', '==', myZone.zone_id),
                    where('status', 'in', ['confirmed', 'CONFIRMED', 'active'])
                )
                const snap = await getDocs(q)

                // جمع spot_ids التي عليها حجز confirmed أو active — بغض النظر عن الوقت
                const reservedSpotIds = new Set()
                snap.docs.forEach(d => {
                    reservedSpotIds.add(d.data().spot_id)
                })

                // دمج الحالة الحقيقية: إذا المكان AVAILABLE لكن عليه حجز → RESERVED
                const merged = spots.map(s => {
                    if (reservedSpotIds.has(s.spot_id) && s.status === 'AVAILABLE') {
                        return { ...s, status: 'RESERVED' }
                    }
                    return s
                })

                setEnrichedSpots(merged)
            } catch (err) {
                console.error('syncReservations error:', err)
                setEnrichedSpots(spots) // fallback: اعرض الأماكن كما هي
            }
        }

        syncReservations()
    }, [spots, myZone?.zone_id])

    // ══════════════════════════════════════════════════
    //  تغيير حالة المكان — مع دعم الحجز اليدوي
    // ══════════════════════════════════════════════════
    const changeStatus = async (spot, newStatus, extraData = {}) => {
        setChanging(spot.spot_id)
        try {
            // ── حالة مشغول يدوياً: أنشئ reservation جديد ──
            if (newStatus === 'OCCUPIED' && (spot.status === 'AVAILABLE' || spot.status === 'RESERVED')) {
                const now    = new Date()
                const newRef = await addDoc(collection(db, 'reservations'), {
                    spot_id:        spot.spot_id,
                    spot_number:    spot.spot_number,
                    zone_id:        myZone.zone_id,
                    zone_name:      myZone.zone_name || '',
                    user_id:        'WALK_IN',
                    full_name:      extraData.full_name      || 'زائر',
                    vehicle_number: extraData.vehicle_number || '',
                    rate_type:      extraData.rate_type      || 'hourly',
                    duration:       extraData.duration       || 1,
                    source:         'MANUAL',
                    status:         'active',
                    start_time:     now,
                    end_time:       extraData.end_time   || null,
                    total_cost:     extraData.total_cost || 0,
                    total_price:    extraData.total_cost || 0,
                    created_at:     serverTimestamp(),
                })
                // ✅ حفظ reservation_id في نفس الوثيقة لتتوافق مع PageReservations
                await updateDoc(doc(db, 'reservations', newRef.id), {
                    reservation_id: newRef.id,
                })
            }

            // ── حالة متاح من مشغول: إنهاء أو إلغاء ──
            if (newStatus === 'AVAILABLE' && spot.status === 'OCCUPIED') {
                const isCancel = extraData.action === 'cancel'
                const q = query(
                    collection(db, 'reservations'),
                    where('spot_id', '==', spot.spot_id),
                    where('status',  '==', 'active')
                )
                const snap = await getDocs(q)
                if (!snap.empty) {
                    // ترتيب يدوي بدلاً من orderBy لتجنب الحاجة إلى index مركّب
                    const sorted  = snap.docs.sort((a, b) => {
                        const ta = a.data().created_at?.toMillis?.() || 0
                        const tb = b.data().created_at?.toMillis?.() || 0
                        return tb - ta
                    })
                    const resDoc  = sorted[0]
                    const endTime = new Date()

                    if (isCancel) {
                        await updateDoc(doc(db, 'reservations', resDoc.id), {
                            status:      'cancelled',
                            end_time:    endTime,
                            total_cost:  0,
                            total_price: 0,
                            updated_at:  serverTimestamp(),
                        })
                    } else {
                        const startTime = resDoc.data().start_time?.toDate?.() || new Date()
                        const hours     = Math.max((endTime - startTime) / 3600000, 0.25)
                        const cost      = parseFloat((hours * (myZone.hourly_rate || 0)).toFixed(2))
                        await updateDoc(doc(db, 'reservations', resDoc.id), {
                            status:      'completed',
                            end_time:    endTime,
                            total_cost:  cost,
                            total_price: cost,
                            updated_at:  serverTimestamp(),
                        })
                    }
                }
            }

            // ── حالة متاح من محجوز (هاتف): ألغِ الحجز الموجود ──
            if (newStatus === 'AVAILABLE' && spot.status === 'RESERVED') {
                const now = new Date()
                const q = query(
                    collection(db, 'reservations'),
                    where('spot_id', '==', spot.spot_id),
                    where('status', 'in', ['confirmed', 'CONFIRMED'])
                )
                const snap = await getDocs(q)
                if (!snap.empty) {
                    const sorted = snap.docs.sort((a, b) => {
                        const ta = a.data().created_at?.toMillis?.() || 0
                        const tb = b.data().created_at?.toMillis?.() || 0
                        return tb - ta
                    })
                    await updateDoc(doc(db, 'reservations', sorted[0].id), {
                        status:     'cancelled',
                        end_time:   now,
                        updated_at: serverTimestamp(),
                    })
                }
            }

            // ── تحديث حالة المكان في Firestore ──
            await spotsAPI.changeStatus(spot.spot_id, newStatus, myZone.zone_id)
            setSpots(prev => prev.map(s => s.spot_id === spot.spot_id ? { ...s, status: newStatus } : s))
            setModalSpot(null)

            const msgs = {
                OCCUPIED:    'تم تسجيل دخول السيارة ✅',
                AVAILABLE:   spot.status === 'RESERVED'
                    ? 'تم إلغاء الحجز وتحرير المكان ✅'
                    : extraData.action === 'cancel'
                        ? 'تم إلغاء الجلسة وتحرير المكان ✅'
                        : 'تم تسجيل خروج السيارة وحفظ الإيراد ✅',
                MAINTENANCE: 'تم تحديث حالة المكان ✅',
            }
            showMsg(msgs[newStatus] || 'تم التحديث ✅')

        } catch (err) {
            console.error(err)
            showMsg(err.message, false)
        } finally {
            setChanging(null)
        }
    }

    // ══════════════════════════════════════════════════
    //  إضافة أماكن جديدة
    // ══════════════════════════════════════════════════
    const handleAddSpots = async () => {
        const count = parseInt(addForm.count)
        if (!count || count < 1 || count > 50) { showMsg('العدد يجب أن يكون بين 1 و 50', false); return }
        setAddSaving(true)

        const typeLetters = { STANDARD: 'A', VIP: 'B', MOTORCYCLE: 'C', DISABLED: 'D', ELECTRIC: 'E' }
        const letter      = typeLetters[addForm.spot_type] || 'A'
        const existingNums = spots
            .filter(s => s.spot_type === addForm.spot_type)
            .map(s => { const m = s.spot_number.match(/(\d+)$/); return m ? parseInt(m[1]) : 0 })
        const startNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1

        try {
            await Promise.all(Array.from({ length: count }, (_, i) =>
                spotsAPI.addSpot(myZone.zone_id, {
                    spot_number: `${letter}-${startNum + i}`,
                    spot_type:   addForm.spot_type,
                    status:      'AVAILABLE',
                })
            ))
            showMsg(`تم إضافة ${count} مكان بنجاح ✅`)
            setAddForm({ spot_type: 'STANDARD', count: 1 })
            setShowAddForm(false)
        } catch (err) { showMsg(err.message, false) }
        finally { setAddSaving(false) }
    }

    // ══════════════════════════════════════════════════
    //  الإحصائيات والفلترة — تعمل على enrichedSpots
    // ══════════════════════════════════════════════════
    const stats = {
        available:   enrichedSpots.filter(s => s.status === 'AVAILABLE').length,
        occupied:    enrichedSpots.filter(s => s.status === 'OCCUPIED').length,
        reserved:    enrichedSpots.filter(s => s.status === 'RESERVED').length,
        maintenance: enrichedSpots.filter(s => s.status === 'MAINTENANCE').length,
    }

    // ✅ ترتيب ذكي: حسب الحرف أولاً ثم الرقم (A-1, A-2, B-1, B-2...)
    const sortSpots = (arr) => [...arr].sort((a, b) => {
        const parse = (num) => {
            const m = (num || '').match(/^([A-Za-z]+)-?(\d+)$/)
            return m ? [m[1], parseInt(m[2])] : [num, 0]
        }
        const [la, na] = parse(a.spot_number)
        const [lb, nb] = parse(b.spot_number)
        return la !== lb ? la.localeCompare(lb) : na - nb
    })

    const filtered = sortSpots(enrichedSpots.filter(s =>
        (!search       || s.spot_number.toLowerCase().includes(search.toLowerCase())) &&
        (!filterStatus || s.status === filterStatus)
    ))

    if (!spots.length && !myZone) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
        </div>
    )

    return (
        <div className="fade-in">
            <SpotStatusModal
                spot={modalSpot}
                onClose={() => setModalSpot(null)}
                onConfirm={changeStatus}
                loading={changing === modalSpot?.spot_id}
                myZone={myZone}
            />
            {msg.text && (
                <div className={`notify ${msg.ok ? 'notify-ok' : 'notify-err'}`}>
                    <i className={`fas ${msg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} /> {msg.text}
                </div>
            )}

            {/* ── إحصائيات ── */}
            <div style={S.kpiGrid}>
                {[
                    { icon: 'fa-check-circle', val: stats.available,   label: 'متاح',           color: '#10b981', bg: '#f0fdf4', status: 'AVAILABLE'   },
                    { icon: 'fa-car',          val: stats.occupied,    label: 'مشغول',          color: '#ef4444', bg: '#fef2f2', status: 'OCCUPIED'    },
                    { icon: 'fa-bookmark',     val: stats.reserved,    label: 'محجوز (تطبيق)', color: '#f59e0b', bg: '#fffbeb', status: 'RESERVED'    },
                    { icon: 'fa-tools',        val: stats.maintenance, label: 'صيانة',          color: '#64748b', bg: '#f1f5f9', status: 'MAINTENANCE' },
                ].map(k => (
                    <div key={k.label}
                         onClick={() => setFilterStatus(prev => prev === k.status ? '' : k.status)}
                         style={{ ...S.kpiCard, borderTopColor: k.color, cursor: 'pointer', outline: filterStatus === k.status ? `2px solid ${k.color}` : 'none', transform: filterStatus === k.status ? 'scale(1.03)' : 'scale(1)', transition: 'all .15s' }}>
                        <div style={{ ...S.kpiIcon, background: k.bg, color: k.color }}><i className={`fas ${k.icon}`} /></div>
                        <div><div style={S.kpiVal}>{k.val}</div><div style={S.kpiLbl}>{k.label}</div></div>
                    </div>
                ))}
            </div>

            {/* ── قائمة الأماكن ── */}
            <div className="card">
                <div className="section-title" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <i className="fas fa-th" /> أماكن موقف {myZone?.zone_name}
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                        {filtered.length}/{enrichedSpots.length} مكان
                    </span>
                    <div style={{ marginRight: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        {filterStatus && (
                            <button onClick={() => setFilterStatus('')}
                                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <i className="fas fa-times" /> إلغاء الفلتر
                            </button>
                        )}
                        <div style={{ position: 'relative' }}>
                            <i className="fas fa-search" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', pointerEvents: 'none' }} />
                            <input className="form-input" placeholder="ابحث عن مكان... (مثال: A-1)"
                                   value={search} onChange={e => setSearch(e.target.value)}
                                   style={{ padding: '7px 32px 7px 12px', fontSize: '0.84rem', width: 200, borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'Tajawal, sans-serif' }} />
                            {search && (
                                <button onClick={() => setSearch('')}
                                        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                                    <i className="fas fa-times-circle" />
                                </button>
                            )}
                        </div>
                        <button onClick={() => { setShowAddForm(v => !v); setAddForm({ spot_type: 'STANDARD', count: 1 }) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', background: showAddForm ? '#fef2f2' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', boxShadow: showAddForm ? 'none' : '0 3px 10px rgba(99,102,241,0.3)', whiteSpace: 'nowrap' }}>
                            <i className={showAddForm ? 'fas fa-times' : 'fas fa-plus'} style={{ color: showAddForm ? '#dc2626' : 'white' }} />
                            <span style={{ color: showAddForm ? '#dc2626' : 'white' }}>{showAddForm ? 'إلغاء' : 'إضافة مكان'}</span>
                        </button>
                    </div>
                </div>

                {/* ── فورم إضافة أماكن ── */}
                {showAddForm && (
                    <div style={{ margin: '0 0 16px', padding: '18px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fas fa-plus-circle" style={{ color: '#6366f1' }} /> إضافة أماكن جديدة
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                                    <i className="fas fa-tag" style={{ marginLeft: 4, color: '#6366f1' }} /> نوع المكان
                                </label>
                                <select className="form-select" value={addForm.spot_type}
                                        onChange={e => setAddForm(p => ({ ...p, spot_type: e.target.value }))}
                                        style={{ padding: '9px 14px', fontSize: '0.88rem', borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', minWidth: 160 }}>
                                    <option value="STANDARD">عادي (A)</option>
                                    <option value="VIP">VIP (B)</option>
                                    <option value="MOTORCYCLE">دراجة (C)</option>
                                    <option value="DISABLED">ذوي احتياجات (D)</option>
                                    <option value="ELECTRIC">كهربائي (E)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
                                    <i className="fas fa-sort-numeric-up" style={{ marginLeft: 4, color: '#6366f1' }} /> العدد
                                </label>
                                <input type="number" min="1" max="50" className="form-input" value={addForm.count}
                                       onChange={e => setAddForm(p => ({ ...p, count: e.target.value }))}
                                       style={{ padding: '9px 12px', fontSize: '0.88rem', borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'Tajawal, sans-serif', width: 90, textAlign: 'center' }} />
                            </div>
                            <div style={{ padding: '9px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600 }}>
                                <i className="fas fa-eye" style={{ marginLeft: 5 }} />
                                ستُنشأ: {(() => {
                                const letter = { STANDARD: 'A', VIP: 'B', MOTORCYCLE: 'C', DISABLED: 'D', ELECTRIC: 'E' }[addForm.spot_type] || 'A'
                                const nums   = spots.filter(s => s.spot_type === addForm.spot_type).map(s => { const m = s.spot_number.match(/(\d+)$/); return m ? parseInt(m[1]) : 0 })
                                const start  = nums.length > 0 ? Math.max(...nums) + 1 : 1
                                const cnt    = Math.min(parseInt(addForm.count) || 1, 3)
                                const prev   = Array.from({ length: cnt }, (_, i) => `${letter}-${start + i}`).join(', ')
                                return parseInt(addForm.count) > 3 ? `${prev}... (${addForm.count} مكان)` : prev
                            })()}
                            </div>
                            <button onClick={handleAddSpots} disabled={addSaving}
                                    style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', fontWeight: 700, cursor: addSaving ? 'not-allowed' : 'pointer', opacity: addSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 3px 10px rgba(16,185,129,0.3)' }}>
                                {addSaving ? <><i className="fas fa-spinner fa-spin" /> جارٍ الإنشاء...</> : <><i className="fas fa-plus-circle" /> إنشاء الأماكن</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── شبكة الأماكن ── */}
                {filtered.length === 0
                    ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                        <i className="fas fa-search" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 12 }} />
                        لا توجد أماكن تطابق البحث
                    </div>
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                        {filtered.map(s => {
                            const sc            = SPOT_COLOR[s.status] || '#64748b'
                            const isHighlighted = search && s.spot_number.toLowerCase().includes(search.toLowerCase())
                            return (
                                <div key={s.spot_id} onClick={() => setModalSpot(s)}
                                     style={{ borderRadius: 10, padding: '12px 6px', textAlign: 'center', background: sc + '18', border: `2px solid ${sc}`, opacity: changing === s.spot_id ? 0.5 : 1, transition: 'all .2s', cursor: 'pointer', boxShadow: isHighlighted ? `0 0 0 3px ${sc}55` : 'none' }}
                                     onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 4px 14px ${sc}44` }}
                                     onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = isHighlighted ? `0 0 0 3px ${sc}55` : 'none' }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: 2 }}>{s.spot_number}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: 6 }}>{TYPE_LABEL[s.spot_type] || s.spot_type}</div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: sc, padding: '2px 6px', background: sc + '22', borderRadius: 6 }}>{SPOT_LABEL[s.status]}</div>
                                </div>
                            )
                        })}
                    </div>
                }
            </div>
        </div>
    )
}