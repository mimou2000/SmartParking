// ══════════════════════════════════════════════════════
//  src/pages/ManagerDashboard.jsx
//  ✅ يحل مشكلة عدم ظهور zone_id نهائياً
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
    const { user }                            = useAuth()
    const { zones, reservations: allRes }     = useData()
    const [activePage, setActivePage]         = useState('stats')

    // ✅ حل جذري: نستخدم state منفصل لـ zoneId و zoneName
    const [myZoneId, setMyZoneId] = useState(null)
    const [myZoneName, setMyZoneName] = useState(null)

    // ✅ جلب zone_id مباشرة من Firestore عند تحميل الصفحة وعند تغيير user
    useEffect(() => {
        if (!user?.uid) return

        const fetchUserZone = async () => {
            try {
                const userDocRef = doc(db, 'users', user.uid)
                const userDoc = await getDoc(userDocRef)
                if (userDoc.exists()) {
                    const data = userDoc.data()
                    console.log('🔥 Direct Firestore zone_id:', data.zone_id, 'zone_name:', data.zone_name)
                    setMyZoneId(data.zone_id || null)
                    setMyZoneName(data.zone_name || null)
                }
            } catch (err) {
                console.error('Error fetching user zone:', err)
            }
        }

        fetchUserZone()

        // ✅ اشترك في التحديثات المباشرة لوثيقة المستخدم
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                setMyZoneId(data.zone_id || null)
                setMyZoneName(data.zone_name || null)
            }
        })

        return () => unsubscribe()
    }, [user?.uid])

    // ✅ الآن نستخدم myZoneId و myZoneName بدلاً من user.zone_id
    const myZone = useMemo(() => {
        if (!myZoneId) return null
        const found = zones.find(z => z.zone_id === myZoneId)
        return found || { zone_id: myZoneId, zone_name: myZoneName || 'غير معروف' }
    }, [zones, myZoneId, myZoneName])

    // ✅ myReservations كـ state قابل للتحديث
    const [myReservations, setMyReservations] = useState([])
    useEffect(() => {
        if (myZone) {
            setMyReservations(allRes.filter(r => r && r.zone_id === myZone.zone_id))
        } else {
            setMyReservations([])
        }
    }, [allRes, myZone])

    // ✅ spots مع onSnapshot
    const [spots, setSpots] = useState([])
    useEffect(() => {
        if (!myZone?.zone_id) return
        const unsub = onSnapshot(
            collection(db, 'zones', myZone.zone_id, 'parking_spots'),
            (snap) => {
                setSpots(snap.docs.map(d => ({ spot_id: d.id, zone_id: myZone.zone_id, ...d.data() })))
            }
        )
        return () => { unsub(); setSpots([]) }
    }, [myZone?.zone_id])

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
                            <div style={show('stats')}>        <PageStats        myZone={myZone} myReservations={myReservations} spots={spots} />             </div>
                            <div style={show('reservations')}> <PageReservations myReservations={myReservations} setMyReservations={setMyReservations} />     </div>
                            <div style={show('spots')}>        <PageSpots        myZone={myZone} spots={spots} setSpots={setSpots} />                         </div>
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