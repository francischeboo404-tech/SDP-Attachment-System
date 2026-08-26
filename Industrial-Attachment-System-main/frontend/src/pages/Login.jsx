import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('Signing In...');
    const setAuth = useAuthStore(state => state.setAuth);
    const navigate = useNavigate();
    // Only enable Google Sign-In when VITE_GOOGLE_CLIENT_ID is explicitly set in .env.
    // The fallback demo ID is NOT authorized for localhost, causing a 403 error from Google.
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isGoogleEnabled = !!(googleClientId && googleClientId.trim() !== '');

    // ── Reset form state on every mount so no stale / browser-injected
    // credentials bleed in from a previous session or a different site.
    useEffect(() => {
        setCredentials({ username: '', password: '' });
        setError('');
    }, []);

    // Loading message cycling
    useEffect(() => {
        let interval;
        if (loading) {
            const messages = [
                'Signing In...',
                'Waking up secure server...',
                'Verifying credentials...',
                'Almost there...',
            ];
            let i = 0;
            interval = setInterval(() => {
                i = (i + 1) % messages.length;
                setLoadingMsg(messages[i]);
            }, 4000);
        } else {
            setLoadingMsg('Signing In...');
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!recaptchaToken) {
            setError('Please complete the reCAPTCHA validation.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('accounts/login/', {
                username: credentials.username.trim(),
                password: credentials.password,
                recaptcha: recaptchaToken
            });
            const userData = data.user || { username: credentials.username };
            // Pass the refresh token as the third argument so the interceptor
            // can silently renew the session when the access token expires.
            setAuth(userData, data.access, data.refresh);
            
            if (userData.role === 'ADMIN') {
                navigate('/manage-jobs');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Login failed', err);
            if (err.response?.data) {
                const errorData = err.response.data;
                // Check for detail (standard DRF) or specific field errors
                if (errorData.detail) {
                    setError(errorData.detail);
                } else if (typeof errorData === 'object') {
                    const messages = Object.values(errorData).flat();
                    setError(messages.join(', '));
                } else {
                    setError('Invalid email or password. Please try again.');
                }
            } else {
                setError('Invalid email or password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 lg:bg-white">
            {/* Left Informational Side */}
            <div className="w-full lg:w-1/2 bg-primary text-slate-900 relative overflow-hidden flex flex-col justify-start lg:justify-between px-6 pt-10 pb-20 lg:p-12">
                {/* Abstract Background Design */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white blur-3xl"></div>
                    <div className="absolute top-1/2 -left-20 w-72 h-72 rounded-full bg-white blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    <div className="bg-white/40 backdrop-blur-sm inline-flex p-2 lg:p-3 rounded-2xl mb-6 lg:mb-8 border border-white/50">
                        <img src="/logo.png" alt="Ministry Logo" className="h-[40px] md:h-[60px] object-contain drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-4 lg:mb-6 leading-tight tracking-tight text-slate-900">
                        Empowering Youth<br/>
                        <span className="text-slate-800 opacity-90">Through Excellence</span>
                    </h1>
                    <p className="text-sm md:text-lg text-slate-800 leading-relaxed max-w-lg mb-6 lg:mb-8 font-medium">
                        Welcome to the State Department for Petroleum's Industrial Attachment System. This platform is purposefully built to ensure transparent, merit-based, and seamless processing of industrial attachment opportunities.
                    </p>
                    
                    <div className="hidden sm:block space-y-6">
                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center shrink-0 border border-white/50">
                                <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Automated Verification</h3>
                                <p className="text-sm text-slate-800/80">Intelligent criteria matching ensures fair vetting</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center shrink-0 border border-white/50">
                                <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Secure Processing</h3>
                                <p className="text-sm text-slate-800/80">Multi-stage document validations and security compliance</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="hidden lg:block relative z-10 pt-12 text-sm text-slate-800/80 font-bold">
                    &copy; {new Date().getFullYear()} State Department for Petroleum. All rights reserved.
                </div>
            </div>

            {/* Right Login Form Side */}
            <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center px-4 pb-12 lg:p-12 relative -mt-10 lg:mt-0 z-20">
                <div className="w-full max-w-md">
                    <form
                        id="login-form"
                        onSubmit={handleSubmit}
                        autoComplete="off"
                        className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all"
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sign In</h2>
                            <p className="text-sm text-gray-500 mt-2 font-medium">Access to industrial attachment system</p>
                        </div>
                        
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-pulse">
                                {error}
                            </div>
                        )}
                        
                        <div className="space-y-6">
                            <div className="relative group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block group-focus-within:text-primary-600 transition-colors">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <input
                                        id="login-username"
                                        name="username"
                                        type="email"
                                        autoComplete="username"
                                        placeholder="fnamelname@gmail.com"
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-100 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400 font-medium text-gray-900"
                                        value={credentials.username}
                                        onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block group-focus-within:text-primary-600 transition-colors">Password</label>
                                <div className="relative">
                                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <input
                                        id="login-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-100 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400 font-medium text-gray-900"
                                        value={credentials.password}
                                        onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                    />
                                    <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary-600 focus:outline-none" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="pt-2 flex justify-center">
                                <ReCAPTCHA
                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                                    onChange={(token) => setRecaptchaToken(token)}
                                    theme="light"
                                />
                            </div>

                            <button type="submit" disabled={loading} className={`w-full bg-primary hover:bg-primary-600 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(227,188,117,0.39)] hover:shadow-[0_6px_20px_rgba(227,188,117,0.23)] hover:-translate-y-0.5 transition-all duration-300 mt-4 flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}>
                                {loading && (
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? loadingMsg : 'Sign In to Portal'}
                                {!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                            </button>
                        </div>
                        
                        <div className="mt-8 flex flex-col items-center gap-4 border-t border-gray-100 pt-6">
                            {isGoogleEnabled ? (
                                <>
                                    <p className="text-gray-500 text-sm font-bold">Or log in with</p>
                                    <GoogleLogin 
                                        onSuccess={async (credentialResponse) => {
                                            try {
                                                const { data } = await api.post('accounts/google-login/', { 
                                                    tokenId: credentialResponse.credential 
                                                });
                                                const userData = data.user;
                                                setAuth(userData, data.access);
                                                
                                                if (userData.role === 'ADMIN') {
                                                    navigate('/manage-jobs');
                                                } else {
                                                    navigate('/dashboard');
                                                }
                                            } catch (err) {
                                                console.error('Google login failed', err);
                                                setError('Google authentication failed. Please try again.');
                                            }
                                        }}
                                        onError={() => {
                                            console.log('Login Failed');
                                            setError('Google login was cancelled or failed.');
                                        }}
                                    />
                                </>
                            ) : null}
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-gray-600 text-sm font-medium">
                                Don't have an account?{' '}
                                <Link to="/register" className="font-bold text-primary-600 hover:text-primary-800 hover:underline transition-colors decoration-2 underline-offset-4">
                                    Create one here
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
