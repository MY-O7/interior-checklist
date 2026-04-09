'use client';

import { Menu, X } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileMenuButton({ isOpen, onToggle }: MobileMenuProps) {
  return (
    <button
      onClick={onToggle}
      className="md:hidden fixed top-3 left-3 z-[60] p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-md"
      aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}

interface SidebarWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function SidebarWrapper({ isOpen, onClose, children }: SidebarWrapperProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay md:hidden ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      {/* Sidebar - mobile: slide, desktop: static */}
      <aside className={`
        sidebar-mobile md:relative md:transform-none md:z-auto
        bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col
        h-full overflow-y-auto overflow-x-hidden
        ${isOpen ? 'open' : ''}
      `}>
        {children}
      </aside>
    </>
  );
}
