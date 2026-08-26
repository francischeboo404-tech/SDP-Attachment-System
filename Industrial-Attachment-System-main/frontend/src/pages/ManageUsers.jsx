import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function ManageUsers() {
    const userRole = useAuthStore(state => state.user?.role);
    const currentUser = useAuthStore(state => state.user);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (['ADMIN', 'HR'].includes(userRole)) {
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, [userRole]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('accounts/users/');
            if (res.data && Array.isArray(res.data.results)) {
                setUsers(res.data.results);
            } else if (Array.isArray(res.data)) {
                setUsers(res.data);
            } else {
                setUsers([]);
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        if (userId === currentUser?.id) {
            alert("You cannot demote yourself. Another Admin must do this.");
            return;
        }
        
        try {
            const res = await api.patch(`accounts/users/${userId}/`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: res.data.role } : u));
        } catch (error) {
            console.error("Failed to update user role", error);
            alert("Failed to update role. Please ensure you have suitable privileges.");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (userId === currentUser?.id) {
            alert("You cannot delete your own active Admin account.");
            return;
        }

        if (!window.confirm("WARNING: Are you sure you want to permanently delete this user account. This action is irreversible and deletes all associated applications and profiles.")) return;
        
        try {
            await api.delete(`accounts/users/${userId}/`);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete the user.");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
    );

    if (!['ADMIN', 'HR'].includes(userRole)) return (
        <div className="text-center p-10 font-bold text-red-500 text-xl border border-red-200 bg-red-50 rounded-2xl mx-10 shadow-sm">
            Access Denied. Elevated Admin Privileges Required.
        </div>
    );

    return (
        <div className="animation-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Access Management</h2>
                <p className="text-gray-500 font-medium mt-1">Govern system privileges and administrative boundaries natively.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User Account</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Contact Mapping</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date Joined</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">System Role</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No users found.</td>
                                </tr>
                            ) : users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center border border-primary-200">
                                                <span className="text-primary-800 font-black">
                                                    {u.first_name ? u.first_name[0].toUpperCase() : u.username[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-extrabold text-gray-900">{u.first_name} {u.last_name}</div>
                                                <div className="text-xs text-gray-500 font-medium">@{u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600 text-sm">
                                        <a href={`mailto:${u.email}`} className="text-blue-600 hover:underline">{u.email}</a>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-500 text-sm">
                                        {new Date(u.date_joined).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {u.role === 'ADMIN' ? (
                                             <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg border bg-purple-50 text-purple-700 border-purple-200">
                                                ADMIN
                                            </span>
                                        ) : u.role === 'HR' ? (
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
                                                HR
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg border bg-gray-100 text-gray-600 border-gray-200">
                                                APPLICANT
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                            {u.id !== currentUser?.id && (
                                                <>
                                                    {(userRole === 'ADMIN' || currentUser?.is_superuser) && u.role !== 'ADMIN' && (
                                                        <button 
                                                            onClick={() => handleRoleChange(u.id, 'ADMIN')}
                                                            className="text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded font-bold border border-primary-100 transition-colors text-xs inline-flex items-center"
                                                        >
                                                            Promote Admin
                                                        </button>
                                                    )}
                                                    {(userRole === 'ADMIN' || currentUser?.is_superuser) && u.role !== 'HR' && u.role !== 'ADMIN' && (
                                                        <button 
                                                            onClick={() => handleRoleChange(u.id, 'HR')}
                                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded font-bold border border-blue-100 transition-colors text-xs inline-flex items-center"
                                                        >
                                                            Promote HR
                                                        </button>
                                                    )}
                                                    {u.role !== 'APPLICANT' && (userRole === 'ADMIN' || currentUser?.is_superuser || (userRole === 'HR' && u.role !== 'ADMIN')) && (
                                                        <button 
                                                            onClick={() => handleRoleChange(u.id, 'APPLICANT')}
                                                            className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold border border-gray-200 transition-colors text-xs inline-flex items-center"
                                                        >
                                                            Demote to Applicant
                                                        </button>
                                                    )}
                                                    
                                                    {(userRole !== 'HR' || currentUser?.is_superuser) && (
                                                        <button 
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded font-bold border border-red-100 transition-colors text-xs inline-flex items-center"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {u.id === currentUser?.id && (
                                                <span className="text-xs bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 font-bold italic">
                                                    Current Session
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
