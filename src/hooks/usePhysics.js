import { useRef, useEffect } from "react";
import planck from "planck-js";

const SCALE = 30;
const FLAG_RADIUS = 50;

const WALK_FORCE = 0.08;
const AIR_CONTROL_FORCE = 0.03;
const MAX_SPEED = 8;
const JUMP_IMPULSE = 6;
const MAX_VERTICAL_SPEED = 12;
const GROUND_DAMPING = 0.1;
const AIR_DAMPING = 0.02;

export default function usePhysics(objects, physicsEnabled, stageSize, camera, setCamera, setHasWon, hasWon, forceRender) {
  const worldRef = useRef(null);
  const playerBody = useRef(null);
  const playerOnGround = useRef(false);
  const keys = useRef({ left: false, right: false, jump: false });

  function toWorld(x) {
    return x / SCALE;
  }

  function toPixels(x) {
    return x * SCALE;
  }

  function buildWorld() {
    const world = new planck.World({
      gravity: planck.Vec2(0, 10),
      allowSleep: true,
      continuousPhysics: true,
    });

    playerBody.current = null;
    playerOnGround.current = false;

    objects.forEach((obj) => {
      if (obj.type === "player") {
        const body = world.createBody({
          type: "dynamic",
          position: planck.Vec2(toWorld(obj.x), toWorld(obj.y)),
          fixedRotation: true,
          bullet: true,
        });

        body.createFixture(planck.Circle(toWorld(10)), {
          density: 4,
          friction: 0.02,
          restitution: 0.01,
        });

        body.setLinearDamping(AIR_DAMPING);
        playerBody.current = body;
      }

      if (obj.type === "line") {
        const body = world.createBody();
        for (let i = 0; i < obj.points.length - 2; i += 2) {
          const v1 = planck.Vec2(toWorld(obj.points[i]), toWorld(obj.points[i + 1]));
          const v2 = planck.Vec2(toWorld(obj.points[i + 2]), toWorld(obj.points[i + 3]));
          body.createFixture(planck.Edge(v1, v2), {
            friction: 0.02,
            restitution: 0.001,
          });
        }
      }
    });

    world.on("begin-contact", (contact) => {
      const a = contact.getFixtureA().getBody();
      const b = contact.getFixtureB().getBody();
      if (a === playerBody.current || b === playerBody.current) {
        playerOnGround.current = true;
      }
    });

    world.on("end-contact", (contact) => {
      const a = contact.getFixtureA().getBody();
      const b = contact.getFixtureB().getBody();
      if (a === playerBody.current || b === playerBody.current) {
        playerOnGround.current = false;
      }
    });

    worldRef.current = world;
  }

  useEffect(() => {
    if (physicsEnabled) buildWorld();
  }, [objects, physicsEnabled]);

  useEffect(() => {
    if (!physicsEnabled) return;
    let frameId;

    function update() {
      worldRef.current.step(1 / 60);

      if (playerBody.current) {
        const velocity = playerBody.current.getLinearVelocity();
        const targetSpeed = keys.current.left ? -MAX_SPEED : keys.current.right ? MAX_SPEED : 0;
        const controlForce = playerOnGround.current ? WALK_FORCE : AIR_CONTROL_FORCE;
        const speedDelta = targetSpeed - velocity.x;

        playerBody.current.applyForceToCenter(planck.Vec2(speedDelta * controlForce, 0), true);
        playerBody.current.setLinearDamping(playerOnGround.current ? GROUND_DAMPING : AIR_DAMPING);

        if (keys.current.jump && playerOnGround.current) {
          if (velocity.y > -MAX_VERTICAL_SPEED) {
            playerBody.current.applyLinearImpulse(
              planck.Vec2(0, -JUMP_IMPULSE),
              playerBody.current.getWorldCenter()
            );
          }
          keys.current.jump = false;
        }

        if (velocity.y < -MAX_VERTICAL_SPEED) {
          playerBody.current.setLinearVelocity(planck.Vec2(velocity.x, -MAX_VERTICAL_SPEED));
        }
      }

      const playerPos = playerBody.current?.getPosition();
      if (playerPos) {
        setCamera((prev) => ({
          ...prev,
          x: stageSize.width / 2 - toPixels(playerPos.x) * prev.zoom,
          y: stageSize.height / 2 - toPixels(playerPos.y) * prev.zoom,
        }));

        const flag = objects.find((o) => o.type === "flag");
        if (flag) {
          const dist = Math.hypot(playerPos.x - toWorld(flag.x), playerPos.y - toWorld(flag.y));
          if (dist < toWorld(FLAG_RADIUS) && !hasWon) {
            setHasWon(true);
          }
        }
      }

      forceRender((n) => n + 1);
      frameId = requestAnimationFrame(update);
    }

    update();
    return () => cancelAnimationFrame(frameId);
  }, [physicsEnabled, objects, hasWon, stageSize, setCamera, forceRender]);

  useEffect(() => {
    function down(e) {
      if (!physicsEnabled) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.current.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.current.right = true;
      if (e.code === "Space" && !e.repeat) {
        keys.current.jump = true;
      }
    }

    function up(e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.current.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.current.right = false;
    }

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [physicsEnabled]);

  return { buildWorld, worldRef, playerBody };
}