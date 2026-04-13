// ══════════════════════════════════════════════════════
//  src/components/SessionWarningModal.jsx
//  نافذة تحذير انتهاء الجلسة
// ══════════════════════════════════════════════════════

import React from 'react'

export default function SessionWarningModal({ show, remainingTime, onExtend, onLogout }) {
    if (!show) return null

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.iconWrap}>
                    <i className="fas fa-clock" style={styles.icon} />
                </div>
                <h3 style={styles.title}>انتهاء صلاحية الجلسة</h3>
                <p style={styles.text}>
                    سيتم تسجيل خروجك تلقائيًا بسبب عدم النشاط
                </p>
                <div style={styles.timer}>
                    <span style={styles.timerNumber}>{remainingTime}</span>
                    <span style={styles.timerLabel}>ثانية</span>
                </div>
                <div style={styles.actions}>
                    <button onClick={onExtend} style={styles.extendBtn}>
                        <i className="fas fa-redo" style={{ marginLeft: 8 }} />
                        تمديد الجلسة
                    </button>
                    <button onClick={onLogout} style={styles.logoutBtn}>
                        <i className="fas fa-sign-out-alt" style={{ marginLeft: 8 }} />
                        تسجيل الخروج
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20
    },
    modal: {
        background: 'white',
        borderRadius: 16,
        padding: '32px 40px',
        textAlign: 'center',
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'fadeInScale 0.2s ease-out'
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
    },
    icon: {
        fontSize: '1.8rem',
        color: 'white'
    },
    title: {
        fontSize: '1.3rem',
        fontWeight: 800,
        color: '#0f172a',
        marginBottom: 8
    },
    text: {
        fontSize: '0.9rem',
        color: '#64748b',
        marginBottom: 20
    },
    timer: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24
    },
    timerNumber: {
        fontSize: '3rem',
        fontWeight: 900,
        color: '#ef4444',
        fontFamily: 'monospace'
    },
    timerLabel: {
        fontSize: '1rem',
        color: '#94a3b8',
        fontWeight: 600
    },
    actions: {
        display: 'flex',
        gap: 12,
        justifyContent: 'center'
    },
    extendBtn: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: 10,
        border: 'none',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: 'white',
        fontWeight: 700,
        fontSize: '0.9rem',
        cursor: 'pointer',
        fontFamily: 'Tajawal, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s'
    },
    logoutBtn: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: 10,
        border: '2px solid #e2e8f0',
        background: 'white',
        color: '#64748b',
        fontWeight: 700,
        fontSize: '0.9rem',
        cursor: 'pointer',
        fontFamily: 'Tajawal, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
    }
}
