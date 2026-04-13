import React from 'react'

const colorMap = {
  blue:   { bg: '#eff6ff', icon: '#3b82f6', border: '#6366f1', badge: '#dbeafe', badgeTxt: '#1d4ed8' },
  green:  { bg: '#f0fdf4', icon: '#10b981', border: '#10b981', badge: '#dcfce7', badgeTxt: '#15803d' },
  red:    { bg: '#fef2f2', icon: '#ef4444', border: '#ef4444', badge: '#fee2e2', badgeTxt: '#991b1b' },
  purple: { bg: '#fdf4ff', icon: '#a855f7', border: '#a855f7', badge: '#f3e8ff', badgeTxt: '#7e22ce' },
  cyan:   { bg: '#ecfeff', icon: '#06b6d4', border: '#06b6d4', badge: '#cffafe', badgeTxt: '#0e7490' },
  orange: { bg: '#fff7ed', icon: '#f59e0b', border: '#f59e0b', badge: '#fef3c7', badgeTxt: '#92400e' },
  pink:   { bg: '#fdf2f8', icon: '#ec4899', border: '#ec4899', badge: '#fce7f3', badgeTxt: '#9d174d' },
  indigo: { bg: '#eef2ff', icon: '#6366f1', border: '#6366f1', badge: '#e0e7ff', badgeTxt: '#3730a3' },
}

export default function StatCard({ icon, value, label, badge, color = 'blue', trend }) {
  const c = colorMap[color] || colorMap.blue

  return (
    <div style={{ ...styles.card, borderTopColor: c.border }} className="fade-in">
      <div style={styles.header}>
        <div style={{ ...styles.iconBox, background: c.bg, color: c.icon }}>
          <i className={`fas ${icon}`} />
        </div>
        {badge && (
          <span style={{ ...styles.badge, background: c.badge, color: c.badgeTxt }}>
            {badge}
          </span>
        )}
      </div>
      <div style={styles.value}>{value}</div>
      <div style={styles.label}>{label}</div>
      {trend !== undefined && (
        <div style={{ ...styles.trend, color: trend >= 0 ? '#10b981' : '#ef4444' }}>
          <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }} />
          {Math.abs(trend)}% من الشهر الماضي
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    background: 'white',
    borderRadius: 14,
    padding: '20px 22px',
    border: '1px solid var(--border)',
    borderTop: '4px solid',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    transition: 'all 0.22s',
    cursor: 'default',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  iconBox: {
    width: 46, height: 46, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem',
  },
  badge: {
    padding: '3px 10px', borderRadius: 20,
    fontSize: '0.7rem', fontWeight: 700,
  },
  value: { fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 },
  label: { fontSize: '0.8rem', color: '#64748b', marginTop: 5, fontWeight: 500 },
  trend: { fontSize: '0.72rem', marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
}
