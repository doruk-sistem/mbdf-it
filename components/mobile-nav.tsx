"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, Users, Menu, X, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

interface MobileNavProps {
  user?: {
    full_name?: string;
    email: string;
  };
}

export function MobileNav({ user }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: Building2,
      description: "Ana sayfa ve MBDF odaları"
    },
    {
      href: "/agreements",
      label: "Sözleşmeler",
      icon: FileText,
      description: "MBDF sözleşmeleri ve e-imza"
    },
    {
      href: "/kks",
      label: "KKS Gönderimler",
      icon: Users,
      description: "KKS veri gönderim takibi"
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <span>MBDF-IT</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          <nav className="flex-1 mt-6">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                      isActive(item.href) 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t pt-4 mt-4 space-y-4">
            {user && (
              <div className="flex items-center space-x-3 px-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.full_name || "Kullanıcı"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between px-3">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>Ayarlar</span>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}