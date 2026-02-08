import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Aliases from './pages/Aliases';
import Emails from './pages/Emails';
import Settings from './pages/Settings';
import Security from './pages/Security';
import DocumentsManager from './components/DocumentsManager';
import ExtensionDownload from './pages/ExtensionDownload';
import ExtensionGuide from './pages/ExtensionGuide';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LockScreen from './components/LockScreen';
import SessionWarning from './components/SessionWarning';
import OfflineStatus from './components/OfflineStatus';
import CommandPalette from './components/CommandPalette';  // Nouveau

function App() {
    const { isLocked } = useAuthStore();

    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#1e1e2e',
                        color: '#cdd6f4',
                        border: '1px solid #313244',
                    },
                    success: {
                        iconTheme: { primary: '#a6e3a1', secondary: '#1e1e2e' },
                    },
                    error: {
                        iconTheme: { primary: '#f38ba8', secondary: '#1e1e2e' },
                    },
                }}
            />

            {isLocked && <LockScreen />}
            <SessionWarning />
            <OfflineStatus />
            <CommandPalette />

            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/extension" element={<ExtensionDownload />} />
                <Route path="/extension-guide" element={<ExtensionGuide />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/vault" element={<Vault />} />
                    <Route path="/aliases" element={<Aliases />} />
                    <Route path="/emails" element={<Emails />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/security" element={<Security />} />
                    <Route path="/documents" element={<DocumentsManager />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
