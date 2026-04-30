import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import { useAuth } from './context/useAuth'
import { DataProvider } from './context/DataProvider.jsx'
import Login from './login_page/Login.jsx'
import AdminDashboard from './layouts/AdminDashboard'
import ManagerDashboard from './layouts/ManagerDashboard'
import GuestDashboard from './layouts/GuestDashboard'
import SecurityWrapper from './components/SecurityWrapper'

function PrivateRoute({ children, requiredRole }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    if (requiredRole && user.role !== requiredRole) {
        // الضيف يُوجَّه لصفحته الخاصة
        if (user.role === 'GUEST') return <Navigate to="/guest" replace />
        return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/manager'} replace />
    }
    // DataProvider داخل PrivateRoute — يُحمَّل فقط بعد تسجيل الدخول
    // SecurityWrapper يوفر حماية الجلسة والتحذير من انتهاء الصلاحية
    return (
        <SecurityWrapper>
            <DataProvider>{children}</DataProvider>
        </SecurityWrapper>
    )
}

// Route للضيف - بدون DataProvider و SecurityWrapper الكاملين
function GuestRoute({ children }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    if (user.role !== 'GUEST') {
        return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/manager'} replace />
    }
    return children
}

function RootRedirect() {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    if (user.role === 'GUEST') return <Navigate to="/guest" replace />
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/manager'} replace />
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={
                <PrivateRoute requiredRole="ADMIN">
                    <AdminDashboard />
                </PrivateRoute>
            } />
            <Route path="/manager" element={
                <PrivateRoute requiredRole="MANAGER">
                    <ManagerDashboard />
                </PrivateRoute>
            } />
            <Route path="/guest" element={
                <GuestRoute>
                    <GuestDashboard />
                </GuestRoute>
            } />
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    )
}
