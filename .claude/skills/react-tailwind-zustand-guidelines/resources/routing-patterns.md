# Routing Patterns

Generic routing best practices for React applications with lazy loading, route organization, and navigation patterns.

---

## Route Organization

### File Structure

```
src/
├── App.jsx                  # Main app with router setup
├── routes/
│   ├── index.js            # Route definitions
│   ├── PrivateRoute.jsx    # Auth wrapper
│   └── NotFound.jsx        # 404 page
├── pages/
│   ├── Home/
│   │   ├── HomePage.jsx
│   │   └── index.js
│   ├── Dashboard/
│   │   ├── DashboardPage.jsx
│   │   └── index.js
│   ├── Players/
│   │   ├── PlayersListPage.jsx
│   │   ├── PlayerDetailPage.jsx
│   │   └── index.js
│   └── Match/
│       ├── MatchPage.jsx
│       └── index.js
```

**Principles:**
- Pages in dedicated directories
- One page per file
- Index.js for clean imports
- Group related pages by feature

---

## Lazy Loading Routes

### React.lazy Pattern

```jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load pages
const HomePage = lazy(() => import('./pages/Home/HomePage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const PlayersListPage = lazy(() => import('./pages/Players/PlayersListPage'));
const PlayerDetailPage = lazy(() => import('./pages/Players/PlayerDetailPage'));

// Loading fallback
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
    </div>
);

export const App = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/players" element={<PlayersListPage />} />
                    <Route path="/players/:id" element={<PlayerDetailPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};
```

**Benefits:**
- Smaller initial bundle
- Faster first page load
- Code splitting per route
- Better performance

---

## Navigation Patterns

### Link Component Usage

```jsx
import { Link } from 'react-router-dom';

// Basic navigation
export const Navigation = () => {
    return (
        <nav>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/players">Players</Link>
        </nav>
    );
};

// Active link styling
export const NavLink = ({ to, children }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`
                px-4 py-2 rounded transition-colors
                ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'}
            `}
        >
            {children}
        </Link>
    );
};
```

### Programmatic Navigation

```jsx
import { useNavigate } from 'react-router-dom';

export const LoginForm = () => {
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        // ... login logic
        navigate('/dashboard');  // Redirect after login
    };

    const handleCancel = () => {
        navigate(-1);  // Go back
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* form fields */}
            <button type="submit">Login</button>
            <button type="button" onClick={handleCancel}>Cancel</button>
        </form>
    );
};
```

---

## Route Parameters

### Reading URL Parameters

```jsx
import { useParams } from 'react-router-dom';

export const PlayerDetailPage = () => {
    const { id } = useParams();  // Get :id from /players/:id

    // Fetch player data using id
    const player = usePlayerStore((state) =>
        state.players.find(p => p.id === parseInt(id))
    );

    if (!player) {
        return <div>Player not found</div>;
    }

    return (
        <div>
            <h1>{player.name}</h1>
            {/* player details */}
        </div>
    );
};
```

### Query Parameters

```jsx
import { useSearchParams } from 'react-router-dom';

export const PlayersListPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const page = parseInt(searchParams.get('page') || '1');
    const sort = searchParams.get('sort') || 'name';

    const handlePageChange = (newPage) => {
        setSearchParams({ page: newPage, sort });
    };

    const handleSortChange = (newSort) => {
        setSearchParams({ page: 1, sort: newSort });
    };

    return (
        <div>
            {/* List with pagination */}
            <button onClick={() => handlePageChange(page + 1)}>
                Next Page
            </button>
        </div>
    );
};
```

---

## Protected Routes

### Authentication Wrapper

```jsx
import { Navigate } from 'react-router-dom';

/**
 * Wrapper for protected routes
 * @param {Object} props
 * @param {JSX.Element} props.children - Child components
 * @returns {JSX.Element}
 */
export const PrivateRoute = ({ children }) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Usage
<Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
        path="/dashboard"
        element={
            <PrivateRoute>
                <DashboardPage />
            </PrivateRoute>
        }
    />
</Routes>
```

