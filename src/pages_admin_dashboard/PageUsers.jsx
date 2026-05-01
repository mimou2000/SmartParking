import React, { useState, useRef, useEffect } from 'react'
import { useData } from '../context/useData.js'
import { useAuth } from '../context/useAuth.js'

/* ─── مساعدات ─── */
const getInitial = (name = '') => name.charAt(0)
const getRoleBadge = (role) =>
    role === 'ADMIN'
        ? { bg: '#f5f3ff', c: '#7c3aed', label: 'مسؤول', icon: 'fa-shield-alt' }
        : { bg: '#f0fdf4', c: '#15803d', label: 'مدير موقف', icon: 'fa-user-tie' }
function formatDate(value) {
  if (!value) return '—'

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString().slice(0, 10)
  }

  if (value?.seconds) { // Firebase Timestamp
    return new Date(value.seconds * 1000).toISOString().slice(0, 10)
  }

  return '—'
}

function checkStrength(val) {
  const r1 = val.length >= 8
  const r2 = /[A-Z]/.test(val)
  const r3 = /\d/.test(val)
  const score = [r1, r2, r3].filter(Boolean).length
  const colors = ['#ef4444', '#f59e0b', '#10b981']
  const labels = ['ضعيفة', 'متوسطة', 'قوية']
  const widths = ['33%', '66%', '100%']
  return { r1, r2, r3, score, color: colors[score-1]||colors[0], label: labels[score-1]||labels[0], width: widths[score-1]||widths[0] }
}

/* ─── قوة كلمة المرور ─── */
function PasswordRules({ val }) {
  const { r1, r2, r3, color, label, width } = checkStrength(val)
  return (
      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 9, marginBottom: 16, fontSize: '.75rem', color: '#64748b' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          <i className="fas fa-shield-alt" style={{ color: '#6366f1', marginLeft: 6 }} />متطلبات كلمة المرور:
        </div>
        {[['r1', r1, '8 أحرف على الأقل'], ['r2', r2, 'حرف كبير واحد'], ['r3', r3, 'رقم واحد على الأقل']].map(([id, ok, text]) => (
            <div key={id} style={{ color: ok ? '#10b981' : '#94a3b8', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={`fas ${ok ? 'fa-check-circle' : 'fa-circle'}`} style={{ fontSize: ok ? '.75rem' : '.5rem' }} />{text}
            </div>
        ))}
        {val && (
            <>
              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width, background: color, borderRadius: 4, transition: 'all .3s' }} />
              </div>
              <div style={{ marginTop: 4, color, fontWeight: 700 }}>القوة: {label}</div>
            </>
        )}
      </div>
  )
}

