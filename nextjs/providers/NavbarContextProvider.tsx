"use client";

import React, { createContext, useContext, useState } from "react";

interface NavbarContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  closeMobileMenu: () => void;
  isFullscreenMode: boolean;
  setIsFullscreenMode: (isFullscreen: boolean) => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <NavbarContext.Provider
      value={{ isMobileMenuOpen, setIsMobileMenuOpen, closeMobileMenu, isFullscreenMode, setIsFullscreenMode }}
    >
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
}
