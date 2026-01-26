import React, { useState, useRef, useEffect } from 'react';
import { Users, Phone, ChevronDown, ExternalLink } from 'lucide-react';

const JoinCommunityDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const LINKS = {
        x: 'https://x.com/CricketManagerX',
        whatsapp: 'https://chat.whatsapp.com/JHhcsjrLwtiL3mlxJGlkAh',
        reddit: 'https://www.reddit.com/r/CricketManagerGame/'
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

    // Custom Reddit Logo
    const RedditLogo = (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-200 border ${isOpen
                    ? 'bg-cricket-primary/20 text-cricket-primary border-cricket-primary/30'
                    : 'bg-black/80 text-text-secondary hover:bg-black/90 hover:text-text-primary border-white/10'
                    }`}
                title="Join our Community"
            >
                <Users className={`w-3.5 h-3.5 ${isOpen ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Join us!</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-xl border border-border-primary py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-border-primary mb-1">
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Community Channels</p>
                    </div>

                    <ExternalLinkItem
                        href={LINKS.whatsapp}
                        icon={Phone}
                        label="WhatsApp Group"
                        colorClass="text-green-500"
                    />

                    <ExternalLinkItem
                        href={LINKS.x}
                        icon={XLogo}
                        label="Follow on X"
                        colorClass="text-text-primary"
                        isCustomIcon={true}
                    />

                    <ExternalLinkItem
                        href={LINKS.reddit}
                        icon={RedditLogo}
                        label="Join on Reddit"
                        colorClass="text-orange-500"
                        isCustomIcon={true}
                    />
                </div>
            )}
        </div>
    );
};

export default JoinCommunityDropdown;
