// ══════════════════════════════════════════════════════
//  src/api/firebaseApi.js
//  متوافق مع قواعد الأمان - استخدام secondaryApp لتحديث كلمات المرور
// ══════════════════════════════════════════════════════

import { db, auth } from '../firebase'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { securityLogger, SECURITY_EVENTS } from '../utils/security'
import {
    collection, doc,
    getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, onSnapshot,
    serverTimestamp, Timestamp,
} from 'firebase/firestore'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updatePassword,
    signOut,
} from 'firebase/auth'
import emailjs from '@emailjs/browser'

// ✅ Secondary App — لإنشاء مستخدمين جدد أو تحديث كلمة السر دون التأثير على جلسة الأدمن
const getSecondaryApp = () => {
    const existing = getApps().find(a => a.name === 'secondary')
    if (existing) return existing
    return initializeApp(auth.app.options, 'secondary')
}

const getSecondaryAuth = () => getAuth(getSecondaryApp())
const getSecondaryFirestore = () => getFirestore(getSecondaryApp())

// ── EmailJS Config ────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_490o3an'
const EMAILJS_TEMPLATE_ID = 'template_rfj0pko'
const EMAILJS_PUBLIC_KEY  = '4NlwW9FgbDZ46REAs'

// ── توليد كلمة سر مؤقتة ──────────────────────────────
function generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let pass = 'SP@'
    for (let i = 0; i < 8; i++) {
        pass += chars[Math.floor(Math.random() * chars.length)]
    }
    return pass
}

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════

export const authAPI = {
    login: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),

    logout: () =>
        signOut(auth),

    forgotPassword: async (email) => {
        const q        = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            return { message: 'إذا كان البريد مسجّلاً، ستصلك كلمة السر المؤقتة خلال دقائق ✅' }
        }

        const userDoc      = snapshot.docs[0]
        const userData     = userDoc.data()
        const tempPassword = generateTempPassword()
        const oldPassword  = userData.password_hash

        // استخدام secondaryApp لتسجيل الدخول وتحديث كلمة السر في Firebase Auth
        const secondaryAuth = getSecondaryAuth()
        const secondaryDb   = getSecondaryFirestore()
        try {
            const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword)
            await updatePassword(cred.user, tempPassword)
            await secondaryAuth.signOut()
        } catch (e) {
            console.warn('Auth update failed (maybe old password is invalid):', e.message)
        }

        // تحديث Firestore باستخدام secondaryApp (نفس هوية المستخدم)
        await updateDoc(doc(secondaryDb, 'users', userDoc.id), {
            password_hash:     tempPassword,
            temp_pass_expiry:  Date.now() + 30 * 60 * 1000,
            temp_pass_used:    false,
            updated_at:        serverTimestamp(),
        })

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email:      email,
                    to_name:       userData.full_name || email.split('@')[0],
                    temp_password: tempPassword,
                    name:          userData.full_name || email.split('@')[0],
                    email:         email,
                    title:         'إعادة تعيين كلمة السر',
                },
                EMAILJS_PUBLIC_KEY
            )
        } catch (err) {
            console.error('EmailJS error:', err)
            throw new Error('فشل إرسال البريد الإلكتروني')
        }

        // تسجيل طلب استعادة كلمة المرور
        securityLogger.log(SECURITY_EVENTS.PASSWORD_RESET_REQUEST, {
            email,
            success: true
        })

        return { message: 'تم إرسال كلمة السر المؤقتة إلى بريدك الإلكتروني' }
    },
}

// ══════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════

