// ══════════════════════════════════════════════════════
//  src/layouts/GuestDashboard.jsx
//  لوحة تحكم الضيف - عرض فقط بدون تعديل
// ══════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'

export default function GuestDashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [zones, setZones] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedZone, setSelectedZone] = useState(null)
    const [spots, setSpots] = useState([])

    // جلب المواقف
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'zones'), (snap) => {
            const data = snap.docs.map(d => ({ zone_id: d.id, ...d.data() }))
            setZones(data)
            setLoading(false)
        })
        return () => unsub()
    }, [])

    // جلب الأماكن عند اختيار موقف
    useEffect(() => {
        if (!selectedZone) {
            setSpots([])
            return
        }
        const unsub = onSnapshot(
            collection(db, 'zones', selectedZone.zone_id, 'parking_spots'),
            (snap) => {
                setSpots(snap.docs.map(d => ({ spot_id: d.id, ...d.data() })))
            }
        )
        return () => unsub()
    }, [selectedZone?.zone_id])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const availableSpots = spots.filter(s => s.status === 'AVAILABLE').length
    const occupiedSpots = spots.filter(s => s.status === 'OCCUPIED').length

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.brand}>
                        <div style={styles.logo}>
                            <i className="fas fa-parking" />
                        </div>
                        <div>
                            <div style={styles.brandName}>SmartParking</div>
                            <div style={styles.brandSub}>وضع الضيف</div>
                        </div>
                    </div>
                    <div style={styles.userInfo}>
                        <div style={styles.guestBadge}>
                            <i className="fas fa-user-secret" style={{ marginLeft: 6 }} />
                            زائر
                        </div>
                        <button onClick={handleLogout} style={styles.logoutBtn}>
                            <i className="fas fa-sign-out-alt" style={{ marginLeft: 6 }} />
                            خروج
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                {/* Welcome Section */}
                <div style={styles.welcomeCard}>
                    <div style={styles.welcomeIcon}>
                        <i className="fas fa-hand-sparkles" />
                    </div>
                    <div>
                        <h1 style={styles.welcomeTitle}>مرحباً بك في SmartParking</h1>
                        <p style={styles.welcomeText}>
                            يمكنك تصفح المواقف المتاحة ورؤية الأماكن الشاغرة. للحجز والمزيد من الميزات، يرجى تسجيل الدخول.
                        </p>
                    </div>
                </div>

                {/* Zones Grid */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>
                            <i className="fas fa-map-marked-alt" style={{ marginLeft: 10, color: '#6366f1' }} />
                            المواقف المتاحة
                        </h2>
                        <span style={styles.badge}>{zones.length} موقف</span>
                    </div>

                    {loading ? (
                        <div style={styles.loading}>
                            <div className="spinner" />
                            <span>جاري التحميل...</span>
                        </div>
                    ) : zones.length === 0 ? (
                        <div style={styles.empty}>
                            <i className="fas fa-parking" style={{ fontSize: '3rem', color: '#cbd5e1' }} />
                            <p>لا توجد مواقف متاحة حالياً</p>
                        </div>
                    ) : (
                        <div style={styles.zonesGrid}>
                            {zones.map(zone => (
                                <div
                                    key={zone.zone_id}
                                    style={{
                                        ...styles.zoneCard,
                                        borderColor: selectedZone?.zone_id === zone.zone_id ? '#6366f1' : '#e2e8f0',
                                        background: selectedZone?.zone_id === zone.zone_id ? '#f5f3ff' : 'white'
                                    }}
                                    onClick={() => setSelectedZone(zone)}
                                >
                                    <div style={styles.zoneIcon}>
                                        <i className="fas fa-map-marker-alt" />
                                    </div>
                                    <div style={styles.zoneInfo}>
                                        <div style={styles.zoneName}>{zone.zone_name || 'موقف بدون اسم'}</div>
                                        <div style={styles.zoneLocation}>
                                            <i className="fas fa-location-dot" style={{ marginLeft: 4, fontSize: '0.7rem' }} />
                                            {zone.location || 'موقع غير محدد'}
                                        </div>
                                    </div>
                                    <div style={styles.zoneCapacity}>
                                        <i className="fas fa-car" style={{ marginLeft: 4 }} />
                                        {zone.total_spots || 0} مكان
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Zone Details */}
                {selectedZone && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>
                                <i className="fas fa-th" style={{ marginLeft: 10, color: '#10b981' }} />
                                أماكن الوقوف في: {selectedZone.zone_name}
                            </h2>
                            <button 
                                onClick={() => setSelectedZone(null)} 
                                style={styles.closeBtn}
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        {/* Stats */}
                        <div style={styles.statsRow}>
                            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <i className="fas fa-check-circle" style={styles.statIcon} />
                                <div>
                                    <div style={styles.statNumber}>{availableSpots}</div>
                                    <div style={styles.statLabel}>متاح</div>
                                </div>
                            </div>
                            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                <i className="fas fa-car" style={styles.statIcon} />
                                <div>
                                    <div style={styles.statNumber}>{occupiedSpots}</div>
                                    <div style={styles.statLabel}>مشغول</div>
                                </div>
                            </div>
                            <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                <i className="fas fa-th-large" style={styles.statIcon} />
                                <div>
                                    <div style={styles.statNumber}>{spots.length}</div>
                                    <div style={styles.statLabel}>إجمالي</div>
                                </div>
                            </div>
                        </div>

                        {/* Spots Grid */}
                        {spots.length === 0 ? (
                            <div style={styles.empty}>
                                <i className="fas fa-parking" style={{ fontSize: '2rem', color: '#cbd5e1' }} />
                                <p>لا توجد أماكن مسجلة</p>
                            </div>
                        ) : (
                            <div style={styles.spotsGrid}>
                                {spots.map(spot => (
                                    <div
                                        key={spot.spot_id}
                                        style={{
                                            ...styles.spotCard,
                                            background: spot.status === 'AVAILABLE' ? '#f0fdf4' : '#fef2f2',
                                            borderColor: spot.status === 'AVAILABLE' ? '#86efac' : '#fecaca'
                                        }}
                                    >
                                        <div style={{
                                            ...styles.spotStatus,
                                            background: spot.status === 'AVAILABLE' ? '#10b981' : '#ef4444'
                                        }}>
                                            <i className={`fas ${spot.status === 'AVAILABLE' ? 'fa-check' : 'fa-car'}`} />
                                        </div>
                                        <div style={styles.spotName}>{spot.spot_name || spot.spot_id}</div>
                                        <div style={styles.spotLabel}>
                                            {spot.status === 'AVAILABLE' ? 'متاح' : 'مشغول'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Login Prompt */}
                <div style={styles.loginPrompt}>
                    <i className="fas fa-lock" style={{ fontSize: '1.5rem', color: '#6366f1' }} />
                    <div>
                        <div style={styles.promptTitle}>تريد حجز مكان؟</div>
                        <div style={styles.promptText}>سجل دخولك للحصول على جميع الميزات</div>
                    </div>
                    <button onClick={handleLogout} style={styles.loginBtn}>
                        <i className="fas fa-sign-in-alt" style={{ marginLeft: 6 }} />
                        تسجيل الدخول
                    </button>
                </div>
            </main>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        background: '#f8fafc',
        direction: 'rtl'
    },
    header: {
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
    },
    headerContent: {
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
    },
    logo: {
        width: 44,
        height: 44,
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem'
    },
    brandName: {
        fontSize: '1.1rem',
        fontWeight: 800,
        color: '#0f172a'
    },
    brandSub: {
        fontSize: '0.75rem',
        color: '#64748b'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
    },
    guestBadge: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 14px',
        background: '#f1f5f9',
        borderRadius: 20,
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#475569'
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#64748b',
        fontFamily: 'Tajawal, sans-serif',
        transition: 'all 0.2s'
    },
    main: {
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px'
    },
    welcomeCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 24,
        color: 'white'
    },
    welcomeIcon: {
        width: 60,
        height: 60,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
        flexShrink: 0
    },
    welcomeTitle: {
        fontSize: '1.3rem',
        fontWeight: 800,
        marginBottom: 6
    },
    welcomeText: {
        fontSize: '0.9rem',
        opacity: 0.9,
        lineHeight: 1.6
    },
    section: {
        background: 'white',
        borderRadius: 16,
        padding: '24px',
        marginBottom: 20,
        border: '1px solid #e2e8f0'
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#0f172a',
        margin: 0
    },
    badge: {
        padding: '6px 12px',
        background: '#f1f5f9',
        borderRadius: 20,
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#64748b'
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
        color: '#64748b'
    },
    empty: {
        textAlign: 'center',
        padding: 40,
        color: '#94a3b8'
    },
    zonesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16
    },
    zoneCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '18px 20px',
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    zoneIcon: {
        width: 44,
        height: 44,
        background: '#f1f5f9',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6366f1',
        fontSize: '1.1rem',
        flexShrink: 0
    },
    zoneInfo: {
        flex: 1
    },
    zoneName: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: 4
    },
    zoneLocation: {
        fontSize: '0.8rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center'
    },
    zoneCapacity: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#f8fafc',
        borderRadius: 8,
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#475569'
    },
    closeBtn: {
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        color: '#64748b',
        fontSize: '0.9rem'
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 20
    },
    statCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '18px 20px',
        borderRadius: 12,
        color: 'white'
    },
    statIcon: {
        fontSize: '1.5rem',
        opacity: 0.9
    },
    statNumber: {
        fontSize: '1.5rem',
        fontWeight: 800
    },
    statLabel: {
        fontSize: '0.8rem',
        opacity: 0.9
    },
    spotsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: 12
    },
    spotCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 12px',
        borderRadius: 12,
        border: '2px solid',
        textAlign: 'center'
    },
    spotStatus: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '0.8rem',
        marginBottom: 8
    },
    spotName: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: 4
    },
    spotLabel: {
        fontSize: '0.75rem',
        color: '#64748b'
    },
    loginPrompt: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'white',
        border: '2px dashed #c7d2fe',
        borderRadius: 16,
        padding: '20px 24px'
    },
    promptTitle: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: 2
    },
    promptText: {
        fontSize: '0.8rem',
        color: '#64748b'
    },
    loginBtn: {
        marginRight: 'auto',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 700,
        color: 'white',
        fontFamily: 'Tajawal, sans-serif'
    }
}
