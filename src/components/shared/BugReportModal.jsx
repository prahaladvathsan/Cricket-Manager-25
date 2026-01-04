import React, { useState, useRef } from 'react';
import { X, Camera, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { getDeviceInfo, formatDeviceInfo } from '../../utils/DeviceInfo';
import { FORM_CONFIG } from '../../utils/formConfig';

const BugReportModal = ({ isOpen, onClose }) => {
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [screenshotBlob, setScreenshotBlob] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const modalRef = useRef(null);

    if (!isOpen) return null;

    const handleCapture = async () => {
        setIsCapturing(true);

        // Hide modal for capture
        const modalElement = modalRef.current;
        if (modalElement) modalElement.style.opacity = '0';

        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            // Lazy load html2canvas only when needed (saves ~100KB from main bundle)
            const { default: html2canvas } = await import('html2canvas');

            const canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0f172a',
            });

            const dataUrl = canvas.toDataURL('image/png');
            setScreenshotPreview(dataUrl);

            // Convert to Blob for upload
            canvas.toBlob((blob) => {
                setScreenshotBlob(blob);
            }, 'image/png');

        } catch (error) {
            console.error('Screenshot capture failed:', error);
        } finally {
            if (modalElement) modalElement.style.opacity = '1';
            setIsCapturing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        setStatus('idle');

        try {
            const formData = new FormData();
            const deviceInfo = getDeviceInfo();

            // 1. Add Web3Forms Access Key (required)
            formData.append('access_key', FORM_CONFIG.accessKey);

            // 2. Add Text Fields
            formData.append('from_name', email || 'Anonymous User');
            formData.append('email', email || 'anonymous@cricketmanager.com');
            formData.append('subject', `Bug Report: ${description.slice(0, 50)}`);
            formData.append('message', description);
            formData.append('device_info', formatDeviceInfo(deviceInfo));

            // 3. Add Screenshot (if captured) - Web3Forms supports file uploads
            if (screenshotBlob) {
                formData.append('attachment', screenshotBlob, 'screenshot.png');
            }

            // 4. Send to Web3Forms
            const response = await fetch(FORM_CONFIG.endpoint, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    resetForm();
                }, 2000);
            } else {
                console.error("Web3Forms Error:", result);
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
        setDescription('');
        setEmail('');
        setScreenshotBlob(null);
        setScreenshotPreview(null);
        setStatus('idle');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-bg-secondary border border-border-primary w-full max-w-lg rounded-xl shadow-2xl transition-all"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-tertiary/50 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <div className="w-2 h-6 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        Report a Bug
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
                        <h3 className="text-xl font-bold text-text-primary">Report Sent!</h3>
                        <p className="text-text-secondary">Thanks for helping us squash bugs.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">

                        {/* Description Input */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">
                                What happened? <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full h-32 bg-bg-tertiary border border-border-secondary rounded-lg p-3 text-text-primary placeholder:text-gray-500 focus:ring-2 focus:ring-cricket-primary focus:border-transparent outline-none transition-all resize-none shadow-inner"
                                placeholder="Describe the bug steps to reproduce..."
                            />
                        </div>

                        {/* Screenshot Area */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">
                                Screenshot (Recommended)
                            </label>

                            {!screenshotPreview ? (
                                <button
                                    type="button"
                                    onClick={handleCapture}
                                    disabled={isCapturing}
                                    className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border-secondary rounded-lg hover:border-cricket-primary hover:bg-cricket-primary/5 transition-all text-text-secondary hover:text-cricket-primary group"
                                >
                                    {isCapturing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-sm">Capturing screen...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                                            <span className="text-sm font-medium">Capture Current Screen</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="relative rounded-lg overflow-hidden border border-border-primary group shadow-md">
                                    <img src={screenshotPreview} alt="Bug screenshot" className="w-full h-48 object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => { setScreenshotBlob(null); setScreenshotPreview(null); }}
                                            className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transform scale-90 group-hover:scale-100 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                            Remove Screenshot
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                className="w-full bg-bg-tertiary border border-border-secondary rounded-lg p-2.5 text-text-primary placeholder:text-gray-500 focus:ring-2 focus:ring-cricket-primary focus:border-transparent outline-none transition-all shadow-inner"
                                placeholder="Where can we contact you?"
                            />
                        </div>

                        {/* Error Message */}
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                <AlertCircle className="w-4 h-4" />
                                <span>Failed to send report. Please check your connection.</span>
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
                                className={`flex-1 py-2.5 px-4 rounded-lg bg-cricket-primary hover:bg-cricket-primary-hover text-white transition-all transform active:scale-[0.98] font-medium flex items-center justify-center gap-2 shadow-lg shadow-cricket-primary/20 ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {isSending ? 'Sending...' : 'Send Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BugReportModal;
