
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import React from 'react';
import { Logo } from '@/components/logo';

export function MainHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* --- Mobile View --- */}
      <div className="flex w-full items-center justify-between md:hidden">
        <div className="flex-shrink-0">
          <SidebarTrigger />
        </div>
        
        <div className="flex-1 text-center">
          <Logo size="sm" />
        </div>
        
        {/* Invisible spacer to balance the SidebarTrigger for visual centering of the Logo.
            SidebarTrigger is h-7 w-7.
        */}
        <div className="w-7 flex-shrink-0"> 
          {/* This div intentionally left empty */}
        </div>
      </div>

      {/* --- Desktop View --- */}
      <div className="hidden w-full items-center md:flex"> {/* For desktop, Logo is in sidebar */}
        <div className="flex-grow">
           {/* Could add breadcrumbs or page title here dynamically if needed */}
        </div>
        <div className="ml-auto flex items-center gap-4">
          {/* User profile dropdown removed */}
        </div>
      </div>
    </header>
  );
}
