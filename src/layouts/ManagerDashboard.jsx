// ══════════════════════════════════════════════════════
//  src/pages/ManagerDashboard.jsx
//  ✅ وضع الضيف يستخدم المنطقة الأولى من DataContext مباشرة
//  ✅ لا توجد استعلامات Firestore في وضع الضيف
// ══════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar  from '../components/Topbar'
import { useAuth } from '../context/useAuth.js'
import { useData } from '../context/useData.js'
import { db } from '../firebase'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { useNotifications }  from '../hooks/useNotifications'
import { PageStats }         from '../pages_manager_dashboard/PageStats'
import { PageReservations }  from '../pages_manager_dashboard/PageReservations'
import { PageSpots }         from '../pages_manager_dashboard/PageSpots'
import { PageReports }       from '../pages_manager_dashboard/PageReports'
import { PageDrivers }       from '../pages_manager_dashboard/PageDrivers'
import { PageManagers }      from '../pages_manager_dashboard/PageManagers'
import { S } from '../utils/constants_manager'

const PAGE_CONFIG = {
    stats:        { label: 'لوحة التحكم',  icon: 'fa-chart-bar'      },
    reservations: { label: 'الحجوزات',     icon: 'fa-calendar-check' },
    spots:        { label: 'الأماكن',      icon: 'fa-th'             },
    reports:      { label: 'التقارير',     icon: 'fa-chart-line'     },
    drivers:      { label: 'سائقو موقفي', icon: 'fa-users'          },
    managers:     { label: 'الإدارة',      icon: 'fa-user-shield'    },
}

export default function ManagerDashboard() {
    const { user } = useAuth()
    const { zones, reservations: allRes, spots: allSpots } = useData()
    const [activePage, setActivePage] = useState('stats')

    const [myZoneId, setMyZoneId] = useState(null)
    const [myZoneName, setMyZoneName] = useState(null)

    const isGuest = user?.isGuest === true   // متغير ثابت لتجنب تحذيرات التبعيات

    // ══════════════════════════════════════════════════
    //  تحديد myZoneId (المنطقة الخاصة بالمدير)
    // ══════════════════════════════════════════════════
    useEffect(() => {
        if (!user?.uid) return

        // ── وضع الضيف: استخدم المنطقة الأولى من DataContext ──
        if (isGuest) {
            const guestZone = zones[0]
            if (guestZone) {
                setMyZoneId(guestZone.zone_id)
                setMyZoneName(guestZone.zone_name)
            }
            return
        }

        // ── مستخدم حقيقي ──
        if (user.zone_id) {
            setMyZoneId(user.zone_id)
            setMyZoneName(user.zone_name || null)
        }

        let unsub
        try {
            unsub = onSnapshot(
                doc(db, 'users', user.uid),
                (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data()
                        setMyZoneId(data.zone_id || null)
                        setMyZoneName(data.zone_name || null)
                    }
                },
                (err) => console.warn('⚠️ اشتراك المستخدم فشل:', err.message)
            )
        } catch (err) {
            console.warn('فشل بدء الاشتراك:', err.message)
        }

        return () => { if (unsub) unsub() }
    }, [user, zones, isGuest])

    // ══════════════════════════════════════════════════
    //  myZone: كائن المنطقة المعروض
    // ══════════════════════════════════════════════════
    const myZone = useMemo(() => {
        if (!myZoneId) return null
        const found = zones.find(z => z.zone_id === myZoneId)
        return found || { zone_id: myZoneId, zone_name: myZoneName || 'غير معروف' }
    }, [zones, myZoneId, myZoneName])

    // ══════════════════════════════════════════════════
    //  myReservations (مُصفّاة)
    // ══════════════════════════════════════════════════
    const myReservations = useMemo(() => {
        if (!myZone) return []
        return allRes.filter(r => r && r.zone_id === myZone.zone_id)
    }, [allRes, myZone])

    // ══════════════════════════════════════════════════
    //  mySpots (مُصفّاة من allSpots)
    // ══════════════════════════════════════════════════
    const mySpots = useMemo(() => {
        if (!myZone) return []
        return allSpots.filter(s => s.zone_id === myZone.zone_id)
    }, [allSpots, myZone])

    const { notifications, clearAll } = useNotifications(myZone)

    const cfg  = PAGE_CONFIG[activePage] || PAGE_CONFIG.stats
    const show = (page) => ({ display: activePage === page ? 'block' : 'none' })

    return (
        <div style={S.layout}>
            <Sidebar activePage={activePage} setPage={setActivePage} />
            <div style={S.main}>
                <Topbar
                    title={cfg.label}
                    icon={cfg.icon}
                    notifications={notifications}
                    onClearAll={clearAll}
                />
                <div style={S.content}>
                    {!myZone && (
                        <div className="card" style={{ textAlign: 'center', padding: 60, marginBottom: 22 }}>
                            <i className="fas fa-map-marked-alt" style={{ fontSize: '3rem', color: '#cbd5e1', display: 'block', marginBottom: 16 }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#64748b' }}>لم يتم تعيينك لأي موقف بعد</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 8 }}>تواصل مع المسؤول لتعيينك لموقف وقوف</div>
                        </div>
                    )}
                    {myZone && (
                        <>
                            <div style={show('stats')}>        <PageStats        myZone={myZone} myReservations={myReservations} spots={mySpots} />             </div>
                            <div style={show('reservations')}> <PageReservations myReservations={myReservations} setMyReservations={() => {}} />     </div>
                            <div style={show('spots')}>        <PageSpots        myZone={myZone} spots={mySpots} setSpots={() => {}} />                         </div>
                            <div style={show('reports')}>      <PageReports      myReservations={myReservations} />                                           </div>
                            <div style={show('drivers')}>      <PageDrivers      myReservations={myReservations} />                                           </div>
                            <div style={show('managers')}>     <PageManagers     myZone={myZone} currentUser={user} />                                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}