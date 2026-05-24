/**
 * SpatialGrid class for optimizing collision detection.
 * Divides the game world into a grid and stores entities in cells.
 * Optimized for incremental updates rather than full rebuilds.
 */
export class SpatialGrid<T extends { x: number; y: number; width: number; height: number }> {
  private cells: Map<string, T[]>;
  private cellSize: number;
  private entityCells: Map<T, string[]>; // Track which cells each entity occupies

  /**
   * Creates a new SpatialGrid.
   * @param width The width of the game world.
   * @param height The height of the game world.
   * @param cellSize The size of each cell in the grid.
   */
  constructor(_width: number, _height: number, cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map<string, T[]>();
    this.entityCells = new Map<T, string[]>();
  }

  /**
   * Clears all entities from the grid.
   */
  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }

  /**
   * Removes an entity from the grid.
   * @param entity The entity to remove.
   */
  remove(entity: T): void {
    const occupiedCells = this.entityCells.get(entity);
    if (!occupiedCells) return;

    // Remove entity from all cells it occupies
    for (const cellKey of occupiedCells) {
      const cellEntities = this.cells.get(cellKey);
      if (cellEntities) {
        const index = cellEntities.indexOf(entity);
        if (index !== -1) {
          cellEntities.splice(index, 1);
          // Remove empty cells to save memory
          if (cellEntities.length === 0) {
            this.cells.delete(cellKey);
          }
        }
      }
    }

    // Remove from tracking
    this.entityCells.delete(entity);
  }

  /**
   * Updates an entity's position in the grid.
   * More efficient than remove() + insert() for moving entities.
   * @param entity The entity to update.
   * @param oldX Optional old X position (if known for optimization).
   * @param oldY Optional old Y position (if known for optimization).
   */
  update(entity: T, oldX?: number, oldY?: number): void {
    // If we know the old position, we can optimize by checking if cells changed
    if (oldX !== undefined && oldY !== undefined) {
      const oldCells = this.getEntityCellsAtPosition(oldX, oldY, entity.width, entity.height);
      const newCells = this.getEntityCellsAtPosition(entity.x, entity.y, entity.width, entity.height);

      // If cells haven't changed, no update needed
      if (this.cellsEqual(oldCells, newCells)) {
        return;
      }
    }

    // Remove from old position and insert at new position
    this.remove(entity);
    this.insert(entity);
  }

  /**
   * Inserts an entity into the grid.
   * @param entity The entity to insert.
   */
  insert(entity: T): void {
    const startCol = Math.floor(entity.x / this.cellSize);
    const endCol = Math.floor((entity.x + entity.width) / this.cellSize);
    const startRow = Math.floor(entity.y / this.cellSize);
    const endRow = Math.floor((entity.y + entity.height) / this.cellSize);

    const occupiedCells: string[] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const key = `${col},${row}`;
        occupiedCells.push(key);

        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key)!.push(entity);
      }
    }

    // Track which cells this entity occupies
    this.entityCells.set(entity, occupiedCells);
  }

  /**
   * Retrieves all entities in the cells that an entity occupies, including neighboring cells.
   * @param entity The entity to query for.
   * @returns An array of potential collision candidates.
   */
  retrieve(entity: T): T[] {
    const candidates = new Set<T>();
    const startCol = Math.floor(entity.x / this.cellSize);
    const endCol = Math.floor((entity.x + entity.width) / this.cellSize);
    const startRow = Math.floor(entity.y / this.cellSize);
    const endRow = Math.floor((entity.y + entity.height) / this.cellSize);

    // Record collision checks for performance monitoring
    const cellsChecked = (endCol - startCol + 3) * (endRow - startRow + 3); // +3 for neighbors
    for (let i = 0; i < cellsChecked; i++) {
      // Import performance monitor dynamically to avoid circular dependency
      if (typeof window !== 'undefined' && (window as any).performanceMonitor) {
        (window as any).performanceMonitor.recordCollisionCheck();
      }
    }

    for (let row = startRow - 1; row <= endRow + 1; row++) {
      for (let col = startCol - 1; col <= endCol + 1; col++) {
        const key = `${col},${row}`;
        if (this.cells.has(key)) {
          for (const candidate of this.cells.get(key)!) {
            candidates.add(candidate);
          }
        }
      }
    }
    return Array.from(candidates);
  }

  /**
   * Gets the cell keys that an entity would occupy at a specific position.
   * @param x Entity X position.
   * @param y Entity Y position.
   * @param width Entity width.
   * @param height Entity height.
   * @returns Array of cell keys.
   */
  private getEntityCellsAtPosition(x: number, y: number, width: number, height: number): string[] {
    const cells: string[] = [];
    const startCol = Math.floor(x / this.cellSize);
    const endCol = Math.floor((x + width) / this.cellSize);
    const startRow = Math.floor(y / this.cellSize);
    const endRow = Math.floor((y + height) / this.cellSize);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        cells.push(`${col},${row}`);
      }
    }

    return cells;
  }

  /**
   * Checks if two arrays of cell keys are equal.
   * @param cells1 First array of cell keys.
   * @param cells2 Second array of cell keys.
   * @returns True if arrays contain the same cell keys.
   */
  private cellsEqual(cells1: string[], cells2: string[]): boolean {
    if (cells1.length !== cells2.length) return false;

    // Sort both arrays and compare
    const sorted1 = [...cells1].sort();
    const sorted2 = [...cells2].sort();

    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i] !== sorted2[i]) return false;
    }

    return true;
  }
}
