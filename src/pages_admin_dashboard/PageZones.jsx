import React, { useState, useRef, useEffect } from 'react'
import { useData } from '../context/useData.js'

function SearchCombobox({ items, value, onChange, placeholder = 'ابحث...', icon = 'fa-search', emptyLabel = 'بدون اختيار', emptyIcon = 'fa-times' }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef(null)
  const listRef  = useRef(null)
  const wrapRef  = useRef(null)
  const selected = items.find(i => String(i.value) === String(value))
  const filtered = query.trim()
      ? items.filter(i => (i.searchText ?? i.label.toLowerCase()).includes(query.toLowerCase())).slice(0, 50)
      : items.slice(0, 50)
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  useEffect(() => { if (active >= 0 && listRef.current) listRef.current.children[active]?.scrollIntoView({ block: 'nearest' }) }, [active])
  const select = (item) => { onChange(item ? String(item.value) : ''); setQuery(''); setOpen(false); setActive(-1) }
  const handleKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    if (e.key === 'Enter')     { e.preventDefault(); active === -1 ? select(null) : filtered[active] && select(filtered[active]) }
    if (e.key === 'Escape')    { setOpen(false); setQuery('') }
  }
  return (
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${open ? '#6366f1' : '#e2e8f0'}`, borderRadius: 9, background: 'white', cursor: 'text', transition: 'border-color .2s', boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none', minHeight: 38 }}
             onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}>
          <i className={`fas ${icon}`} style={{ padding: '0 10px', color: '#94a3b8', fontSize: '.85rem', flexShrink: 0 }} />
          {open ? (
              <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActive(-1) }} onKeyDown={handleKey}
                     placeholder={placeholder} type="text" autoComplete="off" data-form-type="other" data-lpignore="true"
                     style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 0', fontSize: '.88rem', fontFamily: 'Tajawal, sans-serif', background: 'transparent', color: '#0f172a' }} />
          ) : (
              <div style={{ flex: 1, padding: '9px 0', fontSize: '.88rem', fontFamily: 'Tajawal, sans-serif', color: selected ? '#0f172a' : '#94a3b8' }}>
                {selected ? selected.label : placeholder}
              </div>
          )}
          {selected
              ? <button type="button" onClick={e => { e.stopPropagation(); select(null) }} style={{ padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><i className="fas fa-times" /></button>
              : <i className="fas fa-chevron-down" style={{ padding: '0 10px', color: '#94a3b8', fontSize: '.75rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          }
        </div>
        {open && (
            <div ref={listRef} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, maxHeight: 220, overflowY: 'auto' }}>
              <div onClick={() => select(null)} onMouseEnter={() => setActive(-1)}
                   style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, background: active === -1 ? '#f0f9ff' : 'white', borderBottom: '1px solid #f1f5f9' }}>
                <i className={`fas ${emptyIcon}`} style={{ fontSize: '.75rem' }} /> {emptyLabel}
              </div>
              {filtered.length === 0
                  ? <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '.85rem' }}><i className="fas fa-search" style={{ marginLeft: 6 }} />لا توجد نتائج</div>
                  : filtered.map((item, i) => (
                      <div key={item.value} onClick={() => select(item)} onMouseEnter={() => setActive(i)}
                           style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active === i ? '#f0f9ff' : String(item.value) === String(value) ? '#faf5ff' : 'white', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.avatar
                      ? <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{item.avatar}</div>
                      : <i className={`fas ${icon}`} style={{ color: '#6366f1', fontSize: '.75rem' }} />
                  }
                  <div>
                    <div style={{ color: '#0f172a', fontWeight: String(item.value) === String(value) ? 700 : 400 }}>{item.label}</div>
                    {item.sub && <div style={{ fontSize: '.7rem', color: '#94a3b8' }}>{item.sub}</div>}
                  </div>
                </span>
                        {String(item.value) === String(value) && <i className="fas fa-check" style={{ color: '#6366f1', fontSize: '.75rem' }} />}
                      </div>
                  ))
              }
              <div style={{ padding: '6px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: '.72rem', color: '#94a3b8' }}>
                {query ? `${filtered.length} نتيجة من ${items.length}` : `أول 50 من ${items.length}`}
              </div>
            </div>
        )}
      </div>
  )
}

const SPOT_TYPES = [
  { key: 'STANDARD',   label: 'سيارة عادية',       icon: 'fa-car',        color: '#6366f1', bg: '#eff6ff' },
  { key: 'VIP',        label: 'VIP / فاخرة',        icon: 'fa-star',       color: '#f59e0b', bg: '#fffbeb' },
  { key: 'MOTORCYCLE', label: 'دراجة نارية / موتو', icon: 'fa-motorcycle', color: '#10b981', bg: '#f0fdf4' },
  { key: 'DISABLED',   label: 'ذوو الاحتياجات',     icon: 'fa-wheelchair', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'ELECTRIC',   label: 'سيارة كهربائية',     icon: 'fa-bolt',       color: '#8b5cf6', bg: '#f5f3ff' },
]

function SpotTypesInput({ value, onChange }) {
  const total = Object.values(value).reduce((s, n) => s + (parseInt(n) || 0), 0)
  const set = (key, val) => { const n = Math.max(0, parseInt(val) || 0); onChange({ ...value, [key]: n }) }
  return (
      <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-layer-group" style={{ color: '#818cf8' }} /> توزيع الأماكن حسب النوع *
          </div>
          <div style={{ background: total > 0 ? '#10b981' : '#475569', color: 'white', padding: '3px 12px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700, transition: 'background .3s' }}>
            المجموع: {total} مكان
          </div>
        </div>
        <div style={{ padding: '10px 12px' }}>
          {SPOT_TYPES.map(t => {
            const count = value[t.key] || 0
            const pct   = total > 0 ? Math.round(count / total * 100) : 0
            return (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: 'white', borderRadius: 10, padding: '9px 10px', border: `1.5px solid ${count > 0 ? t.color + '50' : '#f1f5f9'}`, transition: 'border-color .2s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: count > 0 ? t.bg : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${t.icon}`} style={{ color: count > 0 ? t.color : '#cbd5e1', fontSize: '.82rem' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: count > 0 ? '#0f172a' : '#94a3b8', marginBottom: 3 }}>{t.label}</div>
                    <div style={{ height: 3, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: t.color, borderRadius: 4, transition: 'width .3s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '.7rem', color: count > 0 ? t.color : '#cbd5e1', fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                    {count > 0 ? `${pct}%` : '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <button type="button" onClick={() => set(t.key, count - 1)} disabled={count === 0}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #e2e8f0', background: 'white', cursor: count > 0 ? 'pointer' : 'not-allowed', color: count > 0 ? '#0f172a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem' }}>
                      <i className="fas fa-minus" />
                    </button>
                    <input type="number" min="0" value={count} onChange={e => set(t.key, e.target.value)}
                           style={{ width: 52, textAlign: 'center', border: `1.5px solid ${count > 0 ? t.color + '60' : '#e2e8f0'}`, borderRadius: 6, padding: '3px 0', fontSize: '.85rem', fontFamily: 'Tajawal,sans-serif', fontWeight: 700, outline: 'none', color: '#0f172a' }} />
                    <button type="button" onClick={() => set(t.key, count + 1)}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem' }}>
                      <i className="fas fa-plus" />
                    </button>
                  </div>
                </div>
            )
          })}
        </div>
        {total > 0 && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {SPOT_TYPES.filter(t => (value[t.key] || 0) > 0).map(t => (
                  <span key={t.key} style={{ background: t.bg, color: t.color, padding: '3px 9px', borderRadius: 20, fontSize: '.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className={`fas ${t.icon}`} style={{ fontSize: '.62rem' }} /> {t.label}: {value[t.key]}
            </span>
              ))}
            </div>
        )}
      </div>
  )
}

