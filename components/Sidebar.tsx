import React, { useState, useEffect, useMemo } from 'react';
import { Page } from '../types';
import { DashboardIcon, AnalyticsIcon, TransactionsIcon, InventoryIcon, SuppliersIcon, ExpiringIcon, TaxIcon, ProfileIcon, SettingsIcon, ChevronDownIcon, SparklesIcon, ReturnIcon, VoucherIcon, LedgersIcon } from './Icons';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

// FIX: Replaced NavItemDetails with a more accurate type for the nav items structure.
// This ensures page properties are correctly typed as `Page` and optional properties like `disabled` are recognized.
interface NavItemData {
  id: string;
  label: string;
  icon: React.ReactNode;
  page?: Page;
  disabled?: boolean;
  subItems?: {
    id: string;
    label: string;
    page: Page;
    icon: React.ReactNode;
    disabled?: boolean;
  }[];
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  hasDropdown?: boolean;
  isDropdownOpen?: boolean;
  disabled?: boolean;
  isSubItem?: boolean;
}> = ({ icon, label, isActive, onClick, hasDropdown, isDropdownOpen, disabled, isSubItem }) => (
  <li>
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 w-full text-left ${
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-bold border border-sidebar-border'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isSubItem ? 'pl-10' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="flex items-center">
        <span className="mr-3">{icon}</span>
        {label}
      </span>
      {hasDropdown && <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />}
    </button>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);

  // FIX: Typed the navItems array to ensure type safety.
  const navItems: NavItemData[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      page: 'dashboard',
      subItems: [
        { id: 'analytics', label: 'Analytics', page: 'analytics', icon: <AnalyticsIcon className="w-5 h-5" /> },
      ]
    },
    { id: 'billing', label: 'Sell', icon: <TransactionsIcon />, page: 'billing' },
    { id: 'transaction-history', label: 'History', icon: <TransactionsIcon />, page: 'transaction-history' },
    { id: 'inventory', label: 'Inventory', icon: <InventoryIcon />, page: 'inventory' },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: <TransactionsIcon />, page: 'purchase-orders' },
    { id: 'expiring', label: 'Expiring Medicines', icon: <ExpiringIcon />, page: 'expiring' },
    { id: 'gemini', label: 'AI Helper', icon: <SparklesIcon />, page: 'gemini' },
    { id: 'suppliers', label: 'Suppliers', icon: <SuppliersIcon />, page: 'suppliers' },
    { id: 'returns', label: 'Returns', icon: <ReturnIcon />, page: 'returns' },
    { id: 'vouchers', label: 'Vouchers', icon: <VoucherIcon />, page: 'vouchers' },
    { id: 'ledgers', label: 'Ledgers', icon: <LedgersIcon />, page: 'ledgers' },
    { id: 'tax', label: 'Tax Reports', icon: <TaxIcon />, page: 'tax', disabled: true },
    { id: 'profile', label: 'My Profile', icon: <ProfileIcon />, page: 'profile', disabled: true },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon />, page: 'settings' },
  ], []);

  // FIX: Corrected an infinite loop by making the state update in this useEffect conditional.
  // It now checks if the target dropdown is already open before calling the state setter,
  // preventing a re-render cycle.
  useEffect(() => {
    // Automatically expand the parent section of the active page
    const parent = navItems.find(item => item.subItems?.some(sub => sub.page === activePage));
    const selfIsParent = navItems.find(item => item.page === activePage && item.subItems);

    const idToOpen = parent?.id || selfIsParent?.id;

    if (idToOpen) {
        setOpenDropdowns(prevOpen => {
            // If the correct dropdown is already open, do nothing to prevent a loop.
            if (prevOpen.length === 1 && prevOpen[0] === idToOpen) {
                return prevOpen;
            }
            // Otherwise, open the correct dropdown.
            return [idToOpen];
        });
    }
  }, [activePage, navItems]);

  // FIX: Updated the item type to match the strongly typed navItems array.
  const handleParentClick = (item: NavItemData) => {
    if (item.page) {
        setActivePage(item.page);
    }
    // Toggle dropdown for manual control
    setOpenDropdowns(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [item.id]);
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground rounded-xl flex flex-col p-4 shadow-sm border border-border">
      <div className="flex items-center mb-8 px-2">
        <div className="w-8 h-8 bg-brand-blue rounded-lg mr-3"></div>
        <h1 className="text-xl font-bold">MediStore</h1>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <React.Fragment key={item.id}>
              <NavItem
                icon={item.icon}
                label={item.label}
                isActive={activePage === item.page && !item.subItems}
                // FIX: All page properties are now correctly typed, resolving assignment errors.
                onClick={() => (item.subItems ? handleParentClick(item) : (item.page && setActivePage(item.page)))}
                hasDropdown={!!item.subItems}
                isDropdownOpen={openDropdowns.includes(item.id)}
                disabled={item.disabled}
              />
              {item.subItems && openDropdowns.includes(item.id) && (
                <ul className="pl-4 space-y-1.5 mt-1.5">
                  {item.subItems.map(subItem => (
                    <NavItem
                      key={subItem.id}
                      icon={subItem.icon}
                      label={subItem.label}
                      isActive={activePage === subItem.page}
                      // FIX: `subItem.page` is now correctly typed as `Page`.
                      onClick={() => subItem.page && setActivePage(subItem.page)}
                      // FIX: `subItem.disabled` is now a valid optional property.
                      disabled={subItem.disabled}
                      isSubItem
                    />
                  ))}
                </ul>
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;