export const statsAPI = {
    get: async () => {
        try {
            const [reservSnap, zonesSnap] = await Promise.all([
                getDocs(query(collection(db, 'reservations'), orderBy('created_at', 'desc'))),
                getDocs(collection(db, 'zones')),
            ])

            const reservations = reservSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            const zones        = zonesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

            let totalSpots = 0
            zones.forEach(zone => {
                if (zone.spot_types && zone.is_active) {
                    Object.values(zone.spot_types).forEach(count => {
                        totalSpots += Number(count)
                    })
                }
            })

            const now      = new Date()
            const todayStr = now.toISOString().slice(0, 10)
            const weekAgo  = new Date(now - 7  * 86400000)
            const monthAgo = new Date(now - 30 * 86400000)
            const toDate   = (ts) => { if (!ts) return null; return ts?.toDate ? ts.toDate() : new Date(ts) }

            const completedRes = reservations.filter(r => r.status === 'completed')
            const totalRevenue = completedRes.reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)
            const todayRevenue = completedRes
                .filter(r => { const d = toDate(r.end_time || r.created_at); return d && d.toISOString().slice(0, 10) === todayStr })
                .reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)
            const weekRevenue  = completedRes
                .filter(r => { const d = toDate(r.end_time || r.created_at); return d && d >= weekAgo })
                .reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)
            const monthRevenue = completedRes
                .filter(r => { const d = toDate(r.end_time || r.created_at); return d && d >= monthAgo })
                .reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)

            const occupiedSpots  = reservations.filter(r => r.status === 'active').length
            const availableSpots = totalSpots - occupiedSpots
            const occupancyRate  = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0

            return {
                ok: true,
                total_spots:         totalSpots,
                available_spots:     availableSpots,
                occupied_spots:      occupiedSpots,
                occupancy_rate:      occupancyRate,
                total_revenue:       totalRevenue,
                today_revenue:       todayRevenue,
                week_revenue:        weekRevenue,
                month_revenue:       monthRevenue,
                recent_reservations: reservations.slice(0, 10),
            }
        } catch (err) {
            throw new Error(err.message)
        }
    },
}

// ══════════════════════════════════════════════════════
//  ZONES
// ══════════════════════════════════════════════════════

export const zonesAPI = {
    getAll: async () => {
        const snap  = await getDocs(collection(db, 'zones'))
        const zones = snap.docs.map(d => ({ zone_id: d.id, ...d.data() }))
        return { ok: true, zones }
    },

    create: async (data) => {
        const ref = await addDoc(collection(db, 'zones'), {
            ...data,
            is_active:  true,
            created_at: serverTimestamp(),
        })

        const typeLetters = {
            STANDARD:   'A',
            VIP:        'B',
            MOTORCYCLE: 'C',
            DISABLED:   'D',
            ELECTRIC:   'E',
        }

        const spotTypes = data.spot_types || {}
        const promises  = []

        Object.entries(spotTypes).forEach(([type, count]) => {
            const letter = typeLetters[type] || 'X'
            for (let i = 1; i <= count; i++) {
                const spotRef = doc(collection(db, 'zones', ref.id, 'parking_spots'))
                promises.push(setDoc(spotRef, {
                    spot_number: `${letter}-${i}`,
                    spot_type:   type,
                    status:      'AVAILABLE',
                    created_at:  serverTimestamp(),
                }))
            }
        })

        await Promise.all(promises)
        return { ok: true, zone_id: ref.id }
    },

    updatePrice: async (zoneId, prices) => {
        await updateDoc(doc(db, 'zones', zoneId), { ...prices, updated_at: serverTimestamp() })
        return { ok: true }
    },

    activate: async (zoneId) => {
        await updateDoc(doc(db, 'zones', zoneId), { is_active: true, updated_at: serverTimestamp() })
        return { ok: true }
    },

    deactivate: async (zoneId) => {
        await updateDoc(doc(db, 'zones', zoneId), { is_active: false, updated_at: serverTimestamp() })
        return { ok: true }
    },

    delete: async (zoneId) => {
        await deleteDoc(doc(db, 'zones', zoneId))
        return { ok: true }
    },
}

// ══════════════════════════════════════════════════════
//  MANAGERS
// ══════════════════════════════════════════════════════

export const assignManagerToZone = async (managerId, zoneId) => {
    await updateDoc(doc(db, 'users', managerId), {
        zone_id:    zoneId,
        updated_at: serverTimestamp(),
    })
    return { ok: true }
}

export const unassignManager = async (managerId) => {
    await updateDoc(doc(db, 'users', managerId), {
        zone_id:    null,
        updated_at: serverTimestamp(),
    })
    return { ok: true }
}

