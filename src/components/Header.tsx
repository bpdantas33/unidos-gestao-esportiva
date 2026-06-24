import { Search, Bell, Settings, Users, Menu } from 'lucide-react';
import { PROFILES } from '../data/initialData';
import { SquadCategory, Player } from '../types';

interface HeaderProps {
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSettings: () => void;
  onToggleNotifications: () => void;
  notificationCount: number;
  currentSquad: SquadCategory;
  setCurrentSquad: (squad: SquadCategory) => void;
  onToggleSidebar: () => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
  players: Player[];
  firebaseStatus?: 'loading' | 'connected' | 'error';
}

export default function Header({
  activeTab,
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  onToggleNotifications,
  notificationCount,
  currentSquad,
  setCurrentSquad,
  onToggleSidebar,
  session,
  players,
  firebaseStatus = 'connected'
}: HeaderProps) {
  // Get active profile based on the loaded screen tab to match initial screens
  const getProfile = () => {
    if (session?.playerId) {
      const loggedPlayer = players.find(p => p.id === session.playerId);
      if (loggedPlayer) {
        return {
          name: loggedPlayer.name,
          role: `Diretoria (Atleta #${loggedPlayer.number})`,
          img: loggedPlayer.image
        };
      }
    }

    if (session?.role === 'player') {
      const loggedPlayer = players.find(p => p.id === session.playerId);
      return {
        name: loggedPlayer?.name || 'Atleta Unidos',
        role: `Atleta #${loggedPlayer?.number || 10}`,
        img: loggedPlayer?.image || PROFILES.treinador
      };
    }

    switch (activeTab) {
      case 'inicio':
        return {
          name: 'Seu Carlos',
          role: 'Técnico e Fundador',
          img: PROFILES.treinador
        };
      case 'calendario':
        return {
          name: 'Roberto \'Betão\'',
          role: 'Diretor e Tesoureiro',
          img: PROFILES.diretor
        };
      case 'estatisticas':
        return {
          name: 'Martins \'Presidente\'',
          role: 'Presidente da Várzea',
          img: PROFILES.manager
        };
      case 'financeiro':
        return {
          name: 'Roberto \'Betão\'',
          role: 'Tesoureiro da Caixinha',
          img: PROFILES.finance
        };
      default:
        return {
          name: 'Seu Carlos',
          role: 'Técnico e Fundador',
          img: PROFILES.treinador
        };
    }
  };

  const profile = getProfile();

  const getPageTitle = () => {
    if (session?.role === 'player') {
      switch (activeTab) {
        case 'inicio':
          return 'Portal do Atleta';
        case 'calendario':
          return 'Calendário Unidos';
        case 'elenco':
          return 'Elenco do Unidos';
        case 'estatisticas':
          return 'Artilharia e Números';
        case 'financeiro':
          return 'Mensalidades e Caixinha';
        default:
          return 'Portal do Atleta';
      }
    }

    switch (activeTab) {
      case 'inicio':
        return 'Painel do Seu Carlos';
      case 'calendario':
        return 'Calendário de Jogos';
      case 'elenco':
        return 'Elenco do Unidos';
      case 'estatisticas':
        return 'Estatísticas e Artilharia';
      case 'financeiro':
        return 'Caixinha e Finanças';
      default:
        return 'Painel do Seu Carlos';
    }
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'inicio':
        return 'Buscar jogadores ou treinos...';
      case 'calendario':
        return 'Procurar partida...';
      case 'elenco':
        return 'Buscar jogador...';
      case 'estatisticas':
        return 'Procurar estatística...';
      case 'financeiro':
        return 'Buscar transações...';
      default:
        return 'Buscar...';
    }
  };

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white flex items-center justify-between px-4 md:px-10 shadow-sm border-b border-outline-variant/30 select-none">
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container transition-colors text-primary shrink-0"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary tracking-tight hidden lg:block">{getPageTitle()}</h1>
          {firebaseStatus === 'connected' && (
            <span className="hidden xl:flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-500/20 select-none shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Nuvem Sincronizada
            </span>
          )}
        </div>
        
        {/* Squad Switcher Toggle */}
        <div className="flex bg-surface-container p-1 rounded-full border border-outline-variant/35 items-center gap-1">
          <Users className="w-3.5 h-3.5 text-on-surface-variant/70 ml-2" />
          <button
            onClick={() => setCurrentSquad('Veterano/Esporte')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all duration-200 ${
              currentSquad === 'Veterano/Esporte'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-white/50'
            }`}
          >
            Veterano / Esporte
          </button>
          <button
            onClick={() => setCurrentSquad('Master')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all duration-200 ${
              currentSquad === 'Master'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-white/50'
            }`}
          >
            Master
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 w-[18px] h-[18px]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-1.5 bg-surface-container-low border border-outline-variant/20 rounded-full w-52 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            placeholder={getPlaceholder()}
          />
        </div>
      </div>

      {/* Action Icons and User Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          onClick={onToggleNotifications}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors relative"
        >
          <Bell className="w-[20px] h-[20px] text-on-surface-variant" />
          {notificationCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border border-white"></span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
        >
          <Settings className="w-[20px] h-[20px] text-on-surface-variant" />
        </button>

        {/* Profile Card */}
        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-outline-variant">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-on-surface leading-none">{profile.name}</p>
            <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{profile.role}</p>
          </div>
          <img
            alt={profile.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-tertiary shadow-sm bg-surface-container"
            src={profile.img}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