function SpotTypesBadges({ spotTypes }) {
  if (!spotTypes || Object.keys(spotTypes).length === 0) return null
  const hasAny = SPOT_TYPES.some(t => spotTypes[t.key] > 0)
  if (!hasAny) return null
  return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {SPOT_TYPES.filter(t => spotTypes[t.key] > 0).map(t => (
            <span key={t.key} style={{ background: t.bg, color: t.color, padding: '3px 9px', borderRadius: 20, fontSize: '.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <i className={`fas ${t.icon}`} style={{ fontSize: '.6rem' }} /> {spotTypes[t.key]} {t.label}
        </span>
        ))}
      </div>
  )
}

export default function PageZones() {
  const { zones, managers, addZone, updateZone } = useData()
  const [msg, setMsg]               = useState({ text: '', ok: false })
  const [showPriceModal, setShowPriceModal] = useState(null)
  const [zoneSearch, setZoneSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const emptyForm  = { zn: '', zl: '', hr: '', dr: '', wr: '', mid: '', mlat: '', mlng: '' }
  const emptyTypes = { STANDARD: 0, VIP: 0, MOTORCYCLE: 0, DISABLED: 0, ELECTRIC: 0 }
  const [form, setForm]           = useState(emptyForm)
  const [spotTypes, setSpotTypes] = useState(emptyTypes)
  const showMsg = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: false }), 4000) }
  const totalSpots = Object.values(spotTypes).reduce((s, n) => s + (parseInt(n) || 0), 0)

  // ✅ المديرون المتاحون = من ليس لديهم zone_id في Firestore
  const availableManagers = managers.filter(m =>
      !m.zone_id || m.zone_id === "NULL" || m.zone_id === '' || m.zone_id === ''
  )

  // ✅ مديرو منطقة معينة
  const getZoneManagers = (zoneId) =>
      managers.filter(m => String(m.zone_id) === String(zoneId))

  const managerItems = availableManagers.map(m => ({
    value: m.user_id, label: m.full_name, avatar: m.full_name?.charAt(0), sub: m.email,
    searchText: `${m.full_name} ${m.email}`.toLowerCase(),
  }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.zn || !form.zl || !form.hr) { showMsg('يرجى ملء الحقول المطلوبة *', false); return }
    if (totalSpots < 1) { showMsg('يجب إضافة نوع واحد على الأقل بعدد أكبر من 0', false); return }
    try {
      const zoneRef = await addZone({
        zone_name:   form.zn,
        location:    form.zl,
        hourly_rate: parseFloat(form.hr),
        daily_rate:  form.dr ? parseFloat(form.dr) : null,
        weekly_rate: form.wr ? parseFloat(form.wr) : null,
        latitude:    form.mlat || null,
        longitude:   form.mlng || null,
        is_active:   true,
        spot_types:  spotTypes,
      })
      // ✅ إذا تم اختيار مدير — نحدث zone_id في حسابه
      if (form.mid && zoneRef?.zone_id) {
        const { usersAPI } = await import('../api/firebaseApi')
        await usersAPI.edit({ user_id: form.mid, zone_id: zoneRef.zone_id })
      }
      setForm(emptyForm); setSpotTypes(emptyTypes)
      showMsg(`تم إنشاء منطقة «${form.zn}» بنجاح مع ${totalSpots} مكان وقوف!`)
    } catch (err) { showMsg(err.message, false) }
  }

  const toggleActive = async (zoneId, activate) => {
    try {
      const zone = zones.find(z => z.zone_id === zoneId)
      await updateZone(zoneId, { ...zone, is_active: activate })
      showMsg(activate ? 'تم تفعيل المنطقة بنجاح.' : 'تم تعطيل المنطقة بنجاح.')
    } catch (err) { showMsg(err.message, false) }
  }

  const updatePrice = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await updateZone(showPriceModal.zone_id, {
        ...showPriceModal,
        hourly_rate: parseFloat(fd.get('hr')),
        daily_rate:  fd.get('dr') ? parseFloat(fd.get('dr')) : null,
        weekly_rate: fd.get('wr') ? parseFloat(fd.get('wr')) : null,
      })
      setShowPriceModal(null); showMsg('تم تحديث الأسعار بنجاح')
    } catch (err) { showMsg(err.message, false) }
  }

  const occColor = (pct) => pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'

  const filteredZones = zones.filter(z => {
    const q = zoneSearch.toLowerCase()
    const matchSearch = !q || z.zone_name?.toLowerCase().includes(q) || z.location?.toLowerCase().includes(q)
    const matchFilter = zoneFilter === 'all' ? true : zoneFilter === 'active' ? z.is_active : !z.is_active
    return matchSearch && matchFilter
  })

  return (
      <div className="fade-in">
        {msg.text && (
            <div className={`notify ${msg.ok ? 'notify-ok' : 'notify-err'}`}>
              <i className={`fas ${msg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />{msg.text}
            </div>
        )}

        <div style={styles.grid}>
          <div className="card">
            <div className="section-title"><i className="fas fa-plus-circle" /> إنشاء منطقة وقوف جديدة</div>
            <form onSubmit={handleCreate} autoComplete="off">
              <div style={styles.frow}>
                <div className="form-group">
                  <label className="form-label">اسم المنطقة *</label>
                  <input className="form-input" placeholder="موقف المركز التجاري" value={form.zn} onChange={e => setForm(f => ({ ...f, zn: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">الموقع *</label>
                  <input className="form-input" placeholder="بوسعادة - حي الشهداء" value={form.zl} onChange={e => setForm(f => ({ ...f, zl: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  المدير المسؤول
                  <span style={{ marginRight: 6, fontSize: '.7rem', color: '#10b981', fontWeight: 600 }}>({availableManagers.length} متاح)</span>
                </label>
                {availableManagers.length === 0
                    ? <div style={{ padding: '9px 12px', background: '#fef9ee', border: '1px solid #fde68a', borderRadius: 9, fontSize: '.82rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }} /> جميع المديرين مرتبطون بمواقف
                    </div>
                    : <SearchCombobox items={managerItems} value={form.mid} onChange={v => setForm(f => ({ ...f, mid: v }))}
                                      placeholder="ابحث عن مدير متاح..." icon="fa-user-tie" emptyLabel="بدون مدير" emptyIcon="fa-user-slash" />
                }
              </div>

              <SpotTypesInput value={spotTypes} onChange={setSpotTypes} />

              <div style={styles.infoBox}>
                <div style={styles.infoBoxLabel}><i className="fas fa-tags" /> الأسعار (بالدج)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label"><i className="fas fa-clock" style={{ marginLeft: 5, color: '#6366f1' }} /> بالساعة *</label>
                    <input className="form-input" type="number" placeholder="50" step="0.01" min="0.01" value={form.hr} onChange={e => setForm(f => ({ ...f, hr: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label"><i className="fas fa-sun" style={{ marginLeft: 5, color: '#f59e0b' }} /> باليوم</label>
                    <input className="form-input" type="number" placeholder="400" step="0.01" min="0" value={form.dr} onChange={e => setForm(f => ({ ...f, dr: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label"><i className="fas fa-calendar-week" style={{ marginLeft: 5, color: '#8b5cf6' }} /> بالأسبوع</label>
                    <input className="form-input" type="number" placeholder="2500" step="0.01" min="0" value={form.wr} onChange={e => setForm(f => ({ ...f, wr: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div style={{ ...styles.infoBox, background: '#f0fdf4', borderColor: '#86efac' }}>
                <div style={{ ...styles.infoBoxLabel, color: '#15803d' }}>
                  <i className="fas fa-map-pin" /> إحداثيات الخريطة
                  <small style={{ fontWeight: 400, color: '#64748b' }}> — ضرورية لظهور الموقف على الخريطة</small>
                </div>
                <div style={styles.frow}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">خط العرض (Latitude)</label>
                    <input className="form-input" type="number" placeholder="35.2167" step="0.000001" value={form.mlat} onChange={e => setForm(f => ({ ...f, mlat: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">خط الطول (Longitude)</label>
                    <input className="form-input" type="number" placeholder="4.1833" step="0.000001" value={form.mlng} onChange={e => setForm(f => ({ ...f, mlng: e.target.value }))} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 4, opacity: totalSpots < 1 ? 0.6 : 1 }}>
                <i className="fas fa-plus" /> إنشاء الموقف
                {totalSpots > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 12, marginRight: 8, fontSize: '.82rem' }}>{totalSpots} مكان</span>}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="section-title">
              <i className="fas fa-list" /> المناطق الحالية
              <span style={{ marginRight: 'auto', background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
              {zones.filter(z => z.is_active).length} منطقة نشطة
            </span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fas fa-search" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.82rem' }} />
                <input className="form-input" style={{ paddingRight: 34 }} placeholder="ابحث بالاسم أو الموقع..."
                       value={zoneSearch} onChange={e => setZoneSearch(e.target.value)} type="search" autoComplete="new-password" />
                {zoneSearch && (
                    <button onClick={() => setZoneSearch('')} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      <i className="fas fa-times" />
                    </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                {[{ key: 'all', label: 'الكل' }, { key: 'active', label: 'نشطة' }, { key: 'inactive', label: 'معطّلة' }].map(f => (
                    <button key={f.key} onClick={() => setZoneFilter(f.key)}
                            style={{ padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', fontSize: '.78rem', fontWeight: 700, transition: 'all .15s',
                              background: zoneFilter === f.key ? 'white' : 'transparent', color: zoneFilter === f.key ? '#0f172a' : '#64748b',
                              boxShadow: zoneFilter === f.key ? '0 1px 4px rgba(0,0,0,.1)' : 'none' }}>
                      {f.label}
                    </button>
                ))}
              </div>
            </div>

            <div style={{ maxHeight: 680, overflowY: 'auto' }}>
              {filteredZones.length === 0
                  ? <div className="empty-state"><i className="fas fa-search" /><p>{zoneSearch ? 'لا توجد نتائج للبحث' : 'لا توجد مناطق'}</p></div>
                  : filteredZones.map(z => {
                    const oc   = parseFloat(z.occ_pct || 0)
                    const oc_c = occColor(oc)
                    // ✅ جلب مديري هذه المنطقة
                    const zoneManagers = getZoneManagers(z.zone_id)
                    return (
                        <div key={z.zone_id} style={styles.zoneItem}>
                          <div style={styles.zoneHeader}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={styles.zoneName}>{z.zone_name}</div>
                              <div style={styles.zoneLoc}><i className="fas fa-map-marker-alt" style={{ color: '#ef4444', fontSize: '0.72rem' }} /> {z.location}</div>
                              {z.latitude
                                  ? <div style={{ ...styles.zoneLoc, color: '#10b981' }}><i className="fas fa-crosshairs" style={{ fontSize: '0.65rem' }} /> {z.latitude}, {z.longitude}</div>
                                  : <div style={{ ...styles.zoneLoc, color: '#f59e0b' }}><i className="fas fa-exclamation-triangle" style={{ fontSize: '0.65rem' }} /> لا توجد إحداثيات</div>
                              }
                              {/* ✅ عرض مديري المنطقة */}

                            </div>
                            <div style={styles.zoneActions}>
                              {z.is_active
                                  ? <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>نشطة</span>
                                  : <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>معطّلة</span>
                              }
                              <button className="btn btn-ghost btn-sm" style={{ color: '#1d4ed8', background: '#eff6ff' }} onClick={() => setShowPriceModal(z)}>
                                <i className="fas fa-tags" /> الأسعار
                              </button>
                              {z.is_active
                                  ? <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => toggleActive(z.zone_id, false)}><i className="fas fa-ban" /> تعطيل</button>
                                  : <button className="btn btn-sm" style={{ background: '#f0fdf4', color: '#16a34a' }} onClick={() => toggleActive(z.zone_id, true)}><i className="fas fa-check-circle" /> تفعيل</button>
                              }
                            </div>
                          </div>

                          <div style={styles.zoneStats}>
                            {[
                              { v: z.total_spots,     l: 'إجمالي',  c: '#0f172a' },
                              { v: z.available_spots, l: 'متاح',    c: '#10b981' },
                              { v: z.occupied,        l: 'مشغول',   c: '#ef4444' },
                              { v: `${((z.total_revenue||0)/1000).toFixed(0)}K`, l: 'دج إيراد', c: '#6366f1' },
                            ].map(s => (
                                <div key={s.l} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.c }}>{s.v}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.l}</div>
                                </div>
                            ))}
                          </div>

                          <SpotTypesBadges spotTypes={z.spot_types} />

                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: '#64748b', marginBottom: 3 }}>
                              <span>الإشغال</span><span style={{ fontWeight: 700, color: oc_c }}>{oc}%</span>
                            </div>
                            <div className="occ-bar"><div className="occ-bar-fill" style={{ width: `${Math.min(oc,100)}%`, background: oc_c }} /></div>
                          </div>

                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                            <span className="price-tag price-hourly"><i className="fas fa-clock" style={{ fontSize: '0.64rem' }} /> {z.hourly_rate?.toFixed(2)} دج/ساعة</span>
                            {z.daily_rate  && <span className="price-tag price-daily"><i className="fas fa-sun" style={{ fontSize: '0.64rem' }} /> {z.daily_rate.toFixed(2)} دج/يوم</span>}
                            {z.weekly_rate && <span className="price-tag price-weekly"><i className="fas fa-calendar-week" style={{ fontSize: '0.64rem' }} /> {z.weekly_rate.toFixed(2)} دج/أسبوع</span>}
                          </div>
                        </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {showPriceModal && (
            <div className="modal-overlay" onClick={() => setShowPriceModal(null)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title"><i className="fas fa-tags" style={{ color: 'var(--primary)' }} /> تحديث الأسعار</div>
                  <button className="modal-close" onClick={() => setShowPriceModal(null)}>✕</button>
                </div>
                <div style={{ fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>{showPriceModal.zone_name}</div>
                <form onSubmit={updatePrice}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label"><i className="fas fa-clock" style={{ marginLeft: 5, color: '#6366f1' }} /> بالساعة *</label>
                      <input className="form-input" name="hr" type="number" step="0.01" min="0.01" defaultValue={showPriceModal.hourly_rate} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><i className="fas fa-sun" style={{ marginLeft: 5, color: '#f59e0b' }} /> باليوم</label>
                      <input className="form-input" name="dr" type="number" step="0.01" min="0" defaultValue={showPriceModal.daily_rate || ''} />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><i className="fas fa-calendar-week" style={{ marginLeft: 5, color: '#8b5cf6' }} /> بالأسبوع</label>
                      <input className="form-input" name="wr" type="number" step="0.01" min="0" defaultValue={showPriceModal.weekly_rate || ''} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowPriceModal(null)}>إلغاء</button>
                    <button type="submit" className="btn btn-primary"><i className="fas fa-save" /> حفظ الأسعار</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  )
}

const styles = {
  grid:         { display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24, alignItems: 'start' },
  frow:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  infoBox:      { background: '#eff6ff', borderRadius: 10, padding: '14px 16px', border: '1px solid #bfdbfe', marginBottom: 14 },
  infoBoxLabel: { fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  zoneItem:     { padding: '14px 16px', borderRadius: 12, border: '1px solid #f1f5f9', marginBottom: 10, background: '#fafafa' },
  zoneHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  zoneName:     { fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 },
  zoneLoc:      { fontSize: '0.73rem', color: '#64748b', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 },
  zoneActions:  { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 },
  zoneStats:    { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' },
}