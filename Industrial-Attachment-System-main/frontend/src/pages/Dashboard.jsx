import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AdminAnalytics from '../components/AdminAnalytics';
import useAuthStore from '../store/authStore';
import useDashboardStore from '../store/dashboardStore';
import api from '../services/api';

export default function Dashboard({ children }) {
    const user = useAuthStore(state => state.user);
    const { stats, fetchStats } = useDashboardStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (user && !['ADMIN', 'HR'].includes(user.role)) {
            Promise.all([
                api.get('accounts/profile/').catch(() => ({ data: null })),
                fetchStats()
            ])
            .then(([profRes]) => {
                setProfile(profRes.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user, fetchStats]);


    
    return (
        <div className="fixed inset-0 flex h-[100dvh] bg-gray-50 font-sans overflow-hidden w-full">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col transition-all duration-300 w-full overflow-hidden h-full">
                <div className="shrink-0 z-20 shadow-sm relative">
                    <Header onMenuClick={() => setIsSidebarOpen(true)} />
                </div>
                <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-50/50 relative w-full h-full pb-20 md:pb-8">
                    {loading && !children && (
                        <div className="absolute inset-0 flex justify-center items-center bg-gray-50/80 z-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    )}
                    {children || (
                        ['ADMIN', 'HR'].includes(user?.role) ? (
                            <AdminAnalytics />
                        ) : (
                            <div className="max-w-7xl mx-auto animation-fade-in">
                                <h2 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Welcome, {user?.username || 'User'}!</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-primary hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-gray-500 text-sm font-bold tracking-wider uppercase">Applications</h3>
                                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-4xl font-black text-gray-800">{stats.applications_count}</p>
                                        <p className="text-sm text-green-500 mt-2 font-medium">Successfully Tracked</p>
                                    </div>
                                    <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-primary hover:shadow-md transition-shadow">
                                         <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-gray-500 text-sm font-bold tracking-wider uppercase">Profile Setup</h3>
                                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-black text-primary-600">{stats.profile_completion}% Complete</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-4">
                                            <div className="bg-primary h-2.5 rounded-full" style={{width: `${stats.profile_completion}%`}}></div>
                                        </div>
                                        {stats.can_apply ? (
                                            <div className="space-y-1">
                                                <p className="text-sm text-green-600 font-bold flex items-center">
                                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                    Profile Complete
                                                </p>
                                                <p className="text-sm text-green-600 font-bold flex items-center">
                                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                    Eligible to Apply
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <p className="text-sm text-red-500 font-bold flex items-center">
                                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V7z" clipRule="evenodd"></path></svg>
                                                    Incomplete Profile
                                                </p>
                                                {stats.missing_sections && stats.missing_sections.length > 0 && (
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        Missing: {stats.missing_sections.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-primary hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-gray-500 text-sm font-bold tracking-wider uppercase">Latest Action</h3>
                                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                        {stats.latest_status ? (
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-3 ${
                                                    stats.latest_status === 'HIRED'       ? 'bg-green-100 text-green-800' :
                                                    stats.latest_status === 'SHORTLISTED' ? 'bg-blue-100 text-blue-800' :
                                                    stats.latest_status === 'REVIEWED'    ? 'bg-purple-100 text-purple-800' :
                                                    stats.latest_status === 'REJECTED'    ? 'bg-orange-100 text-orange-700' :
                                                                                            'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        stats.latest_status === 'HIRED'       ? 'bg-green-500' :
                                                        stats.latest_status === 'SHORTLISTED' ? 'bg-blue-500' :
                                                        stats.latest_status === 'REVIEWED'    ? 'bg-purple-500' :
                                                        stats.latest_status === 'REJECTED'    ? 'bg-orange-400' :
                                                                                                'bg-yellow-400'
                                                    }`} />
                                                    {stats.latest_status === 'HIRED'       ? '✅ Hired' :
                                                     stats.latest_status === 'SHORTLISTED' ? '🎉 Shortlisted' :
                                                     stats.latest_status === 'REVIEWED'    ? '👁 Docs Reviewed' :
                                                     stats.latest_status === 'REJECTED'    ? '🦄 Not Our Unicorn' :
                                                                                             '⏳ Under Review'}
                                                </span>
                                                <p className="text-base font-extrabold text-gray-800 leading-snug">{stats.latest_job_title}</p>
                                                {stats.latest_applied_at && (
                                                    <p className="text-xs text-gray-400 mt-1.5 font-medium">
                                                        Applied {new Date(stats.latest_applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-lg font-bold text-gray-400 mt-1">No applications yet</p>
                                                <p className="text-sm text-gray-400 mt-1 font-medium">Apply for a vacancy to see your status here</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    );
}
