import "../styles/Header.css";

export default function Header({
  onMenuClick,
  onThemeToggle,
  theme,
  worldName = "Untitled World",
  isWeeklyWorld = false,
}) {
  return (
    <header className="header">
      <div className="header__brand">
        <button className="header__theme-button" onClick={onThemeToggle}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <div className="header__title-group">
          <div className="header__title">WebSurfers</div>
          <div className="header__world-row">
            <span className="header__world-name">{worldName}</span>
            {isWeeklyWorld && <span className="header__badge">Weekly</span>}
          </div>
        </div>
      </div>
      <button className="header__menu-button" onClick={onMenuClick}>
          ☰
      </button>
    </header>
  );
}