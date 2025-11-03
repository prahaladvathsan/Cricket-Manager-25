# JavaScript & JSDoc Standards

JavaScript best practices with JSDoc type annotations for type safety and maintainability in React frontend code.

---

## JSDoc Type Annotations

### Why Use JSDoc?

JSDoc provides type safety and IDE intellisense without TypeScript compilation:

```javascript
/**
 * Gets a user by ID
 * @param {number} id - The user ID
 * @returns {Promise<User>} The user object
 */
async function getUser(id) {
    return apiClient.get(`/users/${id}`);
}
```

**Benefits:**
- Type checking in VS Code and modern IDEs
- Better autocomplete/intellisense
- Documentation and types in one place
- No TypeScript compilation step

---

## Explicit Type Definitions

### Function Parameters and Returns

```javascript
// ✅ CORRECT - Explicit JSDoc types
/**
 * Calculates the total price of items
 * @param {Array<{price: number}>} items - Array of items with prices
 * @returns {number} The total price
 */
function calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
}

/**
 * Fetches user data from API
 * @param {number} id - User ID
 * @returns {Promise<{id: number, name: string, email: string}>}
 */
async function fetchUser(id) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}
```

### Component Props

```javascript
/**
 * User profile component
 * @param {Object} props - Component props
 * @param {number} props.userId - The user ID to display
 * @param {() => void} [props.onComplete] - Optional callback when action completes
 * @param {'view'|'edit'} [props.mode='view'] - Display mode for the component
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
export const UserProfile = ({
    userId,
    onComplete,
    mode = 'view',
    className,
}) => {
    return <div className={className}>...</div>;
};
```

---

## Type Definitions with @typedef

### Define Reusable Types

```javascript
/**
 * @typedef {Object} User
 * @property {number} id - User ID
 * @property {string} name - User's full name
 * @property {string} email - User's email address
 * @property {string} [avatarUrl] - Optional avatar URL
 */

/**
 * @typedef {Object} Post
 * @property {number} id - Post ID
 * @property {string} title - Post title
 * @property {string} content - Post content
 * @property {number} authorId - ID of the author
 * @property {Date} createdAt - Creation timestamp
 */

/**
 * Gets a user by ID
 * @param {number} id - User ID
 * @returns {Promise<User>}
 */
async function getUser(id) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}
```

### Place Type Definitions in Separate Files

```javascript
// src/types/user.js
/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {Profile} [profile]
 */

/**
 * @typedef {Object} Profile
 * @property {string} bio
 * @property {string} avatarUrl
 */

// Then import in other files:
/**
 * @typedef {import('../types/user').User} User
 * @typedef {import('../types/user').Profile} Profile
 */
```

---

## Null/Undefined Handling

### Optional Chaining

```javascript
// ✅ CORRECT
const name = user?.profile?.name;

// Equivalent to:
const name = user && user.profile && user.profile.name;
```

### Nullish Coalescing

```javascript
// ✅ CORRECT
const displayName = user?.name ?? 'Anonymous';

// Only uses default if null or undefined
// (Different from || which triggers on '', 0, false)

// Examples:
const count = value ?? 0;          // 0 if null/undefined
const message = error ?? 'Unknown';  // Default message
```

### Defensive Checking

```javascript
/**
 * @param {User|null} user
 * @returns {string}
 */
function getUserName(user) {
    if (!user) {
        return 'Anonymous';
    }
    return user.name;
}

/**
 * @param {Array<User>|undefined} users
 * @returns {number}
 */
function getUserCount(users) {
    return users?.length ?? 0;
}
```

---

## Array and Object Types

### Array Types

```javascript
/**
 * @typedef {Object} Player
 * @property {number} id
 * @property {string} name
 * @property {number} rating
 */

/**
 * Filters players by minimum rating
 * @param {Player[]} players - Array of players
 * @param {number} minRating - Minimum rating threshold
 * @returns {Player[]}
 */
function filterPlayersByRating(players, minRating) {
    return players.filter(player => player.rating >= minRating);
}

/**
 * Generic array operations
 * @param {Array<string|number>} items - Mixed type array
 * @returns {number}
 */
function sumNumericItems(items) {
    return items
        .filter(item => typeof item === 'number')
        .reduce((sum, item) => sum + item, 0);
}
```

### Object/Map Types

```javascript
/**
 * @type {Object.<string, User>}
 */
const userMap = {
    'user1': { id: 1, name: 'John' },
    'user2': { id: 2, name: 'Jane' },
};

/**
 * @type {Record<string, number>}
 */
const scores = {
    player1: 100,
    player2: 85,
};
```

---

## Union Types and Literals

### Union Types

