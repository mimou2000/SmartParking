// src/context/AuthProvider.jsx
import React, { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
} from 'firebase/auth'
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore'
import { AuthContext } from './AuthContext'
import {
    rateLimiter,
    sessionManager,
    securityLogger,
    SECURITY_EVENTS,
    deviceFingerprint,
    sanitizer
} from '../utils/security'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [mustChangePassword, setMustChangePassword] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [lockRemainingTime, setLockRemainingTime] = useState(0)

    // دالة مساعدة لإنشاء وثيقة المستخدم إذا لم تكن موجودة
    const ensureUserDocument = async (firebaseUser) => {
        const userDocRef = doc(db, 'users', firebaseUser.uid)
        const docSnap = await getDoc(userDocRef)
        if (!docSnap.exists()) {
            // تحديد الدور: إذا كان البريد يحتوي على admin@ أو manager@ يمكن تعيينه تلقائياً
            let role = 'CUSTOMER'
            if (firebaseUser.email?.includes('admin')) role = 'ADMIN'
            else if (firebaseUser.email?.includes('manager')) role = 'MANAGER'

            await setDoc(userDocRef, {
                email: firebaseUser.email,
                full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم',
                role: role,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
            })
            console.log(`✅ Created user document for ${firebaseUser.uid} with role ${role}`)
        }
        return userDocRef
    }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // التأكد من وجود الوثيقة
                    const userDocRef = await ensureUserDocument(firebaseUser)

                    // الاشتراك في التحديثات المباشرة
                    const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const firestoreData = docSnap.data()
                            const fullUser = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                ...firestoreData
                            }
                            console.log('✅ User data from Firestore:', fullUser)
                            setUser(fullUser)

                            // التحقق من كلمة السر المؤقتة
                            const hasTempPass = fullUser.temp_pass_used === false && fullUser.temp_pass_expiry != null
                            if (hasTempPass && Date.now() <= fullUser.temp_pass_expiry) {
                                setMustChangePassword(true)
                            } else if (hasTempPass && Date.now() > fullUser.temp_pass_expiry) {
                                signOut(auth)
                                setError('انتهت صلاحية كلمة السر المؤقتة')
                                setMustChangePassword(false)
                            } else {
                                setMustChangePassword(false)
                            }
                        } else {
                            // في حالة نادرة أن الوثيقة حُذفت بعد إنشائها
                            setUser({ uid: firebaseUser.uid, email: firebaseUser.email })
                        }
                        setLoading(false)
                    }, (err) => {
                        console.error('onSnapshot error:', err)
                        // حتى مع وجود خطأ في onSnapshot، نعرض المستخدم الأساسي
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email })
                        setLoading(false)
                    })

                    return () => unsubscribeDoc()
                } catch (err) {
                    console.error('Error ensuring user document:', err)
                    setUser({ uid: firebaseUser.uid, email: firebaseUser.email })
                    setLoading(false)
                }
            } else {
                setUser(null)
                setLoading(false)
                setMustChangePassword(false)
            }
        })
        return () => unsubscribeAuth()
    }, [])

    // التحقق من حالة القفل عند بدء التطبيق
    useEffect(() => {
        const checkLockStatus = () => {
            const lockStatus = rateLimiter.isLocked()
            setIsLocked(lockStatus.locked)
            setLockRemainingTime(lockStatus.remainingTime)
        }
        checkLockStatus()
        const interval = setInterval(checkLockStatus, 1000)
        return () => clearInterval(interval)
    }, [])

    const login = async (email, password) => {
        // التحقق من قفل الحساب
        const lockStatus = rateLimiter.isLocked()
        if (lockStatus.locked) {
            setIsLocked(true)
            setLockRemainingTime(lockStatus.remainingTime)
            setError(`الحساب مقفل. حاول مرة أخرى بعد ${Math.ceil(lockStatus.remainingTime / 60)} دقيقة`)
            return { ok: false, locked: true }
        }

        setLoading(true)
        setError('')
        
        const sanitizedEmail = sanitizer.email(email)
        
        try {
            await signInWithEmailAndPassword(auth, sanitizedEmail, password)
            
            // تسجيل النجاح وإعادة تعيين المحاولات
            rateLimiter.recordAttempt(true)
            
            // التحقق من الجهاز الجديد
            const deviceStatus = deviceFingerprint.registerDevice()
            if (deviceStatus.isNew) {
                securityLogger.log(SECURITY_EVENTS.NEW_DEVICE_LOGIN, {
                    email: sanitizedEmail,
                    fingerprint: deviceStatus.fingerprint
                })
            }
            
            // إنشاء جلسة جديدة
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
            const userData = userDoc.data()
            sessionManager.createSession(auth.currentUser.uid, sanitizedEmail, userData?.role)
            
            // تسجيل الدخول الناجح
            securityLogger.log(SECURITY_EVENTS.LOGIN_SUCCESS, {
                userId: auth.currentUser.uid,
                email: sanitizedEmail,
                role: userData?.role
            })
            
            setLoading(false)
            return { ok: true, role: userData?.role }
        } catch (err) {
            // تسجيل المحاولة الفاشلة
            const attemptResult = rateLimiter.recordAttempt(false)
            
            securityLogger.log(SECURITY_EVENTS.LOGIN_FAILED, {
                email: sanitizedEmail,
                errorCode: err.code,
                remainingAttempts: attemptResult.remaining
            })
            
            if (attemptResult.locked) {
                setIsLocked(true)
                securityLogger.log(SECURITY_EVENTS.ACCOUNT_LOCKED, {
                    email: sanitizedEmail,
                    reason: 'too_many_failed_attempts'
                })
                setError(`تم قفل الحساب بسبب محاولات تسجيل دخول كثيرة. حاول بعد 15 دقيقة`)
            } else {
                const errorMsg = err.code === 'auth/invalid-credential' 
                    ? `البريد أو كلمة المرور خاطئة (متبقي ${attemptResult.remaining} محاولات)` 
                    : 'خطأ في الاتصال'
                setError(errorMsg)
            }
            
            setLoading(false)
            return { ok: false, locked: attemptResult.locked }
        }
    }

    const changePasswordAfterReset = async (newPassword) => {
        if (!user || !auth.currentUser) return { ok: false, message: 'لا يوجد مستخدم' }
        try {
            await updatePassword(auth.currentUser, newPassword)
            await updateDoc(doc(db, 'users', user.uid), {
                password_hash: newPassword,
                temp_pass_used: true,
                temp_pass_expiry: null,
                updated_at: serverTimestamp(),
            })
            setMustChangePassword(false)
            return { ok: true }
        } catch (err) {
            return { ok: false, message: err.message }
        }
    }

    // تسجيل الدخول كضيف بدور محدد (ADMIN أو MANAGER)
    const loginAsGuest = (role = 'MANAGER') => {
        const normalizedRole = role === 'ADMIN' ? 'ADMIN' : 'MANAGER'
        const guestUser = {
            uid: 'guest_' + normalizedRole.toLowerCase() + '_' + Date.now(),
            email: `guest_${normalizedRole.toLowerCase()}@smartparking.com`,
            full_name: normalizedRole === 'ADMIN' ? 'ضيف - مسؤول' : 'ضيف - مدير',
            role: normalizedRole,
            isGuest: true
        }
        
        securityLogger.log(SECURITY_EVENTS.LOGIN_SUCCESS, {
            userId: guestUser.uid,
            email: guestUser.email,
            role: normalizedRole,
            isGuest: true
        })
        
        setUser(guestUser)
        setLoading(false)
        return { ok: true, role: normalizedRole }
    }

    const logout = async () => {
        // تسجيل حدث الخروج
        if (user) {
            securityLogger.log(SECURITY_EVENTS.LOGOUT, {
                userId: user.uid,
                email: user.email
            })
        }
        
        // تدمير الجلسة
        sessionManager.destroySession()
        
        // إذا كان ضيفاً، لا نحتاج signOut
        if (!user?.isGuest) {
            try { await signOut(auth) } catch {}
        }
        setUser(null)
        setMustChangePassword(false)
        setError('')
        setIsLocked(false)
    }

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>جاري التحميل...</div>
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            loginAsGuest,
            logout, 
            loading, 
            error, 
            setError, 
            mustChangePassword, 
            changePasswordAfterReset,
            isLocked,
            lockRemainingTime
        }}>
            {children}
        </AuthContext.Provider>
    )
}
