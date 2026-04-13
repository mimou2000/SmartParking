// ══════════════════════════════════════════════════════
//  src/firebaseApi/useStats.js — Hook لجلب إحصائيات Dashboard
// ══════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { statsAPI } from '././firebaseApi.js'

export function useStats(autoRefresh = 30000) {
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    const fetch = useCallback(async () => {
        try {
            const res = await statsAPI.get()
            if (res.ok) {
                setData(res)
                setError(null)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetch()
        if (autoRefresh > 0) {
            const interval = setInterval(fetch, autoRefresh)
            return () => clearInterval(interval)
        }
    }, [fetch, autoRefresh])

    return { data, loading, error, refetch: fetch }
}
