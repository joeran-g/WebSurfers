import { useState, useRef } from "react";
import { useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import Game from "./components/Game/Game";
import Menu from "./components/Menu";
import "./styles/App.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const gameRef = useRef(null);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <div className="app">
      <Header onMenuClick={toggleMenu} onThemeToggle={toggleTheme} theme={theme} />
      <Game ref={gameRef} />
      {menuOpen && (
        <Menu
          onClose={() => setMenuOpen(false)}
          onLoadWorld={(data) => gameRef.current?.loadWorld(data)}
          getGameObjects={() => gameRef.current?.getCurrentObjects?.() || []}
        />
      )}
    </div>
  );
}