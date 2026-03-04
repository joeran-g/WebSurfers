import "../src/styles/Menu.css";

export default function Menu({ onClose }) {
  return (
    <>
      <div className="menu__overlay" onClick={onClose} />
      <aside className="menu open">
        <div className="menu__header">
          <h2>Menu</h2>
          <button className="menu__close" onClick={onClose}>✕</button>
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
