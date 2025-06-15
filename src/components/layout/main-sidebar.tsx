
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LayoutDashboard, Users, BarChart3, GitCompareArrows, Github, BookText } from 'lucide-react';
import { specificNodeId } from '@/lib/constants';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/channels', label: 'Channels', icon: Users },
  { href: '/analytics', label: 'Network Insights', icon: BarChart3 },
  { href: `/subsumption/${specificNodeId}`, label: 'Routing Analysis', icon: GitCompareArrows },
];

export function MainSidebar() {
  const pathname = usePathname();
  const apiDocsPath = '/api-docs';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <Logo size="md"/>
      </SidebarHeader>
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href}>
                <SidebarMenuButton
                  tooltip={item.label}
                  className="w-full justify-start"
                  isActive={item.href === `/subsumption/${specificNodeId}` ? pathname.startsWith('/subsumption') : (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]/sidebar-wrapper:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="p-4 mt-auto">
        <TooltipProvider delayDuration={0}>
          <div className="flex justify-center items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={apiDocsPath}
                  aria-label="API Documentation"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    pathname === apiDocsPath && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <BookText className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>API Documentation</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://github.com/5satoshi/webapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Fork on GitHub"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Github className="h-5 w-5" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Fork on GitHub</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </SidebarFooter>
    </Sidebar>
  );
}
