import React, { useState, useRef, useEffect } from 'react';
import { Coffee, Bug, MessageSquare, Heart, ChevronDown } from 'lucide-react';
import BugReportModal from '../shared/BugReportModal';
import FeedbackModal from '../shared/FeedbackModal';
import SupportModal from '../shared/SupportModal';

const ContributeDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showBugReport, setShowBugReport] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleAction = (action) => {
        setIsOpen(false);
        if (action === 'bug') setShowBugReport(true);
        if (action === 'feedback') setShowFeedback(true);
        if (action === 'support') setShowSupport(true);
    };

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-200 border ${isOpen
                        ? 'bg-cricket-primary/20 text-cricket-primary border-cricket-primary/30'
                        : 'bg-black/80 text-text-secondary hover:bg-black/90 hover:text-text-primary border-white/10'
                        }`}
                    title="Contribute and Support"
                >
                    <Heart className={`w-3.5 h-3.5 ${isOpen ? 'fill-current' : ''}`} />
                    <span className="text-xs font-medium">Contribute</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-border-primary py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 border-b border-border-primary mb-1">
                            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Support & Help</p>
                        </div>

                        <button
                            onClick={() => handleAction('support')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left"
                        >
                            <Coffee className="w-4 h-4 text-amber-500" />
                            <span>Support the developer</span>
                        </button>

                        <button
                            onClick={() => handleAction('bug')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors text-left"
                        >
                            <Bug className="w-4 h-4 text-red-500" />
                            <span>Report a bug</span>
                        </button>

                        <button
                            onClick={() => handleAction('feedback')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-blue-500/10 hover:text-blue-500 transition-colors text-left"
                        >
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            <span>Provide feedback</span>
                        </button>
                    </div>
                )}
            </div>

            <BugReportModal isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
            <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
            <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />
        </>
    );
};

export default ContributeDropdown;
