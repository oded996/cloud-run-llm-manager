'use client';

import React from 'react';
import Link from 'next/link';
import { OverviewIcon } from './icons/overview-icon';
import { ServicesIcon } from './icons/services-icon';
import { JobsIcon } from './icons/jobs-icon';

export type View = 'general' | 'models' | 'services';

interface NavItem {
  id: View;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'general', icon: <OverviewIcon />, label: 'General' },
  { id: 'models', icon: <ServicesIcon />, label: 'Models' },
  { id: 'services', icon: <JobsIcon />, label: 'Services' },
];

interface SidebarProps {
  activeView: View;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (view: View) => void;
}

const Sidebar = ({ activeView, isCollapsed, onToggleCollapse, onNavigate }: SidebarProps) => {
  return (
    <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center h-12 px-4 border-b border-gray-200">
        <button onClick={onToggleCollapse} className="p-1 rounded-full hover:bg-gray-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center w-full h-10 px-3 rounded-md text-gray-600 hover:bg-gray-100 ${activeView === item.id ? 'bg-blue-100 text-blue-600' : ''}`}
          >
            <div className="w-6 h-6">{item.icon}</div>
            {!isCollapsed && <span className="ml-3 text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-2 border-t border-gray-200">
      </div>
    </aside>
  );
};

export default Sidebar;