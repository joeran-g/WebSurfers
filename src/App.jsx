import { useRef, useState } from "react";
import { useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import Game from "./components/Game/Game";
import Menu from "./components/Menu";
import "./styles/App.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [worldName, setWorldName] = useState("Untitled World");
  const [isWeeklyWorld, setIsWeeklyWorld] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const gameRef = useRef(null);

  const handleWorldChange = ({ name, isWeekly }) => {
    setWorldName(name || "Untitled World");
    setIsWeeklyWorld(Boolean(isWeekly));
  };

  const handleLoadWorld = (...args) => {
    gameRef.current?.loadWorld?.(...args);
  };

  const handleCreateBlankWorld = () => {
    gameRef.current?.createBlankWorld?.();
    handleWorldChange({ name: "Untitled World", isWeekly: false });
  };

  const getCurrentWorld = () => gameRef.current?.getCurrentObjects?.() || [];

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <div className="app">
      <Header
        onMenuClick={toggleMenu}
        onThemeToggle={toggleTheme}
        theme={theme}
        worldName={worldName}
        isWeeklyWorld={isWeeklyWorld}
      />
      {menuOpen && (
        <Menu
          onClose={() => setMenuOpen(false)}
          onLoadWorld={handleLoadWorld}
          onCreateBlankWorld={handleCreateBlankWorld}
          getCurrentWorld={getCurrentWorld}
        />
      )}
      <Game ref={gameRef} onWorldChange={handleWorldChange} />
    </div>
  );
}