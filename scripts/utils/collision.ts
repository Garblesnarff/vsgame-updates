/**
 * Rectangle interface for collision detection
 */
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Circle interface for collision detection
 */
interface Circle {
  x: number;
  y: number;
  radius: number;
}

/**
 * Collision utilities
 * Provides functions for collision detection between game entities
 */

/**
 * Check if two rectangles overlap
 * @param rect1 - First rectangle {x, y, width, height}
 * @param rect2 - Second rectangle {x, y, width, height}
 * @returns Whether the rectangles collide
 */
export function rectangleCollision(
  rect1: Rectangle,
  rect2: Rectangle
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Check if a point is inside a rectangle
 * @param pointX - Point X coordinate
 * @param pointY - Point Y coordinate
 * @param rect - Rectangle {x, y, width, height}
 * @returns Whether the point is inside the rectangle
 */
export function pointInRectangle(
  pointX: number,
  pointY: number,
  rect: Rectangle
): boolean {
  return (
    pointX >= rect.x &&
    pointX <= rect.x + rect.width &&
    pointY >= rect.y &&
    pointY <= rect.y + rect.height
  );
}

/**
 * Check if a point is inside a circle
 * @param pointX - Point X coordinate
 * @param pointY - Point Y coordinate
 * @param circleX - Circle center X coordinate
 * @param circleY - Circle center Y coordinate
 * @param radius - Circle radius
 * @returns Whether the point is inside the circle
 */
export function pointInCircle(
  pointX: number,
  pointY: number,
  circleX: number,
  circleY: number,
  radius: number
): boolean {
  const dx = pointX - circleX;
  const dy = pointY - circleY;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check if a circle and rectangle overlap
 * @param circle - Circle {x, y, radius}
 * @param rect - Rectangle {x, y, width, height}
 * @returns Whether the circle and rectangle collide
 */
export function circleRectangleCollision(
  circle: Circle,
  rect: Rectangle
): boolean {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  // Calculate distance between closest point and circle center
  const dx = closestX - circle.x;
  const dy = closestY - circle.y;

  // Check if distance is less than circle's radius
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

/**
 * Calculate distance between two points
 * @param x1 - First point X coordinate
 * @param y1 - First point Y coordinate
 * @param x2 - Second point X coordinate
 * @param y2 - Second point Y coordinate
 * @returns Distance between the points
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
 * Check if a point is close to a line segment
 * @param pointX - Point X coordinate
 * @param pointY - Point Y coordinate
 * @param lineX1 - Line start X coordinate
 * @param lineY1 - Line start Y coordinate
 * @param lineX2 - Line end X coordinate
 * @param lineY2 - Line end Y coordinate
 * @param tolerance - Distance tolerance
 * @returns Whether the point is close to the line
 */
export function pointNearLine(
  pointX: number,
  pointY: number,
  lineX1: number,
  lineY1: number,
  lineX2: number,
  lineY2: number,
  tolerance: number
): boolean {
  // Calculate length of line segment squared
  const lengthSquared =
    (lineX2 - lineX1) * (lineX2 - lineX1) +
    (lineY2 - lineY1) * (lineY2 - lineY1);

  // If line segment is a point, check distance to that point
  if (lengthSquared === 0) {
    return distance(pointX, pointY, lineX1, lineY1) <= tolerance;
  }

  // Calculate projection of point onto line
  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointX - lineX1) * (lineX2 - lineX1) +
        (pointY - lineY1) * (lineY2 - lineY1)) /
        lengthSquared
    )
  );

  const projX = lineX1 + t * (lineX2 - lineX1);
  const projY = lineY1 + t * (lineY2 - lineY1);

  // Check distance from point to projection
  return distance(pointX, pointY, projX, projY) <= tolerance;
}

export default {
  rectangleCollision,
  pointInRectangle,
  pointInCircle,
  circleRectangleCollision,
  distance,
  pointNearLine,
};
