import { Stage, Layer, Rect, Circle, Line, Group, Text } from "react-konva";
import { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";

const GRAVITY = 0.5;
const FRICTION = 0.98;
const PLAYER_RADIUS = 10;
const FLAG_COLLISION_DISTANCE = 30;
const LINE_SMOOTHING_FACTOR = 1; // 0-1, higher = smoother

// World dimensions (much larger than screen)
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 2000;

// Camera settings
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.0;
const ZOOM_SPEED = 0.1;

export default function Game_p() {
  const [world, setWorld] = useState({
    objects: [
      { id: "player", type: "player", x: 70, y: 50 },
      { id: "flag", type: "flag", x: 750, y: 650 }
    ]
  });

  // Store initial player position for reset
  const initialPlayerPos = useRef({ x: 70, y: 50 });

  const [selectedId, setSelectedId] = useState(null);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const containerRef = useRef();

  // Camera state
  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    zoom: 1.0
  });
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Physics state
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const playerVelocity = useRef({ vx: 0, vy: 0 });
  const playerOnLine = useRef(false);

  {/* Drawing state */}
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  const drawEnabled = useRef(false);

  // Camera control functions
  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - camera.x) / camera.zoom,
      y: (screenY - camera.y) / camera.zoom
    };
  }

  function worldToScreen(worldX, worldY) {
    return {
      x: worldX * camera.zoom + camera.x,
      y: worldY * camera.zoom + camera.y
    };
  }

  function handleWheel(e) {
    e.evt.preventDefault();
    
    const mousePos = { x: e.evt.clientX, y: e.evt.clientY };
    const worldPos = screenToWorld(mousePos.x, mousePos.y);
    
    const zoomDelta = e.evt.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom + zoomDelta));
    
    // Zoom towards mouse position
    const newX = mousePos.x - worldPos.x * newZoom;
    const newY = mousePos.y - worldPos.y * newZoom;
    
    setCamera({
      x: newX,
      y: newY,
      zoom: newZoom
    });
  }

  function startPan(e) {
    if (drawEnabled.current || physicsEnabled) return;
    isPanning.current = true;
    lastPanPoint.current = { x: e.evt.clientX, y: e.evt.clientY };
  }

  function updatePan(e) {
    if (!isPanning.current) return;
    
    const dx = e.evt.clientX - lastPanPoint.current.x;
    const dy = e.evt.clientY - lastPanPoint.current.y;
    
    setCamera(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    lastPanPoint.current = { x: e.evt.clientX, y: e.evt.clientY };
  }

  function endPan() {
    isPanning.current = false;
  }

  const handleMouseDown = (e) => {
    if (isPanning.current) return;
    
    (drawEnabled.current ? isDrawing.current = true : isDrawing.current = false);

    if (isDrawing.current) {
      const worldPos = screenToWorld(e.evt.clientX, e.evt.clientY);
      setLines([...lines, { tool: "pen", points: [worldPos.x, worldPos.y] }]);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning.current) {
      updatePan(e);
      return;
    }
    
    // no drawing - skipping
    if (!isDrawing.current) {
      return;
    }
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const worldPos = screenToWorld(point.x, point.y);
    
    const lastLine = lines[lines.length - 1];
    // add point
    const updatedPoints = lastLine.points.concat([worldPos.x, worldPos.y]);
    const updatedLine = { ...lastLine, points: updatedPoints };

    // replace last in lines state only
    const updatedLines = [...lines];
    updatedLines[updatedLines.length - 1] = updatedLine;
    setLines(updatedLines);
  };

  const handleMouseUp = () => {
    if (isPanning.current) {
      endPan();
      return;
    }
    
    // Only add the finished line to world when drawing ends
    if (isDrawing.current && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const smoothedPoints = smoothLinePoints(lastLine.points);
      setWorld(prev => ({
        ...prev,
        objects: [...prev.objects, { 
          id: `line${Date.now()}`, 
          type: "line", 
          points: smoothedPoints,
          x: 0,
          y: 0
        }]
      }));
    }
    isDrawing.current = false;
    drawEnabled.current = false;
  };

  // Smooth line using Catmull-Rom-like interpolation
  function smoothLinePoints(points) {
    if (points.length < 4) return points;
    
    const smoothed = [];
    const factor = LINE_SMOOTHING_FACTOR;
    
    //smoothed.push(points[0], points[1]); // First point stays
    
    for (let i = 2; i < points.length - 2; i += 2) {
      const x0 = points[i - 2];
      const y0 = points[i - 1];
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[i + 2];
      const y2 = points[i + 3];
      const x3 = points[i + 4] || x2;
      const y3 = points[i + 5] || y2;
      
      // Add intermediate points for smoothing
      for (let t = 0; t <= 1; t += factor) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        // Catmull-Rom matrix
        const q = 0.5 * (
          (2 * x1) +
          (-x0 + x2) * t +
          (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 +
          (-x0 + 3 * x1 - 3 * x2 + x3) * t3
        );
        
        const r = 0.5 * (
          (2 * y1) +
          (-y0 + y2) * t +
          (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
          (-y0 + 3 * y1 - 3 * y2 + y3) * t3
        );
        
        smoothed.push(q, r);
      }
    }
    
    // Add last two points
    smoothed.push(points[points.length - 2], points[points.length - 1]);
    return smoothed;
  }

  // Helper function to find closest point on line segment
  function getClosestPointOnLine(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) {
      const distance = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      return {
        closestX: x1,
        closestY: y1,
        distance,
        onSegment: distance < PLAYER_RADIUS + 10,
        x1,
        y1,
        x2,
        y2
      };
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);

    return {
      closestX,
      closestY,
      distance,
      onSegment: distance < PLAYER_RADIUS + 10,
      x1,
      y1,
      x2,
      y2
    };
  }

  // Physics loop
  useEffect(() => {
    if (!physicsEnabled || hasWon) return;

    const interval = setInterval(() => {
      setWorld(prev => {
        const playerObj = prev.objects.find(o => o.id === "player");
        const flagObj = prev.objects.find(o => o.id === "flag");

        if (!playerObj || !flagObj) return prev;

        let newVx = playerVelocity.current.vx * FRICTION;
        let newVy = playerVelocity.current.vy + GRAVITY;

        let newX = playerObj.x + newVx;
        let newY = playerObj.y + newVy;

        // Check collision with lines
        playerOnLine.current = false;
        let bestCollision = null;

        for (let lineObj of prev.objects) {
          if (lineObj.type !== "line" || !lineObj.points) continue;

          const points = lineObj.points;
          for (let i = 0; i < points.length - 2; i += 2) {
            // Account for line's position offset
            const x1 = lineObj.x + points[i];
            const y1 = lineObj.y + points[i + 1];
            const x2 = lineObj.x + points[i + 2];
            const y2 = lineObj.y + points[i + 3];

            const collision = getClosestPointOnLine(newX, newY, x1, y1, x2, y2);

            if (collision.onSegment && collision.distance < PLAYER_RADIUS + 5) {
              playerOnLine.current = true;
              
              // Keep the best (closest) collision
              if (!bestCollision || collision.distance < bestCollision.distance) {
                bestCollision = collision;
              }
            }
          }
        }

        if (bestCollision) {
          newY = bestCollision.closestY - PLAYER_RADIUS;
          
          // Calculate velocity based on line slope
          const dx = bestCollision.x2 - bestCollision.x1;
          const dy = bestCollision.y2 - bestCollision.y1;
          const slope = dy / (dx || 0.001);
          
          // Bounce velocity along the line
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          const lineAngle = Math.atan(slope);
          
          newVx = speed * Math.cos(lineAngle) * 1.005;
          newVy = speed * Math.sin(lineAngle) * 1.005;
        }

        // Check if fallen off world
        if (newY > stageSize.height + 100) {
          // Reset to initial position
          newX = initialPlayerPos.current.x;
          newY = initialPlayerPos.current.y;
          newVx = 0;
          newVy = 0;
        }

        playerVelocity.current = { vx: newVx, vy: newVy };

        // Check collision with flag
        const flagDist = Math.sqrt(
          (newX - flagObj.x) ** 2 + (newY - flagObj.y) ** 2
        );

        if (flagDist < FLAG_COLLISION_DISTANCE) {
          setHasWon(true);
          confetti({ particleCount: 100, spread: 70 });
        }

        return {
          ...prev,
          objects: prev.objects.map(obj =>
            obj.id === "player" ? { ...obj, x: newX, y: newY } : obj
          )
        };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [physicsEnabled, hasWon, stageSize.height]);

  function startPhysics() {
    // Update initial position to current player position
    const playerObj = world.objects.find(o => o.id === "player");
    if (playerObj) {
      initialPlayerPos.current = { x: playerObj.x, y: playerObj.y };
      playerVelocity.current = { vx: 0, vy: 0 };
    }
    setHasWon(false);
    setPhysicsEnabled(true);
    setSelectedId(null); // Clear selection when starting physics
  }

  function stopPhysics() {
    setPhysicsEnabled(false);
    playerVelocity.current = { vx: 0, vy: 0 };
  }

  {/* Screen resizing */}
  useEffect(() => {
    const updateSize = () => {
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      setStageSize({ width, height });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  function updateObjectPosition(id, x, y) {
    setWorld(prev => ({
      ...prev,
      objects: prev.objects.map(obj =>
        obj.id === id ? { ...obj, x: x, y: y } : obj
      )
    }));
  }

  function canDeleteObject(id) {
    // Check if it's the only player or flag
    const playerCount = world.objects.filter(o => o.type === "player").length;
    const flagCount = world.objects.filter(o => o.type === "flag").length;

    const obj = world.objects.find(o => o.id === id);
    if (obj?.type === "player" && playerCount === 1) return false;
    if (obj?.type === "flag" && flagCount === 1) return false;
    return true;
  }

  function renderOffScreenIndicators() {
    const indicators = [];
    const margin = 30;
    
    // Check player
    const playerObj = world.objects.find(o => o.id === "player");
    if (playerObj) {
      const screenPos = worldToScreen(playerObj.x, playerObj.y);
      if (screenPos.x < -margin || screenPos.x > stageSize.width + margin || 
          screenPos.y < -margin || screenPos.y > stageSize.height + margin) {
        
        // Calculate direction to player
        const centerX = stageSize.width / 2;
        const centerY = stageSize.height / 2;
        const angle = Math.atan2(screenPos.y - centerY, screenPos.x - centerX);
        
        // Position indicator on screen edge
        const distance = Math.min(stageSize.width, stageSize.height) / 2 - 50;
        const indicatorX = centerX + Math.cos(angle) * distance;
        const indicatorY = centerY + Math.sin(angle) * distance;
        
        indicators.push(
          <Group key="player-indicator" x={indicatorX} y={indicatorY}>
            <Circle radius={15} fill="#51cf66" stroke="white" strokeWidth={2} />
            <Text text="P" x={-4} y={-6} fontSize={12} fill="white" fontStyle="bold" />
            {/* Arrow pointing to player */}
            <Line 
              points={[0, 0, Math.cos(angle) * -20, Math.sin(angle) * -20]} 
              stroke="white" 
              strokeWidth={2}
              pointerLength={5}
              pointerWidth={5}
            />
          </Group>
        );
      }
    }
    
    // Check flag
    const flagObj = world.objects.find(o => o.id === "flag");
    if (flagObj) {
      const screenPos = worldToScreen(flagObj.x, flagObj.y);
      if (screenPos.x < -margin || screenPos.x > stageSize.width + margin || 
          screenPos.y < -margin || screenPos.y > stageSize.height + margin) {
        
        // Calculate direction to flag
        const centerX = stageSize.width / 2;
        const centerY = stageSize.height / 2;
        const angle = Math.atan2(screenPos.y - centerY, screenPos.x - centerX);
        
        // Position indicator on screen edge
        const distance = Math.min(stageSize.width, stageSize.height) / 2 - 70;
        const indicatorX = centerX + Math.cos(angle) * distance;
        const indicatorY = centerY + Math.sin(angle) * distance;
        
        indicators.push(
          <Group key="flag-indicator" x={indicatorX} y={indicatorY}>
            <Circle radius={15} fill="#ff6b6b" stroke="white" strokeWidth={2} />
            <Text text="F" x={-4} y={-6} fontSize={12} fill="white" fontStyle="bold" />
            {/* Arrow pointing to flag */}
            <Line 
              points={[0, 0, Math.cos(angle) * -20, Math.sin(angle) * -20]} 
              stroke="white" 
              strokeWidth={2}
              pointerLength={5}
              pointerWidth={5}
            />
          </Group>
        );
      }
    }
    
    return indicators;
  }

  function deleteObject(id) {
    if (!canDeleteObject(id)) return;
    setWorld(prev => ({
      ...prev,
      objects: prev.objects.filter(o => o.id !== id)
    }));
    setSelectedId(null);
  }

  return (
    <div className="game" ref={containerRef}>
      <Stage width={stageSize.width} 
        height={stageSize.height} 
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}>
        <Layer x={camera.x} y={camera.y} scaleX={camera.zoom} scaleY={camera.zoom}>
            {/* World area */}
            <Rect
              x={0}
              y={0}
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              fill="#5f6782"
              onClick={() => {setToolMenuOpen(false), setSelectedId(null)}}
              onMouseDown={startPan}
            />
            {/* World Objects */}
            {world.objects.map(obj => {
                return (
                  <Group
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    draggable={!physicsEnabled}
                    onDragEnd={(e) => {
                      if (!physicsEnabled) {
                        updateObjectPosition(obj.id, e.target.x(), e.target.y());
                      }
                    }}
                    onMouseDown={() => {
                      if (!physicsEnabled) {
                        setSelectedId(obj.id);
                      }
                    }}
                  >
                      {obj.type === "player" && (<>
                        {/* stick figure */}
                        <Circle radius={10} fill="white" y={-20} />
                        <Line points={[0, -10, 0, 20]} stroke="white" strokeWidth={2} />
                        <Line points={[-10, 0, 10, 0]} stroke="white" strokeWidth={2} />
                        <Rect width={40} height={10} y={20} offsetX={20} fill="blue" />
                      </>)}
                      {obj.type === "flag" && (
                        <>
                          <Rect width={5} height={40} fill="white" />
                          <Rect width={20} height={15} x={5} fill="red" />
                        </>
                      )}
                      {obj.type === "line" && (
                        <>
                          {/* Invisible thick line for easier clicking */}
                          <Line 
                            points={obj.points} 
                            stroke="transparent" 
                            strokeWidth={20}
                            listening={true}
                          />
                          {/* line */}
                          <Line 
                            points={obj.points} 
                            stroke={selectedId === obj.id ? "#ff6b6b" : "black"} 
                            strokeWidth={4}
                            lineCap="round"
                            lineJoin="round"
                          />
                        </>
                      )}
                    
                  </Group>
                );}
          )}

          {/* Off-screen indicators */}
          {renderOffScreenIndicators()}
        </Layer>

        {/* UI Layer (screen space, no camera transform) */}
        <Layer>
              <Group className="tool-menu"
                x={toolMenuOpen && !drawEnabled.current ? 0 : -140}
                y={0}
                listening={true}
              >
                <Rect
                  width={140}
                  height={stageSize.height}
                  fill="rgba(0,0,0,0.7)"
                />

                <Text
                  type="button" 
                  text="Draw Line"
                  y={50}
                  x={10}
                  fill="white"
                  fontSize={14}
                  onClick={() => {
                    drawEnabled.current = true;
                    setSelectedId(null);
                  }}
                />

                <Text
                  type="button"
                  text={physicsEnabled ? "Stop" : "Start"}
                  y={90}
                  x={10}
                  fill={physicsEnabled ? "#ff6b6b" : "#51cf66"}
                  fontSize={14}
                  onClick={() => physicsEnabled ? stopPhysics() : startPhysics()}
                />

                <Text
                  type="button"
                  text="Reset"
                  y={130}
                  x={10}
                  fill="white"
                  fontSize={14}
                  onClick={() => {
                    stopPhysics();
                    const playerObj = world.objects.find(o => o.id === "player");
                    if (playerObj) {
                      updateObjectPosition("player", initialPlayerPos.current.x, initialPlayerPos.current.y);
                    }
                  }}
                />
            </Group>

            {/* Toggle Button */}
            <Text
              text="≡"
              x={10}
              y={10}
              fontSize={24}
              fill="black"
              onClick={() => setToolMenuOpen(prev => !prev)}
            />

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
                  onClick={() => {
                    setHasWon(false);
                    stopPhysics();
                    const playerObj = world.objects.find(o => o.id === "player");
                    if (playerObj) {
                      updateObjectPosition("player", initialPlayerPos.current.x, initialPlayerPos.current.y);
                    }
                  }}
                />
              </>
            )}

            {/* Fixed Control Panel for Selected Object */}
            {selectedId && !physicsEnabled && (
              <Group x={stageSize.width - 150} y={10}>
                <Rect
                  width={150}
                  height={90}
                  fill="rgba(50,50,50,0.95)"
                  stroke="white"
                  strokeWidth={2}
                  cornerRadius={8}
                />
                <Text
                  text="Save Position"
                  x={10}
                  y={15}
                  fontSize={14}
                  fill="white"
                  onClick={() => {
                    const obj = world.objects.find(o => o.id === selectedId);
                    if (obj) {
                      updateObjectPosition(selectedId, obj.x, obj.y);
                      setSelectedId(null);
                    }
                  }}
                />
                <Line points={[10, 40, 140, 40]} stroke="white" strokeWidth={1} />
                <Text
                  text="Delete Object"
                  x={10}
                  y={50}
                  fontSize={14}
                  fill="#ff6b6b"
                  onClick={() => deleteObject(selectedId)}
                />
              </Group>
            )}
        </Layer>
      </Stage>
    </div>
  );
}
