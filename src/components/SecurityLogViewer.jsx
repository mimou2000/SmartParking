// ══════════════════════════════════════════════════════
//  src/components/SecurityLogViewer.jsx
//  عرض سجل النشاطات الأمنية
// ══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react'
import { securityLogger, SECURITY_EVENTS } from '../utils/security'

const EVENT_LABELS = {
    [SECURITY_EVENTS.LOGIN_SUCCESS]: { label: 'تسجيل دخول ناجح', icon: 'fa-sign-in-alt', color: '#22c55e' },
    [SECURITY_EVENTS.LOGIN_FAILED]: { label: 'محاولة دخول فاشلة', icon: 'fa-times-circle', color: '#ef4444' },
    [SECURITY_EVENTS.LOGOUT]: { label: 'تسجيل خروج', icon: 'fa-sign-out-alt', color: '#64748b' },
    [SECURITY_EVENTS.SESSION_EXPIRED]: { label: 'انتهاء الجلسة', icon: 'fa-clock', color: '#f59e0b' },
    [SECURITY_EVENTS.PASSWORD_CHANGE]: { label: 'تغيير كلمة المرور', icon: 'fa-key', color: '#6366f1' },
    [SECURITY_EVENTS.PASSWORD_RESET_REQUEST]: { label: 'طلب استعادة كلمة المرور', icon: 'fa-envelope', color: '#8b5cf6' },
    [SECURITY_EVENTS.ACCOUNT_LOCKED]: { label: 'قفل الحساب', icon: 'fa-lock', color: '#dc2626' },
    [SECURITY_EVENTS.SUSPICIOUS_ACTIVITY]: { label: 'نشاط مشبوه', icon: 'fa-exclamation-triangle', color: '#f97316' },
    [SECURITY_EVENTS.NEW_DEVICE_LOGIN]: { label: 'دخول من جهاز جديد', icon: 'fa-laptop', color: '#0ea5e9' },
    [SECURITY_EVENTS.SENSITIVE_ACTION]: { label: 'إجراء حساس', icon: 'fa-shield-alt', color: '#14b8a6' }
}

export default function SecurityLogViewer({ isOpen, onClose }) {
    const [logs, setLogs] = useState([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        if (isOpen) {
            setLogs(securityLogger.getLogs())
        }
    }, [isOpen])

    if (!isOpen) return null

    const filteredLogs = filter === 'all' 
        ? logs 
        : logs.filter(l => l.event === filter)

    const formatDate = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleClearLogs = () => {
        if (window.confirm('هل أنت متأكد من حذف جميع السجلات الأمنية؟')) {
            securityLogger.clearLogs()
            setLogs([])
        }
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <i className="fas fa-shield-alt" style={{ color: '#6366f1', marginLeft: 10 }} />
                        سجل النشاطات الأمنية
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>
                        <i className="fas fa-times" />
                    </button>
                </div>

                <div style={styles.toolbar}>
                    <select 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="all">جميع الأحداث</option>
                        {Object.entries(EVENT_LABELS).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                    <button onClick={handleClearLogs} style={styles.clearBtn}>
                        <i className="fas fa-trash-alt" style={{ marginLeft: 6 }} />
                        مسح السجلات
                    </button>
                </div>

                <div style={styles.logList}>
                    {filteredLogs.length === 0 ? (
                        <div style={styles.empty}>
                            <i className="fas fa-clipboard-list" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
                            <div>لا توجد سجلات أمنية</div>
                        </div>
                    ) : (
                        filteredLogs.map(log => {
                            const eventInfo = EVENT_LABELS[log.event] || { 
                                label: log.event, 
                                icon: 'fa-info-circle', 
                                color: '#94a3b8' 
                            }
                            return (
                                <div key={log.id} style={styles.logItem}>
                                    <div 
                                        style={{ 
                                            ...styles.logIcon, 
                                            background: `${eventInfo.color}15`,
                                            color: eventInfo.color 
                                        }}
                                    >
                                        <i className={`fas ${eventInfo.icon}`} />
                                    </div>
                                    <div style={styles.logContent}>
                                        <div style={styles.logTitle}>{eventInfo.label}</div>
                                        <div style={styles.logMeta}>
                                            <span>{formatDate(log.timestamp)}</span>
                                            {log.email && (
                                                <span style={styles.logEmail}>
                                                    <i className="fas fa-user" style={{ marginLeft: 4 }} />
                                                    {log.email}
                                                </span>
                                            )}
                                        </div>
                                        {log.reason && (
                                            <div style={styles.logReason}>السبب: {log.reason}</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        padding: 20
    },
    modal: {
        background: 'white',
        borderRadius: 16,
        width: '100%',
        maxWidth: 600,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0'
    },
    headerTitle: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center'
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        border: 'none',
        background: '#f1f5f9',
        color: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid #e2e8f0',
        gap: 12
    },
    filterSelect: {
        flex: 1,
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        fontFamily: 'Tajawal, sans-serif',
        background: 'white',
        cursor: 'pointer'
    },
    clearBtn: {
        padding: '8px 14px',
        borderRadius: 8,
        border: 'none',
        background: '#fef2f2',
        color: '#dc2626',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Tajawal, sans-serif',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.15s'
    },
    logList: {
        flex: 1,
        overflow: 'auto',
        padding: 16
    },
    empty: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#94a3b8',
        fontSize: '0.9rem'
    },
    logItem: {
        display: 'flex',
        gap: 14,
        padding: '14px',
        borderRadius: 10,
        background: '#f8fafc',
        marginBottom: 10,
        transition: 'background 0.15s'
    },
    logIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        flexShrink: 0
    },
    logContent: {
        flex: 1,
        minWidth: 0
    },
    logTitle: {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: 4
    },
    logMeta: {
        display: 'flex',
        gap: 12,
        fontSize: '0.75rem',
        color: '#94a3b8'
    },
    logEmail: {
        display: 'flex',
        alignItems: 'center',
        gap: 4
    },
    logReason: {
        fontSize: '0.75rem',
        color: '#64748b',
        marginTop: 4,
        padding: '4px 8px',
        background: '#f1f5f9',
        borderRadius: 4,
        display: 'inline-block'
    }
}
