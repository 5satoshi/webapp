
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import React from 'react';
import { Logo } from '@/components/logo';

export function MainHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* Container for trigger and logo on small screens */}
      <div className="flex items-center gap-3 md:hidden">
        <SidebarTrigger />
        <Logo size="sm" />
      </div>
      <div className="hidden md:block">
         {/* Could add breadcrumbs or page title here dynamically if needed */}
      </div>
      <div className="ml-auto flex items-center gap-4">
        {/* User profile dropdown removed */}
      </div>
    </header>
  );
}
