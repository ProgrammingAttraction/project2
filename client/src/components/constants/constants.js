export const BANNERS = [
  { img: 'https://diswdgcu9cfva.cloudfront.net/banners/glory/bonuses/bndesktop.webp', tag: 'Welcome Bonus', title: 'Get 100% up to $500', cta: 'Claim Bonus' },
  { img: 'https://diswdgcu9cfva.cloudfront.net/banners/glory/aviator/newdesktop.webp', tag: 'Aviator', title: 'Fly High & Win Big', cta: 'Play Now' },
  { img: 'https://diswdgcu9cfva.cloudfront.net/banners/glory/bonuses/bndesktop.webp', tag: 'Tournaments', title: 'Daily Prize Pools', cta: 'Join Now' },
];

export const GAME_IMAGES = [
  'https://xxxbetgames.com/image/vertical_2/30200.webp',
  'https://xxxbetgames.com/image/vertical_2/53432.webp',
  'https://xxxbetgames.com/image/vertical_2/20947.webp',
  'https://xxxbetgames.com/image/vertical_2/41180.webp',
];

export const ALL_GAMES = [
  { name: 'Starburst', provider: 'NetEnt', img: GAME_IMAGES[0], badge: 'hot', plays: '124K' },
  { name: 'Book of Dead', provider: "Play'n GO", img: GAME_IMAGES[1], badge: '', plays: '98K' },
  { name: 'Mega Moolah', provider: 'Microgaming', img: GAME_IMAGES[2], badge: 'jackpot', plays: '245K' },
  { name: 'Crash X', provider: 'Spribe', img: GAME_IMAGES[3], badge: 'hot', plays: '167K' },
  { name: "Gonzo's Quest", provider: 'NetEnt', img: GAME_IMAGES[0], badge: '', plays: '112K' },
  { name: 'Sweet Bonanza', provider: 'Pragmatic', img: GAME_IMAGES[1], badge: 'new', plays: '89K' },
  { name: 'Lightning Roulette', provider: 'Evolution', img: GAME_IMAGES[2], badge: 'hot', plays: '78K' },
  { name: 'Bonus Hunter', provider: 'Hacksaw', img: GAME_IMAGES[3], badge: '', plays: '92K' },
  { name: 'Fast Cash', provider: 'Hacksaw', img: GAME_IMAGES[0], badge: 'new', plays: '156K' },
  { name: 'Megaways Jackpot', provider: 'Big Time Gaming', img: GAME_IMAGES[1], badge: 'jackpot', plays: '145K' },
  { name: 'Dragon Kingdom', provider: 'Pragmatic', img: GAME_IMAGES[2], badge: '', plays: '67K' },
  { name: 'Fish Hunter', provider: 'Spadegaming', img: GAME_IMAGES[3], badge: '', plays: '78K' },
];

export const TOP_NAV_H = [
  { id: 'CASINO', label: 'Casino', type: 'text' },
  { id: 'MEGABLOCK', label: 'Megablock', type: 'megablock' },
  { id: 'TOURNAMENTS', label: 'Tournaments', type: 'text' },
  { id: 'GLORY_GAMES', label: 'Glory Games', type: 'text' },
  { id: 'AVIATOR', label: 'Aviator', type: 'aviator' },
  { id: 'SPORT', label: 'Sport', type: 'text' },
];

export const MEGA_LETTERS = [
  { ch: 'M', c: '#ef4444' }, { ch: 'E', c: '#f97316' }, { ch: 'G', c: '#facc15' },
  { ch: 'A', c: '#22c55e' }, { ch: 'B', c: '#3b82f6' }, { ch: 'L', c: '#a855f7' },
  { ch: 'O', c: '#ec4899' }, { ch: 'C', c: '#06b6d4' }, { ch: 'K', c: '#ef4444' },
];

export const SB_TOP = [
  { id: 'Lobby', emoji: '👑', label: 'Lobby' },
  { id: 'Sport', emoji: '⚽', label: 'Sport' },
];

export const SB_CATS = [
  { id: 'Top Games', emoji: '🏆', label: 'Top Games' },
  { id: 'Game Shows', emoji: '💰', label: 'Game Shows' },
  { id: 'Slots', emoji: '🎰', label: 'Slots' },
  { id: 'New', emoji: '🆕', label: 'New' },
  { id: 'Crash Games', emoji: '🚀', label: 'Crash Games' },
  { id: 'Cross & Win', emoji: '🎯', label: 'Cross & Win' },
  { id: 'Bonus Buy', emoji: '🎁', label: 'Bonus Buy' },
  { id: 'Live Games', emoji: '🎭', label: 'Live Games' },
  { id: 'Roulette', emoji: '🎡', label: 'Roulette' },
  { id: 'Ancient World', emoji: '🗿', label: 'Ancient World' },
  { id: 'Fast Games', emoji: '⚡', label: 'Fast Games' },
  { id: 'Fishing', emoji: '🎣', label: 'Fishing' },
  { id: 'Blackjack', emoji: '♠️', label: 'Blackjack' },
  { id: 'Megaways', emoji: '🌟', label: 'Megaways' },
];

export const PILL_CATS = SB_CATS.slice(0, 8);
export const PROVIDERS = ['All', 'NetEnt', "Play'n GO", 'Microgaming', 'Evolution', 'Pragmatic', 'Spribe', 'Hacksaw'];