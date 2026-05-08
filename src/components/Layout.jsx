import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import useCurrentUser from "@/lib/useCurrentUser";
import {
  Home, Building2, DoorOpen, BedDouble, FileText, Users, UserCheck,
  ClipboardList, FolderOpen, AlertTriangle, ShieldCheck, DollarSign,
  Building, BarChart3, Settings, Menu, X, LogOut, ChevronRight, Zap, Grid3X3,
  Send, LayoutGrid, Layers, Network, ArrowRightLeft, RefreshCw, Wrench, UserCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AppAssistant from "@/components/AppAssistant";

const internalNav = [
  {
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard', path: '/', icon: Home },
    ]
  },
  {
    section: 'PROPERTIES',
    items: [
      { label: 'Houses', path: '/properties', icon: Building2 },
      { label: 'Rooms', path: '/rooms', icon: DoorOpen },
      { label: 'Beds', path: '/beds', icon: BedDouble },
      { label: 'Leases', path: '/leases', icon: FileText },
    ]
  },
  {
    section: 'PLACEMENT',
    items: [
      { label: 'Referrals', path: '/referrals', icon: Send },
      { label: 'Applicants', path: '/applicants', icon: Users },
      { label: 'Residents', path: '/residents', icon: UserCheck },
      { label: 'Occupancy', path: '/occupancy', icon: ClipboardList },
      { label: 'Move Requests', path: '/move-requests', icon: ArrowRightLeft },
    ]
  },
  {
    section: 'OPERATIONS',
    items: [
      { label: 'Documents', path: '/documents', icon: FolderOpen },
      { label: 'Incidents', path: '/incidents', icon: AlertTriangle },
      { label: 'Compliance', path: '/compliance', icon: ShieldCheck },
      { label: 'Fees', path: '/fees', icon: DollarSign },
    ]
  },
  {
    section: 'BILLING',
    items: [
      { label: 'Invoices', path: '/billing', icon: DollarSign },
      { label: 'Recurring Rules', path: '/recurring-rules', icon: RefreshCw },
    ]
  },
  {
    section: 'RESIDENT MGMT',
    items: [
      { label: 'Maintenance', path: '/maintenance', icon: Wrench },
      { label: 'Lease Management', path: '/lease-management', icon: FileText },
    ]
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { label: 'Reporting', path: '/reporting', icon: BarChart3 },
      { label: 'Diagnostics', path: '/diagnostics', icon: Zap },
      { label: 'Housing Models', path: '/housing-models', icon: Layers },
      { label: 'Integration Readiness', path: '/integration-readiness', icon: Network },
    ]
  },
  {
    section: 'SYSTEM',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  },
];

const partnerNav = [
  {
    section: 'PLACEMENT',
    items: [
      { label: 'Bed Search', path: '/bed-search', icon: LayoutGrid },
      { label: 'Availability', path: '/availability', icon: BedDouble },
    ]
  },
];

const tenantNav = [
  {
    section: 'MY PORTAL',
    items: [
      { label: 'My Portal', path: '/tenant-portal', icon: UserCircle },
      { label: 'Maintenance', path: '/maintenance', icon: Wrench },
    ]
  },
];

const turnkeyNav = [
  {
    section: 'MY HOUSE',
    items: [
      { label: 'House Dashboard', path: '/turnkey', icon: Home },
    ]
  },
];

export default function Layout() {
  const { user, loading, isInternal, isPartner, isTurnkeyOperator } = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Security: only show nav items the user's role is entitled to.
  // Unknown / unauthenticated roles get an empty nav.
  const isTenant = user?.role === "tenant";
  const filteredNav = isTurnkeyOperator ? turnkeyNav : (isTenant ? tenantNav : (isPartner ? partnerNav : (isInternal ? internalNav : [])));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-sm">
            LP
          </div>
          <div>
            <h1 className="text-sm font-bold text-primary">Legacy Properties</h1>
            <p className="text-[11px] text-sidebar-foreground/60">{isTurnkeyOperator ? 'Operator Portal' : isPartner ? 'Partner Portal' : 'Operations'}</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {filteredNav.map((section) => (
            <div key={section.section}>
              <div className="px-3 py-2 text-xs font-bold text-sidebar-foreground/50 tracking-widest">
                {section.section}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? 'bg-sidebar-primary text-white shadow-lg border-l-2 border-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-semibold text-sidebar-accent-foreground">
              {user?.full_name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user?.full_name || 'User'}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">{user?.role?.replace(/_/g, ' ') || 'User'}</p>
            </div>
            <button onClick={() => base44.auth.logout()} className="text-sidebar-foreground/40 hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold">Housing Ops</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* App Assistant (internal users only) */}
      {isInternal && <AppAssistant />}
    </div>
  );
}