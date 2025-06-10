
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
import { LayoutDashboard, Users, BarChart3, GitCompareArrows, Bell } from 'lucide-react'; // Changed Lightbulb to GitCompareArrows
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/channels', label: 'Channels', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/subsumption', label: 'Subsumption', icon: GitCompareArrows }, // Changed from Insights
  { href: '/alerts', label: 'Alerts', icon: Bell },
];

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                  tooltip={item.label}
                  className="w-full justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2" />
      <SidebarFooter className="p-2">
        {/* Settings and Logout items removed */}
      </SidebarFooter>
    </Sidebar>
  );
}
