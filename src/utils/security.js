// ══════════════════════════════════════════════════════
//  src/utils/security.js
//  نظام الأمان الشامل للتطبيق
// ══════════════════════════════════════════════════════

// ── Rate Limiting (حماية من القوة الغاشمة) ──────────────

const LOGIN_ATTEMPTS_KEY = 'sp_login_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 دقيقة

export const rateLimiter = {
    getAttempts: () => {
        try {
            const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
            if (!data) return { count: 0, lastAttempt: 0, lockedUntil: 0 }
            return JSON.parse(data)
        } catch {
            return { count: 0, lastAttempt: 0, lockedUntil: 0 }
        }
    },

    recordAttempt: (success = false) => {
        const attempts = rateLimiter.getAttempts()
        const now = Date.now()

        if (success) {
            localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
            return { locked: false, remaining: MAX_ATTEMPTS }
        }

        // إعادة تعيين المحاولات بعد ساعة من آخر محاولة
        if (now - attempts.lastAttempt > 60 * 60 * 1000) {
            attempts.count = 0
        }

        attempts.count += 1
        attempts.lastAttempt = now

        if (attempts.count >= MAX_ATTEMPTS) {
            attempts.lockedUntil = now + LOCKOUT_DURATION
        }

        localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts))

        return {
            locked: attempts.count >= MAX_ATTEMPTS,
            remaining: Math.max(0, MAX_ATTEMPTS - attempts.count),
            lockedUntil: attempts.lockedUntil
        }
    },

    isLocked: () => {
        const attempts = rateLimiter.getAttempts()
        if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
            return {
                locked: true,
                remainingTime: Math.ceil((attempts.lockedUntil - Date.now()) / 1000)
            }
        }
        if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
            localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
        }
        return { locked: false, remainingTime: 0 }
    },

    reset: () => {
        localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
    }
}

// ── Session Management (إدارة الجلسات) ──────────────────

const SESSION_KEY = 'sp_session'
const ACTIVITY_KEY = 'sp_last_activity'
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 دقيقة من عدم النشاط

export const sessionManager = {
    createSession: (userId, userEmail, role) => {
        const session = {
            userId,
            userEmail,
            role,
            createdAt: Date.now(),
            deviceId: sessionManager.getDeviceId(),
            userAgent: navigator.userAgent,
            ip: 'client-side' // في الإنتاج يمكن الحصول عليه من الخادم
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
        sessionManager.updateActivity()
        return session
    },

    getSession: () => {
        try {
            const data = sessionStorage.getItem(SESSION_KEY)
            return data ? JSON.parse(data) : null
        } catch {
            return null
        }
    },

    destroySession: () => {
        sessionStorage.removeItem(SESSION_KEY)
        sessionStorage.removeItem(ACTIVITY_KEY)
    },

    updateActivity: () => {
        sessionStorage.setItem(ACTIVITY_KEY, Date.now().toString())
    },

    isSessionExpired: () => {
        const lastActivity = sessionStorage.getItem(ACTIVITY_KEY)
        if (!lastActivity) return false
        return Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT
    },

    getDeviceId: () => {
        let deviceId = localStorage.getItem('sp_device_id')
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
            localStorage.setItem('sp_device_id', deviceId)
        }
        return deviceId
    },

    getRemainingTime: () => {
        const lastActivity = sessionStorage.getItem(ACTIVITY_KEY)
        if (!lastActivity) return SESSION_TIMEOUT
        const remaining = SESSION_TIMEOUT - (Date.now() - parseInt(lastActivity))
        return Math.max(0, remaining)
    }
}

// ── Password Validation (التحقق من كلمة المرور) ────────

export const passwordValidator = {
    validate: (password) => {
        const rules = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            noSpaces: !/\s/.test(password)
        }

        const score = Object.values(rules).filter(Boolean).length
        const isValid = rules.minLength && rules.hasUppercase && rules.hasLowercase && rules.hasNumber

        return {
            isValid,
            rules,
            score,
            strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
            message: getPasswordMessage(rules)
        }
    },

    generateSecurePassword: (length = 12) => {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        let password = ''
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length))
        }
        return password
    }
}

function getPasswordMessage(rules) {
    const messages = []
    if (!rules.minLength) messages.push('8 أحرف على الأقل')
    if (!rules.hasUppercase) messages.push('حرف كبير')
    if (!rules.hasLowercase) messages.push('حرف صغير')
    if (!rules.hasNumber) messages.push('رقم')
    if (!rules.hasSpecial) messages.push('رمز خاص (!@#$%)')
    
    if (messages.length === 0) return 'كلمة مرور قوية'
    return 'يجب إضافة: ' + messages.join('، ')
}

