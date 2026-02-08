import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    Shield,
    Key,
    Mail,
    Inbox,
    Settings,
    LogOut,
    LayoutDashboard,
    ShieldCheck,
    FolderLock
} from 'lucide-react';
/**
 * Layout Component - SecureVault by Nextendo x Micka Delcato
 */
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import Onboarding from './Onboarding';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import SpotlightSearch from './SpotlightSearch';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/vault', icon: Key, label: 'Coffre-fort' },
    { path: '/aliases', icon: Mail, label: 'Alias E-mail' },
    { path: '/emails', icon: Inbox, label: 'Messages' },
    { path: '/documents', icon: FolderLock, label: 'Documents' },
    { path: '/security', icon: ShieldCheck, label: 'Sécurité' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
];

export default function Layout() {
    const navigate = useNavigate();
    const { user, logout, lock } = useAuthStore();
    
    // Activer les raccourcis clavier
    useKeyboardShortcuts();

    const handleLogout = async () => {
        await logout();
        toast.success('Déconnexion réussie');
        navigate('/login');
    };

    const handleLock = () => {
        lock();
        toast.success('Coffre-fort verrouillé');
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Shield size={24} />
                    </div>
                    <span className="sidebar-logo-text text-gradient">SecureVault</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subdued)', marginLeft: '8px' }}>by Nextendo x Micka Delcato</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            data-tour={path.replace('/', '')}
                        >
                            <Icon className="nav-item-icon" size={20} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="flex items-center gap-md mb-md">
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-crust)',
                                fontWeight: 600,
                            }}
                        >
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="truncate text-sm" style={{ fontWeight: 500 }}>
                                {user?.email || 'Utilisateur'}
                            </div>
                            <div className="text-sm text-muted">Connecté</div>
                        </div>
                    </div>

                    <div className="flex gap-sm">
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ flex: 1 }}
                            onClick={handleLock}
                        >
                            <Shield size={16} />
                            Verrouiller
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ flex: 1 }}
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="container page">
                    <Outlet />
                </div>
            </main>

            {/* Onboarding Tutorial */}
            <Onboarding />
            
            {/* Keyboard Shortcuts */}
            <KeyboardShortcutsHelp />
            
            {/* Spotlight Search */}
            <SpotlightSearch />
        </div>
    );
}