export const managersAPI = {
    getAll: async () => {
        const snap     = await getDocs(query(collection(db, 'users'), where('role', '==', 'MANAGER')))
        const managers = snap.docs.map(d => ({ user_id: d.id, ...d.data() }))
        return { ok: true, managers }
    },

    add: async (data) => {
        const { email, password, ...rest } = data
        const secondaryAuth = getSecondaryAuth()
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        await setDoc(doc(db, 'users', cred.user.uid), {
            ...rest,
            email,
            role:          'MANAGER',
            zone_id:       data.zone_id || 'NULL',
            password_hash: password,
            created_at:    serverTimestamp(),
        })
        await secondaryAuth.signOut()

        // تسجيل إنشاء مدير جديد
        securityLogger.log(SECURITY_EVENTS.SENSITIVE_ACTION, {
            action: 'create_manager',
            targetEmail: email,
            targetUserId: cred.user.uid
        })

        return { ok: true, user_id: cred.user.uid }
    },

    edit: async (data) => {
        const { user_id, password, ...rest } = data
        const updateData = { ...rest, updated_at: serverTimestamp() }

        if (password) {
            const userDoc = await getDoc(doc(db, 'users', user_id))
            if (userDoc.exists()) {
                const { email, password_hash: oldPassword } = userDoc.data()
                if (oldPassword) {
                    try {
                        const secondaryAuth = getSecondaryAuth()
                        const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword)
                        await updatePassword(cred.user, password)
                        await secondaryAuth.signOut()

                        // تسجيل تغيير كلمة المرور
                        securityLogger.log(SECURITY_EVENTS.PASSWORD_CHANGE, {
                            action: 'password_changed_by_admin',
                            targetUserId: user_id,
                            targetEmail: email
                        })
                    } catch (e) {
                        console.error('فشل تغيير كلمة السر في Auth:', e)
                    }
                }
            }
            updateData.password_hash      = password
            updateData.temp_pass_expiry   = null
            updateData.temp_pass_used     = true   // منع شرط login من رفض الدخول
        }

        await updateDoc(doc(db, 'users', user_id), updateData)
        return { ok: true }
    },
}

// ══════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════

export const usersAPI = {
    getAll: async () => {
        const snap  = await getDocs(collection(db, 'users'))
        const users = snap.docs.map(d => ({ user_id: d.id, ...d.data() }))
        return { ok: true, users }
    },

    add: async (data) => {
        const { email, password, ...rest } = data
        const secondaryAuth = getSecondaryAuth()
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        await setDoc(doc(db, 'users', cred.user.uid), {
            ...rest,
            email,
            password_hash: password,
            created_at:    serverTimestamp(),
        })
        await secondaryAuth.signOut()
        return { ok: true, user_id: cred.user.uid }
    },

    edit: async (data) => {
        const { user_id, password, ...rest } = data
        const updateData = { ...rest, updated_at: serverTimestamp() }

        if (password) {
            const userDoc = await getDoc(doc(db, 'users', user_id))
            if (userDoc.exists()) {
                const { email, password_hash: oldPassword } = userDoc.data()
                if (oldPassword) {
                    try {
                        const secondaryAuth = getSecondaryAuth()
                        const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword)
                        await updatePassword(cred.user, password)
                        await secondaryAuth.signOut()
                    } catch (e) {
                        console.error('فشل تغيير كلمة السر في Auth:', e)
                    }
                }
            }
            updateData.password_hash      = password
            updateData.temp_pass_expiry   = null
            updateData.temp_pass_used     = true
        }

        await updateDoc(doc(db, 'users', user_id), updateData)
        return { ok: true }
    },

    delete: async (userId) => {
        // تسجيل حذف المستخدم قبل الحذف
        const userDoc = await getDoc(doc(db, 'users', userId))
        const userData = userDoc.exists() ? userDoc.data() : {}

        await deleteDoc(doc(db, 'users', userId))

        // تسجيل الحدث الأمني
        securityLogger.log(SECURITY_EVENTS.SENSITIVE_ACTION, {
            action: 'delete_user',
            targetUserId: userId,
            targetEmail: userData.email,
            targetRole: userData.role
        })

        return { ok: true }
    },
}

// ══════════════════════════════════════════════════════
//  RESERVATIONS
// ══════════════════════════════════════════════════════

export const reservationsAPI = {
    getAll: async (filters = {}) => {
        const constraints = [orderBy('created_at', 'desc')]
        if (filters.zone_id) constraints.unshift(where('zone_id', '==', filters.zone_id))
        if (filters.status)  constraints.unshift(where('status',  '==', filters.status))
        const snap         = await getDocs(query(collection(db, 'reservations'), ...constraints))
        const reservations = snap.docs.map(d => ({ reservation_id: d.id, ...d.data() }))
        return { ok: true, reservations }
    },

    confirm: async (resId) => {
        await updateDoc(doc(db, 'reservations', resId), {
            status: 'confirmed', updated_at: serverTimestamp(),
        })
        return { ok: true }
    },

    cancel: async (resId) => {
        const resSnap = await getDoc(doc(db, 'reservations', resId))
        if (resSnap.exists()) {
            const { spot_id, zone_id } = resSnap.data()
            if (spot_id && zone_id) await updateDoc(
                doc(db, 'zones', zone_id, 'parking_spots', spot_id),
                { status: 'AVAILABLE', updated_at: serverTimestamp() }
            )
        }
        await updateDoc(doc(db, 'reservations', resId), {
            status:     'cancelled',
            end_time:   serverTimestamp(),
            updated_at: serverTimestamp(),
        })
        return { ok: true }
    },

    complete: async (resId) => {
        const resSnap = await getDoc(doc(db, 'reservations', resId))
        if (resSnap.exists()) {
            const { spot_id, zone_id } = resSnap.data()
            if (spot_id && zone_id) await updateDoc(
                doc(db, 'zones', zone_id, 'parking_spots', spot_id),
                { status: 'AVAILABLE', updated_at: serverTimestamp() }
            )
        }
        await updateDoc(doc(db, 'reservations', resId), {
            status: 'completed', end_time: serverTimestamp(), updated_at: serverTimestamp(),
        })
        return { ok: true }
    },
}

