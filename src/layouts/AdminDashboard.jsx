import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import PageStats from '../pages_admin_dashboard/PageStats'
import PageMap from '../pages_admin_dashboard/PageMap'
import PageZones from '../pages_admin_dashboard/PageZones'
import PageManagers from '../pages_admin_dashboard/PageManagers'
import PageUsers from '../pages_admin_dashboard/PageUsers'
import PageReports from '../pages_admin_dashboard/PageReports'
import { useData } from '../context/useData'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import PageFeedback from '../pages_admin_dashboard/Pagefeedback'

const PAGE_CONFIG = {
  stats:    { label: 'الإحصائيات',        icon: 'fa-chart-bar' },
  map:      { label: 'الخريطة والمواقف', icon: 'fa-map-marked-alt' },
  zones:    { label: 'إدارة المناطق',    icon: 'fa-parking' },
  managers: { label: 'المديرون',          icon: 'fa-users-cog' },
  users:    { label: 'المستخدمون',       icon: 'fa-user-shield' },
  reports:  { label: 'التقارير',         icon: 'fa-chart-line' },
  feedback: { label: 'التغذية الراجعة', icon: 'fa-comment-dots' },
}

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState('stats')
  const { zones } = useData()

  // ✅ allSpots مع onSnapshot — تتحدث فوراً عند أي تغيير في Firestore
  const [allSpots,    setAllSpots]    = useState([])
  const [spotsLoaded, setSpotsLoaded] = useState(false)
  const unsubsRef = useRef([])

  useEffect(() => {
    if (!zones || zones.length === 0) return

    // إلغاء الاشتراكات السابقة
    unsubsRef.current.forEach(u => u())
    unsubsRef.current = []

    setSpotsLoaded(false)

    // خريطة تحتفظ بأماكن كل zone
    const spotsMap = {}
    let loadedCount = 0

    zones.forEach(zone => {
      spotsMap[zone.zone_id] = []

      const unsub = onSnapshot(
          collection(db, 'zones', zone.zone_id, 'parking_spots'),
          (snap) => {
            // تحديث أماكن هذه الـ zone
            spotsMap[zone.zone_id] = snap.docs.map(d => ({
              spot_id: d.id,
              zone_id: zone.zone_id,
              ...d.data(),
            }))

            // دمج كل الأماكن من جميع المناطق
            const merged = Object.values(spotsMap).flat()
            setAllSpots(merged)

            // تحديد أن التحميل اكتمل بعد استجابة جميع المناطق
            if (!spotsLoaded) {
              loadedCount++
              if (loadedCount >= zones.length) setSpotsLoaded(true)
            }
          }
      )
      unsubsRef.current.push(unsub)
    })

    return () => {
      unsubsRef.current.forEach(u => u())
      unsubsRef.current = []
    }
  }, [zones])

  const cfg = PAGE_CONFIG[activePage] || PAGE_CONFIG.stats

  // ✅ CSS show/hide — الصفحات تبقى في الذاكرة ولا تُعاد من الصفر عند التبديل
  const show = (page) => ({ display: activePage === page ? 'block' : 'none' })

  return (
      <div style={styles.layout}>
        <Sidebar activePage={activePage} setPage={setActivePage} />
        <div style={styles.main}>
          <Topbar title={cfg.label} icon={cfg.icon}/>
          <div style={styles.content}>
            <div style={show('stats')}><PageStats allSpots={allSpots} spotsLoaded={spotsLoaded}/></div>
            <div style={show('map')}><PageMap isVisible={activePage === 'map'}/></div>
            <div style={show('zones')}><PageZones allSpots={allSpots} setAllSpots={setAllSpots}/></div>
            <div style={show('managers')}><PageManagers/></div>
            <div style={show('users')}><PageUsers/></div>
            <div style={show('reports')}><PageReports/></div>
            <div style={show('feedback')}><PageFeedback/></div>
          </div>


      </div>
</div>
)
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg)',
  },
  main: {
    flex: 1,
    marginRight: 'var(--sidebar-w)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  content: {
    flex: 1,
    padding: '22px 24px',
    overflowX: 'hidden',
  },
}
