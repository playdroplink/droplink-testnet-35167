import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export const ThemeToggle = ({ 
  variant = "ghost", 
  size = "icon", 
  className = "",
  showText = false 
}: ThemeToggleProps) => {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem("theme_mode") || "light";
    const shouldBeDark = savedTheme === "dark";
    setIsDark(shouldBeDark);
    
    root.classList.remove("light", "dark");
    root.classList.add(shouldBeDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newIsDark = !isDark;
    
    setIsDark(newIsDark);
    
    // Update localStorage
    localStorage.setItem("theme_mode", newIsDark ? "dark" : "light");
    
    // Update DOM
    root.classList.remove("light", "dark");
    root.classList.add(newIsDark ? "dark" : "light");
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      className={`transition-smooth ${showText ? 'gap-2' : ''} ${className}`}
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <>
          <Moon className="h-4 w-4" />
          {showText && <span>Dark Mode</span>}
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          {showText && <span>Light Mode</span>}
        </>
      )}
    </Button>
  );
};
