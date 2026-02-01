/**
 * @file SortableTable.jsx
 * @description Reusable sortable table component with filtering and optional fixed-header scroll sync
 *
 * Common patterns extracted from Squad.jsx and PlayerBrowser.jsx
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Sort indicator component showing current sort direction
 */
const SortIndicator = ({ column, sortBy, sortDirection }) => {
  if (sortBy !== column) {
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  }
  return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
};

/**
 * SortableTable Component
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data items to display
 * @param {Array} props.columns - Column definitions with the following structure:
 *   {
 *     key: string,                    // Unique column identifier
 *     label: string | ReactNode,      // Column header label
 *     sortKey: string,                // Key used for sorting (can be nested like 'user.name')
 *     sortable: boolean,              // Whether column is sortable (default: true)
 *     render: (item, index) => ReactNode,  // Custom render function for cell content
 *     headerClassName: string,        // Additional classes for header cell
 *     cellClassName: string | (item, index) => string, // Additional classes for body cell
 *     align: 'left'|'center'|'right', // Text alignment (default: 'left')
 *     width: string,                  // Min width (e.g., '200px')
 *     sticky: boolean,                // Whether column should be sticky (default: false)
 *   }
 * @param {Object} props.defaultSort - Default sort configuration { column: string, direction: 'asc'|'desc' }
 * @param {Function} props.customSort - Optional custom sort function (item1, item2, column, direction) => number
 * @param {ReactNode} props.filterComponent - Optional filter UI component
 * @param {ReactNode} props.emptyState - Custom empty state component
 * @param {string} props.tableClassName - Additional classes for table element
 * @param {string} props.containerClassName - Additional classes for table container
 * @param {boolean} props.stripedRows - Whether to show alternating row colors (default: true)
 * @param {boolean} props.hoverRows - Whether to highlight rows on hover (default: true)
 * @param {Function} props.onRowClick - Optional row click handler (item, index) => void
 * @param {Function} props.getRowClassName - Function to generate custom row classes (item, index) => string
 * @param {boolean} props.enableScrollSync - Enable fixed header and dual scrollbar sync for wide tables (default: false)
 * @param {number} props.maxHeight - Optional max height for the table container (enables scroll sync automatically)
 */