// ══════════════════════════════════════════════════
//  ✅ Searchable Zone Combobox
// ══════════════════════════════════════════════════
function ZoneCombobox({ zones, value, onChange }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)
  const wrapRef   = useRef(null)

  const selected = zones.find(z => String(z.zone_id) === String(value))

  // فلترة بالبحث — أول 50 نتيجة فقط
  const filtered = query.trim()
      ? zones.filter(z => {
        const q = query.toLowerCase()
        return z.zone_name.toLowerCase().includes(q)
      }).slice(0, 50)
      : zones.slice(0, 50)

  // إغلاق عند النقر خارج
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // تمرير للعنصر المحدد
  useEffect(() => {
    if (active >= 0 && listRef.current) {
      const el = listRef.current.children[active]
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [active])

  const select = (zone) => {
    onChange(zone ? String(zone.zone_id) : '')
    setQuery('')
    setOpen(false)
    setActive(-1)
  }

  const handleKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    if (e.key === 'Enter')      { e.preventDefault(); if (active === -1) select(null); else if (filtered[active]) select(filtered[active]) }
    if (e.key === 'Escape')     { setOpen(false); setQuery('') }
  }

  return (
      <div ref={wrapRef} style={{ position: 'relative' }}>
        {/* ✅ الحل: div يحاكي input — المتصفح لا يرى input حتى يفتح المستخدم القائمة */}
        <div
            style={{
              display: 'flex', alignItems: 'center',
              border: `1.5px solid ${open ? '#6366f1' : '#e2e8f0'}`,
              borderRadius: 9, background: 'white', cursor: 'text',
              transition: 'border-color .2s',
              boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
              minHeight: 38,
            }}
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
        >
          <i className="fas fa-parking" style={{ padding: '0 10px', color: '#94a3b8', fontSize: '.85rem', flexShrink: 0 }} />

          {/* عندما تكون القائمة مفتوحة: input حقيقي للبحث */}
          {open ? (
              <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setActive(-1) }}
                  onKeyDown={handleKey}
                  placeholder="ابحث عن موقف..."
                  type="text"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  style={{
                    flex: 1, border: 'none', outline: 'none', padding: '9px 0',
                    fontSize: '.88rem', fontFamily: 'Tajawal, sans-serif',
                    background: 'transparent', color: '#0f172a',
                  }}
              />
          ) : (
              /* عندما تكون مغلقة: نص عادي — لا input أصلاً */
              <div style={{
                flex: 1, padding: '9px 0', fontSize: '.88rem',
                fontFamily: 'Tajawal, sans-serif',
                color: selected ? '#0f172a' : '#94a3b8',
              }}>
                {selected ? selected.zone_name : 'ابحث عن موقف...'}
              </div>
          )}

          {selected ? (
              <button
                  type="button"
                  onClick={e => { e.stopPropagation(); select(null) }}
                  style={{ padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  title="إلغاء الاختيار"
              >
                <i className="fas fa-times" />
              </button>
          ) : (
              <i className="fas fa-chevron-down" style={{ padding: '0 10px', color: '#94a3b8', fontSize: '.75rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          )}
        </div>

        {/* القائمة المنسدلة */}
        {open && (
            <div
                ref={listRef}
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0,
                  background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999,
                  maxHeight: 220, overflowY: 'auto',
                }}
            >
              {/* خيار "بدون ربط" */}
              <div
                  onClick={() => select(null)}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: '.85rem',
                    color: '#64748b', display: 'flex', alignItems: 'center', gap: 8,
                    background: active === -1 ? '#f0f9ff' : 'white',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                  onMouseEnter={() => setActive(-1)}
              >
                <i className="fas fa-unlink" style={{ fontSize: '.75rem' }} /> بدون ربط
              </div>

              {filtered.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '.85rem' }}>
                    <i className="fas fa-search" style={{ marginLeft: 6 }} />لا توجد نتائج
                  </div>
              ) : filtered.map((z, i) => (
                  <div
                      key={z.zone_id}
                      onClick={() => select(z)}
                      onMouseEnter={() => setActive(i)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', fontSize: '.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: active === i ? '#f0f9ff' : String(z.zone_id) === String(value) ? '#faf5ff' : 'white',
                        borderBottom: '1px solid #f8fafc',
                      }}
                  >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#6366f1', fontSize: '.75rem' }} />
                <span style={{ color: '#0f172a', fontWeight: String(z.zone_id) === String(value) ? 700 : 400 }}>{z.zone_name}</span>
              </span>
                    {String(z.zone_id) === String(value) && (
                        <i className="fas fa-check" style={{ color: '#6366f1', fontSize: '.75rem' }} />
                    )}
                  </div>
              ))}

              {/* عدد النتائج */}
              <div style={{ padding: '6px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: '.72rem', color: '#94a3b8' }}>
                {query ? `${filtered.length} نتيجة من ${zones.length}` : `أول 50 من ${zones.length} موقف`}
              </div>
            </div>
        )}
      </div>
  )
}

