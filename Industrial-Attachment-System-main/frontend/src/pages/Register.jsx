import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/authStore';

export default function Register() {
    const [formData, setFormData] = useState({ 
        username: '', email: '', password: '', confirm_password: '',
        first_name: '', last_name: '' 
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('Processing...');
    const [errorMsg, setErrorMsg] = useState(null);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const navigate = useNavigate();
    // Only enable Google Sign-In when VITE_GOOGLE_CLIENT_ID is explicitly set in .env.
    // The fallback demo ID is NOT authorized for localhost — mounting the widget fires a 403.
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isGoogleEnabled = !!(googleClientId && googleClientId.trim() !== '');

    useEffect(() => {
        let interval;
        if (loading) {
            const messages = [
                "Processing...", 
                "Waking up secure server...", 
                "Creating account...", 
                "Almost there..."
            ];
            let i = 0;
            interval = setInterval(() => {
                i = (i + 1) % messages.length;
                setLoadingMsg(messages[i]);
            }, 4000);
        } else {
            setLoadingMsg('Processing...');
        }
        return () => clearInterval(interval);
    }, [loading]);
    const setAuth = useAuthStore(state => state.setAuth);

    const checkStrength = (pass) => {
        let score = 0;
        if (!pass) return { score: 0, label: '', color: 'bg-gray-200', width: '0%' };
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;
        
        if (pass.length > 16) return { score: 0, label: 'Too Long (>16)', color: 'bg-red-500', width: '100%' };
        if (pass.length < 8) return { score: 1, label: 'Too Short (<8)', color: 'bg-red-500', width: '25%' };
        
        switch(score) {
            case 1: return { score, label: 'Weak', color: 'bg-red-500', width: '25%' };
            case 2: return { score, label: 'Fair', color: 'bg-orange-500', width: '50%' };
            case 3: return { score, label: 'Good', color: 'bg-yellow-500', width: '75%' };
            case 4: return { score, label: 'Strong', color: 'bg-green-500', width: '100%' };
            default: return { score: 0, label: '', color: 'bg-gray-200', width: '0%' };
        }
    };
    
    const strength = checkStrength(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        if (formData.password !== formData.confirm_password) {
            setErrorMsg('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8 || formData.password.length > 16) {
            setErrorMsg('Password must be between 8 and 16 characters.');
            setLoading(false);
            return;
        }

        if (strength.score < 4) {
            setErrorMsg('Password is not strong enough. Ensure it has an uppercase letter, lowercase letter, number, and special character.');
            setLoading(false);
            return;
        }
        
        if (!recaptchaToken) {
            setErrorMsg('Please complete the reCAPTCHA validation.');
            setLoading(false);
            return;
        }

        try {
            await api.post('accounts/register/', {
                ...formData,
                recaptcha: recaptchaToken
            });
            alert('Registration Successful! Please login.');
            navigate('/login');
        } catch (error) {
            console.error('Registration failed', error);
            if (error.response?.data) {
                const errors = Object.values(error.response.data).flat();
                setErrorMsg(errors.join(', '));
            } else {
                setErrorMsg('Network error or server down. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-primary-100 py-10">
            <div className="w-full max-w-lg mx-4">
                <form onSubmit={handleSubmit} className="glass p-10 rounded-2xl relative">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-full flex items-center justify-center mb-6">
                            <img src="/logo.png" alt="Ministry Logo" className="h-[75px] object-contain drop-shadow-sm" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h2>
                        <p className="text-sm text-gray-600 mt-2 font-medium">Join the GoK Career Portal</p>
                    </div>
                    
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-pulse">
                            {errorMsg}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">First Name</label>
                                <input type="text" name="first_name" placeholder="fname" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400" onChange={handleChange} required />
                            </div>
                            <div className="relative">
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">Last Name</label>
                                <input type="text" name="last_name" placeholder="lname" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400" onChange={handleChange} required />
                            </div>
                        </div>
                        
                        <div className="relative">
                            <label className="text-sm font-semibold text-gray-700 mb-1 block">Username</label>
                            <input type="text" name="username" placeholder="flname" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400" onChange={handleChange} required />
                        </div>
                        
                        <div className="relative">
                            <label className="text-sm font-semibold text-gray-700 mb-1 block">Email Address</label>
                            <input type="email" name="email" placeholder="fnamelname@gmail.com" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400" onChange={handleChange} required />
                        </div>
                        
                        <div className="relative">
                            <label className="text-sm font-semibold text-gray-700 mb-1 block flex justify-between">
                                <span>Password</span>
                                {formData.password && <span className={`text-xs font-bold ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>}
                            </label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} name="password" maxLength={16} placeholder="••••••••" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400 pr-10" onChange={handleChange} required />
                                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary-600 focus:outline-none" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    )}
                                </button>
                            </div>
                            
                            {/* Animated Password Strength Meter */}
                            <div className="h-1.5 w-full bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className={`h-full ${strength.color} transition-all duration-500 ease-out`} 
                                    style={{ width: strength.width }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Must be 8-16 chars, contain upper, lower, number & special char.</p>
                        </div>

                        <div className="relative">
                            <label className="text-sm font-semibold text-gray-700 mb-1 block">Confirm Password</label>
                            <div className="relative">
                                <input type={showConfirmPassword ? "text" : "password"} name="confirm_password" maxLength={16} placeholder="••••••••" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-400 focus:outline-none transition-all placeholder-gray-400 pr-10" onChange={handleChange} required />
                                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary-600 focus:outline-none" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? (
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

                        <button 
                            type="submit" 
                            disabled={loading || (formData.password && strength.score < 4)} 
                            className={`w-full bg-primary hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(227,188,117,0.39)] hover:shadow-[0_6px_20px_rgba(227,188,117,0.23)] hover:-translate-y-0.5 transition-all duration-200 mt-2 flex justify-center items-center gap-2 ${(loading || (formData.password && strength.score < 4)) ? 'opacity-70 cursor-not-allowed hover:-translate-y-0' : ''}`}
                        >
                            {loading && (
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {loading ? loadingMsg : 'Register Account'}
                        </button>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-4 border-t border-gray-200 pt-6">
                        {isGoogleEnabled ? (
                            <>
                                <p className="text-gray-500 text-sm font-bold">Or register with</p>
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
                                            setErrorMsg('Google authentication failed. Please try again.');
                                        }
                                    }}
                                    onError={() => {
                                        console.log('Login Failed');
                                        setErrorMsg('Google login was cancelled or failed.');
                                    }}
                                />
                            </>
                        ) : null}
                    </div>
                    
                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
