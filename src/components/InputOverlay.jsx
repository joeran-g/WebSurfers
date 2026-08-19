import { useEffect, useRef, useState } from "react";
import "../styles/InputOverlay.css";

export default function InputOverlay({ isPlaying, onReset }) {
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
    const event = new KeyboardEvent("keydown", {
      key: key === "left" ? "ArrowLeft" : key === "right" ? "ArrowRight" : " ",
      code: key === "left" ? "ArrowLeft" : key === "right" ? "ArrowRight" : "Space",
    });
    window.dispatchEvent(event);
  };

  const handleTouchEnd = (key) => {
    setPressedKeys((prev) => ({ ...prev, [key]: false }));
    const event = new KeyboardEvent("keyup", {
      key: key === "left" ? "ArrowLeft" : key === "right" ? "ArrowRight" : " ",
      code: key === "left" ? "ArrowLeft" : key === "right" ? "ArrowRight" : "Space",
    });
    window.dispatchEvent(event);
  };

  if (!isPlaying) return null;

  return (
    <div className="input-overlay">
      <div className="input-overlay__group">
        <div className="input-overlay__arrow_keys"> 
            <button
            ref={leftBtnRef}
            className={`input-overlay__button input-overlay__button--left ${
                pressedKeys.left ? "input-overlay__button--active" : ""
            }`}
            onTouchStart={() => handleTouchStart("left")}
            onTouchEnd={() => handleTouchEnd("left")}
            >
            ◀
            </button>
            <button
            ref={rightBtnRef}
            className={`input-overlay__button input-overlay__button--right ${
                pressedKeys.right ? "input-overlay__button--active" : ""
            }`}
            onTouchStart={() => handleTouchStart("right")}
            onTouchEnd={() => handleTouchEnd("right")}
            >
            ▶
            </button>
        </div>
            <button
            ref={jumpBtnRef}
            className={`input-overlay__button input-overlay__button--jump ${
                pressedKeys.jump ? "input-overlay__button--active" : ""
            }`}
            onTouchStart={() => handleTouchStart("jump")}
            onTouchEnd={() => handleTouchEnd("jump")}
            >
            JUMP
            </button>
      </div>
    </div>
  );
}