/* ─── Modal الحذف ─── */
function DeleteModal({ target, onClose, onConfirm }) {
  if (!target) return null
  const rb = getRoleBadge(target.role)
  const note = target.role === 'ADMIN' ? 'سيتم حذف حساب المسؤول نهائياً من النظام' : 'سيتم فك ارتباط أي مواقف مسندة لهذا المدير تلقائياً'
  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header" style={{ background: 'linear-gradient(135deg,#fef2f2,#fff)' }}>
            <div className="modal-title" style={{ color: '#dc2626' }}>
              <i className="fas fa-trash-alt" style={{ color: '#dc2626' }} /> تأكيد الحذف
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
            <div style={{ width: 70, height: 70, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444' }} />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>هل أنت متأكد من الحذف؟</div>
            <div style={{ fontSize: '.85rem', color: '#64748b', marginBottom: 16 }}>سيتم حذف الحساب التالي نهائياً ولا يمكن التراجع</div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, textAlign: 'right', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: target.role === 'ADMIN' ? '#8b5cf6' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', color: 'white', flexShrink: 0 }}>
                  {getInitial(target.full_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '.95rem' }}>{target.full_name}</div>
                  <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: 2 }}>{target.email}</div>
                  <span style={{ background: rb.bg, color: rb.c, padding: '2px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className={`fas ${rb.icon}`} style={{ fontSize: '.65rem' }} /> {rb.label}
                </span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '.78rem', color: '#94a3b8', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', textAlign: 'right' }}>
              <i className="fas fa-info-circle" style={{ color: '#f59e0b', marginLeft: 6 }} />{note}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #fee2e2', paddingTop: 16, marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}><i className="fas fa-times" /> إلغاء</button>
            <button onClick={onConfirm} style={{ flex: 1, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', border: 'none', padding: '11px 20px', borderRadius: 9, fontFamily: 'Tajawal,sans-serif', fontSize: '.92rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="fas fa-trash-alt" /> نعم، احذف نهائياً
            </button>
          </div>
        </div>
      </div>
  )
}

/* ─── نموذج إضافة مستخدم ─── */
function AddUserForm({ role, zones, onAdd, accentColor = '#6366f1' }) {
  const emptyForm = { name: '', email: '', phone: '', pass: '', pass2: '', zone_id: '' }
  const [form, setForm]     = useState(emptyForm)
  const [showPass, setShowPass] = useState({ p1: false, p2: false })
  const [err, setErr]       = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.pass) { setErr('يرجى ملء جميع الحقول المطلوبة *'); return }
    if (form.pass !== form.pass2) { setErr('كلمتا المرور غير متطابقتين'); return }
    if (form.pass.length < 8) { setErr('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    setErr('')
    onAdd({ ...form, role })
    setForm(emptyForm)
  }

  const isAdmin = role === 'ADMIN'

  return (
      <div className="card">
        <div className="section-title" style={{ marginBottom: 16 }}>
          <i className={`fas ${isAdmin ? 'fa-user-shield' : 'fa-user-plus'}`} style={{ color: accentColor }} />
          {' '}{isAdmin ? 'إضافة مسؤول جديد' : 'إضافة مدير جديد'}
          <span style={{ background: isAdmin ? '#f5f3ff' : '#eff6ff', color: isAdmin ? '#7c3aed' : '#1d4ed8', padding: '2px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, marginRight: 8 }}>{role}</span>
        </div>

        {isAdmin && (
            <div style={{ padding: '10px 14px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 9, marginBottom: 18, fontSize: '.8rem', color: '#92400e', display: 'flex', gap: 8 }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
              <span>المسؤول يملك صلاحيات كاملة على النظام. تأكد من هوية الشخص قبل منحه هذا الدور.</span>
            </div>
        )}

        {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, marginBottom: 14, fontSize: '.82rem', color: '#dc2626' }}>
              <i className="fas fa-exclamation-circle" style={{ marginLeft: 6 }} />{err}
            </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* حقول وهمية تخدع المتصفح وتمنعه من ملء الحقول الحقيقية */}
          <input type="text"   style={{ display:'none' }} aria-hidden="true" tabIndex={-1} readOnly />
          <input type="email"  style={{ display:'none' }} aria-hidden="true" tabIndex={-1} readOnly />
          <input type="password" style={{ display:'none' }} aria-hidden="true" tabIndex={-1} readOnly />
          <div className="form-group">
            <label className="form-label"><i className="fas fa-user" style={{ color: accentColor, marginLeft: 5 }} />الاسم الكامل *</label>
            <input className="form-input" placeholder="أحمد الأمين طاهري" value={form.name} onChange={e => set('name', e.target.value)} required autoComplete="new-password" data-lpignore="true" data-form-type="other" />
          </div>

          <div style={frow}>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-envelope" style={{ color: accentColor, marginLeft: 5 }} />البريد الإلكتروني *</label>
              <input className="form-input" placeholder="manager@smartparking.dz" type="text" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} required autoComplete="new-password" data-lpignore="true" />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-phone" style={{ color: accentColor, marginLeft: 5 }} />رقم الهاتف</label>
              <input className="form-input" placeholder="06********" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="new-password" data-lpignore="true" data-form-type="other" />
            </div>
          </div>

          {/* ✅ Searchable Zone Combobox بدل select عادي */}
          {!isAdmin && (
              <div style={{ padding: 14, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', marginBottom: 16 }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#0369a1', marginBottom: 10 }}>
                  <i className="fas fa-link" style={{ marginLeft: 6 }} />ربط بموقف (اختياري)
                </div>
                <ZoneCombobox
                    zones={zones.filter(z => z.is_active)}
                    value={form.zone_id}
                    onChange={v => set('zone_id', v)}
                />
              </div>
          )}

          <div style={frow}>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-lock" style={{ color: accentColor, marginLeft: 5 }} />كلمة المرور *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass.p1 ? 'text' : 'password'} value={form.pass} onChange={e => set('pass', e.target.value)} placeholder="••••••••" required style={{ paddingLeft: 40 }} />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, p1: !s.p1 }))} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <i className={`fas ${showPass.p1 ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-lock" style={{ color: accentColor, marginLeft: 5 }} />تأكيد كلمة المرور *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass.p2 ? 'text' : 'password'} value={form.pass2} onChange={e => set('pass2', e.target.value)} placeholder="••••••••" required style={{ paddingLeft: 40 }} />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, p2: !s.p2 }))} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <i className={`fas ${showPass.p2 ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>
          </div>

          {form.pass && <PasswordRules val={form.pass} />}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, ...(isAdmin ? { background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' } : {}) }}>
            <i className={`fas ${isAdmin ? 'fa-user-shield' : 'fa-user-plus'}`} />
            {' '}{isAdmin ? 'إضافة المسؤول' : 'إضافة المدير'}
          </button>
        </form>
      </div>
  )
}

/* ─── جدول مستخدمين ─── */
function UsersTable({ users, role, currentUserId, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const isAdmin = role === 'ADMIN'
  const accentColor = isAdmin ? '#8b5cf6' : '#10b981'
  const filtered = users.filter(u =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )
  return (
      <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className={`fas ${isAdmin ? 'fa-shield-alt' : 'fa-users-cog'}`} style={{ color: accentColor }} />
            {isAdmin ? 'قائمة المسؤولين' : 'قائمة المديرين'}
            <span style={{ background: isAdmin ? '#f5f3ff' : '#f0fdf4', color: isAdmin ? '#7c3aed' : '#15803d', padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700 }}>
            {users.length} {isAdmin ? 'مسؤول' : 'مدير'}
          </span>
          </div>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.82rem' }} />
            <input className="form-input" style={{ paddingRight: 36, width: 200, padding: '8px 36px 8px 14px' }} placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} type="search" autoComplete="new-password" />
          </div>
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: isAdmin ? '40%' : '32%' }} />
              <col style={{ width: isAdmin ? '20%' : '30%' }} />
              <col style={{ width: isAdmin ? '20%' : '18%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
            <tr>
              <th style={th}>{isAdmin ? 'المسؤول' : 'المدير'}</th>
              {isAdmin ? (
                  <th style={th}>الدور</th>
              ) : (
                  <th style={th}>الموقف المسند</th>
              )}
              <th style={th}>تاريخ الإضافة</th>
              <th style={th}>إجراءات</th>
            </tr>
            </thead>
            <tbody>
            {filtered.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><i className={`fas ${isAdmin ? 'fa-shield-alt' : 'fa-user-tie'}`} /><p>{isAdmin ? 'لا يوجد مسؤولون بعد' : 'لا يوجد مديرون بعد'}</p></div></td></tr>
            ) : filtered.map(u => {
              const _rb = getRoleBadge(u.role)
              const isCurrent = u.user_id === currentUserId
              return (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: isAdmin ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'linear-gradient(135deg,#10b981,#059669)', flexShrink: 0 }}>
                          {getInitial(u.full_name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name}</span>
                            {isCurrent && <span style={{ fontSize: '.68rem', background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>أنت</span>}
                          </div>
                          <div style={{ fontSize: '.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                          {u.phone && <div style={{ fontSize: '.7rem', color: '#94a3b8' }}><i className="fas fa-phone" style={{ fontSize: '.65rem', marginLeft: 4 }} />{u.phone}</div>}
                        </div>
                      </div>
                    </td>
                    {isAdmin ? (
                        <td style={td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f5f3ff', color: '#7c3aed', padding: '3px 10px', borderRadius: 20, fontSize: '.73rem', fontWeight: 700 }}>
                            <i className="fas fa-shield-alt" style={{ fontSize: '.65rem' }} /> ADMIN
                          </span>
                        </td>
                    ) : (
                        <td style={td}>
                          {u.zone_name
                              ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}><i className="fas fa-map-marker-alt" style={{ marginLeft: 4, fontSize: '.65rem' }} />{u.zone_name}</span>
                              : <span style={{ background: '#f8fafc', color: '#94a3b8', padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-unlink" style={{ fontSize: '.65rem' }} /> غير مرتبط</span>
                          }
                        </td>
                    )}
                    <td style={{ ...td, fontSize: '.8rem', color: '#64748b' }}>{formatDate(u.created_at)}</td>
                    <td style={td}>
                      {isCurrent ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#1d4ed8' }} onClick={() => onEdit(u)}><i className="fas fa-edit" /> تعديل</button>
                            <span style={{ fontSize: '.7rem', color: '#94a3b8', background: '#f8fafc', padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-lock" style={{ fontSize: '.65rem' }} /> أنت</span>
                          </div>
                      ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#1d4ed8' }} onClick={() => onEdit(u)}><i className="fas fa-edit" /> تعديل</button>
                            <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => onDelete(u)}><i className="fas fa-trash" /> حذف</button>
                          </div>
                      )}
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      </div>
  )
}

/* ─── Modal تعديل ─── */
function EditModal({ target, zones, onClose, onSave }) {
  const [showPass, setShowPass] = useState(false)
  const [newPass, setNewPass]   = useState('')
  const [zoneId, setZoneId]     = useState('')

  useEffect(() => {
    if (target) {
      setZoneId(String(target.assigned_zone || ''))
      setNewPass('')
      setShowPass(false)
    }
  }, [target])

  if (!target) return null

  const isAdmin = target.role === 'ADMIN'
  const accentColor = isAdmin ? '#8b5cf6' : '#6366f1'

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    onSave(target.user_id, {
      full_name: fd.get('fname'),
      email:     fd.get('email'),
      phone:     fd.get('phone'),
      zone_id:   zoneId || 'NULL',
      zone_name: zones.find(z => String(z.zone_id) === zoneId)?.zone_name || '',
      password:  newPass || null,
    })
    onClose()
  }

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              <i className={`fas ${isAdmin ? 'fa-user-shield' : 'fa-user-edit'}`} style={{ color: accentColor }} />
              {' '}{isAdmin ? 'تعديل بيانات المسؤول' : 'تعديل بيانات المدير'}
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div style={{ padding: '10px 14px', background: isAdmin ? '#f5f3ff' : '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: '.9rem', fontWeight: 700, color: '#1e293b', border: `1px solid ${isAdmin ? '#ddd6fe' : '#e2e8f0'}` }}>
            <i className={`fas ${isAdmin ? 'fa-shield-alt' : 'fa-user-tie'}`} style={{ color: accentColor, marginLeft: 8 }} />
            تعديل: <strong>{target.full_name}</strong>
          </div>
          <form onSubmit={handleSubmit} autoComplete="off">
            <input type="text"   style={{ display:'none' }} aria-hidden="true" tabIndex={-1} readOnly />
            <input type="email"  style={{ display:'none' }} aria-hidden="true" tabIndex={-1} readOnly />
            <input type="password" style={{ display:'none' }} aria-hidden="true" tabIndex={-1} readOnly />
            <div style={frow}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل *</label>
                <input className="form-input" name="fname" defaultValue={target.full_name} required />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input className="form-input" name="email" type="email" defaultValue={target.email} required />
              </div>
            </div>
            <div style={frow}>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-input" name="phone" defaultValue={target.phone} autoComplete="new-password" data-lpignore="true" data-form-type="other" />
              </div>
              {!isAdmin && (
                  <div className="form-group">
                    <label className="form-label">الموقف المسند</label>
                    <ZoneCombobox
                        zones={zones.filter(z => z.is_active)}
                        value={zoneId}
                        onChange={setZoneId}
                    />
                  </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">
                كلمة المرور الجديدة
                <span style={{ color: '#94a3b8', fontWeight: 400, marginRight: 6 }}>(فارغ = لا تغيير)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" name="pass" type={showPass ? 'text' : 'password'} placeholder="••••••••" style={{ paddingLeft: 40 }} value={newPass} onChange={e => setNewPass(e.target.value)} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {newPass && <PasswordRules val={newPass} />}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
              <button type="submit" className="btn btn-primary" style={isAdmin ? { background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' } : {}}>
                <i className="fas fa-save" /> حفظ التعديلات
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

/* ══════════════════════ الصفحة الرئيسية ══════════════════════ */
export default function PageUsers() {
  const { user: currentUser } = useAuth()
  const { users, zones, managers, admins, addUser, updateUser, deleteUser } = useData()
  const [activeTab, setActiveTab]     = useState('managers')
  const [msg, setMsg]                 = useState({ text: '', ok: false })
  const [editTarget, setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: false }), 4000)
  }

  const handleAdd = async (formData) => {
    try {
      await addUser({ full_name: formData.name, email: formData.email, phone: formData.phone, password: formData.pass, role: formData.role, zone_id: formData.zone_id || null })
      showMsg(`تم إضافة ${formData.role === 'ADMIN' ? 'المسؤول' : 'المدير'}: «${formData.name}» بنجاح!`)
    } catch (err) { showMsg(err.message, false) }
  }

  const handleSave = async (uid, data) => {
    try { await updateUser(uid, data); showMsg('تم تحديث البيانات بنجاح!') }
    catch (err) { showMsg(err.message, false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await deleteUser(deleteTarget.user_id); setDeleteTarget(null); showMsg('تم حذف الحساب بنجاح.') }
    catch (err) { showMsg(err.message, false) }
  }

  return (
      <div className="fade-in">
        {msg.text && (
            <div className={`notify ${msg.ok ? 'notify-ok' : 'notify-err'}`}>
              <i className={`fas ${msg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />{msg.text}
            </div>
        )}

        {/* ── KPI ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: 'fa-users',          val: users.length,                                 label: 'إجمالي الحسابات',   border: '#6366f1', bg: '#eff6ff', ic: '#6366f1' },
            { icon: 'fa-shield-alt',     val: admins.length,                                label: 'مسؤولون (ADMIN)',   border: '#8b5cf6', bg: '#f5f3ff', ic: '#8b5cf6' },
            { icon: 'fa-user-tie',       val: managers.length,                              label: 'مديرون (MANAGER)',  border: '#10b981', bg: '#f0fdf4', ic: '#10b981' },
            { icon: 'fa-map-marked-alt', val: managers.filter(m => m.assigned_zone || m.zone_id || m.zone_name).length, label: 'مرتبطون بموقف',   border: '#f59e0b', bg: '#fff7ed', ic: '#f59e0b' },
          ].map(k => (
              <div key={k.label} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', borderTop: `4px solid ${k.border}`, boxShadow: '0 2px 10px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, background: k.bg, color: k.ic }}>
                  <i className={`fas ${k.icon}`} />
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
          ))}
        </div>

        {/* ── التبويبات ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, background: '#f8fafc', padding: 6, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content' }}>
          {[
            { key: 'managers', icon: 'fa-user-tie',   label: 'المديرون',   count: managers.length, color: '#10b981' },
            { key: 'admins',   icon: 'fa-shield-alt', label: 'المسؤولون', count: admins.length,   color: '#8b5cf6' },
          ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      style={{ padding: '10px 22px', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', fontSize: '.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s', background: activeTab === tab.key ? 'white' : 'transparent', color: activeTab === tab.key ? '#0f172a' : '#64748b', boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,.1)' : 'none' }}>
                <i className={`fas ${tab.icon}`} />{tab.label}
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: tab.color, color: 'white', fontSize: '.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 20, minWidth: 20 }}>{tab.count}</span>
              </button>
          ))}
        </div>

        {activeTab === 'managers' && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              <AddUserForm role="MANAGER" zones={zones} onAdd={handleAdd} accentColor="#6366f1" />
              <UsersTable users={managers} role="MANAGER" currentUserId={currentUser?.uid} onEdit={setEditTarget} onDelete={setDeleteTarget} />
            </div>
        )}
        {activeTab === 'admins' && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              <AddUserForm role="ADMIN" zones={zones} onAdd={handleAdd} accentColor="#8b5cf6" />
              <UsersTable users={admins} role="ADMIN" currentUserId={currentUser?.uid} onEdit={setEditTarget} onDelete={setDeleteTarget} />
            </div>
        )}

        <EditModal target={editTarget} zones={zones} onClose={() => setEditTarget(null)} onSave={handleSave} />
        <DeleteModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      </div>
  )
}

const frow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
const th = { padding: '12px 16px', textAlign: 'right', fontSize: '.8rem', fontWeight: 700, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }
const td = { padding: '14px 16px', verticalAlign: 'middle' }