import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// ─── Status display config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
    PENDING:     { label: 'Under Review',    bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-400' },
    REVIEWED:    { label: '\ud83d\udc41 Docs Reviewed', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
    SHORTLISTED: { label: 'Shortlisted',     bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
    HIRED:       { label: 'Hired \u2713',         bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200',  dot: 'bg-green-500'  },
    REJECTED:    { label: '🦄 Not Our Unicorn', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
};

const getAtsColor    = s => s >= 70 ? 'text-green-600'  : s >= 40 ? 'text-amber-600'  : 'text-red-500';
const getAtsBarColor = s => s >= 70 ? 'bg-green-500'    : s >= 40 ? 'bg-amber-500'    : 'bg-red-400';
const getAtsLabel    = s => s >= 70 ? 'Strong match'    : s >= 40 ? 'Moderate match'  : 'Low match';

function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4 gap-3">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-20 shrink-0" />
            </div>
            <div className="h-3 bg-gray-100 rounded w-1/3 mb-6" />
            <div className="h-2 bg-gray-200 rounded-full w-full mb-6" />
            <div className="flex justify-between">
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
        </div>
    );
}

export default function Applications() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let allApps = [];
            let url = 'jobs/applications/';
            while (url) {
                if (url.startsWith('http')) {
                    try {
                        const u = new URL(url);
                        url = u.pathname.replace('/api/', '') + u.search;
                    } catch { url = null; break; }
                }
                const res = await api.get(url);
                if (res.data && Array.isArray(res.data.results)) {
                    allApps = [...allApps, ...res.data.results];
                    url = res.data.next;
                } else if (Array.isArray(res.data)) {
                    allApps = [...allApps, ...res.data];
                    url = null;
                } else { url = null; }
            }
            setApplications(allApps);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
            setError('Failed to load your applications. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const Header = () => (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
            <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Applications</h2>
                <p className="text-gray-500 font-medium mt-1">Track the status of your submitted job applications</p>
            </div>
            {!loading && !error && (
                <button
                    onClick={fetchApplications}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-200 px-4 py-2 rounded-xl transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            )}
        </div>
    );

    if (loading) return (
        <div className="animation-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Header />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
        </div>
    );

    if (error) return (
        <div className="animation-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Header />
            <div className="bg-red-50 border border-red-200 rounded-2xl p-14 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-red-800 mb-2">Could Not Load Applications</h3>
                <p className="text-red-600 text-sm mb-6 max-w-sm">{error}</p>
                <button onClick={fetchApplications} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                    Retry
                </button>
            </div>
        </div>
    );

    if (applications.length === 0) return (
        <div className="animation-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Header />
            <div className="bg-white p-14 rounded-2xl shadow-sm border border-dashed border-gray-300 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-5 text-primary-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-7 font-medium">
                    You haven't submitted any applications. Browse open positions, complete your profile, then apply.
                </p>
                <Link to="/vacancies" className="bg-primary text-white hover:bg-primary-600 font-bold py-3 px-8 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5">
                    Browse Vacancies
                </Link>
            </div>
        </div>
    );

    return (
        <div className="animation-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Applications</h2>
                    <p className="text-gray-500 font-medium mt-1">
                        {applications.length} application{applications.length !== 1 ? 's' : ''} submitted
                    </p>
                </div>
                <button
                    onClick={fetchApplications}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-200 px-4 py-2 rounded-xl transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map(app => {
                    const status   = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
                    const score    = parseFloat(app.ats_score) || 0;
                    const docCount = Array.isArray(app.attached_documents) ? app.attached_documents.length : 0;
                    const appliedDate = new Date(app.applied_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    });

                    return (
                        <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300 flex flex-col overflow-hidden group">
                            {/* Card body */}
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start gap-3 mb-1">
                                    <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-primary-700 transition-colors leading-snug">
                                        {app.job_title || `Application #${app.id}`}
                                    </h3>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 flex items-center ${status.bg} ${status.text} ${status.border}`}>
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                                        {status.label}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
                                    {app.job_type?.replace('_', ' ') || 'Position'}
                                </p>

                                {/* ATS Score */}
                                <div className="mb-5">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">ATS Match Score</span>
                                        <span className={`text-sm font-extrabold ${getAtsColor(score)}`}>{score.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${getAtsBarColor(score)}`}
                                            style={{ width: `${Math.min(score, 100)}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs font-semibold mt-1 ${getAtsColor(score)}`}>{getAtsLabel(score)}</p>
                                </div>

                                {/* Meta */}
                                <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Applied {appliedDate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        {docCount} doc{docCount !== 1 ? 's' : ''} attached
                                    </span>
                                </div>
                            </div>

                            {/* Status footer — HIRED gets a special full-width celebration banner */}
                            {app.status === 'HIRED' ? (
                                <div className="px-6 py-5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-center relative overflow-hidden">
                                    {/* Decorative shimmer layer */}
                                    <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                                    <p className="text-xl font-black text-white tracking-tight mb-1 relative">
                                        🎊 Congratulations — You're Hired!
                                    </p>
                                    <p className="text-xs font-semibold text-emerald-100 relative leading-relaxed">
                                        Welcome to the team! 🚀 Please check your email for your onboarding letter
                                        and next steps. We're thrilled to have you on board.
                                    </p>
                                </div>
                            ) : (
                                <div className={`px-6 py-3 border-t ${status.border} ${status.bg} text-xs font-semibold ${status.text}`}>
                                    {app.status === 'PENDING'     && '⏳ Your application is under review by the HR team. Hang tight!'}
                                    {app.status === 'REVIEWED'    && '\ud83d\udc41 Your documents have been reviewed by our team. A decision is coming soon.'}
                                    {app.status === 'SHORTLISTED' && '🎉 Congratulations! You have been shortlisted — expect further communication soon.'}
                                    {app.status === 'REJECTED'    && '\ud83e\udd84 Not our unicorn this time — but keep polishing your profile and try again!'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
