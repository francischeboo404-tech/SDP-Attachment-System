import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function ManageJobs() {
    const userRole = useAuthStore(state => state.user?.role);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        const fetchAllApplications = async () => {
            try {
                let allApps = [];
                let url = 'jobs/applications/';
                while (url) {
                    if (url.startsWith('http')) {
                        try {
                            const urlObj = new URL(url);
                            url = urlObj.pathname.replace('/api/', '') + urlObj.search;
                        } catch (e) {
                            url = null;
                            break;
                        }
                    }

                    const res = await api.get(url);
                    if (res.data && Array.isArray(res.data.results)) {
                        allApps = [...allApps, ...res.data.results];
                        url = res.data.next;
                    } else if (Array.isArray(res.data)) {
                        allApps = [...allApps, ...res.data];
                        url = null;
                    } else {
                        url = null;
                    }
                }
                setApplications(allApps);
            } catch (error) {
                console.error(error);
                setApplications([]);
            } finally {
                setLoading(false);
            }
        };

        if (['ADMIN', 'HR'].includes(userRole)) {
            fetchAllApplications();
        } else {
            setLoading(false);
        }
    }, [userRole]);

    const updateApplicationStatus = async (appId, newStatus) => {
        try {
            await api.patch(`jobs/applications/${appId}/status/`, { status: newStatus });
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
            setSelectedApp(prev => prev ? { ...prev, status: newStatus } : null);
            alert(`Application updated to: ${newStatus}`);
        } catch (error) {
            console.error(error);
            alert("Failed to update status.");
        }
    };

    const handleDownload = async (docId, fileName) => {
        try {
            const res = await api.get(`accounts/documents/${docId}/download/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || `document_${docId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to secure the attachment or it does not exist.");
        }
    };

    /**
     * Opens the attachments modal AND automatically marks the application as
     * REVIEWED if it is still in PENDING state.  Only PENDING → REVIEWED is
     * triggered here; already-REVIEWED/SHORTLISTED/HIRED applications are
     * opened silently without changing their status.
     */
    const viewAttachments = async (app) => {
        setSelectedApp(app);
        if (app.status === 'PENDING') {
            try {
                await api.patch(`jobs/applications/${app.id}/status/`, { status: 'REVIEWED' });
                // Update both the list row and the open modal panel in-place
                setApplications(prev =>
                    prev.map(a => a.id === app.id ? { ...a, status: 'REVIEWED' } : a)
                );
                setSelectedApp(prev => prev ? { ...prev, status: 'REVIEWED' } : null);
            } catch (err) {
                // Non-fatal: the modal is still opened; status just remains PENDING
                console.error('Could not auto-mark as REVIEWED:', err);
            }
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
    );

    if (!['ADMIN', 'HR'].includes(userRole)) return (
        <div className="text-center p-10 font-bold text-red-500 text-xl border border-red-200 bg-red-50 rounded-2xl mx-10">Access Denied. Admin Privileges Required.</div>
    );

    const filteredApps = applications.filter(app => filterType === 'ALL' || app.job_type === filterType);

    return (
        <div className="animation-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Applicant Attachments Dashboard</h2>
                    <p className="text-gray-500 font-medium mt-1">Review candidates and their accurately mapped PDF requirements.</p>
                </div>
                <div className="mt-4 md:mt-0 flex overflow-x-auto whitespace-nowrap scrollbar-hide border border-gray-200 rounded-xl bg-white p-1 shadow-sm w-full md:w-auto">
                    <button onClick={() => setFilterType('ALL')} className={`flex-1 md:flex-none px-4 py-2 font-bold text-sm rounded-lg transition-colors ${filterType === 'ALL' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>All Apps</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Applicant Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Job Applied For</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ATS Score</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredApps.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No applications found internally.</td>
                                </tr>
                            ) : filteredApps.map(app => (
                                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-extrabold text-gray-900">{app.applicant_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">
                                        {app.job_title}
                                        <div className="text-xs font-bold text-gray-400 mt-0.5">Industrial Attachment Category</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${app.ats_score > 70 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            {app.ats_score}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                                            app.status === 'SHORTLISTED' ? 'bg-green-50 text-green-700 border-green-200' :
                                            app.status === 'HIRED'       ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            app.status === 'REVIEWED'    ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            app.status === 'REJECTED'    ? 'bg-red-50 text-red-700 border-red-200' :
                                                                           'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                             {app.status === 'REVIEWED'    ? '👁 Reviewed' :
                                              app.status === 'SHORTLISTED' ? '✓ Shortlisted' :
                                              app.status === 'HIRED'       ? '✅ Hired' :
                                              app.status === 'REJECTED'    ? '🦄 Not Our Unicorn' :
                                                                             '⏳ Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={() => viewAttachments(app)} className="bg-primary-50 text-primary-700 hover:bg-primary hover:text-white px-4 py-2 font-bold rounded-lg transition-all border border-primary-100">
                                            View Attachments
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedApp && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animation-fade-in relative border-t-8 border-t-primary-500">
                        
                        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-8 pt-8 pb-4 border-b border-gray-100 flex justify-between items-start z-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 leading-tight mb-1">{selectedApp.applicant_name}</h3>
                                <p className="text-gray-500 text-sm font-medium">Application for: <strong className="text-gray-800">{selectedApp.job_title}</strong></p>
                            </div>
                            <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 rounded-full p-2 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-8 pt-6">
                            <h4 className="text-xl font-extrabold text-gray-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <span className="flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Authenticated Candidate Uploads
                                </span>
                                
                                <div className="flex flex-wrap gap-2">
                                    {/* Action buttons — only shown while a decision is still pending.
                                        Disappear once status moves to SHORTLISTED, REJECTED, or HIRED. */}
                                    {!['SHORTLISTED', 'HIRED', 'REJECTED'].includes(selectedApp.status) && (
                                        <>
                                            <button
                                                onClick={() => updateApplicationStatus(selectedApp.id, 'SHORTLISTED')}
                                                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center shrink-0"
                                            >
                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                Shortlist Candidate
                                            </button>
                                            <button
                                                onClick={() => updateApplicationStatus(selectedApp.id, 'REJECTED')}
                                                className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center shrink-0"
                                            >
                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                Mark Unsuccessful
                                            </button>
                                        </>
                                    )}
                                    {/* Decision badges — displayed once a verdict has been recorded */}
                                    {selectedApp.status === 'SHORTLISTED' && (
                                        <>
                                            <span className="bg-green-100 text-green-800 text-xs px-3 py-1.5 rounded-lg border border-green-200 font-bold shrink-0 flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                Candidate Shortlisted
                                            </span>
                                            <button
                                                onClick={() => updateApplicationStatus(selectedApp.id, 'HIRED')}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center shrink-0"
                                            >
                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6a4 4 0 11-8 0 4 4 0 018 0zM12 14v7"></path></svg>
                                                🎉 Hire Candidate
                                            </button>
                                        </>
                                    )}
                                    {selectedApp.status === 'REJECTED' && (
                                        <span className="bg-orange-100 text-orange-700 text-xs px-3 py-1.5 rounded-lg border border-orange-200 font-bold shrink-0 flex items-center gap-1">
                                            🦄 Not Our Unicorn
                                        </span>
                                    )}
                                    {selectedApp.status === 'HIRED' && (
                                        <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1.5 rounded-lg border border-emerald-200 font-bold shrink-0 flex items-center gap-1">
                                            ✅ Candidate Hired
                                        </span>
                                    )}
                                </div>
                            </h4>
                            
                            {selectedApp.attached_documents && selectedApp.attached_documents.length > 0 ? (
                                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {selectedApp.attached_documents.map(doc => (
                                        <li key={doc.id} className="bg-gray-50 border border-gray-200 hover:shadow-md hover:border-primary-200 rounded-xl flex flex-col justify-between transition-all group overflow-hidden">
                                            <div className="p-5 overflow-hidden">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="bg-white p-2.5 rounded-lg shadow-sm text-red-500 border border-gray-100">
                                                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-200 px-2 py-1 rounded">PDF</span>
                                                </div>
                                                <h5 className="font-bold text-gray-900 leading-tight mb-1">{doc.document_type.replace('_', ' ')}</h5>
                                                <p className="text-xs text-gray-400 truncate break-all group-hover:block transition-all">{doc.file.split('/').pop()}</p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleDownload(doc.id, `${doc.document_type}.pdf`)} 
                                                className="w-full bg-primary-100 group-hover:bg-primary-600 text-primary-800 group-hover:text-white font-bold py-3 px-4 transition-colors text-sm text-center flex justify-center items-center border-t border-primary-200 group-hover:border-primary-600 mCustom"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                Retrieve Securely
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-1">No Attachments Found</h4>
                                    <p className="text-gray-500 font-medium">This application does not have any securely attached documents.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
