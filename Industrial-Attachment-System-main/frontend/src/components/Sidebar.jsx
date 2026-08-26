import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Sidebar({ isOpen, setIsOpen }) {
    const location = useLocation();
    const logout = useAuthStore(state => state.logout);
    const userRole = useAuthStore(state => state.user?.role || 'APPLICANT');

    const links = [
        { name: 'Dashboard', path: '/dashboard', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        )},
        { name: 'Profile', path: '/profile', role: 'APPLICANT', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        )},
        { name: 'Vacancies', path: '/vacancies', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        )},
        { name: 'My Applications', path: '/applications', role: 'APPLICANT', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        )},
        { name: 'Manage Jobs', path: '/manage-jobs', role: ['ADMIN', 'HR'], icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )},
        { name: 'User Access Control', path: '/manage-users', role: ['ADMIN', 'HR'], icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        )},
    ];

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity" 
                    onClick={() => setIsOpen(false)}
                />
            )}
            
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary text-slate-800 flex flex-col border-r border-primary-600 shadow-2xl transform transition-all duration-300 md:relative md:translate-x-0 md:opacity-100 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none md:pointer-events-auto'}`}>
                <div className="p-4 border-b border-primary-600 flex justify-between md:justify-center items-center bg-white shadow-sm h-20 shrink-0">
                    <img src="/logo.png" alt="Ministry Logo" className="h-12 object-contain filter drop-shadow-sm" />
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800 p-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    <p className="px-4 text-xs font-black uppercase tracking-widest text-primary-900/70 mb-4 drop-shadow-sm">Menu</p>
                    {links.filter(l => !l.role || l.role === userRole || (Array.isArray(l.role) && l.role.includes(userRole))).map(link => {
                        const isActive = location.pathname.startsWith(link.path);
                        return (
                            <Link key={link.name} to={link.path} 
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold ${
                                    isActive 
                                        ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-primary-800 border-none' 
                                        : 'hover:bg-primary-600/30 text-slate-800 hover:text-slate-900 hover:shadow-sm'
                                }`}>
                                <span className={isActive ? "text-primary-600" : "text-slate-700 group-hover:text-slate-900"}>{link.icon}</span>
                                <span>{link.name}</span>
                            </Link>
                        )
                    })}
                </nav>
                
                <div className="p-4 border-t border-primary-600 bg-primary-600/10 shrink-0">
                    <button onClick={logout} className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500 hover:text-white hover:shadow-lg text-slate-800 font-bold transition-all group">
                        <svg className="w-5 h-5 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
}
