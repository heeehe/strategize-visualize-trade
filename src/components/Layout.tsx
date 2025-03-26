
import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={cn("flex-1 pt-24 pb-12", className)}>
        {children}
      </main>
      <footer className="py-6 border-t border-border/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AlgoTrade. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
