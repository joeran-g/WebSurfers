import planck from "planck-js";

export function createWorld() {
  return new planck.World({
    gravity: planck.Vec2(0, 10),
    allowSleep: true,
    continuousPhysics: true,
  });
}