import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getDeviceInfo, formatDeviceInfo } from '../../utils/DeviceInfo';
import { FORM_CONFIG } from '../../utils/formConfig';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [feedback, setFeedback] = useState('');
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        setStatus('idle');

        try {
            const formData = new FormData();
            const deviceInfo = getDeviceInfo();

            formData.append('email', email || 'anonymous@cricketmanager.com');
            formData.append('message', feedback);
            formData.append('device_info', formatDeviceInfo(deviceInfo));
            formData.append('_subject', `Feedback: ${feedback.slice(0, 30)}...`);

            const response = await fetch(FORM_CONFIG.endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    resetForm();
                }, 2000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error("Network Error:", error);
            setStatus('error');
        } finally {
            setIsSending(false);
        }
    };

    const resetForm = () => {
        setFeedback('');
        setEmail('');
        setStatus('idle');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-black/85 backdrop-blur-md border border-border-primary w-full max-w-lg rounded-xl shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-tertiary/50 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <div className="w-2 h-6 bg-trophy-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
                        Give Feedback
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                {status === 'success' ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary">Thanks for your feedback!</h3>
                        <p className="text-text-secondary">We read every message to improve the game.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">

                        {/* Feedback Input */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">
                                Your thoughts <span className="text-trophy-gold">*</span>
                            </label>
                            <textarea
                                required
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full h-32 bg-bg-tertiary border border-border-secondary rounded-lg p-3 text-text-primary placeholder:text-gray-500 focus:ring-2 focus:ring-trophy-gold focus:border-transparent outline-none transition-all resize-none shadow-inner"
                                placeholder="Ideas, suggestions, or what you love..."
                            />
                        </div>

                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">
                                Your Email (Optional)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-bg-tertiary border border-border-secondary rounded-lg p-2.5 text-text-primary placeholder:text-gray-500 focus:ring-2 focus:ring-trophy-gold focus:border-transparent outline-none transition-all shadow-inner"
                                placeholder="If you'd like a response"
                            />
                        </div>

                        {/* Error Message */}
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                <AlertCircle className="w-4 h-4" />
                                <span>Failed to send. Please check your connection.</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSending}
                                className="flex-1 py-2.5 px-4 rounded-lg bg-bg-tertiary hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors font-medium border border-border-primary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSending}
                                className={`flex-1 py-2.5 px-4 rounded-lg bg-trophy-gold hover:bg-trophy-gold/90 text-white transition-all transform active:scale-[0.98] font-medium flex items-center justify-center gap-2 shadow-lg shadow-trophy-gold/20 ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {isSending ? 'Sending...' : 'Send Feedback'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
