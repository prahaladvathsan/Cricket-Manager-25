# GEMINI.md

## Project Overview

This project is a cricket management simulation game, inspired by Football Manager, with a focus on the IPL (Indian Premier League) format. It is a web-based application built with React and Vite.

The application allows users to manage a cricket team, including team selection, and simulates matches. The core of the application is a sophisticated match engine that simulates matches ball-by-ball, taking into account various player attributes, team tactics, and match conditions.

**Key Technologies:**

*   **Frontend:** React, JavaScript (ES6+), Tailwind CSS
*   **Build Tool:** Vite
*   **State Management:** Zustand
*   **Routing:** React Router

**Architecture:**

The application follows a component-based architecture with a clear separation of concerns:

*   **`src/components`**: Contains the React components for the UI, organized by feature (e.g., `layout`, `match`, `player`, `team`).
*   **`src/core`**: Contains the core game logic, including the match engine, player system, and tactics.
    *   **`src/core/match-engine`**: The heart of the simulation, responsible for simulating matches ball-by-ball.
*   **`src/stores`**: Contains the Zustand stores for managing the application's state.
    *   `gameStore.js`: Manages global game state.
    *   `matchStore.js`: Manages the state of an active match.
    *   `playerStore.js`: Manages player data.
    *   `teamStore.js`: Manages team data.
*   **`src/data`**: Contains the game's data, such as player databases, team information, and configuration files.

## Building and Running

### Prerequisites

*   Node.js and npm

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

*   **Development Mode:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:3000`.

*   **Production Build:**
    ```bash
    npm run build
    ```
    This will create a production-ready build in the `dist` directory.

*   **Preview Production Build:**
    ```bash
    npm run preview
    ```
    This will serve the production build locally for previewing.

### Testing

*TODO: Add instructions on how to run tests.*

## Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style. Run `npm run lint` to check for linting errors and `npm run lint:fix` to automatically fix them.
*   **State Management:** Zustand is used for state management. State is organized into different stores based on the domain (e.g., `gameStore`, `matchStore`).
*   **Documentation:** The code is documented using JSDoc comments. The `docs` directory contains more detailed documentation on the project's architecture, core systems, and APIs.
