// ══════════════════════════════════════════════════════
//  src/hooks/useSessionTimeout.js
//  مراقبة الجلسة وتسجيل الخروج التلقائي عند عدم النشاط
// ══════════════════════════════════════════════════════

import { useEffect, useCallback, useRef, useState } from 'react'
import { sessionManager, securityLogger, SECURITY_EVENTS } from '../utils/security'
import { useAuth } from '../context/useAuth'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
const WARNING_BEFORE_LOGOUT = 60 * 1000 // تحذير قبل 60 ثانية من تسجيل الخروج

export function useSessionTimeout() {
    const { user, logout } = useAuth()
    const [showWarning, setShowWarning] = useState(false)
    const [remainingTime, setRemainingTime] = useState(0)
    const timeoutRef = useRef(null)
    const warningRef = useRef(null)
    const intervalRef = useRef(null)

    const handleActivity = useCallback(() => {
        if (!user) return
        sessionManager.updateActivity()
        setShowWarning(false)
        
        // إعادة ضبط المؤقتات
        clearTimeout(timeoutRef.current)
        clearTimeout(warningRef.current)
        clearInterval(intervalRef.current)

        // تعيين تحذير قبل انتهاء الجلسة
        const sessionTimeout = 30 * 60 * 1000 // 30 دقيقة
        
        warningRef.current = setTimeout(() => {
            setShowWarning(true)
            setRemainingTime(WARNING_BEFORE_LOGOUT / 1000)
            
            // بدء العد التنازلي
            intervalRef.current = setInterval(() => {
                setRemainingTime(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }, sessionTimeout - WARNING_BEFORE_LOGOUT)

        // تسجيل الخروج التلقائي
        timeoutRef.current = setTimeout(() => {
            handleForceLogout()
        }, sessionTimeout)
    }, [user])

    const handleForceLogout = useCallback(async () => {
        securityLogger.log(SECURITY_EVENTS.SESSION_EXPIRED, {
            userId: user?.uid,
            email: user?.email,
            reason: 'inactivity_timeout'
        })
        sessionManager.destroySession()
        setShowWarning(false)
        await logout()
    }, [logout, user])

    const extendSession = useCallback(() => {
        handleActivity()
        setShowWarning(false)
    }, [handleActivity])

    useEffect(() => {
        if (!user) {
            clearTimeout(timeoutRef.current)
            clearTimeout(warningRef.current)
            clearInterval(intervalRef.current)
            return
        }

        // تسجيل النشاط الأولي
        handleActivity()

        // الاستماع لأحداث النشاط
        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true })
        })

        // التحقق من انتهاء الجلسة عند العودة للصفحة
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && sessionManager.isSessionExpired()) {
                handleForceLogout()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearTimeout(timeoutRef.current)
            clearTimeout(warningRef.current)
            clearInterval(intervalRef.current)
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [user, handleActivity, handleForceLogout])

    return {
        showWarning,
        remainingTime,
        extendSession,
        forceLogout: handleForceLogout
    }
}
