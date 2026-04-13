// ══════════════════════════════════════════════════════
//  src/components/SecurityWrapper.jsx
//  مكون الأمان الذي يلتف حول التطبيق
// ══════════════════════════════════════════════════════

import React from 'react'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import SessionWarningModal from './SessionWarningModal'

export default function SecurityWrapper({ children }) {
    const { showWarning, remainingTime, extendSession, forceLogout } = useSessionTimeout()

    return (
        <>
            {children}
            <SessionWarningModal
                show={showWarning}
                remainingTime={remainingTime}
                onExtend={extendSession}
                onLogout={forceLogout}
            />
        </>
    )
}
