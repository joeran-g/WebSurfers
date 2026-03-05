import "../styles/Header.css";

export default function Header({ onMenuClick, onThemeToggle, theme }) {
  return (
    <header className="header">
      <h1 className="header__title">WebSurfers</h1>
      <div className="header__actions">
        <button className="header__theme" onClick={onThemeToggle}>
          {theme === "dark" ? "☀" : "🌙"}
        </button>
        <button className="header__button" onClick={onMenuClick}>
          ☰
        </button>
      </div>
    </header>
  );
}