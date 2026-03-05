import { useEffect, useState } from "react";
import "../styles/Menu.css";

export default function Menu({ onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Small delay ensures browser applies initial state before transition
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  // trigger closing animation then notify parent
  function handleClose() {
    setIsOpen(false);
  }

  function onTransitionEnd(e) {
    if (!isOpen && e.propertyName === "transform") {
      onClose();
    }
  }

  return (
    <>
      <div
        className={`menu__overlay ${isOpen ? "open" : ""}`}
        onClick={handleClose}
      />
      <aside
        className={`menu ${isOpen ? "open" : ""}`}
        onTransitionEnd={onTransitionEnd}
      >
        <div className="menu__header">
          <h2>Menu</h2>
          <button className="menu__close" onClick={handleClose}>✕</button>
        </div>

        <div className="menu__section">
          <button className="menu__button">Login</button>
          <button className="menu__button">Register</button>
        </div>

        <hr className="menu__divider" />

        <div className="menu__section">
          <button className="menu__button">Official Worlds</button>
          <button className="menu__button">Community Worlds</button>
          <button className="menu__button menu__button--primary">
            Create Your Own World
          </button>
        </div>
      </aside>
    </>
  );
}