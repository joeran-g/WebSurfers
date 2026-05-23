import { useCallback, useEffect, useRef } from "react";
import * as planck from "planck-js";

const SCALE = 30;
const FLAG_RADIUS = 25;

const WALK_FORCE = 0.2;
const AIR_CONTROL_FORCE = 0.1;
const MAX_SPEED = 50;
const MAX_UP_SPEED = 12;
const MAX_DOWN_SPEED = 25;
const JUMP_IMPULSE = 6;
const SURF_BOOST = 0.15;

export default function usePhysics(
  objects,
  physicsEnabled,
  stageSize,
  setCamera,
  forceRender,
  setGameResult,
  gameResult
) {
  const worldRef = useRef(null);
  const playerBody = useRef(null);
  const isGrounded = useRef(false);
  const lastContactNormal = useRef(planck.Vec2(0, 1));
  const contactCount = useRef(0);
  const noContactTimer = useRef(0);
  const deathFragmentsSpawned = useRef(false);
  const keys = useRef({ left: false, right: false, jump: false });
  const bodiesRef = useRef(new Map());

  const toWorld = useCallback((pixels) => pixels / SCALE, []);
  const toPixels = useCallback((world) => world * SCALE, []);

  const spawnDeathFragments = useCallback(() => {
    if (deathFragmentsSpawned.current || !worldRef.current || !playerBody.current) return;

    const world = worldRef.current;
    const playerPos = playerBody.current.getPosition();
    deathFragmentsSpawned.current = true;

    world.destroyBody(playerBody.current);
    playerBody.current = null;

    const fragmentCount = 6;
    for (let i = 0; i < fragmentCount; i += 1) {
      const offsetX = (Math.random() - 0.5) * 0.5;
      const offsetY = (Math.random() - 0.5) * 0.5;
      const fragment = world.createBody({
        type: "dynamic",
        position: planck.Vec2(playerPos.x + offsetX, playerPos.y + offsetY),
        angle: Math.random() * Math.PI * 2,
      });
      const radius = toWorld(6 + Math.random() * 6);
      fragment.createFixture(planck.Circle(radius), {
        density: 0.5,
        friction: 0.2,
        restitution: 0.3,
      });
      fragment.setLinearVelocity(
        planck.Vec2((Math.random() - 0.5) * 12, -Math.random() * 8)
      );
      fragment.setAngularVelocity((Math.random() - 0.5) * 10);
    }
  }, [toWorld]);

  const buildWorld = useCallback(() => {
    const world = new planck.World({ gravity: planck.Vec2(0, 10) });
    worldRef.current = world;
    bodiesRef.current = new Map();
    playerBody.current = null;
    isGrounded.current = false;
    lastContactNormal.current = planck.Vec2(0, 1);
    contactCount.current = 0;
    noContactTimer.current = 0;
    deathFragmentsSpawned.current = false;

    world.on("begin-contact", (contact) => {
      const fa = contact.getFixtureA();
      const fb = contact.getFixtureB();
      const bodyA = fa.getBody();
      const bodyB = fb.getBody();

      const aData = bodyA.getUserData?.();
      const bData = bodyB.getUserData?.();

      if (
        (bodyA === playerBody.current || bodyB === playerBody.current) &&
        !fa.isSensor() &&
        !fb.isSensor()
      ) {
        contactCount.current += 1;
        isGrounded.current = true;
        const manifold = contact.getWorldManifold();
        if (manifold && manifold.normal) {
          lastContactNormal.current = manifold.normal;
        }
      }

      if (
        (bodyA === playerBody.current && bData?.type === "obstacle") ||
        (bodyB === playerBody.current && aData?.type === "obstacle")
      ) {
        if (!gameResult) {
          setGameResult("lose");
        }
      }

      if (
        (aData?.type === "flag" && bodyB === playerBody.current) ||
        (bData?.type === "flag" && bodyA === playerBody.current)
      ) {
        if (!gameResult) {
          setGameResult("win");
        }
      }
    });

    world.on("end-contact", (contact) => {
      const fa = contact.getFixtureA();
      const fb = contact.getFixtureB();
      const bodyA = fa.getBody();
      const bodyB = fb.getBody();

      if (
        (bodyA === playerBody.current || bodyB === playerBody.current) &&
        !fa.isSensor() &&
        !fb.isSensor()
      ) {
        contactCount.current = Math.max(0, contactCount.current - 1);
        if (contactCount.current === 0) {
          isGrounded.current = false;
        }
      }
    });

    objects.forEach((obj) => {
      if (obj.type === "player") {
        const body = world.createBody({
          type: "dynamic",
          position: planck.Vec2(toWorld(obj.x), toWorld(obj.y)),
        });
        body.createFixture(planck.Circle(toWorld(15)), {
          density: 1,
          friction: 0,
          restitution: 0.1,
        });
        body.setLinearDamping(0.1);
        body.setFixedRotation(true);
        body.setUserData({ id: obj.id, type: "player" });
        playerBody.current = body;
        bodiesRef.current.set(obj.id, body);
      } else if (obj.type === "flag") {
        const body = world.createBody({
          type: "static",
          position: planck.Vec2(toWorld(obj.x), toWorld(obj.y)),
        });
        body.createFixture(planck.Circle(toWorld(FLAG_RADIUS)), {
          isSensor: true,
        });
        body.setUserData({ id: obj.id, type: "flag" });
        bodiesRef.current.set(obj.id, body);
      } else if ((obj.type === "line" || obj.type === "obstacle") && obj.points?.length >= 4) {
        const body = world.createBody({ type: "static" });
        const points = [];
        for (let i = 0; i < obj.points.length; i += 2) {
          points.push(
            planck.Vec2(toWorld(obj.x + obj.points[i]), toWorld(obj.y + obj.points[i + 1]))
          );
        }
        for (let i = 0; i < points.length - 1; i += 1) {
          body.createFixture(planck.Edge(points[i], points[i + 1]), {
            friction: 0.05,
          });
        }
        body.setUserData({ id: obj.id, type: obj.type });
        bodiesRef.current.set(obj.id, body);
      }
    });
  }, [objects, toWorld, gameResult, setGameResult]);

  useEffect(() => {
    if (!physicsEnabled || !worldRef.current) return undefined;

    let frameId = null;
    const world = worldRef.current;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") keys.current.left = true;
      if (event.key === "ArrowRight") keys.current.right = true;
      if (event.key === " ") {
        keys.current.jump = true;
        event.preventDefault();
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === "ArrowLeft") keys.current.left = false;
      if (event.key === "ArrowRight") keys.current.right = false;
      if (event.key === " ") keys.current.jump = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const update = () => {
      frameId = requestAnimationFrame(update);

      if (playerBody.current) {
        const vel = playerBody.current.getLinearVelocity();

        if (keys.current.left) {
          playerBody.current.applyForceToCenter(
            planck.Vec2(-WALK_FORCE * (isGrounded.current ? 1 : AIR_CONTROL_FORCE), 0),
            true
          );
        }
        if (keys.current.right) {
          playerBody.current.applyForceToCenter(
            planck.Vec2(WALK_FORCE * (isGrounded.current ? 1 : AIR_CONTROL_FORCE), 0),
            true
          );
        }

        if (isGrounded.current && Math.abs(lastContactNormal.current.x) > 0.15) {
          const surfDir = Math.sign(-lastContactNormal.current.x);
          playerBody.current.applyForceToCenter(planck.Vec2(surfDir * SURF_BOOST, 0), true);
        }

        if (Math.abs(vel.x) > MAX_SPEED) {
          playerBody.current.setLinearVelocity(
            planck.Vec2(Math.sign(vel.x) * MAX_SPEED, vel.y)
          );
        }

        if (vel.y < -MAX_UP_SPEED) {
          playerBody.current.setLinearVelocity(planck.Vec2(vel.x, -MAX_UP_SPEED));
        } else if (vel.y > MAX_DOWN_SPEED) {
          playerBody.current.setLinearVelocity(planck.Vec2(vel.x, MAX_DOWN_SPEED));
        }

        if (keys.current.jump && isGrounded.current) {
          playerBody.current.applyLinearImpulse(
            planck.Vec2(0, -JUMP_IMPULSE),
            playerBody.current.getWorldCenter(),
            true
          );
          isGrounded.current = false;
          keys.current.jump = false;
        }
      }

      if (playerBody.current) {
        const touching = contactCount.current > 0;
        if (!touching && !gameResult) {
          noContactTimer.current += 1 / 60;
          if (noContactTimer.current >= 10) {
            noContactTimer.current = 0;
            setGameResult("lose");
          }
        } else if (touching) {
          noContactTimer.current = 0;
        }
      }

      world.step(1 / 60);

      if (gameResult === "lose" && !deathFragmentsSpawned.current) {
        spawnDeathFragments();
      }

      if (!gameResult && playerBody.current) {
        const playerPos = playerBody.current.getPosition();
        setCamera((prev) => ({
          ...prev,
          x: stageSize.width / 2 - toPixels(playerPos.x) * prev.zoom,
          y: stageSize.height / 2 - toPixels(playerPos.y) * prev.zoom,
        }));
      }

      forceRender((prev) => prev + 1);
    };

    update();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    physicsEnabled,
    stageSize,
    setCamera,
    forceRender,
    toPixels,
    gameResult,
    setGameResult,
    spawnDeathFragments,
  ]);

  return {
    buildWorld,
    worldRef,
    playerBody,
  };
}