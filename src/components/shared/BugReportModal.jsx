import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle, Info, Terminal } from 'lucide-react';
import { getDeviceInfo, formatDeviceInfo } from '../../utils/DeviceInfo';
import { FORM_CONFIG } from '../../utils/formConfig';

const BugReportModal = ({ isOpen, onClose }) => {
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [includeConsoleLogs, setIncludeConsoleLogs] = useState(true);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const consoleLogsRef = useRef([]);

    // Capture console logs
    useEffect(() => {
        if (!isOpen) return;

        // Get existing console logs from window if any
        if (window.__CONSOLE_LOGS__) {
            consoleLogsRef.current = [...window.__CONSOLE_LOGS__];
            setConsoleLogs([...window.__CONSOLE_LOGS__]);
        }

        // Intercept console methods
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        const captureLog = (type, args) => {
            const timestamp = new Date().toISOString();
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');

            const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
            consoleLogsRef.current.push(logEntry);

            // Keep only last 100 logs
            if (consoleLogsRef.current.length > 100) {
                consoleLogsRef.current.shift();
            }

            // Store globally for persistence
            if (!window.__CONSOLE_LOGS__) {
                window.__CONSOLE_LOGS__ = [];
            }
            window.__CONSOLE_LOGS__.push(logEntry);
            if (window.__CONSOLE_LOGS__.length > 100) {
                window.__CONSOLE_LOGS__.shift();
            }

            setConsoleLogs([...consoleLogsRef.current]);
        };

        console.log = (...args) => {
            captureLog('log', args);
            originalConsole.log(...args);
        };

        console.error = (...args) => {
            captureLog('error', args);
            originalConsole.error(...args);
        };

        console.warn = (...args) => {
            captureLog('warn', args);
            originalConsole.warn(...args);
        };

        console.info = (...args) => {
            captureLog('info', args);
            originalConsole.info(...args);
        };

        return () => {
            // Restore original console methods
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.info = originalConsole.info;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        setStatus('idle');

        try {
            const formData = new FormData();
            const deviceInfo = getDeviceInfo();

            // Build detailed bug report
            let bugReport = `BUG DESCRIPTION:\n${description}\n\n`;
            bugReport += `DEVICE INFO:\n${formatDeviceInfo(deviceInfo)}\n\n`;
            bugReport += `URL: ${window.location.href}\n`;
            bugReport += `TIMESTAMP: ${new Date().toISOString()}\n\n`;

            // Add console logs if user opted in
            if (includeConsoleLogs && consoleLogs.length > 0) {
                bugReport += `CONSOLE LOGS (Last ${consoleLogs.length} entries):\n`;
                bugReport += '---\n';
                bugReport += consoleLogs.join('\n');
                bugReport += '\n---\n';
            }

            // Add Web3Forms Access Key (required)
            formData.append('access_key', FORM_CONFIG.accessKey);

            // Add form fields
            formData.append('from_name', email || 'Anonymous User');
            formData.append('email', email || 'anonymous@cricketmanager.com');
            formData.append('subject', `Bug Report: ${description.slice(0, 50)}`);
            formData.append('message', bugReport);

            // Send to Web3Forms
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
        setStatus('idle');
        setIncludeConsoleLogs(true);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-black/85 backdrop-blur-md border border-border-primary w-full max-w-2xl rounded-xl shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-tertiary/50 rounded-t-xl sticky top-0 z-10">
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
                        <p className="text-text-secondary">Thanks for helping us improve Cricket Manager 25.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                        {/* Instructions */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex gap-3">
                                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-2 text-sm text-text-secondary">
                                    <p className="font-medium text-text-primary">How to write a good bug report:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-1">
                                        <li><span className="font-medium text-text-primary">What happened:</span> Describe the unexpected behavior</li>
                                        <li><span className="font-medium text-text-primary">Steps to reproduce:</span> List the exact steps (e.g., "1. Clicked on Squad, 2. Selected player, 3. Game crashed")</li>
                                        <li><span className="font-medium text-text-primary">Expected behavior:</span> What should have happened instead?</li>
                                        <li><span className="font-medium text-text-primary">Additional context:</span> When did it start? Does it happen every time?</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Description Input */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">
                                Bug Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full h-40 bg-bg-tertiary border border-border-secondary rounded-lg p-3 text-text-primary placeholder:text-gray-500 focus:ring-2 focus:ring-cricket-primary focus:border-transparent outline-none transition-all resize-none shadow-inner"
                                placeholder="Example:&#10;&#10;Steps to reproduce:&#10;1. Went to Squad page&#10;2. Clicked on a player&#10;3. Selected 'Set Captain'&#10;4. Game froze&#10;&#10;Expected: Player should be set as captain&#10;Actual: Game became unresponsive&#10;&#10;This happens every time I try to set a captain."
                            />
                            <p className="text-xs text-text-tertiary mt-1.5 ml-1">
                                Be as detailed as possible - it helps us fix the issue faster!
                            </p>
                        </div>

                        {/* Console Logs Toggle */}
                        <div className="bg-bg-tertiary border border-border-secondary rounded-lg p-3">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeConsoleLogs}
                                    onChange={(e) => setIncludeConsoleLogs(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 text-cricket-primary bg-bg-primary border-border-secondary rounded focus:ring-cricket-primary focus:ring-2"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-text-secondary" />
                                        <span className="text-sm font-medium text-text-primary group-hover:text-cricket-primary transition-colors">
                                            Include Console Logs (Recommended)
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-1">
                                        Console logs help developers identify the root cause. We've captured {consoleLogs.length} log entries.
                                        {consoleLogs.length === 0 && " (No logs captured yet - try reproducing the bug first)"}
                                    </p>
                                </div>
                            </label>
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
                                placeholder="your.email@example.com (if you want us to follow up)"
                            />
                        </div>

                        {/* Error Message */}
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                <AlertCircle className="w-4 h-4" />
                                <span>Failed to send report. Please check your connection and try again.</span>
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
                                disabled={isSending || !description.trim()}
                                className={`flex-1 py-2.5 px-4 rounded-lg bg-cricket-primary hover:bg-cricket-primary-hover text-white transition-all transform active:scale-[0.98] font-medium flex items-center justify-center gap-2 shadow-lg shadow-cricket-primary/20 ${isSending || !description.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {isSending ? 'Sending...' : 'Send Bug Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BugReportModal;
