// ══════════════════════════════════════════════════════
//  src/hooks/useNotifications.js
//  Hook: نظام الإشعارات الحي لـ ManagerDashboard
// ══════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'

export function useNotifications(myZone) {
    const [notifications, setNotifications] = useState([])
    const prevSpotsRef        = useRef({})
    const prevReservationsRef = useRef({})
    const isFirstSpots        = useRef(true)
    const isFirstRes          = useRef(true)

    const timeAgo = (date) => {
        const diff = Math.floor((Date.now() - date.getTime()) / 1000)
        if (diff < 60)    return 'الآن'
        if (diff < 3600)  return `منذ ${Math.floor(diff/60)} دقيقة`
        if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`
        return date.toLocaleDateString('ar-DZ')
    }

    const addNotif = (notif) => {
        setNotifications(prev => [
            { ...notif, id: Date.now() + Math.random(), timeAgo: timeAgo(new Date()), read: false },
            ...prev,
        ].slice(0, 50))
    }

    // ── استمع لتغييرات الأماكن ───────────────────────
    useEffect(() => {
        if (!myZone?.zone_id) return
        isFirstSpots.current = true

        const unsub = onSnapshot(
            collection(db, 'zones', myZone.zone_id, 'parking_spots'),
            (snap) => {
                if (isFirstSpots.current) {
                    snap.docs.forEach(d => { prevSpotsRef.current[d.id] = d.data().status })
                    isFirstSpots.current = false
                    return
                }
                snap.docChanges().forEach(change => {
                    if (change.type !== 'modified') return
                    const spot      = change.doc.data()
                    const oldStatus = prevSpotsRef.current[change.doc.id]
                    const newStatus = spot.status
                    if (oldStatus === newStatus) return
                    prevSpotsRef.current[change.doc.id] = newStatus

                    const map = {
                        OCCUPIED:    { type: 'spot_occupied',    msg: ` المكان ${spot.spot_number} أصبح مشغولاً` },
                        AVAILABLE:   { type: 'spot_available',   msg: ` المكان ${spot.spot_number} أصبح متاحاً` },
                        RESERVED:    { type: 'spot_reserved',    msg: ` المكان ${spot.spot_number} تم حجزه` },
                        MAINTENANCE: { type: 'spot_maintenance', msg: ` المكان ${spot.spot_number} في الصيانة` },
                    }
                    if (map[newStatus]) addNotif({ type: map[newStatus].type, message: map[newStatus].msg })
                })
            }
        )
        return () => unsub()
    }, [myZone?.zone_id])

    // ── استمع لتغييرات الحجوزات ──────────────────────
    useEffect(() => {
        if (!myZone?.zone_id) return
        isFirstRes.current = true

        const q = query(
            collection(db, 'reservations'),
            where('zone_id', '==', myZone.zone_id),
            orderBy('created_at', 'desc')
        )
        const unsub = onSnapshot(q, (snap) => {
            if (isFirstRes.current) {
                snap.docs.forEach(d => { prevReservationsRef.current[d.id] = d.data().status })
                isFirstRes.current = false
                return
            }
            snap.docChanges().forEach(change => {
                const res  = change.doc.data()
                const name = res.full_name || res.user_name || 'مجهول'
                const spot = res.spot_number || ''

                if (change.type === 'added') {
                    addNotif({ type: 'reservation_new', message: ` ${name} حجز المكان ${spot}` })
                    prevReservationsRef.current[change.doc.id] = res.status
                    return
                }
                if (change.type === 'modified') {
                    const oldStatus = prevReservationsRef.current[change.doc.id]
                    if (oldStatus === res.status) return
                    prevReservationsRef.current[change.doc.id] = res.status
                    if (res.status === 'cancelled') addNotif({ type: 'reservation_cancelled', message: ` ${name} ألغى حجز المكان ${spot}` })
                    else if (res.status === 'completed') addNotif({ type: 'reservation_completed', message: ` انتهى حجز ${name} في المكان ${spot}` })
                    else if (res.status === 'active')    addNotif({ type: 'spot_occupied',         message: ` ${name} دخل المكان ${spot}` })
                }
            })
        })
        return () => unsub()
    }, [myZone?.zone_id])

    const clearAll = () => setNotifications([])
    return { notifications, clearAll }
}
