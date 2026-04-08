import planck from "planck-js";
import confetti from "canvas-confetti";
import { Stage, Layer, Rect, Circle, Line, Group, Text } from "react-konva";
import { useState, useRef, useEffect } from "react";

import { createWorld } from "./physics/World";
import Player from "./objects/Player";
import Flag from "./objects/Flag";
import LineObj from "./objects/Line";

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 2000;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_SPEED = 0.1;

const SCALE = 30; // pixels per meter

export default function Game() {
  function toWorld(x) {
    return x / SCALE;
}

  function toPixels(x) {
    return x * SCALE;
  }

  const containerRef = useRef();

  // ===== STATE =====
  const [objects, setObjects] = useState([
    { id: "player", type: "player", x: 70, y: 50 },
    { id: "flag", type: "flag", x: 750, y: 650 },
  ]);

  const [lines, setLines] = useState([]);

  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  const [stageSize, setStageSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  // ===== REFS =====
  const worldRef = useRef(null);
  const playerBody = useRef(null);
  const playerOnGround = useRef(false);

  const isDrawing = useRef(false);
  const drawEnabled = useRef(false);

  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const selectedId = useRef(null);

  const [, forceRender] = useState(0);

  // ===== BUILD PHYSICS =====
  function buildWorld() {
    const world = createWorld();

    objects.forEach((obj) => {
      if (obj.type === "player") {
        const body = world.createBody({
          type: "dynamic",
          position: planck.Vec2(toWorld(obj.x), toWorld(obj.y)),
        });

        body.createFixture(planck.Circle(toWorld(10)), {
          density: 50,
          friction: 0.1,
        });

        playerBody.current = body;
      }

      if (obj.type === "line") {
        const body = world.createBody();

        for (let i = 0; i < obj.points.length - 2; i += 2) {
          const v1 = planck.Vec2(toWorld(obj.points[i]), toWorld(obj.points[i + 1]));
          const v2 = planck.Vec2(toWorld(obj.points[i + 2]), toWorld(obj.points[i + 3]));

          body.createFixture(planck.Edge(v1, v2), {
            friction: 0.2,
          });
        }
      }
    })
    // collision
    world.on("begin-contact", (c) => {
      const a = c.getFixtureA().getBody();
      const b = c.getFixtureB().getBody();

      if (a === playerBody.current || b === playerBody.current) {
        playerOnGround.current = true;
      }
    });

    world.on("end-contact", (c) => {
      const a = c.getFixtureA().getBody();
      const b = c.getFixtureB().getBody();

      if (a === playerBody.current || b === playerBody.current) {
        playerOnGround.current = false;
      }
    });

    worldRef.current = world;
  }

  // ===== PHYSICS LOOP =====
  useEffect(() => {
    if (!physicsEnabled) return;

    let frame;

    function update() {
      worldRef.current.step(1 / 60);

      const pos = playerBody.current?.getPosition();

      if (pos) {
        // camera follow
        setCamera((prev) => ({
          ...prev,
          x: stageSize.width / 2 - toPixels(pos.x) * prev.zoom,
          y: stageSize.height / 2 - toPixels(pos.y) * prev.zoom,
        }));

        // win check
        const flag = objects.find((o) => o.type === "flag");
        if (flag) {
          const dist = Math.hypot(pos.x - flag.x, pos.y - flag.y);
          if (dist < 30 && !hasWon) {
            setHasWon(true);
            confetti();
          }
        }
      }

      forceRender((t) => t + 1);
      frame = requestAnimationFrame(update);
    }

    update();
    return () => cancelAnimationFrame(frame);
  }, [physicsEnabled]);

  // ===== CONTROLS =====
  useEffect(() => {
    function handleKey(e) {
      if (!physicsEnabled) return;

      if (e.code === "Space" && playerOnGround.current) {
        playerBody.current.applyLinearImpulse(
          planck.Vec2(0, -2),
          playerBody.current.getWorldCenter()
        );
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [physicsEnabled]);

  // ===== CAMERA =====
  function screenToWorld(x, y) {
    return {
      x: (x - camera.x) / camera.zoom,
      y: (y - camera.y) / camera.zoom,
    };
  }

  function handleWheel(e) {
    if (physicsEnabled) return;

    e.evt.preventDefault();

    const delta = e.evt.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom + delta));

    setCamera((prev) => ({
      ...prev,
      zoom,
    }));
  }

  function startPan(e) {
    if (physicsEnabled || drawEnabled.current) return;

    isPanning.current = true;
    lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
  }

  function movePan(e) {
    if (!isPanning.current) return;

    const dx = e.evt.clientX - lastPan.current.x;
    const dy = e.evt.clientY - lastPan.current.y;

    setCamera((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
  }

  function endPan() {
    isPanning.current = false;
  }

  // ===== DRAW =====
  function handleMouseDown(e) {
    console.log("Mouse down", { physicsEnabled, drawEnabled: drawEnabled.current, selectedId: selectedId.current });
    if (physicsEnabled) return;

    if (drawEnabled.current) {
      isDrawing.current = true;
      const pos = screenToWorld(e.evt.clientX, e.evt.clientY);
      setLines([...lines, { points: [pos.x, pos.y] }]);
    } else {
      startPan(e);
    }
  }

  function handleMouseMove(e) {
    if (physicsEnabled) return;

    if (isPanning.current) {
      movePan(e);
      return;
    }

    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const p = stage.getPointerPosition();
    const pos = screenToWorld(p.x, p.y);

    const last = lines[lines.length - 1];
    last.points = last.points.concat([pos.x, pos.y]);

    const updated = [...lines];
    updated[updated.length - 1] = last;
    setLines(updated);
  }

  function handleMouseUp() {
    selectedId.current = null;
    if (physicsEnabled) return;

    if (isDrawing.current) {
      const last = lines[lines.length - 1];

      setObjects((prev) => [
        ...prev,
        {
          id: "line-" + Date.now(),
          type: "line",
          points: last.points,
        },
      ]);
    }

    isDrawing.current = false;
    drawEnabled.current = false;
    endPan();
  }

  // ===== RESIZE =====
  useEffect(() => {
    const resize = () => {
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      setStageSize({ width: w, height: h });
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ===== GAME CONTROL =====
  function startGame() {
    buildWorld();
    setHasWon(false);
    setPhysicsEnabled(true);
  }

  function stopGame() {
    setPhysicsEnabled(false);
    setHasWon(false);
    worldRef.current = null;
  }

  // ===== RENDER =====
  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onWheel={handleWheel}
        onMouseDown= {handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer
          x={camera.x}
          y={camera.y}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
        >
          <Rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="#5f6782" />

          {objects.map((obj) => {
            if (obj.type === "player") {
                const pos = playerBody.current?.getPosition();

                const x = physicsEnabled && pos ? toPixels(pos.x) : obj.x;
                const y = physicsEnabled && pos ? toPixels(pos.y) : obj.y;

                return (
                <Player
                    key={obj.id}
                    x={x}
                    y={y}
                    draggable={!physicsEnabled}
                    onSelect={() => (selectedId.current = obj.id)}
                />
                );
            }

            if (obj.type === "flag") {
                return (
                <Flag
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    draggable={!physicsEnabled}
                    onSelect={() => (selectedId.current = obj.id)}
                />
                );
            }

            if (obj.type === "line") {
                return (
                <LineObj
                    key={obj.id}
                    points={obj.points}
                    draggable={!physicsEnabled}
                    selected={selectedId.current === obj.id}
                    onSelect={() => (selectedId.current = obj.id)}
                />
                );
            }

            return null;
            })}
        </Layer>

        <Layer>
          <Text text="Draw Line" x={10} y={40} fill="white"
            onClick={() => (drawEnabled.current = true)} />

          <Text text="Start" x={10} y={70} fill="#51cf66"
            onClick={startGame} />

          <Text text="Stop" x={10} y={100} fill="#ff6b6b"
            onClick={stopGame} />

          <Text text="Space = Jump" x={10} y={140} fill="white" />

          {/* Win Screen */}
            {hasWon && (
              <>
                <Rect
                  x={0}
                  y={0}
                  width={stageSize.width}
                  height={stageSize.height}
                  fill="rgba(0,0,0,0.6)"
                />
                <Text
                  text="🎉 YOU WIN! 🎉"
                  x={stageSize.width / 2}
                  y={stageSize.height / 2}
                  fontSize={48}
                  fill="white"
                  align="center"
                  offsetX={120}
                  offsetY={24}
                />
                <Text
                  text="Click to continue"
                  x={stageSize.width / 2}
                  y={stageSize.height / 2 + 80}
                  fontSize={20}
                  fill="white"
                  align="center"
                  offsetX={70}
                  onClick={stopGame}
                />
              </>
            )}
        </Layer>
      </Stage>
    </div>
  );
}