// ── Security Logger (سجل الأمان) ────────────────────────

const SECURITY_LOG_KEY = 'sp_security_log'
const MAX_LOG_ENTRIES = 100

export const securityLogger = {
    log: (event, details = {}) => {
        const logs = securityLogger.getLogs()
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            event,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            deviceId: sessionManager.getDeviceId(),
            userAgent: navigator.userAgent,
            ...details
        }

        logs.unshift(entry)

        // الاحتفاظ بآخر 100 سجل فقط
        if (logs.length > MAX_LOG_ENTRIES) {
            logs.pop()
        }

        localStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(logs))
        return entry
    },

    getLogs: () => {
        try {
            const data = localStorage.getItem(SECURITY_LOG_KEY)
            return data ? JSON.parse(data) : []
        } catch {
            return []
        }
    },

    clearLogs: () => {
        localStorage.removeItem(SECURITY_LOG_KEY)
    },

    getRecentEvents: (eventType, count = 10) => {
        const logs = securityLogger.getLogs()
        return logs.filter(l => l.event === eventType).slice(0, count)
    }
}

// ── أنواع الأحداث الأمنية ────────────────────────────────
export const SECURITY_EVENTS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    NEW_DEVICE_LOGIN: 'NEW_DEVICE_LOGIN',
    SENSITIVE_ACTION: 'SENSITIVE_ACTION'
}

// ── Input Sanitization (تنظيف المدخلات) ─────────────────

export const sanitizer = {
    email: (email) => {
        return email.trim().toLowerCase().replace(/[<>'"]/g, '')
    },

    text: (text) => {
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
    },

    // منع XSS
    escapeHtml: (str) => {
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }
}

// ── CSRF Protection (حماية CSRF) ────────────────────────

export const csrfProtection = {
    generateToken: () => {
        const token = 'csrf_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
        sessionStorage.setItem('sp_csrf_token', token)
        return token
    },

    getToken: () => {
        let token = sessionStorage.getItem('sp_csrf_token')
        if (!token) {
            token = csrfProtection.generateToken()
        }
        return token
    },

    validateToken: (token) => {
        const storedToken = sessionStorage.getItem('sp_csrf_token')
        return token && token === storedToken
    },

    refreshToken: () => {
        return csrfProtection.generateToken()
    }
}

// ── Device Fingerprinting (بصمة الجهاز) ─────────────────

export const deviceFingerprint = {
    generate: () => {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.platform
        ]
        return btoa(components.join('|')).substring(0, 32)
    },

    isKnownDevice: () => {
        const currentFingerprint = deviceFingerprint.generate()
        const knownDevices = JSON.parse(localStorage.getItem('sp_known_devices') || '[]')
        return knownDevices.includes(currentFingerprint)
    },

    registerDevice: () => {
        const currentFingerprint = deviceFingerprint.generate()
        const knownDevices = JSON.parse(localStorage.getItem('sp_known_devices') || '[]')
        if (!knownDevices.includes(currentFingerprint)) {
            knownDevices.push(currentFingerprint)
            // الاحتفاظ بآخر 5 أجهزة فقط
            if (knownDevices.length > 5) {
                knownDevices.shift()
            }
            localStorage.setItem('sp_known_devices', JSON.stringify(knownDevices))
            return { isNew: true, fingerprint: currentFingerprint }
        }
        return { isNew: false, fingerprint: currentFingerprint }
    }
}

// ── Secure Storage (تخزين آمن) ───────────────────────────

export const secureStorage = {
    set: (key, value) => {
        try {
            const encoded = btoa(JSON.stringify(value))
            sessionStorage.setItem('sp_sec_' + key, encoded)
            return true
        } catch {
            return false
        }
    },

    get: (key) => {
        try {
            const encoded = sessionStorage.getItem('sp_sec_' + key)
            if (!encoded) return null
            return JSON.parse(atob(encoded))
        } catch {
            return null
        }
    },

    remove: (key) => {
        sessionStorage.removeItem('sp_sec_' + key)
    },

    clear: () => {
        Object.keys(sessionStorage)
            .filter(k => k.startsWith('sp_sec_'))
            .forEach(k => sessionStorage.removeItem(k))
    }
}
