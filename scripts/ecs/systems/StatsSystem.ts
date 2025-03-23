
/**
 * Stats System for managing entity stats
 */
export class StatsSystem {
  update(entities: any[]): void { // Use 'any[]' for entities
    for (const entity of entities) {
      const statsComponent = entity.stats; // Access StatsComponent directly from entity
      if (statsComponent) {
        // Add any stat update logic here (e.g., regeneration)
      }
    }
  }
}
