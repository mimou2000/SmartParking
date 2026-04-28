// ══════════════════════════════════════════════════════
//  src/api/firebaseApi.js
//  ✅ الإصلاح: إضافة zone_id عند إنشاء الحجز + تحديث subscribeReservations
// ══════════════════════════════════════════════════════

import { db, auth } from '../firebase'
import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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
    fetchSignInMethodsForEmail,
} from 'firebase/auth'
import emailjs from '@emailjs/browser'

// ══════════════════════════════════════════════════════
//  ✅ Secondary App — منفصلة تماماً عن جلسة الأدمن
// ══════════════════════════════════════════════════════
const getSecondaryAuth = async () => {
    const existing = getApps().find(a => a.name === 'secondary')
    if (existing) {
        try {
            const oldAuth = getAuth(existing)
            if (oldAuth.currentUser) await signOut(oldAuth)
        } catch { }
        try { await deleteApp(existing) } catch { }
    }
    const secondaryApp = initializeApp(auth.app.options, 'secondary')
    return getAuth(secondaryApp)
}

const createAuthUser = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase()

    try {
        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail)
        if (methods && methods.length > 0) {
            throw new Error('هذا البريد الإلكتروني مسجل مسبقاً في النظام')
        }
    } catch (checkErr) {
        if (checkErr.message === 'هذا البريد الإلكتروني مسجل مسبقاً في النظام') {
            throw checkErr
        }
        console.warn('fetchSignInMethods check skipped:', checkErr.message)
    }

    let secondaryAuth
    try {
        secondaryAuth = await getSecondaryAuth()
    } catch (initErr) {
        throw new Error('فشل تهيئة الاتصال بالخادم: ' + initErr.message)
    }

    try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password)
        const uid = cred.user.uid
        try { await signOut(secondaryAuth) } catch { }
        return uid
    } catch (err) {
        try { await signOut(secondaryAuth) } catch { }

        const code = err.code || ''
        const msg = err.message || ''

        if (code === 'auth/email-already-in-use' || msg.includes('EMAIL_EXISTS') || msg.includes('email-already-in-use')) {
            throw new Error('هذا البريد الإلكتروني مسجل مسبقاً')
        }
        if (code === 'auth/weak-password' || msg.includes('WEAK_PASSWORD') || msg.includes('weak-password')) {
            throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        }
        if (code === 'auth/invalid-email' || msg.includes('INVALID_EMAIL') || msg.includes('invalid-email')) {
            throw new Error('صيغة البريد الإلكتروني غير صحيحة')
        }
        if (code === 'auth/operation-not-allowed' || msg.includes('OPERATION_NOT_ALLOWED')) {
            throw new Error('تسجيل المستخدمين معطل — تحقق من Firebase Console → Authentication → Sign-in method')
        }
        if (msg.includes('400') || msg.includes('network') || code === 'auth/network-request-failed') {
            throw new Error('فشل الاتصال بالخادم — تأكد من تفعيل Email/Password في Firebase Authentication')
        }

        throw new Error('خطأ في إنشاء الحساب: ' + (msg || code))
    }
}

