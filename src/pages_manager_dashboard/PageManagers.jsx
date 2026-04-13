// ══════════════════════════════════════════════════════
//  src/pages_manager_dashboard/PageManagers.jsx
// ══════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react'
import { managersAPI, zonesAPI, usersAPI } from '../api/firebaseApi'
import { toDate } from '../utils/constants_manager'

// ── قوة كلمة المرور ───────────────────────────────────
function getPasswordStrength(pw) {
    if (!pw) return null
    let score = 0
    if (pw.length >= 8)          score++
    if (/[A-Z]/.test(pw))        score++
    if (/[0-9]/.test(pw))        score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { label: 'ضعيفة',    color: '#ef4444', width: '25%'  }
    if (score === 2) return { label: 'متوسطة',  color: '#f59e0b', width: '55%'  }
    if (score === 3) return { label: 'جيدة',    color: '#3b82f6', width: '75%'  }
    return              { label: 'قوية',        color: '#10b981', width: '100%' }
}

export function PageManagers({ myZone, currentUser }) {
    const [managers,     setManagers]     = useState([])
    const [loading,      setLoading]      = useState(true)
    const [saving,       setSaving]       = useState(false)
    const [savingPrice,  setSavingPrice]  = useState(false)
    const [showForm,     setShowForm]     = useState(false)
    const [editTarget,   setEditTarget]   = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting,     setDeleting]     = useState(false)
    const [showPass,     setShowPass]     = useState(false)
    const [msg,          setMsg]          = useState({ text: '', ok: false })
    const [form,         setForm]         = useState({ full_name: '', email: '', password: '', phone: '' })
    const [prices,       setPrices]       = useState({ hourly_rate: '', daily_rate: '', weekly_rate: '' })

    const showMsg = (text, ok = true) => {
        setMsg({ text, ok })
        setTimeout(() => setMsg({ text: '', ok: false }), 4000)
    }

    const fetchManagers = useCallback(async () => {
        if (!myZone?.zone_id) { setLoading(false); return }
        setLoading(true)
        try {
            const res = await managersAPI.getAll()
            if (res.ok) setManagers(res.managers.filter(m => m.zone_id === myZone.zone_id))
        } catch (err) { showMsg(err.message, false) }
        finally { setLoading(false) }
    }, [myZone])

    useEffect(() => { fetchManagers() }, [fetchManagers])

    useEffect(() => {
        if (myZone) setPrices({
            hourly_rate: String(myZone.hourly_rate  || ''),
            daily_rate:  String(myZone.daily_rate   || ''),
            weekly_rate: String(myZone.weekly_rate  || ''),
        })
    }, [myZone])

    const resetForm = () => {
        setForm({ full_name: '', email: '', password: '', phone: '' })
        setShowPass(false)
    }

    // ── إضافة ──
    const handleAdd = async () => {
        if (!form.full_name || !form.email || !form.password) {
            showMsg('يرجى ملء جميع الحقول الإلزامية', false); return
        }
        setSaving(true)
        try {
            await managersAPI.add({
                full_name: form.full_name, email: form.email,
                password: form.password,  phone: form.phone,
                zone_id: myZone.zone_id,  role: 'MANAGER',
            })
            showMsg('تم إضافة المدير بنجاح ✅')
            resetForm(); setShowForm(false); fetchManagers()
        } catch (err) { showMsg(err.message, false) }
        finally { setSaving(false) }
    }

    // ── فتح مودال التعديل ──
    const openEdit = (m) => {
        setEditTarget(m)
        setForm({ full_name: m.full_name || '', email: m.email || '', password: '', phone: m.phone || '' })
        setShowPass(false)
        setShowForm(false)
    }

    // ── حفظ التعديل ──
    const handleEdit = async () => {
        if (!form.full_name) { showMsg('الاسم الكامل إلزامي', false); return }
        setSaving(true)
        try {
            const data = { user_id: editTarget.user_id, full_name: form.full_name, phone: form.phone }
            if (form.password) data.password = form.password
            await managersAPI.edit(data)
            showMsg('تم تحديث بيانات المدير ✅')
            setEditTarget(null); resetForm(); fetchManagers()
        } catch (err) { showMsg(err.message, false) }
        finally { setSaving(false) }
    }

    // ── حذف ──
    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await usersAPI.delete(deleteTarget.user_id)
            showMsg('تم حذف المدير بنجاح ✅')
            setDeleteTarget(null); fetchManagers()
        } catch (err) { showMsg(err.message, false) }
        finally { setDeleting(false) }
    }

    // ── التسعيرة ──
    const handleSavePrice = async () => {
        const hourly = parseFloat(prices.hourly_rate)
        if (!prices.hourly_rate || isNaN(hourly) || hourly <= 0) {
            showMsg('السعر بالساعة إلزامي ويجب أن يكون أكبر من صفر', false); return
        }
        setSavingPrice(true)
        try {
            const payload = { hourly_rate: hourly }
            const daily  = parseFloat(prices.daily_rate)
            const weekly = parseFloat(prices.weekly_rate)
            if (!isNaN(daily)  && daily  > 0) payload.daily_rate  = daily
            if (!isNaN(weekly) && weekly > 0) payload.weekly_rate = weekly
            await zonesAPI.updatePrice(myZone.zone_id, payload)
            showMsg('تم تحديث التسعيرة بنجاح ✅')
        } catch (err) { showMsg(err.message, false) }
        finally { setSavingPrice(false) }
    }

    const strength = getPasswordStrength(form.password)

    const priceFields = [
        { key: 'hourly_rate', label: 'السعر بالساعة',  icon: 'fa-clock',         color: '#6366f1', required: true  },
        { key: 'daily_rate',  label: 'السعر باليوم',   icon: 'fa-sun',           color: '#f59e0b', required: false },
        { key: 'weekly_rate', label: 'السعر بالأسبوع', icon: 'fa-calendar-week', color: '#8b5cf6', required: false },
    ]

    const addFields = [
        { key: 'full_name', label: 'الاسم الكامل',      icon: 'fa-user',     type: 'text',  ph: 'مثال: أحمد بن علي', required: true  },
        { key: 'email',     label: 'البريد الإلكتروني', icon: 'fa-envelope', type: 'email', ph: 'example@mail.com',  required: true  },
        { key: 'phone',     label: 'رقم الهاتف',         icon: 'fa-phone',    type: 'text',  ph: '0555 000 000',      required: false },
    ]

    return (
        <div className="fade-in">

            {/* ── إشعار ── */}
            {msg.text && (
                <div className={msg.ok ? 'notify notify-ok' : 'notify notify-err'}>
                    <i className={msg.ok ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} /> {msg.text}
                </div>
            )}

            {/* ══ مودال تعديل المدير (بدون شريط أزرق) ══ */}
            {editTarget && (
                <div style={S.overlay} onClick={() => { setEditTarget(null); resetForm() }}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>

                        {/* جسم المودال */}
                        <div style={{ padding: '24px' }}>

                            {/* رأس المودال البسيط */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        background: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <i className="fas fa-user-edit" style={{ color: '#6366f1', fontSize: '1.1rem' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                                            تعديل بيانات المدير
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                            تحديث معلومات المدير الحالية
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setEditTarget(null); resetForm() }}
                                    style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: 10,
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.target.style.background = '#e2e8f0'
                                        e.target.style.color = '#0f172a'
                                    }}
                                    onMouseLeave={e => {
                                        e.target.style.background = '#f1f5f9'
                                        e.target.style.color = '#64748b'
                                    }}
                                >
                                    <i className="fas fa-times" />
                                </button>
                            </div>

                            {/* شارة اسم المدير */}
                            <div style={{
                                background: '#f8fafc',
                                borderRadius: 12,
                                padding: '12px 16px',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                border: '1px solid #e2e8f0'
                            }}>
                                <div className="avatar" style={{
                                    background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                                    flexShrink: 0,
                                    width: 44,
                                    height: 44,
                                    fontSize: '1.1rem'
                                }}>
                                    {(editTarget.full_name || '?').charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                                        {editTarget.full_name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{editTarget.email}</div>
                                </div>
                            </div>

                            {/* صف: الاسم + البريد */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                <div>
                                    <label style={S.label}>
                                        الاسم الكامل <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.full_name}
                                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                                        style={S.input}
                                    />
                                </div>
                                <div>
                                    <label style={S.label}>البريد الإلكتروني <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        disabled
                                        style={{ ...S.input, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }}
                                    />
                                </div>
                            </div>

                            {/* صف: الهاتف + الموقف */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                <div>
                                    <label style={S.label}>رقم الهاتف</label>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                        placeholder="0555 000 000"
                                        style={S.input}
                                    />
                                </div>
                                <div>
                                    <label style={S.label}>الموقف المسند</label>
                                    <div style={{ ...S.input, background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fas fa-parking" style={{ color: '#6366f1' }} />
                                        {myZone?.zone_name || '—'}
                                    </div>
                                </div>
                            </div>

                            {/* كلمة المرور */}
                            <div style={{ marginBottom: 6 }}>
                                <label style={S.label}>
                                    كلمة المرور الجديدة
                                    <span style={{ fontWeight: 400, color: '#94a3b8', marginRight: 6 }}>(فارغ = لا تغيير)</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        placeholder="••••••••"
                                        style={{ ...S.input, paddingLeft: 40 }}
                                    />
                                    <button
                                        onClick={() => setShowPass(v => !v)}
                                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                                    >
                                        <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* متطلبات + قوة كلمة المرور */}
                            {form.password && (
                                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                                        <i className="fas fa-shield-alt" style={{ marginLeft: 5, color: '#6366f1' }} />
                                        متطلبات كلمة المرور:
                                    </div>
                                    {[
                                        { test: form.password.length >= 8,          label: '8 أحرف على الأقل'    },
                                        { test: /[A-Z]/.test(form.password),         label: 'حرف كبير واحد'       },
                                        { test: /[0-9]/.test(form.password),         label: 'رقم واحد على الأقل'  },
                                    ].map(r => (
                                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                            <i className={`fas ${r.test ? 'fa-check-circle' : 'fa-circle'}`}
                                               style={{ fontSize: '0.7rem', color: r.test ? '#10b981' : '#cbd5e1' }} />
                                            <span style={{ fontSize: '0.75rem', color: r.test ? '#10b981' : '#94a3b8', fontWeight: r.test ? 600 : 400 }}>
                                                {r.label}
                                            </span>
                                        </div>
                                    ))}
                                    {/* شريط القوة */}
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ background: '#e2e8f0', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                                            <div style={{ width: strength?.width, height: '100%', background: strength?.color, borderRadius: 20, transition: 'width 0.3s' }} />
                                        </div>
                                        <div style={{ textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: strength?.color, marginTop: 4 }}>
                                            القوة: {strength?.label}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* خط فاصل */}
                            <div style={{ height: 1, background: '#e2e8f0', margin: '18px 0' }} />

                            {/* أزرار */}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => { setEditTarget(null); resetForm() }} style={S.btnCancel}>
                                    إلغاء
                                </button>
                                <button onClick={handleEdit} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                    {saving
                                        ? <><i className="fas fa-spinner fa-spin" /> جارٍ الحفظ...</>
                                        : <><i className="fas fa-save" /> حفظ التعديلات</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ مودال تأكيد الحذف ══ */}
            {deleteTarget && (
                <div style={S.overlay} onClick={() => setDeleteTarget(null)}>
                    <div style={{ ...S.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', padding: '24px 24px 20px' }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                <i className="fas fa-trash-alt" style={{ color: '#ef4444', fontSize: '1.5rem' }} />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 8 }}>تأكيد الحذف</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                                هل أنت متأكد من حذف المدير<br />
                                <strong style={{ color: '#0f172a' }}>{deleteTarget.full_name}</strong>؟
                                <br />لا يمكن التراجع عن هذا الإجراء.
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                                <button onClick={() => setDeleteTarget(null)} style={S.btnCancel}>إلغاء</button>
                                <button onClick={handleDelete} disabled={deleting} style={{ ...S.btnDanger, opacity: deleting ? 0.7 : 1 }}>
                                    {deleting ? <><i className="fas fa-spinner fa-spin" /> جارٍ الحذف...</> : <><i className="fas fa-trash-alt" /> حذف</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ قسم التسعيرة ══ */}
            <div className="card" style={{ marginBottom: 22, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9' }}>
                    <i className="fas fa-tags" style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                        تسعيرة موقف {myZone?.zone_name}
                    </span>
                </div>
                <div style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                        {priceFields.map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                                    <i className={`fas ${f.icon}`} style={{ marginLeft: 5, color: f.color }} />
                                    {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number" min="0" step="0.01" placeholder="0.00"
                                        value={prices[f.key]}
                                        onChange={e => setPrices(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        onFocus={e => e.target.style.borderColor = f.color}
                                        onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                                        style={{ width: '100%', padding: '9px 12px 9px 40px', fontSize: '0.88rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box', outline: 'none' }}
                                    />
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>دج</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <i className="fas fa-info-circle" style={{ color: '#16a34a' }} />
                        <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                            السعر باليوم والأسبوع اختياريان
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSavePrice} disabled={savingPrice}
                                style={{ ...S.btnSuccess, opacity: savingPrice ? 0.7 : 1, cursor: savingPrice ? 'not-allowed' : 'pointer' }}>
                            {savingPrice ? <><i className="fas fa-spinner fa-spin" /> جارٍ الحفظ...</> : <><i className="fas fa-save" /> حفظ التسعيرة</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* ══ قسم المديرين ══ */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-user-shield" style={{ color: 'var(--primary)' }} />
                        مديرو موقف {myZone?.zone_name}
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>{managers.length} مدير</span>
                    </div>
                    <button onClick={() => { setShowForm(v => !v); resetForm() }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                        <i className={showForm ? 'fas fa-times' : 'fas fa-plus'} />
                        {showForm ? 'إلغاء' : 'إضافة مدير'}
                    </button>
                </div>

                {/* ── نموذج إضافة ── */}
                {showForm && (
                    <div style={{ margin: '0 20px 20px', padding: 20, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fas fa-user-plus" style={{ color: '#6366f1' }} /> بيانات المدير الجديد
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            {addFields.map(f => (
                                <div key={f.key}>
                                    <label style={S.label}>
                                        <i className={'fas ' + f.icon} style={{ marginLeft: 5, color: '#6366f1' }} />
                                        {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                    </label>
                                    <input type={f.type} placeholder={f.ph} value={form[f.key]}
                                           onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                           style={S.input} />
                                </div>
                            ))}
                            <div>
                                <label style={S.label}>
                                    <i className="fas fa-lock" style={{ marginLeft: 5, color: '#6366f1' }} />
                                    كلمة المرور <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        style={{ ...S.input, paddingLeft: 40 }}
                                    />
                                    <button onClick={() => setShowPass(v => !v)}
                                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                                        <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <i className="fas fa-parking" style={{ color: '#3b82f6' }} />
                            <span style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600 }}>
                                سيتم تعيين المدير تلقائياً لموقف: <strong>{myZone?.zone_name}</strong>
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowForm(false); resetForm() }} style={S.btnCancel}>إلغاء</button>
                            <button onClick={handleAdd} disabled={saving}
                                    style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                {saving ? <><i className="fas fa-spinner fa-spin" /> جارٍ الحفظ...</> : <><i className="fas fa-save" /> حفظ المدير</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── الجدول ── */}
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr><th>#</th><th>المدير</th><th>البريد</th><th>الهاتف</th><th>تاريخ الإضافة</th><th>الحالة</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                            </td></tr>
                        ) : managers.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                <i className="fas fa-user-shield" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 8 }} />
                                لا يوجد مديرون في هذا الموقف
                            </td></tr>
                        ) : managers.map((m, i) => {
                            const isMe = m.user_id === currentUser?.uid
                            return (
                                <tr key={m.user_id} style={{ background: isMe ? '#f8f7ff' : 'white' }}>
                                    <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="avatar" style={isMe ? { background: 'linear-gradient(135deg,#6366f1,#818cf8)' } : {}}>
                                                {(m.full_name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.full_name}</div>
                                                {isMe && <div style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600 }}>• أنت</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.email}</td>
                                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{m.phone || '—'}</td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.created_at ? toDate(m.created_at)?.toLocaleDateString('ar-DZ') : '—'}</td>
                                    <td>
                                        <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                                            <i className="fas fa-circle" style={{ fontSize: '0.5rem', marginLeft: 4 }} />نشط
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => openEdit(m)} title="تعديل"
                                                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#fffbeb', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                                <i className="fas fa-edit" />
                                            </button>
                                            {!isMe && (
                                                <button onClick={() => setDeleteTarget(m)} title="حذف"
                                                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                                    <i className="fas fa-trash-alt" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
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

// ── أنماط مشتركة ──────────────────────────────────────
const S = {
    overlay:     { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },
    modal:       { background: 'white', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' },
    label:       { fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 },
    input:       { width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' },
    btnCancel:   { padding: '9px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 },
    btnPrimary:  { padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
    btnSuccess:  { padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#34d399)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },
    btnDanger:   { padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#f87171)', color: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
}