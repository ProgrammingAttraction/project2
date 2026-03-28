import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BANNERS, ALL_GAMES, PILL_CATS, PROVIDERS, SB_TOP, SB_CATS } from "../../components/constants/constants";
import Header from '../../components/header/Header';
import Sidebar from '../../components/sidebar/Sidebar';

const Home = () => {
  const [activeHNav, setActiveHNav] = useState('CASINO');
  const [activeTop, setActiveTop] = useState('Lobby');
  const [activeCat, setActiveCat] = useState('Top Games');
  const [activeProv, setActiveProv] = useState('All');
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClose, setDrawerClose] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  function openDrawer() { setDrawerClose(false); setDrawerOpen(true); }
  function closeDrawer() {
    setDrawerClose(true);
    setTimeout(() => { setDrawerOpen(false); setDrawerClose(false); }, 220);
  }

  function pickTop(id) { setActiveTop(id); setActiveCat(''); if (isMobile) closeDrawer(); }
  function pickCat(id) { setActiveCat(id); setActiveTop(''); if (isMobile) closeDrawer(); }

  const displayGames = activeProv === 'All'
    ? ALL_GAMES
    : ALL_GAMES.filter(g => g.provider === activeProv);

  const topGames = displayGames.filter(g => g.badge === 'hot' || g.badge === 'jackpot');
  const newGames = displayGames.filter(g => g.badge === 'new');

  const BannerSlider = () => {
    const [cur, setCur] = useState(0);
    const timerRef = useRef(null);

    const go = useCallback((idx) => {
      setCur((idx + BANNERS.length) % BANNERS.length);
    }, []);

    useEffect(() => {
      timerRef.current = setInterval(() => go(cur + 1), 4500);
      return () => clearInterval(timerRef.current);
    }, [cur, go]);

    const IconArrow = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    );

    return (
      <div className="relative rounded-xl overflow-hidden mb-6 bg-gray-900">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${cur * 100}%)` }}>
          {BANNERS.map((b, i) => (
            <div key={i} className="min-w-full relative flex-shrink-0 h-[220px] md:h-[280px] lg:h-[320px]">
              <img 
                src={b.img} 
                alt={b.title} 
                className="w-full h-full object-cover block"
                onError={e => { e.target.style.display = 'none'; }} 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent flex flex-col justify-center p-7 md:p-9">
                <span className="font-barlow text-[11px] font-bold tracking-[2px] uppercase text-yellow-400 mb-1.5">{b.tag}</span>
                <div className="font-barlow text-3xl md:text-4xl font-black text-white leading-tight mb-2.5 max-w-xs">{b.title}</div>
                <button className="inline-flex items-center gap-1.5 bg-blue-600 text-white border-none rounded-lg px-5 py-2.5 cursor-pointer font-barlow text-sm font-bold tracking-wide uppercase hover:bg-blue-700 transition-all hover:scale-105 w-fit">
                  {b.cta} <IconArrow />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button 
          className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 rounded-full border-none cursor-pointer bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-base font-bold hover:bg-white/30 transition-all z-10"
          onClick={() => go(cur - 1)}
        >‹</button>
        <button 
          className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 rounded-full border-none cursor-pointer bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-base font-bold hover:bg-white/30 transition-all z-10"
          onClick={() => go(cur + 1)}
        >›</button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {BANNERS.map((_, i) => (
            <button 
              key={i} 
              className={`w-2 h-2 rounded-full border-none cursor-pointer transition-all ${cur === i ? 'bg-white w-5 rounded-md' : 'bg-white/40'}`}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`} 
            />
          ))}
        </div>
      </div>
    );
  };

  const GameCard = ({ game }) => {
    const IconPlay = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    );

    return (
      <div className="rounded-xl overflow-hidden bg-white shadow-md cursor-pointer transition-all hover:-translate-y-1 hover:shadow-blue-200/50 relative group">
        <div className="relative">
          <img
            className="w-full aspect-[3/4] object-cover block"
            src={game.img}
            alt={game.name}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="w-full aspect-[3/4] hidden items-center justify-center text-4xl bg-gradient-to-br from-indigo-100 to-indigo-200 absolute inset-0">{game.emoji || '🎮'}</div>
          {game.badge && (
            <span className={`absolute top-2 left-2 font-barlow text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wide uppercase ${
              game.badge === 'new' ? 'bg-green-600 text-white' : 
              game.badge === 'jackpot' ? 'bg-purple-600 text-white' : 
              'bg-red-500 text-white'
            }`}>
              {game.badge.toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 top-0 bottom-auto h-[calc(100%-48px)] bg-blue-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center text-lg text-white bg-white/20">
              <IconPlay />
            </div>
          </div>
        </div>
        <div className="p-2">
          <div className="text-xs font-bold text-gray-900 truncate">{game.name}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{game.provider}</div>
        </div>
      </div>
    );
  };

  const GameSection = ({ title, games, showCount = false, totalCount = 0 }) => {
    const IconArrow = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    );

    if (!games || games.length === 0) return null;
    return (
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-barlow text-xl font-extrabold text-gray-900 tracking-wide">{title}</span>
          {showCount ? (
            <span className="text-xs font-semibold text-gray-500">{totalCount} games</span>
          ) : (
            <button className="text-xs font-bold text-blue-600 bg-none border-none cursor-pointer flex items-center gap-1 hover:opacity-75 transition-opacity">
              See all <IconArrow />
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3 mb-7">
          {games.map((g, i) => <GameCard key={i} game={g} />)}
        </div>
      </div>
    );
  };

  const MobileDrawer = () => {
    if (!drawerOpen) return null;
    const SidebarContent = () => (
      <div className="pb-6">
        <div className="text-[10px] font-bold text-gray-500 tracking-[0.8px] uppercase mb-2 px-1">Categories</div>
        {SB_TOP.map(item => (
          <button 
            key={item.id} 
            className={`flex items-center gap-2.5 w-full py-2 px-2.5 rounded-lg border-none bg-transparent cursor-pointer font-nunito text-[13.5px] font-semibold text-gray-900 whitespace-nowrap text-left transition-colors mb-0.5 hover:bg-gray-100 ${
              activeTop === item.id ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`} 
            onClick={() => pickTop(item.id)}
          >
            <span className="text-lg leading-none w-5.5 text-center flex-shrink-0">{item.emoji}</span>{item.label}
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
            className={`flex items-center gap-2.5 w-full py-1.5 px-2.5 rounded-lg border-none bg-transparent cursor-pointer font-nunito text-[13px] font-semibold text-gray-900 whitespace-nowrap text-left transition-colors mb-0.5 hover:bg-gray-100 ${
              activeCat === cat.id ? 'bg-indigo-100 text-indigo-700 font-bold' : ''
            }`} 
            onClick={() => pickCat(cat.id)}
          >
            <span className="text-lg leading-none w-6 text-center flex-shrink-0">{cat.emoji}</span>{cat.label}
          </button>
        ))}
      </div>
    );

    const Logo = () => (
      <div className="flex flex-col items-center cursor-pointer leading-none gap-px flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-base">👑</span>
          <span className="font-barlow text-[22px] font-black text-blue-600 tracking-[1.5px]">GLORY</span>
        </div>
        <span className="font-barlow text-[10px] font-bold text-red-600 tracking-[3.5px] uppercase">Casino</span>
      </div>
    );

    return (
      <>
        <div 
          className={`fixed inset-0 bg-black/40 z-[200] animate-in fade-in duration-200 ${drawerClose ? 'animate-out fade-out duration-200' : ''}`}
          onClick={closeDrawer}
          aria-hidden="true" 
        />
        <nav 
          className={`fixed top-0 left-0 w-[min(260px,86vw)] h-full bg-white z-[201] shadow-xl flex flex-col overflow-y-auto animate-in slide-in-from-left duration-300 ${
            drawerClose ? 'animate-out slide-out-to-left duration-200' : ''
          }`}
          aria-label="Mobile nav"
        >
          <div className="flex items-center justify-between p-3.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <Logo />
            <button className="bg-none border-none cursor-pointer text-gray-500 p-1 rounded-md flex items-center justify-center hover:text-red-600 transition-colors" onClick={closeDrawer} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-2.5 pb-6 flex-1">
            <SidebarContent />
          </div>
        </nav>
      </>
    );
  };

  return (
    <div className="min-h-screen font-roboto bg-gray-100">
      <Header activeHNav={activeHNav} setActiveHNav={setActiveHNav} drawerOpen={drawerOpen} openDrawer={openDrawer} closeDrawer={closeDrawer} />
      
      {/* Main layout with proper flex positioning for sticky sidebar */}
      <div className="relative">
        <div className="flex">
          {/* Sidebar with sticky positioning */}
          <div className="lg:block flex-shrink-0">
            <Sidebar isMobile={isMobile} sbCollapsed={sbCollapsed} activeTop={activeTop} activeCat={activeCat} pickTop={pickTop} pickCat={pickCat} />
          </div>
          
          {/* Main content area */}
          <main className="flex-1 min-w-0">
            <div className="p-5 pb-10 w-full">
              <BannerSlider />
              
              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
                {PILL_CATS.map(cat => (
                  <button 
                    key={cat.id} 
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border-2 border-gray-200 bg-white cursor-pointer font-nunito text-xs font-bold text-gray-500 whitespace-nowrap transition-all flex-shrink-0 hover:border-blue-600 hover:text-blue-600 hover:bg-indigo-50 ${
                      activeCat === cat.id ? 'bg-blue-600 border-blue-600 text-white' : ''
                    }`}
                    onClick={() => pickCat(cat.id)}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>{cat.label}
                  </button>
                ))}
              </div>

              {/* Provider Filters */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 mb-6 scrollbar-none items-center">
                <span className="text-xs font-bold text-gray-500 flex-shrink-0 mr-0.5">Provider:</span>
                {PROVIDERS.map(p => (
                  <button 
                    key={p} 
                    className={`py-1.5 px-3.5 rounded-full border-2 border-gray-200 bg-white text-xs font-bold text-gray-500 cursor-pointer whitespace-nowrap flex-shrink-0 transition-all hover:bg-blue-600 hover:border-blue-600 hover:text-white ${
                      activeProv === p ? 'bg-blue-600 border-blue-600 text-white' : ''
                    }`}
                    onClick={() => setActiveProv(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <GameSection title="🔥 Top Games" games={topGames} />
              <GameSection title="🆕 New Arrivals" games={newGames} />
              <GameSection title="🎮 All Games" games={displayGames} showCount={true} totalCount={displayGames.length} />
            </div>
          </main>
        </div>
      </div>
      
      <MobileDrawer />
    </div>
  );
};

export default Home;