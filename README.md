# Vampire Survival Game

A browser-based survival game where you play as a vampire fighting against waves of enemies. Use your vampiric abilities to drain blood, summon bats, and dash through enemies to survive as long as possible.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [Code Quality](#code-quality)
- [Build](#build)

## Features

- Player movement with WASD or arrow keys
- Multiple abilities with cooldowns and energy costs
- Auto-attack system
- Enemy spawning with scaling difficulty
- Leveling system with skill points
- Skill tree with ability upgrades
- Visual effects for abilities
- Responsive design

## Project Structure

The project follows a modular architecture for better maintainability and extensibility:

```
vampire-survival-game/
│
├── index.html                  # Main HTML file
├── styles/                     # CSS files
│   ├── main.css                # Main styles
│   ├── game-elements.css       # Game element styles
│   ├── ui.css                  # UI element styles
│   └── abilities.css           # Ability-specific styles
│
├── scripts/                    # JavaScript files
│   ├── main.js                 # Entry point, initialization
│   ├── config.ts               # Game configuration and constants
│   │
│   ├── entities/               # Game entities
│   │   ├── player.js           # Player class
│   │   ├── enemy.js            # Enemy class
│   │   ├── projectile.js       # Projectile class
│   │   └── particle.js         # Particle effects
│   │
│   ├── abilities/              # Ability system
│   │   ├── ability-base.js     # Base ability class
│   │   ├── ability-manager.js  # Manages all abilities
│   │   ├── blood-drain.js      # Blood Drain ability
│   │   ├── bat-swarm.js        # Bat Swarm ability
│   │   ├── shadow-dash.js      # Shadow Dash ability
│   │   ├── blood-lance.js      # Blood Lance ability
│   │   └── night-shield.js     # Night Shield ability
│   │
│   ├── ui/                     # UI components
│   │   ├── ui-manager.js       # Main UI manager
│   │   └── ...                 # Other UI components
│   │
│   ├── utils/                  # Utility functions
│   │   ├── event-system.js     # Event system
│   │   ├── asset-manager.js    # Asset management
│   │   └── ...                 # Other utilities
│   │
│   ├── game/                   # Core game systems
│   │   ├── game.js             # Main game class
│   │   ├── game-loop.js        # Game loop
│   │   ├── input-handler.js    # Input handling
│   │   ├── state-manager.js    # Game state management
│   │   ├── particle-system.js  # Particle system
│   │   └── spawn-system.js     # Enemy spawning
│   │
│   └── types/                  # TypeScript type definitions
│       └── events.d.ts         # Event type definitions
│
├── assets/                     # Game assets (future)
│   ├── images/                 # Images and sprites
│   ├── sounds/                 # Sound effects and music
│   └── fonts/                  # Custom fonts
│
├── docs/                       # Generated documentation
├── tests/                      # Test files
└── dist/                       # Build output
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vampire-survival-game.git
   cd vampire-survival-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:9000`

## Development

### Development Server

Start the development server with:
```bash
npm run dev
```

This will launch a dev server with hot module reloading at `http://localhost:9000`.

### TypeScript

The project uses TypeScript for better type safety. New files should be created as `.ts` files when possible.

Check TypeScript errors with:
```bash
npm run typecheck
```

## Testing

Tests are written using Jest. Run the tests with:

```bash
npm test
```

Run tests in watch mode during development:
```bash
npm run test:watch
```

Generate test coverage report:
```bash
npm run test:coverage
```

## Documentation

JSDoc is used for code documentation. Generate the documentation with:

```bash
npm run docs
```

This will create documentation in the `docs/` directory.

## Code Quality

### Linting

ESLint is used for code linting. Run the linter with:

```bash
npm run lint
```

Fix automatically fixable issues:
```bash
npm run lint:fix
```

## Build

Create a production build with:

```bash
npm run build
```

This will create optimized files in the `dist/` directory.

## Architecture Improvements

The codebase has been refactored with several architectural improvements:

1. **Event System**: A publish-subscribe pattern implementation for decoupled communication between components.

2. **Asset Management**: A dedicated system for loading and managing game assets like images, sounds, and data files.

3. **State Management**: A formal state management system for handling different game states (loading, menu, playing, paused, etc.)

4. **TypeScript Support**: Types for better code safety and developer experience.

5. **Testing Infrastructure**: Jest configuration for unit testing components.

6. **Documentation**: Comprehensive JSDoc comments for better developer understanding.

## License

MIT