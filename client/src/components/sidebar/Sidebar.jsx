import React from 'react';
import { SB_TOP, SB_CATS } from "../constants/constants";

// react-icons imports
import {
  RiHomeLine,
  RiFireLine,
  RiTrophyLine,
  RiLiveLine,
  RiGamepadLine,
  RiStarLine,
  RiGiftLine,
  RiVipCrownLine,
  RiDiceLine,
  RiSpaceShipLine,
  RiBallPenLine,
  RiArrowRightSLine,
  RiShieldStarLine,
  RiPlayCircleLine,
  RiLeafLine,
  RiFlashlightLine,
  RiHashtag,
  RiLayout4Line,
  RiSparkling2Line,
} from 'react-icons/ri';
import { IoGameController } from "react-icons/io5";
import { FaCircleDollarToSlot } from "react-icons/fa6";

import {
  GiCardAceSpades,
  GiPokerHand,
  GiRollingDices,
  GiFishingPole,
  GiMineExplosion,
  GiBullseye,
  GiCricketBat,
  GiSoccerBall,
  GiTennisRacket,
  GiBasketballBall,
} from 'react-icons/gi';

import {
  MdSportsCricket,
  MdSportsEsports,
  MdOutlineCasino,
} from 'react-icons/md';

import { FiChevronRight, FiZap } from 'react-icons/fi';
import { BsGrid3X3Gap, BsController, BsDice5 } from 'react-icons/bs';
import { TbCards, TbPokerChip, TbFishHook } from 'react-icons/tb';
import { HiOutlineSparkles } from 'react-icons/hi';

// ─── Icon map for SB_TOP and SB_CATS by id ───────────────────────────────────
// All icons use gray colors only
const ICON_MAP = {
  home:        { Icon: RiHomeLine,         color: '#6b7280' },
  hot:         { Icon: RiFireLine,         color: '#6b7280' },
  live:        { Icon: RiLiveLine,         color: '#6b7280' },
  new:         { Icon: HiOutlineSparkles,  color: '#6b7280' },
  popular:     { Icon: RiStarLine,         color: '#6b7280' },
  promotions:  { Icon: RiGiftLine,         color: '#6b7280' },
  tournament:  { Icon: RiTrophyLine,       color: '#6b7280' },
  sports:      { Icon: GiSoccerBall,       color: '#6b7280' },
  esports:     { Icon: MdSportsEsports,    color: '#6b7280' },
  slots:       { Icon: FaCircleDollarToSlot,  color: '#6b7280' },
  casino:      { Icon: MdOutlineCasino,    color: '#6b7280' },
  live_casino: { Icon: RiPlayCircleLine,   color: '#6b7280' },
  table:       { Icon: GiPokerHand,        color: '#6b7280' },
  cards:       { Icon: TbCards,            color: '#6b7280' },
  poker:       { Icon: TbPokerChip,        color: '#6b7280' },
  dice:        { Icon: GiRollingDices,     color: '#6b7280' },
  crash:       { Icon: RiSpaceShipLine,    color: '#6b7280' },
  aviator:     { Icon: FiZap,              color: '#6b7280' },
  fishing:     { Icon: TbFishHook,         color: '#6b7280' },
  mines:       { Icon: GiMineExplosion,    color: '#6b7280' },
  arcade:      { Icon: IoGameController,   color: '#6b7280' },
  cricket:     { Icon: GiCricketBat,       color: '#6b7280' },
  football:    { Icon: GiSoccerBall,       color: '#6b7280' },
  basketball:  { Icon: GiBasketballBall,   color: '#6b7280' },
  tennis:      { Icon: GiTennisRacket,     color: '#6b7280' },
  default:     { Icon: RiLayout4Line,      color: '#6b7280' },
};

const getIconConfig = (id) => {
  if (!id) return ICON_MAP.default;
  const key = id.toLowerCase().replace(/[-\s]/g, '_');
  return ICON_MAP[key] || ICON_MAP.default;
};

// ─── Section title component ──────────────────────────────────────────────────
const SectionTitle = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 mb-0.5">
    {Icon && <Icon size={11} className="text-gray-400" />}
    <span className="text-[9.5px] font-extrabold tracking-[1.2px] uppercase text-gray-400">
      {label}
    </span>
    <div className="flex-1 h-px bg-gray-100 ml-0.5" />
  </div>
);

