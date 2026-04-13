import React, { useState } from 'react'
import { useAuth } from '../context/useAuth'

const adminNav = [
  { id: 'stats',    icon: 'fa-chart-bar',      label: 'الإحصائيات' },
  { id: 'map',      icon: 'fa-map-marked-alt',  label: 'الخريطة والمواقف' },
  { id: 'zones',    icon: 'fa-parking',         label: 'إدارة المناطق' },
  { id: 'reports',  icon: 'fa-chart-line',      label: 'التقارير' },
  { id: 'users',    icon: 'fa-user-shield',     label: 'ادارة' },
  { id: 'feedback', icon: 'fa-comment-dots', label: 'التغذية الراجعة' },
]

const managerNav = [
  { id: 'stats',        icon: 'fa-chart-bar',      label: 'لوحة التحكم'  },
  { id: 'reservations', icon: 'fa-calendar-check', label: 'الحجوزات'     },
  { id: 'spots',        icon: 'fa-th',             label: 'الأماكن'      },
  { id: 'reports',      icon: 'fa-chart-line',     label: 'التقارير'     },
  { id: 'drivers',      icon: 'fa-users',          label: 'سائقو موقفي' },
  { id: 'managers',     icon: 'fa-user-shield',    label: 'الإدارة'      },
]

export default function Sidebar({ activePage, setPage }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const navItems = isAdmin ? adminNav : managerNav
  const [showConfirm, setShowConfirm] = useState(false)

  return (
      <>
        <aside style={styles.sidebar}>
          {/* Brand */}
          <div style={styles.brand}>
            <div style={styles.logo}>
              <i className="fas fa-parking" />
            </div>
            <div>
              <div style={styles.brandName}>SmartParking</div>
              <div style={styles.brandSub}>{isAdmin ? 'المدير العام' : 'مدير الموقف'}</div>
            </div>
          </div>

          {/* Live indicator */}
          <div style={styles.liveIndicator}>
            <span className="live-dot" />
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>نظام مباشر</span>
          </div>

          {/* Nav */}
          <nav style={styles.nav}>
            <div style={styles.navLabel}>القائمة الرئيسية</div>
            {navItems.map(item => (
                <button
                    key={item.id}
                    style={{
                      ...styles.navBtn,
                      ...(activePage === item.id ? styles.navBtnActive : {})
                    }}
                    onClick={() => setPage(item.id)}
                >
                  <div style={{
                    ...styles.navIcon,
                    ...(activePage === item.id ? styles.navIconActive : {})
                  }}>
                    <i className={`fas ${item.icon}`} />
                  </div>
                  <span style={styles.navLabel2}>{item.label}</span>
                  {activePage === item.id && <div style={styles.navIndicator} />}
                </button>
            ))}
          </nav>

          {/* Logout */}
          <div style={styles.bottom}>
            <div style={styles.userCard}>
              <label style={{
                fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '8px 10px 6px', marginBottom: 4,
              }}>تسجيل الخروج</label>
              <button style={styles.logoutBtn} onClick={() => setShowConfirm(true)} title="تسجيل الخروج">
                <i className="fas fa-sign-out-alt" />
              </button>
            </div>
          </div>
        </aside>

        {/* Logout Confirmation Modal */}
        {showConfirm && (
            <div style={styles.overlay} onClick={() => setShowConfirm(false)}>
              <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Icon */}
                <div style={styles.modalIcon}>
                  <i className="fas fa-sign-out-alt" style={{ fontSize: '1.3rem', color: '#f97316' }} />
                </div>

                {/* Text */}
                <div style={styles.modalTitle}>تسجيل الخروج</div>
                <div style={styles.modalDesc}>هل أنت متأكد من تسجيل الخروج من النظام؟</div>

                {/* Buttons */}
                <div style={styles.modalBtns}>
                  <button style={styles.cancelBtn} onClick={() => setShowConfirm(false)}>
                    <i className="fas fa-times" style={{ marginLeft: 6 }} />
                    إلغاء
                  </button>
                  <button style={styles.confirmBtn} onClick={() => { setShowConfirm(false); logout() }}>
                    <i className="fas fa-sign-out-alt" style={{ marginLeft: 6 }} />
                    نعم، خروج
                  </button>
                </div>
              </div>
            </div>
        )}
      </>
  )
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-w)',
    height: '100vh',
    position: 'fixed',
    top: 0, right: 0,
    background: '#0f172a',
    display: 'flex', flexDirection: 'column',
    padding: '0', zIndex: 100,
    borderLeft: '1px solid rgba(255,255,255,0.06)',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '20px 20px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logo: {
    width: 42, height: 42,
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '1.1rem', flexShrink: 0,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
  },
  brandName: { fontSize: '1rem', fontWeight: 900, color: 'white' },
  brandSub: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' },
  liveIndicator: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px',
    background: 'rgba(16,185,129,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  nav: {
    flex: 1, overflowY: 'auto',
    padding: '12px 12px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  navLabel: {
    fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    padding: '8px 10px 6px', marginBottom: 4,
  },
  navLabel2: { flex: 1, fontSize: '0.88rem', fontWeight: 600 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 12px', borderRadius: 11,
    border: 'none', background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
    transition: 'all 0.18s', position: 'relative',
    width: '100%', textAlign: 'right',
  },
  navBtnActive: {
    background: 'rgba(99,102,241,0.15)',
    color: 'white',
    border: '1px solid rgba(99,102,241,0.2)',
  },
  navIcon: {
    width: 34, height: 34, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)',
    fontSize: '0.88rem', flexShrink: 0, transition: 'all 0.18s',
  },
  navIconActive: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
  },
  navIndicator: {
    width: 3, height: '60%',
    background: 'linear-gradient(to bottom, #6366f1, #a855f7)',
    borderRadius: 2, position: 'absolute', left: 0,
  },
  bottom: {
    padding: '12px 14px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
  },
  logoutBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#ef4444', width: 30, height: 30, borderRadius: 8,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.8rem', transition: 'all 0.15s', flexShrink: 0,
    marginRight: 'auto',
  },

  /* Modal */
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
    backdropFilter: 'blur(3px)',
  },
  modal: {
    background: 'white',
    borderRadius: 16,
    padding: '28px 28px 22px',
    width: 300,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    direction: 'rtl',
  },
  modalIcon: {
    width: 52, height: 52,
    background: 'rgba(249,115,22,0.1)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 14px',
  },
  modalTitle: {
    fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: 6,
  },
  modalDesc: {
    fontSize: '0.82rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5,
  },
  modalBtns: {
    display: 'flex', gap: 10,
  },
  cancelBtn: {
    flex: 1, padding: '9px 0', borderRadius: 9,
    border: '1px solid #e2e8f0', background: '#f8fafc',
    color: '#475569', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
  },
  confirmBtn: {
    flex: 1, padding: '9px 0', borderRadius: 9,
    border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
  },
}