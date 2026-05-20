import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";

import Player from "./objects/Player";
import Flag from "./objects/Flag";
import LineObj from "./objects/Line";
import useCamera from "../../hooks/useCamera";
import useDrawing from "../../hooks/useDrawing";
import usePhysics from "../../hooks/usePhysics";
import useObjects from "../../hooks/useObjects";
import useApi from "../../hooks/useApi";
import "../../styles/Game.css";
import { useTheme } from "../../context/ThemeContext";

const DEFAULT_WORLD = [
  { id: "player", type: "player", x: 70, y: 50 },
  { id: "flag", type: "flag", x: 750, y: 650 },
];

const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };

function Game(props, ref) {
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [toolMode, setToolMode] = useState(null);
  const [objectMenuPos, setObjectMenuPos] = useState(null);
  const [, forceRender] = useState(0);

  const containerRef = useRef();
  const runStartState = useRef(null);

  const {
    stageSize,
    setStageSize,
    camera,
    setCamera,
    screenToWorld,
    handleWheel,
    startPan,
    movePan,
    endPan,
    isPanning,
    resetCamera,
  } = useCamera(DEFAULT_CAMERA);
  const drawing = useDrawing(screenToWorld, toolMode === "draw");
  const {
    objects,
    setObjects,
    selectedId,
    selectedObject,
    setSelectedId,
    handleObjectDragEnd,
    handleLineDragEnd,
    deleteSelectedObject,
    canDeleteSelectedObject,
    saveSelectedObjectPosition,
    clearPendingPosition,
  } = useObjects(DEFAULT_WORLD);

  const { buildWorld, playerBody } = usePhysics(
    objects,
    physicsEnabled,
    stageSize,
    setCamera,
    setHasWon,
    hasWon,
    forceRender
  );
  const { getWorlds } = useApi();

  useEffect(() => {
    const loadPublicWorlds = async () => {
      const worlds = await getWorlds();
      if (!worlds?.length) return;
      const weekly = worlds.find((world) => world.is_weekly_world);
      const selected = weekly || worlds[0];
      if (selected?.world_data) {
        setObjects(selected.world_data);
      }
    };
    loadPublicWorlds();
  }, [getWorlds, setObjects]);

  useEffect(() => {
    const resize = () => {
      const width = containerRef.current?.offsetWidth ?? window.innerWidth;
      const height = containerRef.current?.offsetHeight ?? window.innerHeight;
      setStageSize({ width, height });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [setStageSize]);

  useEffect(() => {
    if (!selectedId) {
      setObjectMenuPos(null);
      return;
    }

    const obj = selectedObject || objects.find((item) => item.id === selectedId);
    if (!obj) return;

    setObjectMenuPos({
      x: obj.x * camera.zoom + camera.x,
      y: obj.y * camera.zoom + camera.y + 40,
    });
  }, [selectedId, selectedObject, objects, camera]);

  useEffect(() => {
    if (toolMode !== "select") {
      setSelectedId(null);
      setObjectMenuPos(null);
    }
  }, [toolMode, setSelectedId]);

  const resetRun = useCallback(() => {
    setPhysicsEnabled(false);
    setHasWon(false);
    if (runStartState.current) {
      setObjects(JSON.parse(JSON.stringify(runStartState.current)));
    }
    resetCamera(DEFAULT_CAMERA);
  }, [setObjects, resetCamera]);

  

  useEffect(() => {
    if (hasWon && physicsEnabled) {
      setPhysicsEnabled(false);
    }
  }, [hasWon, physicsEnabled]);

  const startGame = () => {
    runStartState.current = JSON.parse(JSON.stringify(objects));
    setSelectedId(null);
    setObjectMenuPos(null);
    setHasWon(false);
    setPhysicsEnabled(true);
    resetCamera(DEFAULT_CAMERA);
    buildWorld();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyR" && physicsEnabled) {
        e.preventDefault();
        resetRun();
      }

      if (e.code === "Space" && !physicsEnabled) {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [physicsEnabled, resetRun, startGame]);

  const stopGame = () => {
    setPhysicsEnabled(false);
    setHasWon(false);
    setSelectedId(null);
    setObjectMenuPos(null);
    resetCamera(DEFAULT_CAMERA);
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const clickedOnStageBackground =
      e.target === stage || e.target.name() === "background";

    if (physicsEnabled) {
      return;
    }

    if (toolMode === "draw") {
      if (drawing.handleMouseDown(e)) return;
      if (clickedOnStageBackground) setSelectedId(null);
      return;
    }

    if (toolMode === "select") {
      if (clickedOnStageBackground) {
        setSelectedId(null);
        setObjectMenuPos(null);
      }
      return;
    }

    if (clickedOnStageBackground && e.evt.button === 0) {
      startPan(e.evt);
      return;
    }

    if (clickedOnStageBackground) {
      setSelectedId(null);
      setObjectMenuPos(null);
    }
  };

  const handleMouseMove = (e) => {
    if (toolMode === "draw") {
      drawing.handleMouseMove(e);
    } else if (isPanning) {
      movePan(e.evt);
    }
  };

  const handleMouseUp = () => {
    if (toolMode === "draw") {
      const finishedLine = drawing.handleMouseUp();
      if (finishedLine) {
        setObjects((prev) => [...prev, finishedLine]);
      }
    }
    if (isPanning) {
      endPan();
    }
  };

  const renderObject = (obj) => {
    const renderObj = obj.id === selectedId && selectedObject ? selectedObject : obj;
    const isPlayer = renderObj.type === "player";
    const playerPos =
      isPlayer && physicsEnabled && playerBody.current
        ? playerBody.current.getPosition()
        : null;

    const x = playerPos ? playerPos.x * 30 : renderObj.x ?? 0;
    const y = playerPos ? playerPos.y * 30 : renderObj.y ?? 0;

    let props = {
      x,
      y,
      draggable: toolMode === "select",
      selected: selectedId === renderObj.id && toolMode === "select",
      onSelect: () => {
        if (toolMode === "select") {
          setSelectedId(renderObj.id);
        }
      },
      onDragEnd: (event) => {
        if (renderObj.type === "line") {
          handleLineDragEnd(renderObj.id, event);
        } else {
          handleObjectDragEnd(renderObj.id, event);
        }
      },
    };

    if (renderObj.type === "player") return <Player key={renderObj.id} {...props} />;
    if (renderObj.type === "flag") return <Flag key={renderObj.id} {...props} />;
    if (renderObj.type === "line")
      return <LineObj key={renderObj.id} {...props} points={renderObj.points} />;
    return null;
  };

  const { theme } = useTheme();

  const getCanvasBg = () => {
    return theme === "light" ? "#e0f2fe" : "#1a1f2e";
  };

  return (
    <div className="game">
      <div ref={containerRef} className="game__canvas-wrapper">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? "grabbing" : toolMode === "draw" ? "crosshair" : "default" }}
        >
          <Layer>
            <Rect
              name="background"
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fill={getCanvasBg()}
            />
            <Group x={camera.x} y={camera.y} scaleX={camera.zoom} scaleY={camera.zoom}>
              {objects.map(renderObject)}
              {drawing.lines[0] && (
                <LineObj
                  key="draft-line"
                  x={drawing.lines[0].x}
                  y={drawing.lines[0].y}
                  points={drawing.lines[0].points}
                />
              )}
            </Group>
          </Layer>
        </Stage>

        <div className="game__controls">
          <button onClick={startGame} disabled={physicsEnabled}>Start Game</button>
          <button onClick={stopGame} disabled={!physicsEnabled}>Stop Game</button>
          <button onClick={resetRun} disabled={!physicsEnabled}>Reset Run</button>
        </div>

        <div className="tool-menu">
          {!toolMode ? (
            <>
              <button onClick={() => setToolMode("draw")}>Draw Line</button>
              <button onClick={() => setToolMode("select")}>Move/Delete Object</button>
            </>
          ) : (
            <>
              <button onClick={() => setToolMode(null)}>Back</button>
              <div style={{ color: "#ccc", fontSize: "12px", marginTop: "4px" }}>
                {toolMode === "draw" ? "Click and drag to draw." : "Click an object to select it."}
              </div>
            </>
          )}
        </div>

        {toolMode === "select" && selectedId && objectMenuPos && (
          <div className="object-menu" style={{ top: objectMenuPos.y, left: objectMenuPos.x }}>
            <button
              onClick={() => {
                saveSelectedObjectPosition();
                setSelectedId(null);
                setObjectMenuPos(null);
              }}
            >
              Save position
            </button>
            <button
              onClick={() => {
                clearPendingPosition();
                setSelectedId(null);
                setObjectMenuPos(null);
              }}
            >
              Cancel
            </button>
            {canDeleteSelectedObject() && (
              <button
                onClick={() => {
                  deleteSelectedObject();
                  setSelectedId(null);
                  setObjectMenuPos(null);
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}

        {physicsEnabled && <div className="game__status">Physics enabled — arrow left/right to move, space to jump</div>}
        {hasWon && <div className="game__win">You Won!</div>}
      </div>
    </div>
  );
}

export default forwardRef(Game);