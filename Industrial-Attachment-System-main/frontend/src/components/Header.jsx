import useAuthStore from '../store/authStore';

export default function Header({ onMenuClick }) {
    const user = useAuthStore(state => state.user);
    
    return (
        <header className="bg-white shadow-sm h-20 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
            <div className="flex items-center gap-3">
                <button 
                    onClick={onMenuClick}
                    className="md:hidden p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <h1 className="text-lg md:text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2 md:gap-3 truncate">
                    <span className="bg-primary-50 text-primary-600 p-1.5 md:p-2 rounded-lg shrink-0">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </span>
                    <span className="hidden sm:inline">State Department for Petroleum</span>
                    <span className="sm:hidden truncate">Dept. Petroleum</span>
                </h1>
            </div>
            <div className="flex items-center space-x-4 md:space-x-6">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">{user?.username || 'Guest User'}</p>
                    <p className="text-xs font-medium text-primary-600 uppercase tracking-wider">{user?.role || 'Applicant'}</p>
                </div>
                <button className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary-100 text-primary-700 font-extrabold text-lg border-2 border-primary-200 hover:ring-4 hover:ring-primary-50 transition-all shadow-inner">
                    {user?.username?.charAt(0).toUpperCase() || 'G'}
                </button>
            </div>
        </header>
    );
}
