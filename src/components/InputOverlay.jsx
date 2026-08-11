import { useEffect, useState } from "react";
import "../styles/InputOverlay.css";

export default function InputOverlay({ isPlaying }) {
  const [pressedKeys, setPressedKeys] = useState({
    arrowLeft: false,
    arrowRight: false,
    space: false,
  });

  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPressedKeys((prev) => ({ ...prev, arrowLeft: true }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPressedKeys((prev) => ({ ...prev, arrowRight: true }));
      } else if (e.key === " ") {
        e.preventDefault();
        setPressedKeys((prev) => ({ ...prev, space: true }));
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft") {
        setPressedKeys((prev) => ({ ...prev, arrowLeft: false }));
      } else if (e.key === "ArrowRight") {
        setPressedKeys((prev) => ({ ...prev, arrowRight: false }));
      } else if (e.key === " ") {
        setPressedKeys((prev) => ({ ...prev, space: false }));
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
  };

  const handleTouchEnd = (key) => {
    setPressedKeys((prev) => ({ ...prev, [key]: false }));
  };

  if (!isPlaying) return null;

  return (
    <div className="input-overlay">
      <div className="input-overlay__group">
        <div
          className={`input-overlay__button input-overlay__button--left ${
            pressedKeys.arrowLeft ? "input-overlay__button--active" : ""
          }`}
          onTouchStart={() => handleTouchStart("arrowLeft")}
          onTouchEnd={() => handleTouchEnd("arrowLeft")}
          onMouseDown={() => handleTouchStart("arrowLeft")}
          onMouseUp={() => handleTouchEnd("arrowLeft")}
          onMouseLeave={() => handleTouchEnd("arrowLeft")}
        >
          ← Left
        </div>

        <div
          className={`input-overlay__button input-overlay__button--jump ${
            pressedKeys.space ? "input-overlay__button--active" : ""
          }`}
          onTouchStart={() => handleTouchStart("space")}
          onTouchEnd={() => handleTouchEnd("space")}
          onMouseDown={() => handleTouchStart("space")}
          onMouseUp={() => handleTouchEnd("space")}
          onMouseLeave={() => handleTouchEnd("space")}
        >
          Space
        </div>

        <div
          className={`input-overlay__button input-overlay__button--right ${
            pressedKeys.arrowRight ? "input-overlay__button--active" : ""
          }`}
          onTouchStart={() => handleTouchStart("arrowRight")}
          onTouchEnd={() => handleTouchEnd("arrowRight")}
          onMouseDown={() => handleTouchStart("arrowRight")}
          onMouseUp={() => handleTouchEnd("arrowRight")}
          onMouseLeave={() => handleTouchEnd("arrowRight")}
        >
          Right →
        </div>
      </div>
    </div>
  );
}