import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * HelpIcon - A reusable component that displays a HelpCircle icon and shows content on hover.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to display inside the tooltip.
 * @param {string} [props.className] - Additional classes for the icon container.
 * @param {string} [props.tooltipClassName] - Additional classes for the tooltip container.
 * @param {string} [props.width='w-4'] - Width class for the icon.
 * @param {string} [props.height='h-4'] - Height class for the icon.
 * @param {string} [props.placement='bottom'] - Tooltip placement ('top' | 'bottom').
 */
const HelpIcon = ({
    children,
    className = '',
    tooltipClassName = '',
    width = 'w-4',
    height = 'h-4',
    placement = 'bottom',
    align = 'center' // 'left', 'center', 'right'
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Dynamic classes based on alignment
    const getAlignmentClasses = () => {
        if (align === 'left') return 'left-0';
        if (align === 'right') return 'right-0';
        return 'left-1/2 -translate-x-1/2';
    };

    const getArrowAlignmentClasses = () => {
        if (align === 'left') return 'left-2'; // Offset slightly from edge
        if (align === 'right') return 'right-2';
        return 'left-1/2 -translate-x-1/2';
    };

    return (
        <div
            className={`relative inline-flex items-center justify-center ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <HelpCircle className={`${width} ${height} text-text-secondary hover:text-cricket-accent transition-colors cursor-help`} />

            {isHovered && (
                <div
                    className={`
            absolute z-50 p-2 
            bg-bg-secondary border border-border-primary rounded shadow-xl 
            min-w-[200px] max-w-[300px]
            ${getAlignmentClasses()}
            ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            ${tooltipClassName}
          `}
                >
                    {/* Arrow */}
                    <div
                        className={`
              absolute w-2 h-2 bg-bg-secondary border-l border-t border-border-primary rotate-45
              ${getArrowAlignmentClasses()}
              ${placement === 'top' ? 'bottom-[-5px] border-l-0 border-t-0 border-r border-b' : 'top-[-5px]'}
            `}
                    />

                    <div className="relative z-10 text-xs text-text-secondary">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpIcon;