### Role-Based Access

```jsx
/**
 * Wrapper for role-specific routes
 * @param {Object} props
 * @param {JSX.Element} props.children
 * @param {Array<string>} props.allowedRoles
 */
export const RoleRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, role } = useAuthStore((state) => ({
        isAuthenticated: state.isAuthenticated,
        role: state.user?.role,
    }));

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

// Usage
<Route
    path="/admin"
    element={
        <RoleRoute allowedRoles={['admin', 'superuser']}>
            <AdminPage />
        </RoleRoute>
    }
/>
```

---

## Layout Routes

### Nested Layouts

```jsx
import { Outlet } from 'react-router-dom';

// Main layout with header/footer
export const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <Outlet />  {/* Child routes render here */}
            </main>
            <Footer />
        </div>
    );
};

// Dashboard layout with sidebar
export const DashboardLayout = () => {
    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 p-6">
                <Outlet />
            </div>
        </div>
    );
};

// Route configuration
<Routes>
    <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="settings" element={<SettingsPage />} />
        </Route>
    </Route>
</Routes>
```

---

## 404 and Error Handling

### Not Found Page

```jsx
export const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900">404</h1>
                <p className="text-xl text-gray-600 mt-4">Page not found</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded"
                >
                    Go Home
                </button>
            </div>
        </div>
    );
};

// Add as catch-all route
<Routes>
    {/* ... other routes ... */}
    <Route path="*" element={<NotFoundPage />} />
</Routes>
```

---

## Breadcrumbs

### Breadcrumb Component

```jsx
import { Link, useLocation } from 'react-router-dom';

export const Breadcrumbs = () => {
    const location = useLocation();

    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-blue-600 hover:underline">
                Home
            </Link>

            {pathnames.map((name, index) => {
                const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;

                return (
                    <div key={routeTo} className="flex items-center space-x-2">
                        <span className="text-gray-400">/</span>
                        {isLast ? (
                            <span className="text-gray-700 capitalize">{name}</span>
                        ) : (
                            <Link
                                to={routeTo}
                                className="text-blue-600 hover:underline capitalize"
                            >
                                {name}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};
```

---

## Navigation State

### Passing State via Navigation

```jsx
// Navigate with state
const navigate = useNavigate();

navigate('/player/123', {
    state: { from: 'search-results', query: 'batsman' }
});

// Access state in destination
import { useLocation } from 'react-router-dom';

export const PlayerDetailPage = () => {
    const location = useLocation();
    const { from, query } = location.state || {};

    return (
        <div>
            {from === 'search-results' && (
                <p>From search: {query}</p>
            )}
        </div>
    );
};
```

---

## Best Practices

### Route Configuration

```jsx
// Centralized route definitions
export const routes = {
    home: '/',
    dashboard: '/dashboard',
    players: {
        list: '/players',
        detail: (id) => `/players/${id}`,
        edit: (id) => `/players/${id}/edit`,
    },
    match: {
        detail: (id) => `/match/${id}`,
    },
};

// Usage
<Link to={routes.players.detail(123)}>View Player</Link>

navigate(routes.dashboard);
```

### Loading States

```jsx
// Route-level loading
export const RouteLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
);

// Use in Suspense fallback
<Suspense fallback={<RouteLoader />}>
    <Routes>
        {/* routes */}
    </Routes>
</Suspense>
```

---

## Summary

**Routing Best Practices:**
- ✅ Use lazy loading for code splitting
- ✅ Organize pages by feature
- ✅ Wrap protected routes with auth checks
- ✅ Use layouts for shared UI structure
- ✅ Handle 404 with catch-all route
- ✅ Centralize route definitions
- ✅ Include loading states
- ✅ Use descriptive route paths
- ✅ Keep navigation logic in components
- ❌ Avoid deep nesting (max 2-3 levels)
- ❌ Don't mix routing logic with business logic

**See Also:**
- [component-patterns.md](component-patterns.md) - Page component structure
- [file-organization.md](file-organization.md) - Project structure
