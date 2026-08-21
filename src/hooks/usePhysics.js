import { useCallback, useEffect, useRef } from "react";
import * as planck from "planck-js";

const SCALE = 30;
const FLAG_RADIUS = 25;

const WALK_FORCE = 0.5;
const AIR_CONTROL_FORCE = 5;
const MAX_SPEED = 100;
const MAX_UP_SPEED = 30;
const MAX_DOWN_SPEED = 100;
const JUMP_IMPULSE = 4;
const SURF_BOOST = 0.2;

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
  const keys = useRef({ left: false, right: false, jumpHeld: false });
  // tracks whether on-screen buttons are currently held (pointer down)
  const inputHeldRef = useRef({ left: false, right: false, jump: false });
  const activeBoostsRef = useRef(new Map());
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
        // if jump button is held on overlay, re-arm jump on contact so holding jump auto-jumps
        if (inputHeldRef.current.jump) {
          keys.current.jumpHeld = true;
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

      // Boost pad: either single impulse or add to active boosts for continuous application
      if (
        (aData?.type === "boost" && bodyB === playerBody.current) ||
        (bData?.type === "boost" && bodyA === playerBody.current)
      ) {
        const boostData = aData?.type === "boost" ? aData : bData;
        try {
          const id = boostData.id ?? `${boostData.rotation}_${boostData.strength}`;
          if (boostData.continuous !== false) {
            activeBoostsRef.current.set(id, boostData);
          } else {
            const rot = boostData.rotation || 0; // radians
            const strength = typeof boostData.strength === 'number' ? boostData.strength : 1.2;
            const imp = planck.Vec2(Math.cos(rot) * strength, Math.sin(rot) * strength);
            playerBody.current.applyLinearImpulse(imp, playerBody.current.getWorldCenter(), true);
          }
        } catch (e) {}
      }

      // Bounce pad: reflect player's velocity based on contact normal and bounce factor
      if (
        (aData?.type === "bounce_pad" && bodyB === playerBody.current) ||
        (bData?.type === "bounce_pad" && bodyA === playerBody.current)
      ) {
        const padData = aData?.type === "bounce_pad" ? aData : bData;
        try {
          const manifold = contact.getWorldManifold();
          if (manifold && manifold.normal && playerBody.current) {
            const normal = manifold.normal;
            const vel = playerBody.current.getLinearVelocity();
            const vdot = vel.x * normal.x + vel.y * normal.y;
            const bounce = typeof padData.bounce === 'number' ? padData.bounce : 1.0;
            // v' = v - (1 + bounce) * (v·n) * n
            const vx = vel.x - (1 + bounce) * vdot * normal.x;
            const vy = vel.y - (1 + bounce) * vdot * normal.y;
            playerBody.current.setLinearVelocity(planck.Vec2(vx, vy));
          }
        } catch (e) {}
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

      // remove boost from active map when leaving sensor
      const aData = bodyA.getUserData?.();
      const bData = bodyB.getUserData?.();
      if ((aData?.type === 'boost' && bodyB === playerBody.current) || (bData?.type === 'boost' && bodyA === playerBody.current)) {
        const boostData = aData?.type === 'boost' ? aData : bData;
        const id = boostData.id ?? `${boostData.rotation}_${boostData.strength}`;
        activeBoostsRef.current.delete(id);
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
      } else if (obj.type === "boost") {
        // boost: static sensor rectangle with rotation and strength
        const rot = (obj.rotation ?? 0) * (Math.PI / 180);
        const w = toWorld(obj.width ?? 120);
        const h = toWorld(obj.height ?? 40);
        const body = world.createBody({ type: "static", position: planck.Vec2(toWorld(obj.x), toWorld(obj.y)) });
        const fixture = body.createFixture(planck.Box(w / 2, h / 2), { isSensor: true });
        body.setTransform(body.getPosition(), rot);
        body.setUserData({ id: obj.id, type: 'boost', id: obj.id, rotation: rot, strength: obj.strength ?? 1.2, continuous: obj.continuous !== false });
        bodiesRef.current.set(obj.id, body);
      } else if (obj.type === "bounce_pad") {
        // bounce pad: static edge rotated by rotation with given length
        const rot = (obj.rotation ?? 0) * (Math.PI / 180);
        const len = toWorld(obj.length ?? 120);
        const cx = toWorld(obj.x);
        const cy = toWorld(obj.y);
        const dx = Math.cos(rot) * (len / 2);
        const dy = Math.sin(rot) * (len / 2);
        const p1 = planck.Vec2(cx - dx, cy - dy);
        const p2 = planck.Vec2(cx + dx, cy + dy);
        const body = world.createBody({ type: 'static' });
        body.createFixture(planck.Edge(p1, p2), { friction: 0.05 });
        body.setUserData({ id: obj.id, type: 'bounce_pad', bounce: obj.bounce ?? 1.0 });
        bodiesRef.current.set(obj.id, body);
      }
    });
  }, [objects, toWorld, gameResult, setGameResult]);

  // Keyboard listeners - runs once when component mounts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") keys.current.left = true;
      if (event.key === "ArrowRight") keys.current.right = true;
      if (event.key === " ") {
        keys.current.jumpHeld = true;
        event.preventDefault();
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === "ArrowLeft") keys.current.left = false;
      if (event.key === "ArrowRight") keys.current.right = false;
      if (event.key === " ") keys.current.jumpHeld = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // programmatic input API for on-screen controls
  const setInputDown = useCallback((key) => {
    inputHeldRef.current[key] = true;
    if (key === "left") keys.current.left = true;
    if (key === "right") keys.current.right = true;
    if (key === "jump") keys.current.jumpHeld = true;
  }, []);

  const setInputUp = useCallback((key) => {
    inputHeldRef.current[key] = false;
    if (key === "left") keys.current.left = false;
    if (key === "right") keys.current.right = false;
    if (key === "jump") keys.current.jumpHeld = false;
  }, []);

  // Physics loop - only runs when physicsEnabled is true
  useEffect(() => {
    if (!physicsEnabled || !worldRef.current) return;

    let frameId = null;
    const world = worldRef.current;

    const update = () => {
      frameId = requestAnimationFrame(update);

      if (playerBody.current) {
        const vel = playerBody.current.getLinearVelocity();

        // apply continuous boost impulses if player is inside boost sensors
        if (activeBoostsRef.current.size > 0) {
          activeBoostsRef.current.forEach((b) => {
            try {
              const rot = b.rotation || 0;
              const strength = typeof b.strength === 'number' ? b.strength : 1.2;
              // small per-frame impulse to feel continuous
              const impMag = strength * 0.3;
              playerBody.current.applyLinearImpulse(
                planck.Vec2(Math.cos(rot) * impMag, Math.sin(rot) * impMag),
                playerBody.current.getWorldCenter(),
                true
              );
            } catch (e) {}
          });
        }

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

        if (keys.current.jumpHeld && isGrounded.current) {
          playerBody.current.applyLinearImpulse(
            planck.Vec2(0, -JUMP_IMPULSE),
            playerBody.current.getWorldCenter(),
            true
          );
          isGrounded.current = false;
          keys.current.jumpHeld = false;
        }
      }

      if (playerBody.current) {
        const touching = contactCount.current > 0;
        if (!touching && !gameResult) {
          noContactTimer.current += 1 / 60;
          if (noContactTimer.current >= 10 && !gameResult) {
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
    setInputDown,
    setInputUp,
  };
}