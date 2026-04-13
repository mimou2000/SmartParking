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

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [mustChangePassword, setMustChangePassword] = useState(false)

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

    const login = async (email, password) => {
        setLoading(true)
        setError('')
        try {
            await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
            setLoading(false)
            return { ok: true }
        } catch (err) {
            setError(err.code === 'auth/invalid-credential' ? 'البريد أو كلمة المرور خاطئة' : 'خطأ في الاتصال')
            setLoading(false)
            return { ok: false }
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

    const logout = async () => {
        try { await signOut(auth) } catch {}
        setUser(null)
        setMustChangePassword(false)
        setError('')
    }

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>جاري التحميل...</div>
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, error, setError, mustChangePassword, changePasswordAfterReset }}>
            {children}
        </AuthContext.Provider>
    )
}