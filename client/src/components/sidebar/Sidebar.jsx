import React from 'react';
import { SB_TOP, SB_CATS } from "../constants/constants";

const Sidebar = ({ isMobile, sbCollapsed, activeTop, activeCat, pickTop, pickCat }) => {
  const SidebarContent = () => (
    <div className="pb-6 min-w-[220px]">
      <div className="text-[10px] font-bold text-gray-500 tracking-[0.8px] uppercase mb-2 px-1">
        Categories
      </div>
      {SB_TOP.map(item => (
        <button 
          key={item.id} 
          className={`flex items-center gap-2.5 w-full py-2 px-2.5 rounded-lg border-none bg-transparent cursor-pointer font-nunito text-[13.5px] font-semibold text-gray-900 whitespace-nowrap text-left transition-colors mb-0.5 hover:bg-gray-200 ${
            activeTop === item.id ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
          }`} 
          onClick={() => pickTop(item.id)}
        >
          <span className="text-lg leading-none w-5.5 text-center flex-shrink-0">{item.emoji}</span>
          {item.label}
        </button>
      ))}
      
      <button 
        className="flex items-center w-full py-2.5 px-3 rounded-lg border-none bg-blue-600 cursor-pointer font-barlow text-sm font-extrabold text-white tracking-wide uppercase gap-2 transition-all hover:bg-blue-700 mb-0.5"
        onClick={() => pickTop('GLORY_CLUB')}
      >
        <span className="text-base">🛡️</span>
        <span className="flex-1 text-left">GLORY CLUB</span>
        <span className="text-sm">›</span>
      </button>
      
      <div className="h-px bg-gray-200 my-2.5 mx-1" />
      
      {SB_CATS.map(cat => (
        <button 
          key={cat.id} 
          className={`flex items-center gap-2.5 w-full py-1.5 px-2.5 rounded-lg border-none bg-transparent cursor-pointer font-nunito text-[13px] font-semibold text-gray-900 whitespace-nowrap text-left transition-colors mb-0.5 hover:bg-gray-200 ${
            activeCat === cat.id ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
          }`} 
          onClick={() => pickCat(cat.id)}
        >
          <span className="text-lg leading-none w-6 text-center flex-shrink-0">{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );

  if (isMobile) return null;
  
  return (
    <aside 
      className={`sticky top-14 bg-gray-100 border-r border-gray-200 h-[calc(100vh-56px)] flex-shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-300 scrollbar-thin scrollbar-thumb-gray-300 ${
        sbCollapsed ? 'w-0 border-r-transparent' : 'w-[220px]'
      }`}
      aria-label="Sidebar"
    >
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;