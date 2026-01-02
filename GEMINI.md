# Gemini Project: Cricket Manager - World Premier League Simulation

## Project Overview

This is a cricket management simulation game inspired by Football Manager, featuring the World Premier League (WPL) format. The game is built using React with Vite for the frontend, Zustand for state management, and Tailwind CSS for styling. The core of the application is a realistic T20 match simulation engine that simulates matches on a ball-by-ball basis.

**Key Technologies:**

*   **Frontend:** React 18, Vite
*   **State Management:** Zustand
*   **Styling:** Tailwind CSS
*   **Match Engine:** Custom-built JavaScript-based simulation engine.

**Architecture:**

The project follows a component-based architecture with a clear separation of concerns.

*   `src/core`: Contains the core game logic, including the match engine, game progression, and other systems.
*   `src/components`: Contains the React components that make up the user interface.
*   `src/stores`: Contains the Zustand stores for managing the application's state.
*   `src/data`: Contains static game data, such as player and team information.
*   `src/utils`: Contains utility functions used throughout the application.

## Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Run the Development Server:**

```bash
npm run dev
```

This will start the development server, and you can view the application by visiting `http://localhost:3000` in your web browser.

**3. Build for Production:**

```bash
npm run build
```

This will create a production-ready build of the application in the `dist` directory.

**4. Linting:**

To check the code for any linting errors, run the following command:

```bash
npm run lint
```

## Development Conventions

*   **State Management:** The project uses Zustand for state management. Stores are defined in the `src/stores` directory and are used to manage different parts of the application's state, such as game state, team data, and UI state.
*   **Styling:** The project uses Tailwind CSS for styling. Utility classes are used directly in the JSX files to style the components.
*   **Component Structure:** Components are organized by feature in the `src/components` directory. Shared components are located in the `src/components/shared` directory.
*   **Core Logic:** The core game logic is separated from the UI and is located in the `src/core` directory. This makes it easier to test and maintain the game's business logic.

## Git Workflow

After the completion of any feature, the code is to be committed and pushed to the `testing` branch. After final version testing and game stability (you will need to prompt the user for approval for this), the `testing` branch can be merged with the `main` branch.