// ── EmailJS Config ────────────────────────────────────
const EMAILJS_SERVICE_ID = 'service_490o3an'
const EMAILJS_TEMPLATE_ID = 'template_rfj0pko'
const EMAILJS_PUBLIC_KEY = '4NlwW9FgbDZ46REAs'

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
        const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            return { message: 'إذا كان البريد مسجّلاً، ستصلك كلمة السر المؤقتة خلال دقائق ✅' }
        }

        const userDoc = snapshot.docs[0]
        const userData = userDoc.data()
        const tempPassword = generateTempPassword()
        const oldPassword = userData.password_hash

        let secondaryAuth
        try {
            secondaryAuth = await getSecondaryAuth()
            const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword)
            await updatePassword(cred.user, tempPassword)
            await signOut(secondaryAuth)
        } catch (e) {
            console.warn('Auth update failed:', e.message)
            try { if (secondaryAuth) await signOut(secondaryAuth) } catch { }
        }

        await updateDoc(doc(db, 'users', userDoc.id), {
            password_hash: tempPassword,
            temp_pass_expiry: Date.now() + 30 * 60 * 1000,
            temp_pass_used: false,
            updated_at: serverTimestamp(),
        })

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
                {
                    to_email: email,
                    to_name: userData.full_name || email.split('@')[0],
                    temp_password: tempPassword,
                    name: userData.full_name || email.split('@')[0],
                    email,
                    title: 'إعادة تعيين كلمة السر',
                },
                EMAILJS_PUBLIC_KEY
            )
        } catch (err) {
            console.error('EmailJS error:', err)
            throw new Error('فشل إرسال البريد الإلكتروني')
        }

        securityLogger.log(SECURITY_EVENTS.PASSWORD_RESET_REQUEST, { email, success: true })
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
            const zones = zonesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

            let totalSpots = 0
            zones.forEach(zone => {
                if (zone.spot_types && zone.is_active) {
                    Object.values(zone.spot_types).forEach(count => { totalSpots += Number(count) })
                }
            })

            const now = new Date()
            const todayStr = now.toISOString().slice(0, 10)
            const weekAgo = new Date(now - 7 * 86400000)
            const monthAgo = new Date(now - 30 * 86400000)
            const toDate = (ts) => { if (!ts) return null; return ts?.toDate ? ts.toDate() : new Date(ts) }

            const completedRes = reservations.filter(r => r.status === 'completed')
            const totalRevenue = completedRes.reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)
            const todayRevenue = completedRes
                .filter(r => { const d = toDate(r.end_time || r.created_at); return d && d.toISOString().slice(0, 10) === todayStr })
                .reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)
            const weekRevenue = completedRes
                .filter(r => { const d = toDate(r.end_time || r.created_at); return d && d >= weekAgo })
                .reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)
            const monthRevenue = completedRes
                .filter(r => { const d = toDate(r.end_time || r.created_at); return d && d >= monthAgo })
                .reduce((s, r) => s + (r.total_price || r.total_cost || 0), 0)

            const occupiedSpots = reservations.filter(r => r.status === 'active').length
            const availableSpots = totalSpots - occupiedSpots
            const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0

            return {
                ok: true,
                total_spots: totalSpots,
                available_spots: availableSpots,
                occupied_spots: occupiedSpots,
                occupancy_rate: occupancyRate,
                total_revenue: totalRevenue,
                today_revenue: todayRevenue,
                week_revenue: weekRevenue,
                month_revenue: monthRevenue,
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
        const snap = await getDocs(collection(db, 'zones'))
        const zones = snap.docs.map(d => ({ zone_id: d.id, ...d.data() }))
        return { ok: true, zones }
    },

    create: async (data) => {
        const ref = await addDoc(collection(db, 'zones'), {
            ...data,
            is_active: true,
            created_at: serverTimestamp(),
        })

        const typeLetters = { STANDARD: 'A', VIP: 'B', MOTORCYCLE: 'C', DISABLED: 'D', ELECTRIC: 'E' }
        const spotTypes = data.spot_types || {}
        const promises = []

        Object.entries(spotTypes).forEach(([type, count]) => {
            const letter = typeLetters[type] || 'X'
            for (let i = 1; i <= count; i++) {
                const spotRef = doc(collection(db, 'zones', ref.id, 'parking_spots'))
                promises.push(setDoc(spotRef, {
                    spot_number: `${letter}-${i}`,
                    spot_type: type,
                    status: 'AVAILABLE',
                    created_at: serverTimestamp(),
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
    await updateDoc(doc(db, 'users', managerId), { zone_id: zoneId, updated_at: serverTimestamp() })
    return { ok: true }
}

export const unassignManager = async (managerId) => {
    await updateDoc(doc(db, 'users', managerId), { zone_id: null, updated_at: serverTimestamp() })
    return { ok: true }
}

export const managersAPI = {
    getAll: async () => {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'MANAGER')))
        const managers = snap.docs.map(d => ({ user_id: d.id, ...d.data() }))
        return { ok: true, managers }
    },

    add: async (data) => {
        const { email, password, ...rest } = data

        if (!email || !password) throw new Error('البريد الإلكتروني وكلمة المرور إلزاميان')
        if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

        const uid = await createAuthUser(email, password)

        await setDoc(doc(db, 'users', uid), {
            ...rest,
            email: email.trim().toLowerCase(),
            role: 'MANAGER',
            zone_id: data.zone_id || null,
            password_hash: password,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        })

        securityLogger.log(SECURITY_EVENTS.SENSITIVE_ACTION, {
            action: 'create_manager',
            targetEmail: email,
            targetUserId: uid,
        })

        return { ok: true, user_id: uid }
    },

    edit: async (data) => {
        const { user_id, password, ...rest } = data
        const updateData = { ...rest, updated_at: serverTimestamp() }

        if (password) {
            if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

            const userDoc = await getDoc(doc(db, 'users', user_id))
            if (userDoc.exists()) {
                const { email, password_hash: oldPassword } = userDoc.data()
                if (oldPassword && email) {
                    let secondaryAuth
                    try {
                        secondaryAuth = await getSecondaryAuth()
                        const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword)
                        await updatePassword(cred.user, password)
                        await signOut(secondaryAuth)
                        securityLogger.log(SECURITY_EVENTS.PASSWORD_CHANGE, {
                            action: 'password_changed_by_admin',
                            targetUserId: user_id,
                            targetEmail: email,
                        })
                    } catch (e) {
                        console.error('فشل تغيير كلمة السر في Auth:', e.message)
                        try { if (secondaryAuth) await signOut(secondaryAuth) } catch { }
                    }
                }
            }

            updateData.password_hash = password
            updateData.temp_pass_expiry = null
            updateData.temp_pass_used = true
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
        const snap = await getDocs(collection(db, 'users'))
        const users = snap.docs.map(d => ({ user_id: d.id, ...d.data() }))
        return { ok: true, users }
    },

    add: async (data) => {
        const { email, password, ...rest } = data

        if (!email || !password) throw new Error('البريد الإلكتروني وكلمة المرور إلزاميان')
        if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

        const uid = await createAuthUser(email, password)

        await setDoc(doc(db, 'users', uid), {
            ...rest,
            email: email.trim().toLowerCase(),
            role: data.role || 'DRIVER',
            password_hash: password,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        })

        return { ok: true, user_id: uid }
    },

    edit: async (data) => {
        const { user_id, password, ...rest } = data
        const updateData = { ...rest, updated_at: serverTimestamp() }

        if (password) {
            if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

            const userDoc = await getDoc(doc(db, 'users', user_id))
            if (userDoc.exists()) {
                const { email, password_hash: oldPassword } = userDoc.data()
                if (oldPassword && email) {
                    let secondaryAuth
                    try {
                        secondaryAuth = await getSecondaryAuth()
                        const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword)
                        await updatePassword(cred.user, password)
                        await signOut(secondaryAuth)
                    } catch (e) {
                        console.error('فشل تغيير كلمة السر في Auth:', e.message)
                        try { if (secondaryAuth) await signOut(secondaryAuth) } catch { }
                    }
                }
            }

            updateData.password_hash = password
            updateData.temp_pass_expiry = null
            updateData.temp_pass_used = true
        }

        await updateDoc(doc(db, 'users', user_id), updateData)
        return { ok: true }
    },

    delete: async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId))
        const userData = userDoc.exists() ? userDoc.data() : {}

        await deleteDoc(doc(db, 'users', userId))

        securityLogger.log(SECURITY_EVENTS.SENSITIVE_ACTION, {
            action: 'delete_user',
            targetUserId: userId,
            targetEmail: userData.email,
            targetRole: userData.role,
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
        if (filters.status) constraints.unshift(where('status', '==', filters.status))
        const snap = await getDocs(query(collection(db, 'reservations'), ...constraints))
        const reservations = snap.docs.map(d => ({ reservation_id: d.id, ...d.data() }))
        return { ok: true, reservations }
    },

    // ✅ الإصلاح 1: إضافة zone_id إلى الحجز عند إنشائه
    // استخدم هذه الدالة في تطبيق السائق عند حجز موقف
    create: async (data) => {
        const { spot_id, zone_id, user_id, ...rest } = data

        if (!zone_id) throw new Error('zone_id مطلوب عند إنشاء الحجز')
        if (!spot_id) throw new Error('spot_id مطلوب عند إنشاء الحجز')

        // ✅ نحفظ zone_id داخل وثيقة الحجز — هذا هو الإصلاح الجوهري
        const ref = await addDoc(collection(db, 'reservations'), {
            ...rest,
            spot_id,
            zone_id,        // ← الحقل المفقود الذي كان يُعطِّل الفلترة
            user_id: user_id || null,
            status: 'pending',
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        })

        return { ok: true, reservation_id: ref.id }
    },

    confirm: async (resId) => {
        const resSnap = await getDoc(doc(db, 'reservations', resId))
        if (resSnap.exists()) {
            const { spot_id, zone_id } = resSnap.data()
            // ✅ عند تأكيد دخول السيارة: غيّر المكان إلى OCCUPIED
            if (spot_id && zone_id) await updateDoc(
                doc(db, 'zones', zone_id, 'parking_spots', spot_id),
                { status: 'OCCUPIED', updated_at: serverTimestamp() }
            )
        }
        await updateDoc(doc(db, 'reservations', resId), {
            status: 'active',           // ← يصير active (نشط) بعد تأكيد دخول السيارة
            start_time: serverTimestamp(), // ← وقت الدخول الفعلي
            updated_at: serverTimestamp(),
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
            status: 'cancelled',
            end_time: serverTimestamp(),
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
            status: 'completed',
            end_time: serverTimestamp(),
            updated_at: serverTimestamp(),
        })
        return { ok: true }
    },

    // ✅ الإصلاح 2: دالة لإصلاح الحجوزات القديمة التي لا تحتوي على zone_id
    // شغّلها مرة واحدة فقط من لوحة الأدمن
    migrateZoneIds: async () => {
        console.log('🔄 بدء ترحيل zone_id للحجوزات القديمة...')

        // جلب كل الحجوزات التي ليس لها zone_id
        const snap = await getDocs(query(collection(db, 'reservations'), orderBy('created_at', 'desc')))
        const allReservations = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const withoutZone = allReservations.filter(r => !r.zone_id && r.spot_id)

        if (withoutZone.length === 0) {
            console.log('✅ كل الحجوزات لديها zone_id — لا حاجة للترحيل')
            return { ok: true, migrated: 0 }
        }

        // جلب كل المناطق وspots الخاصة بها
        const zonesSnap = await getDocs(collection(db, 'zones'))
        const zones = zonesSnap.docs.map(d => ({ zone_id: d.id, ...d.data() }))

        // بناء خريطة: spot_id → zone_id
        const spotToZone = {}
        for (const zone of zones) {
            const spotsSnap = await getDocs(collection(db, 'zones', zone.zone_id, 'parking_spots'))
            spotsSnap.docs.forEach(s => {
                spotToZone[s.id] = zone.zone_id
            })
        }

        // تحديث كل حجز بدون zone_id
        let migrated = 0
        const updates = []
        for (const res of withoutZone) {
            const zoneId = spotToZone[res.spot_id]
            if (zoneId) {
                updates.push(
                    updateDoc(doc(db, 'reservations', res.id), {
                        zone_id: zoneId,
                        updated_at: serverTimestamp(),
                    })
                )
                migrated++
            } else {
                console.warn(`⚠️ لم يُعثر على zone للـ spot_id: ${res.spot_id} في الحجز: ${res.id}`)
            }
        }

        await Promise.all(updates)
        console.log(`✅ تم ترحيل ${migrated} حجز بنجاح`)
        return { ok: true, migrated }
    },
}

// ══════════════════════════════════════════════════════
//  SPOTS
// ══════════════════════════════════════════════════════

export const spotsAPI = {
    getMySpots: async (zoneId) => {
        if (!zoneId) return { ok: true, spots: [] }
        const snap = await getDocs(collection(db, 'zones', zoneId, 'parking_spots'))
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
            spot_type: data.spot_type,
            status: data.status || 'AVAILABLE',
            created_at: serverTimestamp(),
        })

        try {
            const zoneRef = doc(db, 'zones', zoneId)
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
        const end = Timestamp.fromDate(new Date(endDate))
        const q = query(
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

    // ✅ الإصلاح 3: الاشتراك الآن يعمل لأن zone_id موجود في وثائق الحجوزات
    subscribeReservations: (callback, zoneId = null) => {
        const constraints = zoneId
            ? [where('zone_id', '==', zoneId), orderBy('created_at', 'desc')]
            : [orderBy('created_at', 'desc')]

        return onSnapshot(
            query(collection(db, 'reservations'), ...constraints),
            (snap) => { callback(snap.docs.map(d => ({ reservation_id: d.id, ...d.data() }))) },
            (err) => { console.error('subscribeReservations error:', err); callback([]) }
        )
    },

    subscribeSpots: (callback, zoneId = null) => {
        if (!zoneId) { callback([]); return () => { } }
        return onSnapshot(
            collection(db, 'zones', zoneId, 'parking_spots'),
            (snap) => { callback(snap.docs.map(d => ({ spot_id: d.id, zone_id: zoneId, ...d.data() }))) }
        )
    },
}