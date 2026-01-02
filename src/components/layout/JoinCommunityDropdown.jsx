import React, { useState, useRef, useEffect } from 'react';
import { Users, Phone, ChevronDown, ExternalLink } from 'lucide-react';

const JoinCommunityDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const LINKS = {
        x: 'https://x.com/CricketManagerX',
        whatsapp: 'https://chat.whatsapp.com/JHhcsjrLwtiL3mlxJGlkAh'
    };

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

    const ExternalLinkItem = ({ href, icon: Icon, label, colorClass, isCustomIcon }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors group"
            onClick={() => setIsOpen(false)}
        >
            <div className={`p-1.5 rounded-full bg-bg-tertiary group-hover:bg-bg-hover transition-colors ${colorClass}`}>
                {isCustomIcon ? Icon : <Icon className="w-4 h-4" />}
            </div>
            <span className="flex-1 font-medium">{label}</span>
            <ExternalLink className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
    );

    // Custom X (Twitter) Logo
    const XLogo = (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-200 border border-transparent ${isOpen
                    ? 'bg-cricket-primary/20 text-cricket-primary border-cricket-primary/30'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                title="Join our Community"
            >
                <Users className={`w-3.5 h-3.5 ${isOpen ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Join us!</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-bg-secondary rounded-lg shadow-xl border border-border-primary py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-border-primary mb-1">
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Community Channels</p>
                    </div>

                    <ExternalLinkItem
                        href={LINKS.x}
                        icon={XLogo}
                        label="Follow on X"
                        colorClass="text-text-primary"
                        isCustomIcon={true}
                    />

                    <ExternalLinkItem
                        href={LINKS.whatsapp}
                        icon={Phone}
                        label="WhatsApp Group"
                        colorClass="text-green-500"
                    />
                </div>
            )}
        </div>
    );
};

export default JoinCommunityDropdown;
