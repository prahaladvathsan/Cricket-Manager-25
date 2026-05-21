import React, { useState } from 'react';
import { X, Coffee, ExternalLink, Copy, Check } from 'lucide-react';

const UPI_ID = 'prahaladvatsan@okicici';
const KOFI_URL = 'https://ko-fi.com/prahaladvathsan';
const QR_SRC = '/assets/QR.jpeg';

const SupportModal = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(UPI_ID);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-black/85 backdrop-blur-md border border-border-primary w-full max-w-2xl rounded-xl shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-tertiary/50 rounded-t-xl sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <div className="w-2 h-6 bg-trophy-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
                        Support the developer
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <p className="text-sm text-text-secondary leading-relaxed">
                        Cricket Manager 25 is a solo project, free to play and ad-free.
                        If you've enjoyed it, a small contribution helps keep the servers running and
                        new features shipping. Pick whichever option works for you.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ko-fi card */}
                        <a
                            href={KOFI_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col items-center text-center bg-bg-tertiary border border-border-secondary hover:border-amber-500/50 hover:bg-amber-500/5 rounded-lg p-4 transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                <Coffee className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-semibold text-text-primary mb-1">Ko-fi</h3>
                            <p className="text-xs text-text-tertiary mb-3">
                                Worldwide · Cards & PayPal
                            </p>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 group-hover:text-amber-400">
                                Buy me a coffee
                                <ExternalLink className="w-3 h-3" />
                            </span>
                        </a>

                        {/* GPay / UPI card */}
                        <div className="flex flex-col items-center text-center bg-bg-tertiary border border-border-secondary rounded-lg p-4">
                            <div className="w-full bg-white rounded-md overflow-hidden mb-3">
                                <img
                                    src={QR_SRC}
                                    alt="GPay UPI QR code for prahaladvatsan@okicici"
                                    className="w-full h-auto block"
                                />
                            </div>
                            <h3 className="text-sm font-semibold text-text-primary mb-1">UPI / GPay</h3>
                            <p className="text-xs text-text-tertiary mb-3">
                                India · Scan with any UPI app
                            </p>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-cricket-primary hover:text-cricket-primary-hover transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3 h-3" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" />
                                        Copy UPI ID
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-text-tertiary text-center pt-1">
                        Thank you — every bit means a lot.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SupportModal;
