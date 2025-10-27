import React from 'react';
import { Project } from '../general/general.component';

interface HeaderProps {
  project: Project | null;
}

const Header = ({ project }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-white border-b border-gray-200 text-gray-700 z-10">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-lg font-medium">
          <span className="text-gray-800 ml-1">Google Cloud Run LLM Manager</span>
        </div>
        <div className="flex items-center border border-gray-300 rounded bg-gray-50 px-2 py-1 ml-4">
           <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          <span className="ml-2 text-sm font-medium text-gray-800">{project ? project.name : 'No Project Selected'}</span>
          <svg className="w-4 h-4 ml-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
        </div>
      </div>
    </header>
  );
};

export default Header;