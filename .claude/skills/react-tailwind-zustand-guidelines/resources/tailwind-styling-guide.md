# Tailwind CSS Styling Guide

Tailwind CSS best practices for building consistent, responsive, and maintainable user interfaces.

---

## Core Principles

### Utility-First Approach

```jsx
// ✅ CORRECT - Utility classes for styling
export const Button = ({ children, variant = 'primary' }) => {
    const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]}`}>
            {children}
        </button>
    );
};

// ❌ AVOID - Inline styles
export const Button = ({ children }) => {
    return (
        <button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
            {children}
        </button>
    );
};
```

---

## Layout Patterns

### Container Pattern

```jsx
// Centered container with max-width
export const Container = ({ children }) => {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {children}
        </div>
    );
};

// Full-width section with background
export const Section = ({ children, className = '' }) => {
    return (
        <section className={`py-12 ${className}`}>
            <div className="container mx-auto px-4">
                {children}
            </div>
        </section>
    );
};
```

### Flex Layouts

```jsx
// Horizontal flex with gap
export const HorizontalStack = ({ children, gap = 4 }) => {
    return (
        <div className={`flex items-center gap-${gap}`}>
            {children}
        </div>
    );
};

// Vertical flex with gap
export const VerticalStack = ({ children, gap = 4 }) => {
    return (
        <div className={`flex flex-col gap-${gap}`}>
            {children}
        </div>
    );
};

// Space-between pattern
export const SpaceBetween = ({ left, right }) => {
    return (
        <div className="flex items-center justify-between">
            <div>{left}</div>
            <div>{right}</div>
        </div>
    );
};
```

### Grid Layouts

```jsx
// Responsive grid
export const Grid = ({ children, cols = { sm: 1, md: 2, lg: 3 } }) => {
    return (
        <div className={`grid grid-cols-${cols.sm} md:grid-cols-${cols.md} lg:grid-cols-${cols.lg} gap-6`}>
            {children}
        </div>
    );
};

// Auto-fit grid
export const AutoGrid = ({ children, minWidth = '250px' }) => {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
            {children}
        </div>
    );
};
```

---

## Component Composition

### Card Component

```jsx
export const Card = ({ children, className = '' }) => {
    return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
            {children}
        </div>
    );
};

// With subcomponents
Card.Header = ({ children }) => (
    <div className="mb-4 pb-4 border-b border-gray-200">
        {children}
    </div>
);

Card.Title = ({ children }) => (
    <h3 className="text-xl font-bold text-gray-900">{children}</h3>
);

Card.Body = ({ children }) => (
    <div className="text-gray-700">{children}</div>
);

Card.Footer = ({ children }) => (
    <div className="mt-4 pt-4 border-t border-gray-200">
        {children}
    </div>
);

// Usage
<Card>
    <Card.Header>
        <Card.Title>Player Stats</Card.Title>
    </Card.Header>
    <Card.Body>
        <p>Content here...</p>
    </Card.Body>
    <Card.Footer>
        <button>View Details</button>
    </Card.Footer>
</Card>
```

### Button Variants

```jsx
const buttonVariants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    outline: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
};

const buttonSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
};

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    ...props
}) => {
    const baseClasses = 'rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const classes = `
        ${baseClasses}
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `.trim().replace(/\s+/g, ' ');

    return (
        <button
            className={classes}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};
```

---

## Responsive Design

### Breakpoint Patterns

```jsx
// Mobile-first approach
export const ResponsiveCard = () => {
    return (
        <div className="
            w-full           /* Mobile: full width */
            sm:w-1/2         /* Small: half width */
            md:w-1/3         /* Medium: third width */
            lg:w-1/4         /* Large: quarter width */
            p-4              /* Padding on all sizes */
            sm:p-6           /* More padding on small+ */
        ">
            <h3 className="text-lg sm:text-xl md:text-2xl">
                Responsive Title
            </h3>
        </div>
    );
};

// Hide/show based on breakpoint
export const ResponsiveNav = () => {
    return (
        <>
            {/* Mobile menu button */}
            <button className="block md:hidden">
                Menu
            </button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex md:items-center md:gap-4">
                <a href="/">Home</a>
                <a href="/about">About</a>
            </nav>
        </>
    );
};
```

### Container Queries (if using @tailwindcss/container-queries)

```jsx
// Container-based responsive design
export const PlayerCard = () => {
    return (
        <div className="@container">
            <div className="
                flex flex-col          /* Mobile: stack */
                @md:flex-row           /* Container md: side-by-side */
                gap-4
            ">
                <img className="@md:w-24" src="..." alt="Player" />
                <div>
                    <h3 className="text-base @md:text-lg">Player Name</h3>
                </div>
            </div>
        </div>
    );
};
```

---

## Color and Theming

### Color Palette Usage

```jsx
// Semantic color classes
const colors = {
    text: {
        primary: 'text-gray-900',
        secondary: 'text-gray-600',
        muted: 'text-gray-400',
    },
    bg: {
        primary: 'bg-white',
        secondary: 'bg-gray-50',
        accent: 'bg-blue-50',
    },
    border: {
        default: 'border-gray-200',
        focus: 'border-blue-500',
    },
};

export const TextField = ({ label, error, ...props }) => {
    return (
        <div>
            <label className={colors.text.secondary}>
                {label}
            </label>
            <input
                className={`
                    ${colors.bg.primary}
                    ${error ? 'border-red-500' : colors.border.default}
                    ${colors.text.primary}
                    border rounded px-3 py-2 w-full
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                `}
                {...props}
            />
            {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
        </div>
    );
};
```

### Dark Mode Support

```jsx
// Using dark: variant
export const Card = ({ children }) => {
    return (
        <div className="
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            border border-gray-200 dark:border-gray-700
            rounded-lg p-6
        ">
            {children}
        </div>
    );
};

// Toggle dark mode (in your app)
export const ThemeToggle = () => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
            {darkMode ? '🌞' : '🌙'}
        </button>
    );
};
```

---

## Typography

### Text Hierarchy

```jsx
export const Typography = {
    H1: ({ children }) => (
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {children}
        </h1>
    ),

    H2: ({ children }) => (
        <h2 className="text-3xl font-semibold text-gray-900 mb-3">
            {children}
        </h2>
    ),

    H3: ({ children }) => (
        <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            {children}
        </h3>
    ),

    Body: ({ children }) => (
        <p className="text-base text-gray-700 leading-relaxed">
            {children}
        </p>
    ),

    Small: ({ children }) => (
        <span className="text-sm text-gray-600">
            {children}
        </span>
    ),

    Caption: ({ children }) => (
        <span className="text-xs text-gray-500">
            {children}
        </span>
    ),
};

// Usage
<div>
    <Typography.H1>Page Title</Typography.H1>
    <Typography.Body>
        This is body text with proper spacing and color.
    </Typography.Body>
    <Typography.Small>Additional info</Typography.Small>
</div>
```

### Text Utilities

```jsx
// Truncate text
export const TruncatedText = ({ children, lines = 1 }) => {
    const classes = lines === 1
        ? 'truncate'  // Single line
        : `line-clamp-${lines}`;  // Multiple lines

    return <p className={`${classes} text-gray-700`}>{children}</p>;
};

// Emphasized text
export const Emphasis = ({ children, variant = 'bold' }) => {
    const variants = {
        bold: 'font-bold',
        semibold: 'font-semibold',
        italic: 'italic',
        underline: 'underline',
    };

    return <span className={variants[variant]}>{children}</span>;
};
```

---

## Spacing System

### Consistent Spacing

```jsx
// Use spacing scale consistently
const spacing = {
    xs: 'gap-1',   // 0.25rem (4px)
    sm: 'gap-2',   // 0.5rem (8px)
    md: 'gap-4',   // 1rem (16px)
    lg: 'gap-6',   // 1.5rem (24px)
    xl: 'gap-8',   // 2rem (32px)
};

// Stack component with consistent spacing
export const Stack = ({ children, spacing = 'md', direction = 'vertical' }) => {
    const baseClass = direction === 'vertical' ? 'flex flex-col' : 'flex items-center';

    return (
        <div className={`${baseClass} ${spacing[spacing] || spacing.md}`}>
            {children}
        </div>
    );
};
```

---

## Form Components

### Form Field Pattern

```jsx
export const FormField = ({ label, error, helpText, children }) => {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            {children}

            {helpText && !error && (
                <p className="text-sm text-gray-500 mt-1">{helpText}</p>
            )}

            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
};

// Usage
<FormField
    label="Email Address"
    error={errors.email}
    helpText="We'll never share your email"
>
    <input
        type="email"
        className="w-full border border-gray-300 rounded px-3 py-2"
    />
</FormField>
```

### Input Components

```jsx
export const Input = ({ error, ...props }) => {
    const baseClasses = 'w-full px-3 py-2 border rounded transition-colors';
    const stateClasses = error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    return (
        <input
            className={`${baseClasses} ${stateClasses} focus:outline-none focus:ring-2`}
            {...props}
        />
    );
};

export const Textarea = ({ error, rows = 4, ...props }) => {
    const baseClasses = 'w-full px-3 py-2 border rounded transition-colors resize-none';
    const stateClasses = error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    return (
        <textarea
            rows={rows}
            className={`${baseClasses} ${stateClasses} focus:outline-none focus:ring-2`}
            {...props}
        />
    );
};

export const Select = ({ error, children, ...props }) => {
    const baseClasses = 'w-full px-3 py-2 border rounded transition-colors';
    const stateClasses = error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    return (
        <select
            className={`${baseClasses} ${stateClasses} focus:outline-none focus:ring-2`}
            {...props}
        >
            {children}
        </select>
    );
};
```

---

## Animation and Transitions

### Transition Utilities

```jsx
// Hover effects
export const HoverCard = ({ children }) => {
    return (
        <div className="
            bg-white p-6 rounded-lg
            transition-all duration-200
            hover:shadow-lg hover:scale-105
            cursor-pointer
        ">
            {children}
        </div>
    );
};

// Fade in/out
export const FadeTransition = ({ show, children }) => {
    return (
        <div className={`
            transition-opacity duration-300
            ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>
            {children}
        </div>
    );
};

