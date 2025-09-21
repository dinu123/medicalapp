import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Page, UserRole } from '../types';
import { AppContext } from '../App';
import { DashboardIcon, AnalyticsIcon, TransactionsIcon, InventoryIcon, SuppliersIcon, ExpiringIcon, TaxIcon, ProfileIcon, SettingsIcon, ChevronDownIcon, SparklesIcon, ReturnIcon, VoucherIcon, LedgersIcon, UserIcon as AuditIcon } from './Icons';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

interface NavItemData {
  id: string;
  label: string;
  icon: React.ReactNode;
  page?: Page;
  disabled?: boolean;
  allowedRoles: UserRole[];
  subItems?: {
    id: string;
    label: string;
    page: Page;
    icon: React.ReactNode;
    disabled?: boolean;
    allowedRoles: UserRole[];
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
  const { currentUser } = useContext(AppContext);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);

  const allNavItems: NavItemData[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      page: 'dashboard',
      allowedRoles: ['admin', 'pharmacist', 'cashier'],
      subItems: [
        { id: 'analytics', label: 'Analytics', page: 'analytics', icon: <AnalyticsIcon className="w-5 h-5" />, allowedRoles: ['admin'] },
      ]
    },
    { id: 'billing', label: 'Sell', icon: <TransactionsIcon />, page: 'billing', allowedRoles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'transaction-history', label: 'History', icon: <TransactionsIcon />, page: 'transaction-history', allowedRoles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'inventory', label: 'Inventory', icon: <InventoryIcon />, page: 'inventory', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: <TransactionsIcon />, page: 'purchase-orders', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'expiring', label: 'Expiring Medicines', icon: <ExpiringIcon />, page: 'expiring', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'gemini', label: 'AI Helper', icon: <SparklesIcon />, page: 'gemini', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'suppliers', label: 'Suppliers', icon: <SuppliersIcon />, page: 'suppliers', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'returns', label: 'Returns', icon: <ReturnIcon />, page: 'returns', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'vouchers', label: 'Vouchers', icon: <VoucherIcon />, page: 'vouchers', allowedRoles: ['admin', 'pharmacist'] },
    { id: 'ledgers', label: 'Ledgers', icon: <LedgersIcon />, page: 'ledgers', allowedRoles: ['admin'] },
    { id: 'tax', label: 'Tax Reports', icon: <TaxIcon />, page: 'tax', allowedRoles: ['admin'] },
    { id: 'audit-trail', label: 'Audit Trail', icon: <AuditIcon />, page: 'audit-trail', allowedRoles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon />, page: 'settings', allowedRoles: ['admin'] },
  ], []);

  const navItems = useMemo(() => {
    if (!currentUser) return [];
    return allNavItems.filter(item => item.allowedRoles.includes(currentUser.role));
  }, [currentUser, allNavItems]);


  useEffect(() => {
    const parent = navItems.find(item => item.subItems?.some(sub => sub.page === activePage));
    const selfIsParent = navItems.find(item => item.page === activePage && item.subItems);

    const idToOpen = parent?.id || selfIsParent?.id;

    if (idToOpen) {
        setOpenDropdowns(prevOpen => {
            if (prevOpen.length === 1 && prevOpen[0] === idToOpen) {
                return prevOpen;
            }
            return [idToOpen];
        });
    }
  }, [activePage, navItems]);

  const handleParentClick = (item: NavItemData) => {
    if (item.page) {
        setActivePage(item.page);
    }
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
                isActive={activePage === item.page}
                onClick={() => (item.subItems ? handleParentClick(item) : (item.page && setActivePage(item.page)))}
                hasDropdown={!!item.subItems}
                isDropdownOpen={openDropdowns.includes(item.id)}
                disabled={item.disabled}
              />
              {item.subItems && openDropdowns.includes(item.id) && (
                <ul className="pl-4 space-y-1.5 mt-1.5">
                  {item.subItems.map(subItem => (
                    subItem.allowedRoles.includes(currentUser!.role) && (
                      <NavItem
                        key={subItem.id}
                        icon={subItem.icon}
                        label={subItem.label}
                        isActive={activePage === subItem.page}
                        onClick={() => subItem.page && setActivePage(subItem.page)}
                        disabled={subItem.disabled}
                        isSubItem
                      />
                    )
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
