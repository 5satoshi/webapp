
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import React from 'react';
import { Logo } from '@/components/logo';

export function MainHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* --- Mobile View --- */}
      <div className="flex w-full items-center md:hidden"> {/* Parent Flex Container */}
        <div className="flex-shrink-0"> {/* Left Item: Trigger */}
          <SidebarTrigger className="h-7 w-7" />
        </div>
        
        {/* Updated this div to use flexbox for centering its child (Logo) */}
        <div className="flex flex-1 justify-center items-center"> {/* Logo container */}
          <Logo size="md" /> {/* Changed size from "sm" to "md" */}
        </div>
        
        <div className="w-7 flex-shrink-0"> {/* Right Item: Spacer, ensures logo can center properly */}
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