// ══════════════════════════════════════════════════════
//  SPOTS
// ══════════════════════════════════════════════════════

export const spotsAPI = {
    getMySpots: async (zoneId) => {
        if (!zoneId) return { ok: true, spots: [] }
        const snap  = await getDocs(collection(db, 'zones', zoneId, 'parking_spots'))
        const spots = snap.docs.map(d => ({ spot_id: d.id, zone_id: zoneId, ...d.data() }))
        return { ok: true, spots }
    },

    changeStatus: async (spotId, status, zoneId) => {
        await updateDoc(doc(db, 'zones', zoneId, 'parking_spots', spotId), {
            status, updated_at: serverTimestamp(),
        })
        return { ok: true }
    },

    addSpot: async (zoneId, data) => {
        const spotRef = doc(collection(db, 'zones', zoneId, 'parking_spots'))
        await setDoc(spotRef, {
            spot_number: data.spot_number,
            spot_type:   data.spot_type,
            status:      data.status || 'AVAILABLE',
            created_at:  serverTimestamp(),
        })

        try {
            const zoneRef  = doc(db, 'zones', zoneId)
            const zoneSnap = await getDoc(zoneRef)
            if (zoneSnap.exists()) {
                const currentCount = Number((zoneSnap.data().spot_types || {})[data.spot_type] || 0)
                await updateDoc(zoneRef, {
                    [`spot_types.${data.spot_type}`]: currentCount + 1,
                    updated_at: serverTimestamp(),
                })
            }
        } catch (e) {
            console.warn('spot_types update skipped:', e.message)
        }

        return { ok: true, spot_id: spotRef.id }
    },
}

// ══════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════

export const reportsAPI = {
    generate: async (type, startDate, endDate) => {
        const start = Timestamp.fromDate(new Date(startDate))
        const end   = Timestamp.fromDate(new Date(endDate))
        const q     = query(
            collection(db, 'reservations'),
            where('created_at', '>=', start),
            where('created_at', '<=', end),
            orderBy('created_at', 'desc')
        )
        const snap = await getDocs(q)
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        return { ok: true, type, data }
    },
}

// ══════════════════════════════════════════════════════
//  REALTIME — onSnapshot
// ══════════════════════════════════════════════════════

export const realtimeAPI = {
    subscribeZones: (callback) =>
        onSnapshot(collection(db, 'zones'), (snap) => {
            callback(snap.docs.map(d => ({ zone_id: d.id, ...d.data() })))
        }),

    subscribeReservations: (callback, zoneId = null) => {
        // ✅ إذا كان المستخدم MANAGER نُقيّد الـ query بـ zone_id
        // هذا ضروري لأن Firestore Rules لا تسمح بقراءة المجموعة كاملة للمدير
        const constraints = zoneId
            ? [where('zone_id', '==', zoneId), orderBy('created_at', 'desc')]
            : [orderBy('created_at', 'desc')]

        return onSnapshot(
            query(collection(db, 'reservations'), ...constraints),
            (snap) => {
                callback(snap.docs.map(d => ({ reservation_id: d.id, ...d.data() })))
            },
            (err) => {
                console.error('subscribeReservations error:', err)
                callback([])
            }
        )
    },

    subscribeSpots: (callback, zoneId = null) => {
        if (!zoneId) { callback([]); return () => {} }
        return onSnapshot(
            collection(db, 'zones', zoneId, 'parking_spots'),
            (snap) => {
                callback(snap.docs.map(d => ({ spot_id: d.id, zone_id: zoneId, ...d.data() })))
            }
        )
    },
}