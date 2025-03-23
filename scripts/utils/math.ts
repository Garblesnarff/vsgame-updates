/**
 * Math utilities
 * Helper functions for mathematical calculations
 */

/**
 * Generate a random number between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number in range
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Calculate the angle between two points in radians
 * @param x1 - First point X coordinate
 * @param y1 - First point Y coordinate
 * @param x2 - Second point X coordinate
 * @param y2 - Second point Y coordinate
 * @returns Angle in radians
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Calculate the distance between two points
 * @param x1 - First point X coordinate
 * @param y1 - First point Y coordinate
 * @param x2 - Second point X coordinate
 * @param y2 - Second point Y coordinate
 * @returns Distance
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the square of the distance between two points (faster than distance)
 * @param x1 - First point X coordinate
 * @param y1 - First point Y coordinate
 * @param x2 - Second point X coordinate
 * @param y2 - Second point Y coordinate
 * @returns Squared distance
 */
export function distanceSquared(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Calculate a point on a circle given center, radius and angle
 * @param centerX - Circle center X coordinate
 * @param centerY - Circle center Y coordinate
 * @param radius - Circle radius
 * @param angle - Angle in radians
 * @returns Point {x, y}
 */
export function pointOnCircle(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number
): { x: number; y: number } {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

/**
 * Normalize a 2D vector to unit length
 * @param x - Vector X component
 * @param y - Vector Y component
 * @returns Normalized vector {x, y}
 */
export function normalize(x: number, y: number): { x: number; y: number } {
  const length = Math.sqrt(x * x + y * y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Scale a value from one range to another
 * @param value - Value to scale
 * @param fromMin - Source range minimum
 * @param fromMax - Source range maximum
 * @param toMin - Target range minimum
 * @param toMax - Target range maximum
 * @returns Scaled value
 */
export function scale(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  return ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
}

// Export as a namespace for convenience
export const Math2D = {
  random,
  randomInt,
  clamp,
  lerp,
  angle,
  distance,
  distanceSquared,
  pointOnCircle,
  normalize,
  toRadians,
  toDegrees,
  scale,
};

export default Math2D;
