import { BaseEntity } from '../entities/base-entity';
import CONFIG from '../config';

/**
 * SpatialGrid class for optimizing collision detection.
 * Divides the game world into a grid and stores entities in cells.
 */
export class SpatialGrid<T extends BaseEntity> {
  private cells: Map<string, T[]>;
  private cellSize: number;
  private width: number;
  private height: number;
  private cols: number;
  private rows: number;

  /**
   * Creates a new SpatialGrid.
   * @param width The width of the game world.
   * @param height The height of the game world.
   * @param cellSize The size of each cell in the grid.
   */
  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.cells = new Map<string, T[]>();
  }

  /**
   * Clears all entities from the grid.
   */
  clear(): void {
    this.cells.clear();
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

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const key = `${col},${row}`;
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key)!.push(entity);
      }
    }
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
}