// ─── Nav button ───────────────────────────────────────────────────────────────
const NavBtn = ({ item, isActive, onClick, size = 'md' }) => {
  const { Icon, color } = getIconConfig(item.id);
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex items-center gap-2.5 w-full rounded-lg border-none cursor-pointer text-left
        transition-all duration-150 mb-0.5
        ${size === 'sm' ? 'py-1.5 px-2.5' : 'py-2 px-2.5'}
        ${isActive 
          ? 'bg-gray-50 border-l-2 border-gray-400' 
          : hovered 
            ? 'bg-gray-50 border-l-2 border-transparent' 
            : 'bg-transparent border-l-2 border-transparent'
        }
      `}
    >
      {/* Icon bubble */}
      <div className={`
        rounded-lg flex-shrink-0 flex items-center justify-center transition-colors duration-150
        ${size === 'sm' ? 'w-7 h-7' : 'w-[30px] h-[30px]'}
        ${isActive || hovered ? 'bg-gray-100' : 'bg-gray-50'}
      `}>
        <Icon 
          size={size === 'sm' ? 14 : 15} 
          className={isActive || hovered ? 'text-gray-600' : 'text-gray-400'} 
        />
      </div>

      <span className={`
        flex-1 text-[12.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis
        ${size === 'sm' ? 'text-xs' : 'text-[12.5px]'}
        ${isActive ? 'font-bold text-gray-800' : hovered ? 'text-gray-700' : 'text-gray-500'}
      `}>
        {item.label}
      </span>

      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
      )}
    </button>
  );
};

// ─── Glory Club special button ────────────────────────────────────────────────
const GloryClubBtn = ({ onClick }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border-none cursor-pointer
        my-1 transition-all duration-150
        ${hovered 
          ? 'bg-gray-800 shadow-md -translate-y-px' 
          : 'bg-gray-900 shadow'
        }
      `}
    >
      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <RiVipCrownLine size={16} className="text-yellow-400" />
      </div>
      <span className="flex-1 text-left text-white text-xs font-extrabold tracking-wide uppercase">
        Glory Club
      </span>
      <div className="flex items-center gap-1 bg-yellow-400/20 rounded-md px-1.5 py-0.5">
        <span className="text-yellow-400 text-[9px] font-bold tracking-wide">VIP</span>
      </div>
    </button>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div className="h-px bg-gray-100 my-2 mx-3" />
);

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
const Sidebar = ({ isMobile, sbCollapsed, activeTop, activeCat, pickTop, pickCat }) => {

  const SidebarContent = () => (
    <div className="p-2.5 pb-6 min-w-[260px]">
      {/* ── Quick Access ── */}
      <SectionTitle label="Quick Access" icon={RiFlashlightLine} />
      {SB_TOP.map(item => (
        <NavBtn
          key={item.id}
          item={item}
          isActive={activeTop === item.id}
          onClick={() => pickTop(item.id)}
        />
      ))}

      {/* ── VIP ── */}
      <div className="px-0.5">
        <GloryClubBtn onClick={() => pickTop('GLORY_CLUB')} />
      </div>

      <Divider />

      {/* ── Game Categories ── */}
      <SectionTitle label="Game Categories" icon={BsGrid3X3Gap} />
      {SB_CATS.map(cat => (
        <NavBtn
          key={cat.id}
          item={cat}
          isActive={activeCat === cat.id}
          onClick={() => pickCat(cat.id)}
          size="sm"
        />
      ))}

      {/* ── Footer info ── */}
      <Divider />
      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 mt-1 mx-0.5">
        <div className="flex items-center gap-1.5 mb-1">
          <RiShieldStarLine size={13} className="text-gray-500" />
          <span className="text-[10px] font-bold text-gray-500 tracking-wide">Licensed & Secure</span>
        </div>
        <p className="m-0 text-[10px] text-gray-400 leading-relaxed">
          18+ only. Play responsibly.
        </p>
      </div>
    </div>
  );

  if (isMobile) return null;

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>

      <aside
        className="sidebar-scroll sticky top-[58px] h-[calc(100vh-58px)] flex-shrink-0 shadow-md overflow-y-auto overflow-x-hidden transition-all duration-300 bg-white border-r border-gray-100"
        style={{
          width: sbCollapsed ? '0px' : '260px',
          opacity: sbCollapsed ? 0 : 1,
        }}
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;