// Slide in/out
export const SlidePanel = ({ isOpen, children }) => {
    return (
        <div className={`
            fixed right-0 top-0 h-full w-80 bg-white shadow-xl
            transform transition-transform duration-300
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
            {children}
        </div>
    );
};
```

---

## Accessibility

### Focus States

```jsx
// Always include focus styles
export const AccessibleButton = ({ children, ...props }) => {
    return (
        <button
            className="
                px-4 py-2 bg-blue-600 text-white rounded
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                hover:bg-blue-700
                active:bg-blue-800
                disabled:opacity-50 disabled:cursor-not-allowed
            "
            {...props}
        >
            {children}
        </button>
    );
};
```

### Screen Reader Only Content

```jsx
export const ScreenReaderOnly = ({ children }) => {
    return (
        <span className="sr-only">
            {children}
        </span>
    );
};

// Usage
<button>
    <ScreenReaderOnly>Close modal</ScreenReaderOnly>
    <svg>...</svg>
</button>
```

---

## Utility Functions

### Class Name Helper

```jsx
/**
 * Conditionally join class names
 * @param {...(string|boolean|undefined|null)} classes
 * @returns {string}
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

// Usage
<div className={cn(
    'base-class',
    isActive && 'active-class',
    isDisabled && 'disabled-class',
    customClass
)}>
    Content
</div>
```

---

## Summary

**Tailwind Best Practices:**
- ✅ Use utility-first approach
- ✅ Create reusable component variants
- ✅ Follow mobile-first responsive design
- ✅ Maintain consistent spacing scale
- ✅ Include hover/focus/active states
- ✅ Support dark mode when applicable
- ✅ Use semantic class groupings
- ✅ Leverage transition utilities
- ✅ Ensure accessibility with focus states
- ✅ Extract repeated patterns into components
- ❌ Avoid inline styles
- ❌ Don't create one-off utility classes

**See Also:**
- [component-patterns.md](component-patterns.md) - Component structure
- [javascript-jsdoc-standards.md](javascript-jsdoc-standards.md) - Component typing
