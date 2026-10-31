import { WORLD_WIDTH, DRONE, WALL, CAMERA_DEPTH } from './config.js?v=d9a0933b62';

// A north-facing orthographic quarter view. Only rendering/input is projected:
// combat coordinates, percent bands, ranges and swept collisions stay in world space.
export const DEPTH_SCALE = CAMERA_DEPTH;
export const FORWARD_ELEVATION = 16;
export const WALL_ELEVATION = WALL.elevation;
export class QuarterCamera {
  constructor(height) { this.resize(height); }
  resize(height) { this.height = height; this.a = .92; this.b = 16 / height; this.c = .065; this.d = DEPTH_SCALE; this.tx = WORLD_WIDTH / 2 * (1 - this.a) - 8; this.ty = -this.c * WORLD_WIDTH / 2; }
  project(x, y, z = 0) { return { x: this.a * x + this.b * y + this.tx, y: this.c * x + this.d * y + this.ty - z }; }
  unproject(x, y, z = 0) { const px = x - this.tx, py = y + z - this.ty, det = this.a * this.d - this.b * this.c; return { x: (this.d * px - this.b * py) / det, y: (-this.c * px + this.a * py) / det }; }
  cannonAnchor(c, game) { const p = game.cannonPosition(c), forward = c.type !== 'drone' && Math.abs(c.x - 216) < .5 && c.type !== 'command'; return this.project(p.x, p.y, c.type === 'drone' ? DRONE.altitude : forward ? FORWARD_ELEVATION : WALL_ELEVATION); }
}
