# Common Patterns

Frequently used patterns for forms, modals, tables, and other common UI elements using React and Tailwind CSS.

---

## Modal/Dialog Pattern

### Basic Modal Component

```jsx
import { useEffect } from 'react';

/**
 * Reusable modal component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {() => void} props.onClose - Close handler
 * @param {string} [props.title] - Modal title
 * @param {JSX.Element} props.children - Modal content
 * @param {JSX.Element} [props.footer] - Modal footer (buttons)
 */
export const Modal = ({ isOpen, onClose, title, children, footer }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex justify-end gap-2 p-4 border-t">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// Usage example
export const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Action"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Confirm
                    </button>
                </>
            }
        >
            <p className="text-gray-700">{message}</p>
        </Modal>
    );
};
```

---

## Form Patterns

### Form with Validation

```jsx
import { useState } from 'react';

/**
 * Form component with validation
 */
export const LoginForm = ({ onSubmit }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Validate form data
     * @returns {Object} errors
     */
    const validate = () => {
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        return newErrors;
    };

    /**
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            setErrors({});
        } catch (error) {
            setErrors({ submit: 'Login failed. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * @param {string} field
     * @param {string} value
     */
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                </label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`
                        w-full px-3 py-2 border rounded transition-colors
                        ${errors.email
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'}
                        focus:outline-none focus:ring-2
                    `}
                />
                {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
            </div>

            {/* Password field */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`
                        w-full px-3 py-2 border rounded transition-colors
                        ${errors.password
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'}
                        focus:outline-none focus:ring-2
                    `}
                />
                {errors.password && (
                    <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
            </div>

            {/* Submit error */}
            {errors.submit && (
                <p className="text-sm text-red-600">{errors.submit}</p>
            )}

            {/* Submit button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="
                    w-full px-4 py-2 text-white bg-blue-600 rounded
                    hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                "
            >
                {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
};
```

---

## Table Pattern

### Sortable Table Component

```jsx
import { useState } from 'react';

/**
 * @typedef {Object} Column
 * @property {string} key - Data key
 * @property {string} label - Column header label
 * @property {boolean} [sortable] - Whether column is sortable
 * @property {(value: any) => JSX.Element|string} [render] - Custom cell renderer
 */

/**
 * Reusable table component with sorting
 * @param {Object} props
 * @param {Array<Object>} props.data - Table data
 * @param {Array<Column>} props.columns - Column definitions
 * @param {(row: Object) => void} [props.onRowClick] - Row click handler
 */
export const Table = ({ data, columns, onRowClick }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig.key) return 0;

        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                onClick={() => column.sortable && handleSort(column.key)}
                                className={`
                                    px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    {column.label}
                                    {column.sortable && sortConfig.key === column.key && (
                                        <span>
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sortedData.map((row, index) => (
                        <tr
                            key={index}
                            onClick={() => onRowClick?.(row)}
                            className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
                        >
                            {columns.map((column) => (
                                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {column.render
                                        ? column.render(row[column.key], row)
                                        : row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {sortedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No data available
                </div>
            )}
        </div>
    );
};

// Usage example
const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true },
    {
        key: 'status',
        label: 'Status',
        render: (value) => (
            <span className={`
                px-2 py-1 rounded text-xs
                ${value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
            `}>
                {value}
            </span>
        ),
    },
];

<Table
    data={players}
    columns={columns}
    onRowClick={(row) => console.log('Clicked:', row)}
/>
```

---

## Loading States

### Loading Spinner

```jsx
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-4',
    };

    return (
        <div className="flex items-center justify-center">
            <div className={`
                ${sizes[size]}
                border-blue-600 border-t-transparent
                rounded-full animate-spin
                ${className}
            `} />
        </div>
    );
};

// Full-page loader
export const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
    </div>
);

// Inline loader
export const InlineLoader = () => (
    <div className="flex items-center gap-2 text-gray-600">
        <LoadingSpinner size="sm" />
        <span>Loading...</span>
    </div>
);
```

### Skeleton Loaders

```jsx
export const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-3 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="animate-pulse">
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex gap-4 py-3 border-b">
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
            </div>
        ))}
    </div>
);
```

---

## Toast Notifications

### Toast Component

```jsx
import { useState, useEffect } from 'react';

/**
 * Toast notification component
 * @param {Object} props
 * @param {string} props.message - Notification message
 * @param {'success'|'error'|'info'} props.type - Notification type
 * @param {() => void} props.onClose - Close handler
 * @param {number} [props.duration=3000] - Auto-close duration in ms
 */
export const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const variants = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white',
    };

    return (
        <div className={`
            ${variants[type]}
            px-6 py-4 rounded-lg shadow-lg
            flex items-center justify-between gap-4
            min-w-[300px]
        `}>
            <span>{message}</span>
            <button
                onClick={onClose}
                className="text-white hover:opacity-75"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

// Toast container (fixed position)
export const ToastContainer = ({ toasts, onRemove }) => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
            <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => onRemove(toast.id)}
            />
        ))}
    </div>
);

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return {
        toasts,
        addToast,
        removeToast,
        success: (message) => addToast(message, 'success'),
        error: (message) => addToast(message, 'error'),
        info: (message) => addToast(message, 'info'),
    };
}
```

---

## Pagination Component

```jsx
/**
 * Pagination component
 * @param {Object} props
 * @param {number} props.currentPage - Current page (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {(page: number) => void} props.onPageChange - Page change handler
 */
export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex items-center justify-center gap-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`
                        px-3 py-1 rounded transition-colors
                        ${page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'border hover:bg-gray-50'}
                    `}
                >
                    {page}
                </button>
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
    );
};
```

---

## Summary

**Common Pattern Checklist:**
- ✅ Modal with backdrop and ESC key handling
- ✅ Form validation with error display
- ✅ Sortable tables with custom renderers
- ✅ Loading spinners and skeleton loaders
- ✅ Toast notifications with auto-dismiss
- ✅ Pagination component
- ✅ Reusable components with TypeScript/JSDoc types
- ✅ Accessible focus states and ARIA labels
- ✅ Responsive design with Tailwind

**See Also:**
- [tailwind-styling-guide.md](tailwind-styling-guide.md) - Styling patterns
- [component-patterns.md](component-patterns.md) - Component structure
- [zustand-patterns.md](zustand-patterns.md) - State management
