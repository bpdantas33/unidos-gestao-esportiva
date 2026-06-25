import { LayoutDashboard, Calendar, Users, BarChart3, DollarSign, HelpCircle, LogOut, X, Shield, User } from 'lucide-react';
import { UNIDOS_LOGO } from '../data/initialData';
import { Player } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSupport: () => void;
  isOpen: boolean;
  onClose: () => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
  players: Player[];
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onLogout,
  onSupport,
  isOpen,
  onClose,
  session,
  players
}: SidebarProps) {
  const menuItems = [
    { id: 'inicio', name: 'Início', icon: LayoutDashboard },
    { id: 'calendario', name: 'Calendário', icon: Calendar },
    { id: 'elenco', name: 'Elenco', icon: Users },
    { id: 'estatisticas', name: 'Estatísticas', icon: BarChart3 },
    { id: 'financeiro', name: 'Financeiro', icon: DollarSign },
  ];

  const loggedInPlayer = session?.playerId
    ? players.find(p => p.id === session.playerId)
    : null;

  return (
    <aside className={`h-screen w-64 fixed left-0 top-0 z-50 bg-primary-container flex flex-col py-8 px-4 shadow-xl border-r border-white/5 select-none transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Brand Logo & Name */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-tertiary shadow-md relative shrink-0">
              <img
                alt="Unidos Crest"
                className="w-full h-full object-cover scale-[1.35]"
                src={UNIDOS_LOGO}
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="font-bold text-[18px] text-white leading-tight tracking-tight">Unidos Suzano<br/>Futebol Master</h2>
              <p className="text-[10px] font-semibold text-primary-fixed-dim uppercase tracking-wider">Futebol de Várzea</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="lg:hidden text-primary-fixed-dim hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Logged in Profile Widget */}
      <div className="mx-2 mb-6 p-3 bg-white/5 rounded-xl border border-white/10 text-left animate-fadeIn">
        {session?.role === 'admin' ? (
          loggedInPlayer ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-tertiary/40 bg-white/10 relative">
                <img
                  src={loggedInPlayer.image}
                  alt={loggedInPlayer.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary rounded-full border border-primary-container flex items-center justify-center">
                  <Shield className="w-1.5 h-1.5 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate leading-tight">
                  {loggedInPlayer.name.split(' ').slice(0, 2).join(' ')}
                </p>
                <p className="text-[10px] text-tertiary font-bold uppercase tracking-wide mt-0.5">
                  Diretoria (Admin)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-tertiary/20 flex items-center justify-center text-tertiary border border-tertiary/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Diretoria</p>
                <p className="text-[10px] text-primary-fixed-dim font-bold">Administrador</p>
              </div>
            </div>
          )
        ) : loggedInPlayer ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/15 bg-white/10">
              <img
                src={loggedInPlayer.image}
                alt={loggedInPlayer.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate leading-tight">
                {loggedInPlayer.name.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-[10px] text-primary-fixed-dim font-bold uppercase tracking-wide mt-0.5">
                Nº {loggedInPlayer.number} • {loggedInPlayer.position}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-primary-fixed-dim">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white uppercase">Não Identificado</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 flex flex-col gap-1.5 sidebar-scroll overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 text-left font-medium ${
                isActive
                  ? 'bg-secondary text-white border-l-4 border-tertiary-fixed shadow-md'
                  : 'text-primary-fixed-dim hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-tertiary-fixed' : ''}`} />
              <span className="text-[15px]">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Buttons */}
      <div className="mt-auto pt-6 flex flex-col gap-1.5">
        <button
          onClick={onSupport}
          className="w-full flex items-center gap-3 text-primary-fixed-dim px-4 py-2 hover:text-white transition-colors text-left font-medium"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Suporte</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 text-primary-fixed-dim px-4 py-2 hover:text-white transition-colors text-left font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
}
