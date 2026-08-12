import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import Game from "./components/Game/Game";
import Menu from "./components/Menu";
import "./styles/App.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentWorldMeta, setCurrentWorldMeta] = useState({
    id: null,
    name: "Untitled World",
    isWeekly: false,
    ownedByMe: false,
  });
  const { theme, toggleTheme } = useTheme();
  const gameRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  const handleWorldChange = useCallback(({ id = null, name = "Untitled World", isWeekly = false, ownedByMe = false }) => {
    setCurrentWorldMeta({
      id,
      name,
      isWeekly,
      ownedByMe,
    });
  }, []);

  const handleLoadWorld = (worldData, name, id, isWeekly, ownedByMe = false) => {
    gameRef.current?.loadWorld?.(worldData, name, id, isWeekly, ownedByMe);
  };

  const handleCreateBlankWorld = () => {
    gameRef.current?.createBlankWorld?.();
  };

  const getCurrentWorld = () => gameRef.current?.getCurrentObjects?.() || [];

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      );
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkDevice();
    window.addEventListener("orientationchange", checkDevice);
    window.addEventListener("resize", checkDevice);

    return () => {
      window.removeEventListener("orientationchange", checkDevice);
      window.removeEventListener("resize", checkDevice);
    };
  }, []);

  if (isMobile && isPortrait) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#1a1f2e",
          color: "#fff",
          textAlign: "center",
          flexDirection: "column",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        <h1>Rotate Your Device</h1>
        <p>WebSurfers is best played in landscape mode</p>
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="10" y="20" width="60" height="40" rx="4" />
          <path d="M 30 40 L 50 40 M 40 30 L 40 50" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        onMenuClick={() => setMenuOpen((prev) => !prev)}
        onThemeToggle={toggleTheme}
        theme={theme}
        worldName={currentWorldMeta.name}
        isWeeklyWorld={currentWorldMeta.isWeekly}
      />
      {menuOpen && (
        <Menu
          onClose={() => setMenuOpen(false)}
          onLoadWorld={handleLoadWorld}
          onCreateBlankWorld={handleCreateBlankWorld}
          getCurrentWorld={getCurrentWorld}
          currentWorldMeta={currentWorldMeta}
        />
      )}
      <Game ref={gameRef} onWorldChange={handleWorldChange} />
    </div>
  );
}