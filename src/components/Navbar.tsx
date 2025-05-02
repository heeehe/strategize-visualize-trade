
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  LineChart, 
  Settings, 
  History, 
  Play, 
  Menu, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";

const NavItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    name: "Backtesting",
    path: "/backtest",
    icon: <History className="w-5 h-5" />
  },
  {
    name: "Live Trading",
    path: "/live",
    icon: <Play className="w-5 h-5" />
  },
  {
    name: "Strategies",
    path: "/strategy",
    icon: <LineChart className="w-5 h-5" />
  },
  {
    name: "Settings",
    path: "/settings",
    icon: <Settings className="w-5 h-5" />
  }
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "glass-morphism py-3 shadow-sm" : "py-5"
      )}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center">
            <LineChart className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-xl">AlgoTrade</span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {NavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded-md transition-all",
                location.pathname === item.path 
                  ? "text-primary font-medium" 
                  : "text-foreground/70 hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-foreground p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass-morphism animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {NavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md transition-all",
                  location.pathname === item.path 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