const SortableTable = ({
  data = [],
  columns = [],
  defaultSort = { column: '', direction: 'asc' },
  customSort = null,
  filterComponent = null,
  emptyState = null,
  tableClassName = '',
  containerClassName = '',
  stripedRows = true,
  hoverRows = true,
  onRowClick = null,
  getRowClassName = null,
  enableScrollSync = false,
  maxHeight = null,
}) => {
  // Sort state
  const [sortBy, setSortBy] = useState(defaultSort.column);
  const [sortDirection, setSortDirection] = useState(defaultSort.direction);

  // Scroll sync refs and state (only used when enableScrollSync is true)
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const fixedHeaderRef = useRef(null);

  const [isScrollbarFixed, setIsScrollbarFixed] = useState(false);
  const [tablePosition, setTablePosition] = useState({ left: 0, width: 0 });

  // Handle scroll for fixed header positioning
  useEffect(() => {
    if (!enableScrollSync) return;

    const handleScroll = () => {
      if (tableContainerRef.current && tableScrollRef.current) {
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const tableRect = tableScrollRef.current.getBoundingClientRect();
        const shouldBeFixed = containerRect.top <= 0;

        setIsScrollbarFixed(shouldBeFixed);

        if (shouldBeFixed) {
          setTablePosition({
            left: tableRect.left,
            width: tableRect.width
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [enableScrollSync]);

  // Sync scroll between top scrollbar, table, and fixed header
  useEffect(() => {
    if (!enableScrollSync) return;

    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;

    if (!topScroll || !tableScroll) return;

    // Set the scroll width of top scroller to match table
    const updateScrollWidth = () => {
      const scrollWidth = tableScroll.scrollWidth;
      if (topScroll.firstChild) {
        topScroll.firstChild.style.width = `${scrollWidth}px`;
      }
    };

    updateScrollWidth();

    // Sync scroll positions
    const handleTopScroll = () => {
      if (tableScroll.scrollLeft !== topScroll.scrollLeft) {
        tableScroll.scrollLeft = topScroll.scrollLeft;
      }
      // Also sync fixed header
      if (isScrollbarFixed && fixedHeaderRef.current && fixedHeaderRef.current.scrollLeft !== topScroll.scrollLeft) {
        fixedHeaderRef.current.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleTableScroll = () => {
      if (topScroll.scrollLeft !== tableScroll.scrollLeft) {
        topScroll.scrollLeft = tableScroll.scrollLeft;
      }
      // Sync fixed header scroll
      if (isScrollbarFixed && fixedHeaderRef.current) {
        fixedHeaderRef.current.scrollLeft = tableScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    tableScroll.addEventListener('scroll', handleTableScroll);

    // Update scroll width when data or columns change
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableScroll.firstChild) {
      resizeObserver.observe(tableScroll.firstChild);
    }

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      tableScroll.removeEventListener('scroll', handleTableScroll);
      resizeObserver.disconnect();
    };
  }, [data, columns, enableScrollSync, isScrollbarFixed]);

  // Handle sort column click
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      // Use column-specific default direction if provided, otherwise 'asc'
      const columnDef = columns.find(col => col.sortKey === column);
      setSortDirection(columnDef?.defaultDirection || 'asc');
    }
  };

  // Get nested value from object using dot notation (e.g., 'user.name')
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      // Use custom sort function if provided
      if (customSort) {
        return customSort(a, b, sortBy, sortDirection);
      }

      // Default sort logic
      const aVal = getNestedValue(a, sortBy);
      const bVal = getNestedValue(b, sortBy);

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // String comparison
      if (typeof aVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Numeric comparison
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortBy, sortDirection, customSort]);

  // Generate header cell classes
  const getHeaderClassName = (column) => {
    const baseClasses = 'px-3 py-2 font-semibold text-text-primary';
    const sortableClasses = column.sortable !== false ? 'cursor-pointer hover:bg-bg-tertiary transition-colors' : '';
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    }[column.align || 'left'];
    const stickyClasses = column.sticky ? 'sticky left-0 bg-bg-secondary z-40' : '';
    const widthStyle = column.width ? `min-w-[${column.width}]` : '';

    return `${baseClasses} ${sortableClasses} ${alignClasses} ${stickyClasses} ${widthStyle} ${column.headerClassName || ''}`.trim();
  };

  // Generate body cell classes
  const getCellClassName = (column, item, index) => {
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    }[column.align || 'left'];
    const stickyClasses = column.sticky ? 'sticky left-0 bg-inherit z-20' : '';

    const customClasses = typeof column.cellClassName === 'function'
      ? column.cellClassName(item, index)
      : column.cellClassName || '';

    return `px-3 py-2 ${alignClasses} ${stickyClasses} ${customClasses}`.trim();
  };

  // Generate row classes
  const getRowClasses = (item, index) => {
    const baseClasses = 'border-b border-border-primary';
    const stripedClasses = stripedRows ? (index % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary') : '';
    const hoverClasses = hoverRows ? 'hover:bg-bg-tertiary transition-colors' : '';
    const clickableClasses = onRowClick ? 'cursor-pointer' : '';
    const customClasses = getRowClassName ? getRowClassName(item, index) : '';

    return `${baseClasses} ${stripedClasses} ${hoverClasses} ${clickableClasses} ${customClasses}`.trim();
  };

  // Default empty state
  const defaultEmptyState = (
    <tr>
      <td colSpan={columns.length} className="px-3 py-12 text-center">
        <p className="text-text-primary font-semibold">No data available</p>
        <p className="text-text-secondary text-sm mt-1">
          Try adjusting your filters
        </p>
      </td>
    </tr>
  );

  // Render header row (shared between normal and fixed header)
  const renderHeaderRow = () => (
    <tr className="border-b border-border-primary bg-bg-secondary">
      {columns.map((column) => (
        <th
          key={column.key}
          onClick={() => column.sortable !== false ? handleSort(column.sortKey) : null}
          className={getHeaderClassName(column)}
        >
          <div className={`flex items-center gap-1 ${
            column.align === 'center' ? 'justify-center' :
            column.align === 'right' ? 'justify-end' : ''
          }`}>
            {column.label}
            {column.sortable !== false && (
              <SortIndicator
                column={column.sortKey}
                sortBy={sortBy}
                sortDirection={sortDirection}
              />
            )}
          </div>
        </th>
      ))}
    </tr>
  );

  // CSS for hiding scrollbar on fixed header
  const hideScrollbarStyle = `
    .sortable-table-hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `;

  return (
    <div className="space-y-2">
      {/* Filter component */}
      {filterComponent && (
        <div className="card p-2">
          {filterComponent}
        </div>
      )}

      {/* Top Scrollbar (when scroll sync is enabled) */}
      {enableScrollSync && (
        <>
          <div
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden"
            style={{
              height: '12px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#4B5563 #1F2937',
              ...(isScrollbarFixed && {
                position: 'fixed',
                top: '0',
                left: `${tablePosition.left}px`,
                width: `${tablePosition.width}px`,
                zIndex: 100,
                backgroundColor: '#1a1f2e',
                borderBottom: '1px solid #2a3142',
              })
            }}
          >
            <div style={{ height: '1px' }}></div>
          </div>

          {/* Spacer when scrollbar is fixed */}
          {isScrollbarFixed && <div style={{ height: '12px' }}></div>}
        </>
      )}

      {/* Fixed Header (when scroll sync is enabled and scrolled) */}
      {enableScrollSync && isScrollbarFixed && (
        <div
          ref={fixedHeaderRef}
          style={{
            position: 'fixed',
            top: '12px',
            left: `${tablePosition.left}px`,
            width: `${tablePosition.width}px`,
            zIndex: 85,
            overflowX: 'auto',
            overflowY: 'hidden',
            backgroundColor: '#1a1f2e',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="sortable-table-hide-scrollbar"
        >
          <style>{hideScrollbarStyle}</style>
          <table className={`text-sm ${tableClassName}`} style={{ minWidth: 'max-content', width: '100%' }}>
            <thead style={{ backgroundColor: '#1a1f2e' }}>
              {renderHeaderRow()}
            </thead>
          </table>
        </div>
      )}

      {/* Table container */}
      <div
        ref={tableContainerRef}
        className={enableScrollSync ? 'card' : ''}
        style={enableScrollSync ? { overflow: 'visible' } : undefined}
      >
        <div
          ref={enableScrollSync ? tableScrollRef : undefined}
          className={`relative ${enableScrollSync ? '' : 'overflow-x-auto rounded-lg border border-border-primary'} ${containerClassName}`}
          style={enableScrollSync ? {
            overflowX: 'auto',
            overflowY: 'visible',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4B5563 #1F2937',
            ...(maxHeight ? { maxHeight, overflowY: 'auto' } : {})
          } : (maxHeight ? { maxHeight, overflowY: 'auto' } : {})}
        >
          {/* Spacer for fixed header height when scrolled */}
          {enableScrollSync && isScrollbarFixed && <div style={{ height: '41px' }}></div>}

          <table
            className={`relative w-full text-sm bg-bg-primary ${tableClassName}`}
            style={enableScrollSync ? { minWidth: 'max-content', width: '100%' } : undefined}
          >
            {/* Table header */}
            <thead
              style={enableScrollSync ? {
                position: 'sticky',
                top: '0',
                zIndex: 90,
                backgroundColor: '#1a1f2e',
                ...(isScrollbarFixed && { visibility: 'hidden' })
              } : undefined}
            >
              {renderHeaderRow()}
            </thead>

            {/* Table body */}
            <tbody>
              {sortedData.length === 0 ? (
                emptyState || defaultEmptyState
              ) : (
                sortedData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={getRowClasses(item, index)}
                    onClick={() => onRowClick?.(item, index)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={getCellClassName(column, item, index)}
                      >
                        {column.render(item, index)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SortableTable;
