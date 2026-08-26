import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../services/api';

const COLORS = [
  '#1E3A8A', // Professionalism & Integrity (Navy)
  '#0D9488', // Transparency & Accountability (Teal)
  '#7C3AED', // Innovativeness (Purple)
  '#EA580C', // Stakeholder participation (Orange)
  '#DB2777', // Customer centric (Warm Pink)
  '#E3BC75', // Teamwork & Commitment (Gold)
  '#16A34A', // Sustainability (Forest Green)
  '#0284C7', // Inclusivity & impartiality (Sky Blue)
];

export default function AdminAnalytics() {
    const [stats, setStats] = useState({
        total_jobs: 0,
        total_applications: 0,
        status_distribution: [],
        job_type_distribution: [],
        average_ats_score: 0,
        trend: [],
        period_label: "Monthly"
    });
    const [loading, setLoading] = useState(true);
    
    // Default: Last 30 Days
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/jobs/analytics/?start_date=${startDate}&end_date=${endDate}`);
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [startDate, endDate]);

    const handleStartDateChange = (e) => {
        if (e.target.value > endDate) {
            setEndDate(e.target.value);
        }
        setStartDate(e.target.value);
    };

    const handleEndDateChange = (e) => {
        if (e.target.value < startDate) {
            setStartDate(e.target.value);
        }
        setEndDate(e.target.value);
    };

    const pieData = stats.status_distribution.map(s => ({
        name: s.status,
        value: s.count
    }));

    const barData = stats.job_type_distribution.map(j => ({
        name: j.job_type.replace('_', ' '),
        applications: j.count
    }));

    return (
        <div className="animation-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Intelligence Dashboard</h2>
                <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center w-full sm:w-auto">
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2 w-12 sm:w-auto text-right">From:</span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={handleStartDateChange}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 font-bold cursor-pointer transition-colors w-full sm:w-36"
                        />
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2 w-12 sm:w-auto text-right">To:</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={handleEndDateChange}
                            max={new Date().toISOString().split('T')[0]}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 font-bold cursor-pointer transition-colors w-full sm:w-36"
                        />
                    </div>
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-[#3B82F6]">
                            <h3 className="text-sm font-bold text-gray-500 uppercase">Total Vacancies</h3>
                            <p className="text-3xl font-black mt-2 text-gray-800">{stats.total_jobs}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-[#14B8A6]">
                            <h3 className="text-sm font-bold text-gray-500 uppercase">Total Applications</h3>
                            <p className="text-3xl font-black mt-2 text-gray-800">{stats.total_applications}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-[#E3BC75]">
                            <h3 className="text-sm font-bold text-gray-500 uppercase">Avg. ATS Score</h3>
                            <p className="text-3xl font-black mt-2 text-gray-800">{stats.average_ats_score}%</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-[#8B5CF6]">
                            <h3 className="text-sm font-bold text-gray-500 uppercase">System Integrity</h3>
                            <p className="text-3xl font-black mt-2 text-gray-800">100%</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Application Context (Pie Chart) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Application Status Distribution</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height={288}>
                                    <PieChart>
                                        <Pie
                                            data={pieData.length ? pieData : [{name: 'No Data', value: 1}]}
                                            cx="50%"
                                            cy="50%"
                                            stroke="none"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.length ? pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            )) : <Cell fill="#E5E7EB" />}
                                        </Pie>
                                        {pieData.length > 0 && (
                                            <>
                                                <RechartsTooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend iconType="circle" />
                                            </>
                                        )}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Job Types (Bar Chart) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Category Demand Volume</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height={288}>
                                    <BarChart data={barData.length ? barData : [{name: 'No Data', applications: 0}]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                        {barData.length > 0 && (
                                            <RechartsTooltip
                                                cursor={{fill: '#F3F4F6'}}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                        )}
                                        <Bar dataKey="applications" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {barData.length ? barData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                            )) : <Cell fill="#E5E7EB" />}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        {/* Application Trends (Area Chart) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 capitalize">{stats.period_label || 'Chronological'} Application Submissions Trend</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height={288}>
                                    <AreaChart data={stats.trend.length ? stats.trend : [{date: 'No Data', applications: 0}]}>
                                        <defs>
                                            <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                        {stats.trend.length > 0 && <RechartsTooltip />}
                                        <Area type="monotone" dataKey="applications" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
