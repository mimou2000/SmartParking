// ══════════════════════════════════════════════════════
//  src/components/Topbar.jsx
// ══════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/useAuth.js'

const NOTIF_COLORS = {
  reservation_new:       '#6366f1',
  reservation_cancelled: '#ef4444',
  reservation_completed: '#10b981',
  spot_occupied:         '#ef4444',
  spot_available:        '#10b981',
  spot_maintenance:      '#64748b',
  spot_reserved:         '#f59e0b',
}
const NOTIF_ICONS = {
  reservation_new:       'fa-calendar-plus',
  reservation_cancelled: 'fa-calendar-times',
  reservation_completed: 'fa-flag-checkered',
  spot_occupied:         'fa-car',
  spot_available:        'fa-check-circle',
  spot_maintenance:      'fa-tools',
  spot_reserved:         'fa-bookmark',
}

export default function Topbar({ title, icon, notifications = [], onClearAll }) {
  const { user }                    = useAuth()
  const [time,       setTime]       = useState(new Date())
  const [showNotifs, setShowNotifs] = useState(false)
  const panelRef                    = useRef(null)

  const isManager = user?.role === 'MANAGER'

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const timeStr = time.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = time.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const unread  = notifications.filter(n => !n.read).length

  return (
      <header style={styles.topbar}>
        <div style={styles.titleArea}>
          {icon && <div style={styles.pageIcon}><i className={icon.startsWith('fa') && !icon.startsWith('fas') ? `fas ${icon}` : icon} /></div>}
          <div>
            <h1 style={styles.title}>{title}</h1>
            <div style={styles.breadcrumb}><i className="fas fa-home" style={{ fontSize: '0.65rem' }} /> / {title}</div>
          </div>
        </div>

        <div style={styles.rightArea}>
          {/* Clock */}
          <div style={styles.clock}>
            <div style={styles.clockTime}>{timeStr}</div>
            <div style={styles.clockDate}>{dateStr}</div>
          </div>

          <div style={styles.divider} />

          {/* ✅ زر الإشعارات — للمدير فقط */}
          {isManager && (
              <div ref={panelRef} style={{ position: 'relative' }}>
                <button
                    style={{ ...styles.iconBtn, background: showNotifs ? '#eff6ff' : '#f8fafc', borderColor: showNotifs ? '#6366f1' : 'var(--border)', color: showNotifs ? '#6366f1' : 'var(--muted)' }}
                    onClick={() => setShowNotifs(v => !v)}
                >
                  <i className="fas fa-bell" />
                  {unread > 0 && (
                      <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>

                {showNotifs && (
                    <div style={styles.panel}>
                      <div style={styles.panelHeader}>
                        <div style={styles.panelTitle}>
                          <i className="fas fa-bell" style={{ color: '#6366f1' }} />
                          الإشعارات
                          {unread > 0 && <span style={styles.panelBadge}>{unread} جديد</span>}
                        </div>
                        {notifications.length > 0 && (
                            <button onClick={() => { onClearAll?.(); setShowNotifs(false) }} style={styles.clearBtn}>
                              مسح الكل
                            </button>
                        )}
                      </div>
                      <div style={styles.panelBody}>
                        {notifications.length === 0 ? (
                            <div style={styles.emptyState}>
                              <i className="fas fa-bell-slash" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 8 }} />
                              لا توجد إشعارات
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((n, i) => (
                                <div key={n.id || i} style={{ ...styles.notifItem, background: n.read ? 'white' : '#f5f3ff', borderRight: `3px solid ${NOTIF_COLORS[n.type] || '#6366f1'}` }}>
                                  <div style={{ ...styles.notifIcon, background: (NOTIF_COLORS[n.type] || '#6366f1') + '18', color: NOTIF_COLORS[n.type] || '#6366f1' }}>
                                    <i className={`fas ${NOTIF_ICONS[n.type] || 'fa-info-circle'}`} />
                                  </div>
                                  <div style={styles.notifContent}>
                                    <div style={styles.notifText}>{n.message}</div>
                                    <div style={styles.notifTime}>{n.timeAgo}</div>
                                  </div>
                                  {!n.read && <div style={styles.unreadDot} />}
                                </div>
                            ))
                        )}
                      </div>
                    </div>
                )}
              </div>
          )}

          {isManager && <div style={styles.divider} />}

          {/* User */}
          <div style={styles.userChip}>
            <div className="avatar" style={{
              width: 34, height: 34, fontSize: '0.82rem',
              background: user?.role === 'ADMIN'
                  ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
            }}>
              {user?.full_name?.charAt(0)}
            </div>
            <div style={styles.userText}>
              <div style={styles.uName}>{user?.full_name}</div>
              <div style={styles.uRole}>{user?.role === 'ADMIN' ? 'مسؤول عام' : 'مدير'}</div>
            </div>
          </div>
        </div>

        <style>{`@keyframes notifSlideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </header>
  )
}

const styles = {
  topbar:      { height: 'var(--topbar-h)', background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
  titleArea:   { display: 'flex', alignItems: 'center', gap: 14 },
  pageIcon:    { width: 40, height: 40, background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.05rem' },
  title:       { fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' },
  breadcrumb:  { fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 },
  rightArea:   { display: 'flex', alignItems: 'center', gap: 16 },
  clock:       { textAlign: 'center' },
  clockTime:   { fontSize: '0.95rem', fontWeight: 700, color: 'var(--dark)', fontVariantNumeric: 'tabular-nums' },
  clockDate:   { fontSize: '0.65rem', color: 'var(--muted)' },
  divider:     { width: 1, height: 32, background: 'var(--border)' },
  iconBtn:     { position: 'relative', width: 36, height: 36, borderRadius: 9, border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', transition: 'all 0.15s' },
  badge:       { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', padding: '0 3px' },
  panel:       { position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)', width: 360, maxHeight: 480, background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden', zIndex: 999, animation: 'notifSlideIn 0.2s ease' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' },
  panelTitle:  { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', fontFamily: 'Tajawal, sans-serif' },
  panelBadge:  { background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 },
  clearBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Tajawal, sans-serif', padding: '4px 8px', borderRadius: 6 },
  panelBody:   { overflowY: 'auto', maxHeight: 400 },
  emptyState:  { textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'Tajawal, sans-serif' },
  notifItem:   { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s', direction: 'rtl' },
  notifIcon:   { width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem' },
  notifContent:{ flex: 1, minWidth: 0 },
  notifText:   { fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4, fontFamily: 'Tajawal, sans-serif' },
  notifTime:   { fontSize: '0.7rem', color: '#94a3b8', marginTop: 3, fontFamily: 'Tajawal, sans-serif' },
  unreadDot:   { width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 4 },
  userChip:    { display: 'flex', alignItems: 'center', gap: 10 },
  userText:    {},
  uName:       { fontSize: '0.84rem', fontWeight: 700, color: 'var(--dark)' },
  uRole:       { fontSize: '0.65rem', color: 'var(--muted)' },
}