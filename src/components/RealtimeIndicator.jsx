// ═══════════════════════════════════════════
//  src/components/RealtimeIndicator.jsx
//  مؤشر حالة الاتصال SSE في الـ Topbar
// ═══════════════════════════════════════════
import React from 'react'
import { useData } from '../context/DataContext'

export default function RealtimeIndicator() {
  const { sseStatus, lastUpdate, changed } = useData()

  const config = {
    connecting:   { color: '#f59e0b', bg: '#fffbeb', icon: 'fa-circle-notch fa-spin', text: 'جاري الاتصال...' },
    connected:    { color: '#10b981', bg: '#f0fdf4', icon: 'fa-circle',               text: 'نظام مباشر'      },
    reconnecting: { color: '#ef4444', bg: '#fef2f2', icon: 'fa-circle-notch fa-spin', text: 'إعادة الاتصال...' },
    error:        { color: '#ef4444', bg: '#fef2f2', icon: 'fa-exclamation-circle',   text: 'خطأ في الاتصال'  },
  }

  const cfg = config[sseStatus] || config.connecting
  const hasChange = changed.length > 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', borderRadius: 20,
      background: hasChange ? '#eff6ff' : cfg.bg,
      border: `1px solid ${hasChange ? '#bfdbfe' : cfg.color}20`,
      fontSize: '.78rem', fontWeight: 600,
      transition: 'all .3s',
    }}>
      {/* نقطة الحالة */}
      <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: '.65rem' }} />

      <span style={{ color: hasChange ? '#1d4ed8' : cfg.color }}>
        {hasChange
          ? `تم تحديث: ${changed.join('، ')}`
          : cfg.text
        }
      </span>

      {/* وقت آخر تحديث */}
      {lastUpdate && sseStatus === 'connected' && !hasChange && (
        <span style={{ color: '#94a3b8', fontSize: '.7rem' }}>
          {lastUpdate.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  )
}
