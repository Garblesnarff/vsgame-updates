/**
     * Interface for stats
     */
    interface Stats {
      health: number;
      maxHealth: number;
      energy: number;
      maxEnergy: number;
      energyRegen: number;
      speed: number;
      attackPower: number;
      defense: number;
      attackSpeedMultiplier: number;
      lifeStealPercentage: number;
    }

    /**
     * Stats Component for entities
     */
    export class StatsComponent {
      stats: Stats;

      constructor(initialStats: Stats) {
        this.stats = initialStats;
        // Initialize new stats if they don't exist
        this.stats.attackSpeedMultiplier = initialStats.attackSpeedMultiplier ?? 1;
        this.stats.lifeStealPercentage = initialStats.lifeStealPercentage ?? 0;
      }

      getHealth(): number {
        return this.stats.health;
      }


      setHealth(health: number): void {
        this.stats.health = health;
      }

      getMaxHealth(): number {
        return this.stats.maxHealth;
      }

      setMaxHealth(maxHealth: number): void {
        this.stats.maxHealth = maxHealth;
      }

      getEnergy(): number {
        return this.stats.energy;
      }

      setEnergy(energy: number): void {
        this.stats.energy = energy;
      }

      getMaxEnergy(): number {
        return this.stats.maxEnergy;
      }

      setMaxEnergy(maxEnergy: number): void {
        this.stats.maxEnergy = maxEnergy;
      }

      getEnergyRegen(): number {
        return this.stats.energyRegen;
      }

      getSpeed(): number {
        return this.stats.speed;
      }

      getAttackPower(): number {
        return this.stats.attackPower;
      }

      setAttackPower(attackPower: number): void {
        this.stats.attackPower = attackPower;
      }

      getDefense(): number {
        return this.stats.defense;
      }

      setDefense(defense: number): void {
        this.stats.defense = defense;
      }

      getAttackSpeedMultiplier(): number {
        return this.stats.attackSpeedMultiplier;
      }

      setAttackSpeedMultiplier(attackSpeedMultiplier: number): void {
        this.stats.attackSpeedMultiplier = attackSpeedMultiplier;
      }

      getLifeStealPercentage(): number {
        return this.stats.lifeStealPercentage;
      }

      setLifeStealPercentage(lifeStealPercentage: number): void {
        this.stats.lifeStealPercentage = lifeStealPercentage;
      }
    }
