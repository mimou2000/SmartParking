import React, { useState } from 'react'
import { useData } from '../context/useData'   // ✅ إصلاح: من useData.js

export default function PageManagers() {
  const { managers, zones, updateUser, deleteUser } = useData()
  const [msg, setMsg]           = useState({ text: '', ok: false })
  const [editModal, setEditModal] = useState(null)
  const [search, setSearch]     = useState('')

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: false }), 4000)
  }

  // ✅ إصلاح: تحويل Firebase Timestamp إلى تاريخ مقروء
  const formatDate = (ts) => {
    if (!ts) return '—'
    const date = ts?.toDate ? ts.toDate() : new Date(ts)
    return date.toISOString().slice(0, 10)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await updateUser(editModal.user_id, {
        full_name:     fd.get('fname'),
        email:         fd.get('email'),
        phone:         fd.get('phone'),
        zone_id:       fd.get('zone') || null,
        zone_name:     zones.find(z => z.zone_id === fd.get('zone'))?.zone_name || '',
        assigned_zone: fd.get('zone') || null,
        ...(fd.get('pass') ? { password: fd.get('pass') } : {}),
      })
      setEditModal(null)
      showMsg('تم تحديث بيانات المدير بنجاح!')
    } catch (err) {
      showMsg(err.message, false)
    }
  }

  const handleDelete = async (uid) => {
    if (!confirm('هل تريد حذف هذا المدير؟')) return
    try {
      await deleteUser(uid)
      showMsg('تم حذف المدير بنجاح.')
    } catch (err) {
      showMsg(err.message, false)
    }
  }

  const filtered = managers.filter(m =>
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const getInitials = (name) => (name || '').split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
      <div className="fade-in">
        {msg.text && (
            <div className={`notify ${msg.ok ? 'notify-ok' : 'notify-err'}`}>
              <i className={`fas ${msg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
              {msg.text}
            </div>
        )}

        {/* KPIs */}
        <div style={styles.kpiRow}>
          {[
            { icon: 'fa-users',        val: managers.length,                               label: 'إجمالي المديرين', bg: '#eff6ff', ic: '#3b82f6', border: '#6366f1' },
            { icon: 'fa-check-circle', val: managers.length,                               label: 'مديرون نشطون',   bg: '#f0fdf4', ic: '#10b981', border: '#10b981' },
            { icon: 'fa-link',         val: managers.filter(m => m.assigned_zone).length,  label: 'مرتبطون بموقف', bg: '#fff7ed', ic: '#f59e0b', border: '#f59e0b' },
            { icon: 'fa-clock',        val: managers.filter(m => !m.assigned_zone).length, label: 'بدون موقف',      bg: '#fef2f2', ic: '#ef4444', border: '#ef4444' },
          ].map(k => (
              <div key={k.label} style={{ ...styles.kpiCard, borderTopColor: k.border }}>
                <div style={{ ...styles.kpiIcon, background: k.bg, color: k.ic }}><i className={`fas ${k.icon}`} /></div>
                <div>
                  <div style={styles.kpiVal}>{k.val}</div>
                  <div style={styles.kpiLbl}>{k.label}</div>
                </div>
              </div>
          ))}
        </div>

        {/* Managers Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
          <div style={styles.tableHeader}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>قائمة المديرين</div>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.82rem' }} />
              <input className="form-input" style={{ paddingRight: 36, width: 220, padding: '8px 36px 8px 14px' }}
                     placeholder="بحث عن مدير..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '28%' }} /><col style={{ width: '22%' }} />
                <col style={{ width: '15%' }} /><col style={{ width: '20%' }} /><col style={{ width: '15%' }} />
              </colgroup>
              <thead>
              <tr>
                <th style={styles.th}>المدير</th><th style={styles.th}>الموقف المسند</th>
                <th style={styles.th}>الإيراد</th><th style={styles.th}>تاريخ الإضافة</th><th style={styles.th}>الإجراءات</th>
              </tr>
              </thead>
              <tbody>
              {filtered.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><i className="fas fa-users" /><p>لا يوجد مديرون</p></div></td></tr>
              ) : filtered.map(m => (
                  <tr key={m.user_id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{getInitials(m.full_name)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {m.zone_name
                          ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <i className="fas fa-parking" style={{ marginLeft: 4 }} />{m.zone_name}
                        </span>
                          : <span style={{ background: '#f8fafc', color: '#94a3b8', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem' }}>بدون تعيين</span>
                      }
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: '#10b981' }}>{((m.zone_revenue || 0) / 1000).toFixed(0)}K دج</strong>
                    </td>
                    {/* ✅ إصلاح: Firebase Timestamp → string */}
                    <td style={{ ...styles.td, fontSize: '0.8rem', color: '#64748b' }}>{formatDate(m.created_at)}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#1d4ed8' }} onClick={() => setEditModal(m)}>
                          <i className="fas fa-edit" /> تعديل
                        </button>
                        <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => handleDelete(m.user_id)}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editModal && (
            <div className="modal-overlay" onClick={() => setEditModal(null)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title"><i className="fas fa-user-edit" style={{ color: 'var(--primary)' }} /> تعديل بيانات المدير</div>
                  <button className="modal-close" onClick={() => setEditModal(null)}>✕</button>
                </div>
                <form onSubmit={handleEdit}>
                  <div style={styles.frow}>
                    <div className="form-group">
                      <label className="form-label">الاسم الكامل *</label>
                      <input className="form-input" name="fname" defaultValue={editModal.full_name} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">البريد الإلكتروني *</label>
                      <input className="form-input" name="email" type="email" defaultValue={editModal.email} required />
                    </div>
                  </div>
                  <div style={styles.frow}>
                    <div className="form-group">
                      <label className="form-label">رقم الهاتف</label>
                      <input className="form-input" name="phone" defaultValue={editModal.phone} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الموقف المسند</label>
                      <select className="form-select" name="zone" defaultValue={editModal.assigned_zone || ''}>
                        <option value="">-- بدون تعيين --</option>
                        {zones.filter(z => z.is_active).map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">كلمة مرور جديدة (اتركها فارغة للإبقاء)</label>
                    <input className="form-input" name="pass" type="password" placeholder="••••••••" />
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>إلغاء</button>
                    <button type="submit" className="btn btn-primary"><i className="fas fa-save" /> حفظ التعديلات</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  )
}

const styles = {
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 },
  kpiCard: { background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', borderTop: '4px solid', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 },
  kpiIcon: { width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
  kpiVal: { fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 },
  kpiLbl: { fontSize: '0.75rem', color: '#64748b', marginTop: 3 },
  frow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px' },
  th: { padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tr: { transition: 'background 0.15s' },
}