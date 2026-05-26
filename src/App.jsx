import { useRef, useState } from "react";
import { useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import Game from "./components/Game/Game";
import Menu from "./components/Menu";
import "./styles/App.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const gameRef = useRef(null);

  const handleLoadWorld = (worldData) => {
    gameRef.current?.loadWorld?.(worldData);
  };

  const handleCreateBlankWorld = () => {
    gameRef.current?.createBlankWorld?.();
  };

  const getCurrentWorld = () => gameRef.current?.getCurrentObjects?.() || [];

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <div className="app">
      <Header onMenuClick={toggleMenu} onThemeToggle={toggleTheme} theme={theme} />
      {menuOpen && (
        <Menu
          onClose={() => setMenuOpen(false)}
          onLoadWorld={handleLoadWorld}
          onCreateBlankWorld={handleCreateBlankWorld}
          getCurrentWorld={getCurrentWorld}
        />
      )}
      <Game ref={gameRef} />
    </div>
  );
}