```javascript
/**
 * @typedef {'idle'|'loading'|'success'|'error'} Status
 */

/**
 * @param {string|number} id - User ID (can be string or number)
 * @returns {Promise<User>}
 */
function fetchUser(id) {
    return fetch(`/api/users/${id}`).then(r => r.json());
}

/**
 * @param {'view'|'edit'|'delete'} action - The action to perform
 * @returns {void}
 */
function handleAction(action) {
    switch (action) {
        case 'view':
            // ...
            break;
        case 'edit':
            // ...
            break;
        case 'delete':
            // ...
            break;
    }
}
```

### Complex State Types

```javascript
/**
 * @typedef {Object} LoadingState
 * @property {'idle'} status
 */

/**
 * @typedef {Object} SuccessState
 * @property {'success'} status
 * @property {any} data
 */

/**
 * @typedef {Object} ErrorState
 * @property {'error'} status
 * @property {Error} error
 */

/**
 * @typedef {LoadingState|SuccessState|ErrorState} State
 */

/**
 * @param {State} state
 * @returns {JSX.Element}
 */
function Component({ state }) {
    if (state.status === 'success') {
        return <Display data={state.data} />;
    }
    if (state.status === 'error') {
        return <Error error={state.error} />;
    }
    return <Loading />;
}
```

---

## Custom Hooks with JSDoc

### Hook Return Types

```javascript
/**
 * @typedef {Object} UseDataReturn
 * @property {any|null} data - The fetched data
 * @property {boolean} isLoading - Loading state
 * @property {Error|null} error - Error if fetch failed
 * @property {() => void} refetch - Function to refetch data
 */

/**
 * Custom hook for fetching data
 * @param {string} url - API endpoint URL
 * @returns {UseDataReturn}
 */
function useData(url) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(() => {
        setIsLoading(true);
        fetch(url)
            .then(r => r.json())
            .then(setData)
            .catch(setError)
            .finally(() => setIsLoading(false));
    }, [url]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, isLoading, error, refetch };
}
```

---

## Event Handlers

### Typing Event Handlers

```javascript
/**
 * Form component with typed event handlers
 * @param {Object} props
 * @param {(data: {username: string, password: string}) => void} props.onSubmit
 * @returns {JSX.Element}
 */
export const LoginForm = ({ onSubmit }) => {
    /**
     * @param {React.FormEvent<HTMLFormElement>} event
     */
    const handleSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
            username: formData.get('username'),
            password: formData.get('password'),
        });
    };

    /**
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    const handleInputChange = (event) => {
        console.log(event.target.value);
    };

    /**
     * @param {React.MouseEvent<HTMLButtonElement>} event
     */
    const handleClick = (event) => {
        console.log('Clicked:', event.currentTarget);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input onChange={handleInputChange} />
            <button onClick={handleClick}>Submit</button>
        </form>
    );
};
```

---

## Validation and Type Guards

### Runtime Type Checking

```javascript
/**
 * Checks if value is a valid user object
 * @param {any} data
 * @returns {data is User}
 */
function isUser(data) {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.id === 'number' &&
        typeof data.name === 'string' &&
        typeof data.email === 'string'
    );
}

/**
 * Safely parse API response
 * @param {unknown} response
 * @returns {User|null}
 */
function parseUserResponse(response) {
    if (isUser(response)) {
        return response;
    }
    console.error('Invalid user data:', response);
    return null;
}
```

---

## Best Practices

### Comments vs JSDoc

```javascript
// ❌ AVOID - Comment without type info
// Fetches user
function getUser(id) {
    return fetch(`/api/users/${id}`);
}

// ✅ CORRECT - JSDoc with type info
/**
 * Fetches user data from API
 * @param {number} id - User ID
 * @returns {Promise<User>}
 */
function getUser(id) {
    return fetch(`/api/users/${id}`).then(r => r.json());
}
```

### Consistent Naming

```javascript
// ✅ CORRECT - Clear, consistent naming
/**
 * @param {User} user
 * @returns {boolean}
 */
function isUserActive(user) {
    return user.status === 'active';
}

/**
 * @param {User[]} users
 * @returns {User[]}
 */
function getActiveUsers(users) {
    return users.filter(isUserActive);
}
```

---

## Summary

**JavaScript/JSDoc Checklist:**
- ✅ Use JSDoc for all exported functions and components
- ✅ Define complex types with `@typedef`
- ✅ Document parameters with `@param`
- ✅ Specify return types with `@returns`
- ✅ Use optional chaining `?.` and nullish coalescing `??`
- ✅ Add type guards for runtime validation
- ✅ Keep types in separate files when shared
- ✅ Document event handlers with React event types
- ✅ Use union types for state and enums
- ❌ Avoid skipping JSDoc on public APIs

**See Also:**
- [component-patterns.md](component-patterns.md) - Component structure
- [zustand-patterns.md](zustand-patterns.md) - State management typing
