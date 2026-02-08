import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, requires2FA } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated && !requires2FA) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
