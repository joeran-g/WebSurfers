import "../styles/Header.css";

export default function Header({ onMenuClick, onThemeToggle, theme, username }) {
  return (
    <header className="header">
      <h1 className="header__title">WebSurfers</h1>
      <div className="header__actions">
        {username && <span className="header__user">Welcome, {username}!</span>}
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