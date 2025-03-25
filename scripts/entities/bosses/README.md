# Boss Encounters System

This directory contains the implementation of boss encounters for the Vampire Survival Game. Bosses are special challenging enemies that appear at specific time thresholds, creating periodic challenges that require strategy to overcome.

## Boss System Features

- **Timed Encounters**: Bosses appear every 5 minutes of gameplay
- **Warning System**: A notification appears 30 seconds before each boss spawn
- **Arena Mechanics**: When a boss spawns, a visual boundary appears that contains both the player and boss
- **Health Bar UI**: A dedicated boss health bar appears at the top of the screen
- **Phase System**: Bosses have multiple phases with changing abilities and behavior
- **Reward System**: Defeating a boss grants experience, temporary buffs, and ability cooldown resets

## Boss Types

### Church Paladin
A holy warrior clad in blessed armor who uses light-based attacks and defensive abilities to counter vampire powers.

**Phases:**
1. **Phase 1 (100-70% Health)**
   - Moderate speed, direct approach
   - Sword combo, shield bash, holy projectiles
   
2. **Phase 2 (70-40% Health)**
   - Increased speed with occasional charge attacks
   - Consecration, divine shield, light pillars
   
3. **Phase 3 (40-0% Health)**
   - Tactical repositioning with occasional teleports
   - Judgment, holy nova, summon acolytes

**Special Mechanics:**
- Vampire Weakness: All vampire abilities deal 30% less damage
- Blessed Armor: Takes reduced damage from frontal attacks while shield is raised
- Holy Resistance: Immune to crowd control effects

### Implementation Status

- [x] Base Boss Class
- [x] Boss Spawn System
- [x] Boss Health Bar UI
- [x] Arena Mechanics
- [x] Church Paladin Boss (First Boss)
- [ ] Master Vampire Hunter Boss
- [ ] Blood Countess Boss
- [x] Reward System
- [x] Integration with Game Class

## How to Use

To enable boss encounters in your game, use the `createGameWithBosses` function instead of directly creating a `Game` instance:

```javascript
import { createGameWithBosses } from './scripts/game/game-with-bosses';

// Get game container
const gameContainer = document.getElementById('game-container');

// Create game with boss encounters
const game = createGameWithBosses(gameContainer);

// Start the game
game.start();
```

## Architecture

- **Base Boss Class**: Extends the Enemy class with boss-specific behavior
- **Boss Spawn System**: Manages the timing and spawning of bosses
- **Game Integration**: Provides extensions to the Game class to handle boss encounters
- **Event System**: Uses the game's event system for boss-related events

## File Structure

- `base-boss.ts`: The base Boss class that all boss types extend
- `church-paladin.ts`: Implementation of the Church Paladin boss
- `index.ts`: Exports for boss types

## Related Files

- `/scripts/game/boss-system/boss-spawn-system.ts`: System for spawning bosses at intervals
- `/scripts/game/boss-system/index.ts`: Exports for boss system
- `/scripts/game/game-boss-integration.ts`: Integration with the Game class
- `/scripts/game/game-with-bosses.ts`: Factory function for creating a game with bosses
- `/styles/boss-effects.css`: CSS animations and styles for boss effects

## Events

The boss system adds the following events to the game's event system:

- `BOSS_SPAWN`: Fired when a boss spawns
- `BOSS_WARNING`: Fired when a boss warning is shown
- `BOSS_ATTACK`: Fired when a boss performs an attack
- `BOSS_ATTACK_START`: Fired when a boss begins charging an attack
- `BOSS_PHASE_CHANGE`: Fired when a boss enters a new phase
- `BOSS_SPECIAL_MOVE`: Fired when a boss uses a special ability
- `BOSS_DEFEATED`: Fired when a boss is defeated

## Future Enhancements

- Add Master Vampire Hunter boss
- Add Blood Countess boss
- Add boss-specific power-ups
- Add boss-specific achievements
- Add boss difficulty scaling
- Add boss music
