// ══════════════════════════════════════════════════════
//  src/context/useAuth.js
//  ✅ فقط الـ Hook
// ══════════════════════════════════════════════════════

import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export const useAuth = () => useContext(AuthContext)