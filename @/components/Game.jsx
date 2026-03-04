import { useEffect, useRef } from "react";
import "../src/styles/Game.css";

export default function Game() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--canvas-bg");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <main className="game">
      <canvas ref={canvasRef} className="game__canvas" />
    </main>
  );
}
