## Scripts/Entities/Enemies

This directory contains scripts related to enemy entities.

### Files

- base-enemy.ts: Defines the base class for all enemy types.
- basic-enemy.ts: Defines the BasicEnemy class.
- fast-swarmer.ts: Defines the FastSwarmer class.
- holy-priest.ts: Defines the HolyPriest class, a support enemy that heals and buffs other enemies.
- index.ts: Exports all enemy types.
- silver-mage.ts: Defines the SilverMage class, a ranged enemy that creates hazardous silver zones.
- tanky-brute.ts: Defines the TankyBrute class.
- vampire-hunter.ts: Defines the VampireHunter class.
- vampire-scout.ts: Defines the VampireScout class, a fast, evasive enemy that can mark players and summon reinforcements.

### Enemy Types

The game features various enemy types that offer different gameplay challenges:

- **Basic Enemy**: Standard enemy with balanced stats.
- **Fast Swarmer**: Quick enemies that attack in coordinated groups.
- **Holy Priest**: Support unit that heals and buffs other enemies, creating protective shields and courage blessings.
- **Silver Mage**: Ranged mystic that creates hazardous silver zones that damage the player and block energy regeneration.
- **Tanky Brute**: Tough enemies with high health and damage but slow speed.
- **Vampire Hunter**: Ranged attacker that shoots silver projectiles at the player.
- **Vampire Scout**: Nimble traitor with supernatural abilities to track and mark the player, buffing all enemies while the mark is active. Can dodge attacks and summon reinforcements.

### Spawning Mechanics

Enemy types are introduced at different player levels:
- Basic Enemy: Level 1 (from the start)
- Vampire Hunter: Level 1 (from the start)
- Fast Swarmer: Level 1 (from the start)
- Tanky Brute: Level 5
- Silver Mage: Level 3
- Holy Priest: Level 5
- Vampire Scout: Level 4
