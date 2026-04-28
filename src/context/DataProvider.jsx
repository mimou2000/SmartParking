// ══════════════════════════════════════════════════════
//  src/context/DataProvider.jsx
//  ✅ متوافق مع واجهة spotsAPI.changeStatus (يتطلب zoneId)
// ══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { DataContext } from './DataContext'
import {
    statsAPI, zonesAPI, managersAPI, usersAPI,
    reservationsAPI, spotsAPI, realtimeAPI,
} from '../api/firebaseApi.js'

export function DataProvider({ children }) {
    const { user } = useAuth()

    const [stats,        setStats]        = useState(null)
    const [zones,        setZones]        = useState([])
    const [managers,     setManagers]     = useState([])
    const [users,        setUsers]        = useState([])
    const [reservations, setReservations] = useState([])
    const [spots,        setSpots]        = useState([])
    const [loading,      setLoading]      = useState(true)
    const [error,        setError]        = useState(null)

    // ══════════════════════════════════════════════════
    //  FETCH FUNCTIONS
    // ══════════════════════════════════════════════════

    const fetchStats = useCallback(async () => {
        try {
            const res = await statsAPI.get()
            if (res.ok) setStats(res)
        } catch (err) { setError(err.message) }
    }, [])

    const fetchZones = useCallback(async () => {
        try {
            const res = await zonesAPI.getAll()
            if (res.ok) setZones(res.zones || [])
        } catch (err) { console.error('fetchZones:', err.message) }
    }, [])

    const fetchManagers = useCallback(async () => {
        try {
            const res = await managersAPI.getAll()
            if (res.ok) setManagers(res.managers || [])
        } catch (err) { console.error('fetchManagers:', err.message) }
    }, [])

    const fetchUsers = useCallback(async () => {
        try {
            const res = await usersAPI.getAll()
            if (res.ok) setUsers(res.users || [])
        } catch (err) { console.error('fetchUsers:', err.message) }
    }, [])

    const fetchReservations = useCallback(async () => {
        try {
            const res = await reservationsAPI.getAll()
            if (res.ok) setReservations(res.reservations || [])
        } catch (err) { console.error('fetchReservations:', err.message) }
    }, [])

    const fetchSpots = useCallback(async () => {
        try {
            const zoneId = user?.role === 'MANAGER' ? user?.zone_id : null
            const res    = await spotsAPI.getMySpots(zoneId)
            if (res.ok) setSpots(res.spots || [])
        } catch (err) { console.error('fetchSpots:', err.message) }
    }, [user])

    // ══════════════════════════════════════════════════
    //  INIT + Realtime Subscriptions (onSnapshot)
    // ══════════════════════════════════════════════════

    useEffect(() => {
        if (!user) return

        const init = async () => {
            setLoading(true)
            await Promise.all([fetchStats(), fetchUsers(), fetchManagers(), fetchSpots()])
            setLoading(false)
        }
        init()

        const unsubZones = realtimeAPI.subscribeZones((updatedZones) => setZones(updatedZones))
        // ✅ تمرير zone_id للمدير حتى يعمل الـ query مع Firestore Rules
        const unsubRes   = realtimeAPI.subscribeReservations(
            (updatedRes) => setReservations(updatedRes),
            user?.role === 'MANAGER' ? user?.zone_id : null
        )
        const unsubSpots = realtimeAPI.subscribeSpots(
            (updatedSpots) => setSpots(updatedSpots),
            user?.role === 'MANAGER' ? user?.zone_id : null
        )

        const iv = setInterval(() => fetchStats(), 30000)

        return () => {
            unsubZones()
            unsubRes()
            unsubSpots()
            clearInterval(iv)
        }
    }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

    // ══════════════════════════════════════════════════
    //  قيم مشتقة
    // ══════════════════════════════════════════════════

    const admins = users.filter(u => u.role === 'ADMIN')

    const managersEnriched = users.filter(u => u.role === 'MANAGER').map(u => {
        const extra = managers.find(m => m.user_id === u.user_id)
        if (!extra) return u

        // ✅ إصلاح: دمج آمن — لا نكتب undefined فوق قيمة موجودة
        const merged = { ...extra, ...u }

        // ضمان حقول الموقف من أي مصدر متاح
        merged.zone_id       = u.zone_id       || extra.zone_id       || null
        merged.zone_name     = u.zone_name     || extra.zone_name     || ''
        merged.assigned_zone = u.assigned_zone || extra.assigned_zone || u.zone_id || extra.zone_id || null

        return merged
    })
    const managersDisplay = managersEnriched.length > 0 ? managersEnriched : managers

    // ══════════════════════════════════════════════════
    //  ZONE ACTIONS
    // ══════════════════════════════════════════════════

    const createZone = async (data) => {
        const res = await zonesAPI.create(data)
        if (!res.ok) throw new Error(res.message || 'فشل إنشاء الموقف')
        await fetchStats()
        return res
    }

    const updateZonePrice = async (zoneId, prices) => {
        const res = await zonesAPI.updatePrice(zoneId, prices)
        if (!res.ok) throw new Error(res.message || 'فشل تحديث الأسعار')
        return res
    }

    const toggleZone = async (zoneId, activate) => {
        const res = activate ? await zonesAPI.activate(zoneId) : await zonesAPI.deactivate(zoneId)
        if (!res.ok) throw new Error(res.message || 'فشل تغيير حالة الموقف')
        return res
    }

    const deleteZone = async (zoneId) => {
        const res = await zonesAPI.delete(zoneId)
        if (!res.ok) throw new Error(res.message || 'فشل الحذف')
        await fetchStats()
        return res
    }

    const addZone = createZone

    const updateZone = async (zoneId, data) => {
        const current = zones.find(z => z.zone_id === zoneId)
        if (current && Boolean(data.is_active) !== Boolean(current.is_active)) {
            return toggleZone(zoneId, Boolean(data.is_active))
        }
        return updateZonePrice(zoneId, {
            hourly_rate: data.hourly_rate,
            daily_rate:  data.daily_rate  || null,
            weekly_rate: data.weekly_rate || null,
        })
    }

    // ── Managers ──
    const addManager = async (data) => {
        const res = await managersAPI.add(data)
        if (!res.ok) throw new Error(res.message)
        await fetchUsers(); await fetchManagers()
        return res
    }

    const updateManager = async (data) => {
        const res = await managersAPI.edit(data)
        if (!res.ok) throw new Error(res.message)
        await fetchUsers(); await fetchManagers()
        return res
    }

    // ── Users ──
    const addUser = async (data) => {
        const res = await usersAPI.add(data)
        if (!res.ok) throw new Error(res.message)
        await fetchUsers(); await fetchManagers()
        return res
    }

    const updateUser = async (userId, data) => {
        const res = await usersAPI.edit({ user_id: userId, ...data })
        if (!res.ok) throw new Error(res.message)
        // إذا كانت البيانات تتضمن zone → نحدّث managers أيضاً
        if (data.zone_id !== undefined || data.assigned_zone !== undefined) {
            await managersAPI.edit({
                user_id:       userId,
                zone_id:       data.zone_id       ?? data.assigned_zone ?? null,
                assigned_zone: data.assigned_zone ?? data.zone_id       ?? null,
                zone_name:     data.zone_name     ?? '',
            }).catch(() => {}) // silent: قد لا يكون في collection managers
        }
        await fetchUsers(); await fetchManagers()
        return res
    }

    const deleteUser = async (userId) => {
        if (userId === user?.uid) throw new Error('لا يمكنك حذف حسابك الحالي')
        const res = await usersAPI.delete(userId)
        if (!res.ok) throw new Error(res.message)
        await fetchUsers(); await fetchManagers()
        return res
    }

    // ── Reservations ──
    const confirmReservation = async (id) => {
        const r = await reservationsAPI.confirm(id)
        if (!r.ok) throw new Error(r.message)
        return r
    }

    const cancelReservation = async (id) => {
        const r = await reservationsAPI.cancel(id)
        if (!r.ok) throw new Error(r.message)
        await fetchStats()
        return r
    }

    const completeReservation = async (id) => {
        const r = await reservationsAPI.complete(id)
        if (!r.ok) throw new Error(r.message)
        await fetchStats()
        return r
    }

    // ── Spots ──
    // ✅ التعديل: إضافة zoneId كمعامل ثالث لتتوافق مع spotsAPI.changeStatus
    const changeSpotStatus = async (spotId, status, zoneId) => {
        if (!zoneId) throw new Error('zoneId مطلوب لتغيير حالة المكان')
        const r = await spotsAPI.changeStatus(spotId, status, zoneId)
        if (!r.ok) throw new Error(r.message)
        return r
    }

    // ── شاشة التحميل ──
    if (loading) return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:14 }}>
            <div style={{ width:44, height:44, border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color:'#64748b', fontSize:'0.9rem', fontFamily:'Tajawal, sans-serif' }}>جاري تحميل البيانات...</div>
        </div>
    )

    return (
        <DataContext.Provider value={{
            stats, zones, managers: managersDisplay, admins, users,
            reservations, spots, loading, error,

            totalSpots:     stats?.total_spots     ?? 0,
            availableSpots: stats?.available_spots ?? 0,
            occupiedSpots:  stats?.occupied_spots  ?? 0,
            occupancyRate:  stats?.occupancy_rate  ?? 0,
            totalRevenue:   stats?.total_revenue   ?? 0,
            todayRevenue:   stats?.today_revenue   ?? 0,
            weekRevenue:    stats?.week_revenue    ?? 0,
            monthRevenue:   stats?.month_revenue   ?? 0,

            fetchStats, fetchZones, fetchManagers, fetchUsers, fetchReservations, fetchSpots,

            createZone, addZone, updateZone, updateZonePrice, toggleZone, deleteZone,
            addManager, updateManager,
            addUser, updateUser, deleteUser,
            confirmReservation, cancelReservation, completeReservation,
            changeSpotStatus,
        }}>
            {children}
        </DataContext.Provider>
    )
}