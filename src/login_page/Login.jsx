import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { authAPI } from '../api/firebaseApi.js'
import { securityLogger, SECURITY_EVENTS, passwordValidator } from '../utils/security'

export default function Login() {
    const { login, loginAsGuest, loading, error, setError, isLocked, lockRemainingTime } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [remember, setRemember] = useState(false)

    // ── نسيت كلمة السر ──
    const [forgotMode, setForgotMode]       = useState(false)
    const [forgotEmail, setForgotEmail]     = useState('')
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotMsg, setForgotMsg]         = useState({ text: '', ok: true })

    // ✅ استرجع البريد المحفوظ
    useEffect(() => {
        const saved = localStorage.getItem('sp_remembered_email')
        if (saved) { setEmail(saved); setRemember(true) }
    }, [])

    // ── تسجيل الدخول ──
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (remember) localStorage.setItem('sp_remembered_email', email)
        else          localStorage.removeItem('sp_remembered_email')
        const res = await login(email, password)
        if (res.ok) {
            if (res.mustChangePassword) navigate('/change-password')
            else navigate(res.role === 'ADMIN' ? '/admin' : '/manager')
        }
    }

    // ── الدخول كضيف ──
    const handleGuestLogin = () => {
        const res = loginAsGuest()
        if (res.ok) {
            navigate('/guest')
        }
    }

    // ── إرسال رابط إعادة تعيين كلمة السر عبر Firebase ──
    const handleForgot = async (e) => {
        e.preventDefault()
        setForgotLoading(true)
        setForgotMsg({ text: '', ok: true })
        try {
            const res = await authAPI.forgotPassword(forgotEmail)
            setForgotMsg({ text: res.message, ok: true })
        } catch {
            setForgotMsg({ text: 'البريد غير مسجّل في النظام', ok: false })
        } finally {
            setForgotLoading(false)
        }
    }

    // ════════════════════════════════
    //  واجهة نسيت كلمة السر
    // ════════════════════════════════
    if (forgotMode) return (
        <div style={styles.page}>
            <div style={styles.blob1} /><div style={styles.blob2} /><div style={styles.blob3} />
            <div style={{ ...styles.card, gridTemplateColumns: '1fr', maxWidth: 460 }}>
                <div style={styles.formSide}>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{ ...styles.logo, margin: '0 auto 16px', width: 56, height: 56, fontSize: '1.5rem' }}>
                            <i className="fas fa-key" />
                        </div>
                        <h2 style={{ ...styles.welcome, fontSize: '1.4rem' }}>نسيت كلمة السر؟</h2>
                        <p style={styles.sub}>أدخل بريدك وسنرسل لك رابط إعادة التعيين</p>
                    </div>

                    {forgotMsg.text && (
                        <div style={{
                            ...styles.alert,
                            background: forgotMsg.ok ? '#f0fdf4' : '#fef2f2',
                            color:      forgotMsg.ok ? '#15803d' : '#991b1b',
                            border:     `1px solid ${forgotMsg.ok ? '#bbf7d0' : '#fecaca'}`,
                            marginBottom: 20,
                        }}>
                            <i className={`fas ${forgotMsg.ok ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
                            {forgotMsg.text}
                        </div>
                    )}

                    {forgotMsg.ok && forgotMsg.text ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📧</div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>
                                تحقق من صندوق البريد الوارد.
                            </p>
                            <button
                                onClick={() => { setForgotMode(false); setForgotMsg({ text: '', ok: true }); setForgotEmail('') }}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                            >
                                <i className="fas fa-arrow-right" /> العودة لتسجيل الدخول
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleForgot}>
                            <div className="form-group">
                                <label className="form-label">البريد الإلكتروني</label>
                                <div style={styles.inputWrap}>
                                    <i className="fas fa-envelope" style={styles.inputIcon} />
                                    <input
                                        className="form-input"
                                        style={{ paddingRight: '40px' }}
                                        type="email"
                                        value={forgotEmail}
                                        onChange={e => setForgotEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '13px', marginBottom: 12 }}
                                disabled={forgotLoading}
                            >
                                {forgotLoading
                                    ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />جاري الإرسال...</>
                                    : <><i className="fas fa-paper-plane" /> إرسال بريد إعادة التعيين</>
                                }
                            </button>

                            <button
                                type="button"
                                onClick={() => { setForgotMode(false); setForgotMsg({ text: '', ok: true }) }}
                                style={styles.backBtn}
                            >
                                <i className="fas fa-arrow-right" /> العودة لتسجيل الدخول
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )

    // ════════════════════════════════
    //  واجهة تسجيل الدخول الرئيسية
    // ════════════════════════════════
    return (
        <div style={styles.page}>
            <div style={styles.blob1} /><div style={styles.blob2} /><div style={styles.blob3} />

            <div style={styles.card}>
                {/* Left: Form */}
                <div style={styles.formSide}>
                    <div style={styles.brand}>
                        <div style={styles.logo}><i className="fas fa-parking" /></div>
                        <div>
                            <div style={styles.brandName}>SmartParking</div>
                            <div style={styles.brandSub}>نظام الإدارة الذكي</div>
                        </div>
                    </div>

                    <div style={styles.formHeader}>
                        <h2 style={styles.welcome}>مرحبا بك </h2>
                        <p style={styles.sub}>سجّل دخولك للوصول إلى لوحة التحكم</p>
                    </div>

                    {/* رسالة القفل الأمني */}
                    {isLocked && (
                        <div style={styles.lockAlert}>
                            <div style={styles.lockIcon}>
                                <i className="fas fa-lock" />
                            </div>
                            <div>
                                <div style={styles.lockTitle}>تم قفل الحساب مؤقتًا</div>
                                <div style={styles.lockText}>
                                    حاول مرة أخرى بعد {Math.ceil(lockRemainingTime / 60)} دقيقة
                                </div>
                            </div>
                        </div>
                    )}

                    {error && !isLocked && (
                        <div style={styles.alert}>
                            <i className="fas fa-exclamation-circle" />{error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div className="form-group">
                            <label className="form-label">البريد الإلكتروني</label>
                            <div style={styles.inputWrap}>
                                <i className="fas fa-envelope" style={styles.inputIcon} />
                                <input
                                    className="form-input"
                                    style={{ paddingRight: '40px' }}
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError?.('') }}
                                    placeholder="admin@smartparking.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>كلمة المرور</label>
                                <button
                                    type="button"
                                    onClick={() => { setForgotMode(true); setForgotEmail(email); setError?.('') }}
                                    style={styles.forgotBtn}
                                >
                                    <i className="fas fa-key" style={{ marginLeft: 4, fontSize: '0.7rem' }} />
                                    نسيت كلمة السر؟
                                </button>
                            </div>
                            <div style={styles.inputWrap}>
                                <i className="fas fa-lock" style={styles.inputIcon} />
                                <input
                                    className="form-input"
                                    style={{ paddingRight: '40px', paddingLeft: '40px' }}
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError?.('') }}
                                    placeholder="••••••••"
                                    required
                                />
                                <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                                    <i className={`fas fa-eye${showPass ? '-slash' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div style={styles.rememberRow}>
                            <label style={styles.rememberLabel} onClick={() => setRemember(r => !r)}>
                                <div style={{ ...styles.checkbox, background: remember ? '#6366f1' : 'white', borderColor: remember ? '#6366f1' : '#cbd5e1' }}>
                                    {remember && <i className="fas fa-check" style={{ fontSize: '0.65rem', color: 'white' }} />}
                                </div>
                                تذكّرني
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                padding: '13px', 
                                marginTop: '6px', 
                                fontSize: '1rem',
                                opacity: isLocked ? 0.5 : 1,
                                cursor: isLocked ? 'not-allowed' : 'pointer'
                            }}
                            disabled={loading || isLocked}
                        >
                            {loading
                                ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />جاري التحقق...</>
                                : isLocked 
                                    ? <><i className="fas fa-lock" /> الحساب مقفل</>
                                    : <><i className="fas fa-sign-in-alt" /> تسجيل الدخول</>
                            }
                        </button>

                        {/* فاصل */}
                        <div style={styles.divider}>
                            <span style={styles.dividerLine}></span>
                            <span style={styles.dividerText}>أو</span>
                            <span style={styles.dividerLine}></span>
                        </div>

                        {/* زر الدخول كضيف */}
                        <button
                            type="button"
                            onClick={handleGuestLogin}
                            style={styles.guestBtn}
                        >
                            <i className="fas fa-user-secret" style={{ marginLeft: 8 }} />
                            الدخول كضيف
                        </button>
                    </form>
                </div>

                {/* Right: Info panel */}
                <div style={styles.infoPanel}>
                    <div style={styles.infoContent}>
                        <div style={styles.infoIcon}>
                            <i className="fas fa-car" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.9)' }} />
                        </div>
                        <h1 style={styles.infoTitle}>مستقبل إدارة<br />مواقف السيارات</h1>
                        <p style={styles.infoText}>منصة متكاملة لإدارة ومراقبة مواقف السيارات في الوقت الفعلي</p>
                        <div style={styles.features}>
                            {[
                                { icon: 'fa-bolt',           label: 'تحديثات فورية',  desc: 'مراقبة لحظة بلحظة' },
                                { icon: 'fa-chart-pie',      label: 'تقارير ذكية',    desc: 'تحليل العوائد والإشغال' },
                                { icon: 'fa-map-marked-alt', label: 'خريطة تفاعلية', desc: 'رصد جغرافي دقيق' },
                            ].map(f => (
                                <div key={f.icon} style={styles.featureCard}>
                                    <div style={styles.featureIcon}><i className={`fas ${f.icon}`} /></div>
                                    <div>
                                        <div style={styles.featureLabel}>{f.label}</div>
                                        <div style={styles.featureDesc}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={styles.copyright}>© 2026 SmartParking — كل الحقوق محفوظة</div>
                </div>
            </div>
        </div>
    )
}

const styles = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at top left, #0f172a 0%, #1e1b4b 40%, #312e81 100%)', position: 'relative', overflow: 'hidden', padding: '20px' },
    blob1: { position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none' },
    blob2: { position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', bottom: -80, left: -80, pointerEvents: 'none' },
    blob3: { position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', top: '50%', left: '40%', pointerEvents: 'none' },
    card: { display: 'grid', gridTemplateColumns: '1fr 1.1fr', width: '100%', maxWidth: 880, borderRadius: 24, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 },
    formSide: { background: 'white', padding: '40px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    brand: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
    logo: { width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.3rem', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' },
    brandName: { fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' },
    brandSub:  { fontSize: '0.72rem', color: '#64748b', fontWeight: 500 },
    formHeader: { marginBottom: 22 },
    welcome: { fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 },
    sub:    { fontSize: '0.88rem', color: '#64748b' },
    alert:  { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.85rem', fontWeight: 600 },
    lockAlert: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, marginBottom: 16, background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #fbbf24', animation: 'pulse 2s infinite' },
    lockIcon: { width: 44, height: 44, borderRadius: 10, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', flexShrink: 0 },
    lockTitle: { fontSize: '0.9rem', fontWeight: 800, color: '#92400e', marginBottom: 2 },
    lockText: { fontSize: '0.8rem', color: '#b45309', fontWeight: 600 },
    form:   { display: 'flex', flexDirection: 'column' },
    inputWrap: { position: 'relative' },
    inputIcon: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.88rem' },
    eyeBtn:    { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.88rem' },
    forgotBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Tajawal, sans-serif', padding: 0, transition: 'color 0.2s' },
    rememberRow:   { display: 'flex', alignItems: 'center', marginBottom: 4, marginTop: 2 },
    rememberLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600, cursor: 'pointer', userSelect: 'none' },
    checkbox: { width: 18, height: 18, borderRadius: 5, border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
    backBtn: { width: '100%', padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
    infoPanel:    { background: 'linear-gradient(150deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
    infoContent:  { flex: 1, display: 'flex', flexDirection: 'column', gap: 20 },
    infoIcon:     { width: 70, height: 70, background: 'rgba(255,255,255,0.1)', borderRadius: 20, backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' },
    infoTitle:    { fontSize: '1.8rem', fontWeight: 900, color: 'white', lineHeight: 1.25, marginTop: 4 },
    infoText:     { fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 },
    features:     { display: 'flex', flexDirection: 'column', gap: 12 },
    featureCard:  { display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.08)', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' },
    featureIcon:  { width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5f3fc', fontSize: '1rem', flexShrink: 0 },
    featureLabel: { fontSize: '0.88rem', fontWeight: 700, color: 'white' },
    featureDesc:  { fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' },
    copyright:    { fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20 },
    divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' },
    dividerLine: { flex: 1, height: 1, background: '#e2e8f0' },
    dividerText: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 },
    guestBtn: { 
        width: '100%', 
        padding: '13px', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
        border: '2px solid #e2e8f0', 
        borderRadius: 10, 
        cursor: 'pointer', 
        fontFamily: 'Tajawal, sans-serif', 
        fontSize: '0.95rem', 
        fontWeight: 700, 
        color: '#475569', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        transition: 'all 0.2s ease',
    },
}
