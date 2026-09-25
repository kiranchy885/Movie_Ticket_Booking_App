import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Mail, Heart, CheckCircle2, AlertCircle, X, HelpCircle, ShieldCheck, FileText, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const Footer = () => {
    const [email, setEmail] = useState('');
    const [subscribedEmail, setSubscribedEmail] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');
    
    // Modal state: null | 'help' | 'faq' | 'privacy' | 'terms'
    const [activeModal, setActiveModal] = useState(null);

    // Handle newsletter subscription via backend API
    const handleSubscribe = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setErrorMessage('Please enter your email address.');
            setStatus('error');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setErrorMessage('Please enter a valid email format.');
            setStatus('error');
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch('http://localhost:5000/api/subscribe', { // Update with your backend URL if different
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: trimmedEmail }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubscribedEmail(trimmedEmail);
                setStatus('success');
                toast.success(`Welcome email successfully sent to ${trimmedEmail}! 📬`);
                setEmail('');
                setTimeout(() => {
                    setStatus('idle');
                }, 6000);
            } else {
                setErrorMessage(data.message || 'Something went wrong. Please try again.');
                setStatus('error');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            setErrorMessage('Server connection error. Please try again later.');
            setStatus('error');
        }
    };

    return (
        <footer className="bg-gray-950 text-gray-400 border-t border-gray-800/60 pt-16 pb-12 relative">
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
                    
                    {/* Brand & Info */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="bg-primary p-2 rounded-lg text-white">
                                <Film className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black tracking-wider text-white">
                                QUICK<span className="text-primary">SHOW</span>
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                            Your ultimate platform for seamless movie discovery, real-time seat reservation, and instant ticket booking. Experience cinema like never before.
                        </p>
                        <div className="pt-2 flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-primary" />
                                <span>support@quickshow.com</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                            Quick Links
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link to="/" className="hover:text-primary transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/movies" className="hover:text-primary transition-colors">
                                    Movies & Shows
                                </Link>
                            </li>
                            <li>
                                <Link to="/theaters" className="hover:text-primary transition-colors">
                                    Theaters
                                </Link>
                            </li>
                            <li>
                                <Link to="/my-booking" className="hover:text-primary transition-colors">
                                    My Bookings
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support & Legal */}
                    <div>
                        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                            Support & Legal
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <button 
                                    onClick={() => setActiveModal('help')}
                                    className="hover:text-primary transition-colors text-left cursor-pointer"
                                >
                                    Help Center
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setActiveModal('faq')}
                                    className="hover:text-primary transition-colors text-left cursor-pointer"
                                >
                                    FAQs
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setActiveModal('privacy')}
                                    className="hover:text-primary transition-colors text-left cursor-pointer"
                                >
                                    Privacy Policy
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setActiveModal('terms')}
                                    className="hover:text-primary transition-colors text-left cursor-pointer"
                                >
                                    Terms of Service
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                            Stay Updated
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">
                            Subscribe with your email to receive premier showtimes, movie trailers, and promo codes.
                        </p>
                        
                        <form onSubmit={handleSubscribe} className="space-y-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (status === 'error') setStatus('idle');
                                }}
                                placeholder="Enter your email address"
                                disabled={status === 'loading'}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                            />
                            
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 rounded-lg text-sm transition cursor-pointer shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 disabled:opacity-70"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Sending Mail...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Subscribe</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {status === 'success' && (
                            <div className="mt-2 flex items-start space-x-1.5 text-xs text-green-400 bg-green-950/40 border border-green-800/50 p-2.5 rounded-md">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400 mt-0.5" />
                                <span>Success! Thank-you mail dispatched to <strong className="text-white">{subscribedEmail}</strong>.</span>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mt-2 flex items-center space-x-1.5 text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2 rounded-md">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>

                </div>

                {/* Divider & Bottom Bar */}
                <div className="border-t border-gray-800/60 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
                    <p>© {new Date().getFullYear()} QuickShow. All rights reserved.</p>
                    <p className="flex items-center space-x-1 mt-4 sm:mt-0">
                        <span>Crafted with</span>
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 mx-0.5" />
                        <span>for movie lovers</span>
                    </p>
                </div>
            </div>

            {/* ================= MODALS ================= */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50">
                            <div className="flex items-center space-x-2 text-white font-bold text-lg">
                                {activeModal === 'help' && <HelpCircle className="w-5 h-5 text-primary" />}
                                {activeModal === 'faq' && <HelpCircle className="w-5 h-5 text-primary" />}
                                {activeModal === 'privacy' && <ShieldCheck className="w-5 h-5 text-primary" />}
                                {activeModal === 'terms' && <FileText className="w-5 h-5 text-primary" />}
                                <span>
                                    {activeModal === 'help' && 'Help Center'}
                                    {activeModal === 'faq' && 'Frequently Asked Questions'}
                                    {activeModal === 'privacy' && 'Privacy Policy'}
                                    {activeModal === 'terms' && 'Terms of Service'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Content */}
                        <div className="p-6 overflow-y-auto space-y-4 text-sm text-gray-300 leading-relaxed">
                            
                            {/* Help Center with Requested Contact Info */}
                            {activeModal === 'help' && (
                                <>
                                    <h4 className="text-white font-semibold text-base">Booking Consult & Support</h4>
                                    <p>For any inquiries regarding your ticket reservations, seat selection, or payment status, please reach out directly:</p>
                                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2.5">
                                        <p className="flex items-center space-x-2 text-white">
                                            <span>📧 Email:</span>
                                            <a href="mailto:deeptiparajuli4@gmail.com" className="text-primary hover:underline">deeptiparajuli4@gmail.com</a>
                                        </p>
                                        <p className="flex items-center space-x-2 text-white">
                                            <span>📞 Mobile No:</span>
                                            <a href="tel:9841368745" className="text-primary hover:underline font-semibold">9841368745</a>
                                            <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded ml-2">Faster contact for booking consult</span>
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* FAQs */}
                            {activeModal === 'faq' && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-white font-semibold">Q: How do I book movie tickets on QuickShow?</p>
                                        <p className="text-gray-400 text-xs mt-1">A: Simply browse our movies list, select your preferred movie and theater, choose your showtime and seats, and proceed to secure checkout.</p>
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">Q: Can I choose my own specific seats?</p>
                                        <p className="text-gray-400 text-xs mt-1">A: Yes! Our interactive seat layout lets you view available, booked, and premium VIP seats in real-time before confirming your reservation.</p>
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">Q: How do I access my digital ticket at the theater?</p>
                                        <p className="text-gray-400 text-xs mt-1">A: Once payment is complete, your digital QR code ticket appears instantly under the "My Bookings" page. Just present it at the cinema entrance.</p>
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">Q: How can I apply promo codes or discount coupons?</p>
                                        <p className="text-gray-400 text-xs mt-1">A: During the final checkout screen, you will find an input box to apply active discount vouchers to reduce your total amount.</p>
                                    </div>
                                </div>
                            )}

                            {activeModal === 'privacy' && (
                                <>
                                    <h4 className="text-white font-semibold text-base">Your Privacy Matters</h4>
                                    <p>At QuickShow, we respect your personal data and are committed to protecting your privacy rights. We collect information only to process ticket reservations and personalize your cinema experience.</p>
                                    <p>We never sell, rent, or trade your personal information to third-party marketing entities. All payment data is securely encrypted using industry-standard SSL protocols.</p>
                                </>
                            )}

                            {/* Terms of Service */}
                            {activeModal === 'terms' && (
                                <>
                                    <h4 className="text-white font-semibold text-base">Platform Guidelines & Agreements</h4>
                                    <p>By using QuickShow, you agree to comply with our user policies:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                                        <li>Users must provide valid contact details during checkout.</li>
                                        <li>Ticket resale or unauthorized commercial distribution is strictly prohibited.</li>
                                        <li>Cinemas reserve the right of admission and schedule adjustments due to unforeseen circumstances.</li>
                                    </ul>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/50 flex justify-end">
                            <button
                                onClick={() => setActiveModal(null)}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition cursor-pointer"
                            >
                                Close Window
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;