import { useEffect, useRef, useState } from "react";
import "../styles/InputOverlay.css";

export default function InputOverlay({ isPlaying, onReset, onInputDown, onInputUp }) {
  const leftBtnRef = useRef(null);
  const rightBtnRef = useRef(null);
  const jumpBtnRef = useRef(null);
  const [pressedKeys, setPressedKeys] = useState({
    left: false,
    right: false,
    jump: false,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setPressedKeys((prev) => ({ ...prev, left: true }));
      } else if (e.key === "ArrowRight") {
        setPressedKeys((prev) => ({ ...prev, right: true }));
      } else if (e.key === " ") {
        setPressedKeys((prev) => ({ ...prev, jump: true }));
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft") {
        setPressedKeys((prev) => ({ ...prev, left: false }));
      } else if (e.key === "ArrowRight") {
        setPressedKeys((prev) => ({ ...prev, right: false }));
      } else if (e.key === " ") {
        setPressedKeys((prev) => ({ ...prev, jump: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying]);

  const handleTouchStart = (key) => {
    setPressedKeys((prev) => ({ ...prev, [key]: true }));
    if (onInputDown) onInputDown(key);
  };

  const handleTouchEnd = (key) => {
    setPressedKeys((prev) => ({ ...prev, [key]: false }));
    if (onInputUp) onInputUp(key);
  };

  if (!isPlaying) return null;

  const overlayClass = `input-overlay ${isMobile ? "" : "input-overlay--desktop"}`;

  return (
    <div className={overlayClass}>
      <div className="input-overlay__group">
        <div className="input-overlay__arrow_keys"> 
            <button
            ref={leftBtnRef}
            className={`input-overlay__button input-overlay__button--left ${
                pressedKeys.left ? "input-overlay__button--active" : ""
            }`}
            onPointerDown={(e) => { e.preventDefault(); handleTouchStart("left"); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouchEnd("left"); }}
            onPointerCancel={() => handleTouchEnd("left")}
            onPointerLeave={() => handleTouchEnd("left")}
            >
            ◀
            </button>
            <button
            ref={rightBtnRef}
            className={`input-overlay__button input-overlay__button--right ${
                pressedKeys.right ? "input-overlay__button--active" : ""
            }`}
            onPointerDown={(e) => { e.preventDefault(); handleTouchStart("right"); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouchEnd("right"); }}
            onPointerCancel={() => handleTouchEnd("right")}
            onPointerLeave={() => handleTouchEnd("right")}
            >
            ▶
            </button>
        </div>
            <button
            ref={jumpBtnRef}
            className={`input-overlay__button input-overlay__button--jump ${
                pressedKeys.jump ? "input-overlay__button--active" : ""
            }`}
            onPointerDown={(e) => { e.preventDefault(); handleTouchStart("jump"); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouchEnd("jump"); }}
            onPointerCancel={() => handleTouchEnd("jump")}
            onPointerLeave={() => handleTouchEnd("jump")}
            >
            JUMP
            </button>
      </div>
    </div>
  );
}