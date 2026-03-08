import React from 'react';
import { AdSlot } from '@/components/AdSlot';

interface SidebarProps {
  children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-full md:w-72 flex-shrink-0 space-y-4">
      {/* Top sidebar ad slot */}
      <AdSlot position="sidebar-top" size="rectangle" showPlaceholder={false} />
      {children}
      {/* Bottom sidebar ad slot */}
      <AdSlot position="sidebar-bottom" size="rectangle" showPlaceholder={false} />
    </aside>
  );
}

export default Sidebar;
