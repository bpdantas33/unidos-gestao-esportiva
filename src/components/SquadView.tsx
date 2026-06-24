import { useState } from 'react';
import { Plus, Star, Trash2, MessageSquare } from 'lucide-react';
import { Player, PlayerPosition } from '../types';

interface SquadViewProps {
  players: Player[];
  onPlayerClick: (player: Player) => void;
  onOpenAddPlayer: () => void;
  onDeletePlayer: (id: string) => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
}

export default function SquadView({
  players,
  onPlayerClick,
  onOpenAddPlayer,
  onDeletePlayer,
  session
}: SquadViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<'Todos' | PlayerPosition>('Todos');

  // Filter players based on tab selection
  const filteredPlayers = selectedFilter === 'Todos'
    ? players
    : players.filter(p => p.position === selectedFilter);

  // Dynamic calculations based on active players in memory
  const calculateOverview = () => {
    if (players.length === 0) return { avgAge: 0, totalValue: 0, available: 0, injured: 0 };
    const totalAge = players.reduce((sum, p) => sum + p.age, 0);
    const avgAge = (totalAge / players.length).toFixed(1);
    
    // Simular valor baseado no rating do elenco
    const totalValue = players.reduce((sum, p) => sum + (p.rating * 1.5 + (100 - p.age) * 0.5), 0).toFixed(1);
    const available = players.filter(p => !p.isInjured).length;
    const injured = players.filter(p => p.isInjured).length;

    return {
      avgAge,
      totalValue,
      available,
      injured
    };
  };

  const stats = calculateOverview();

  const tabs: ('Todos' | PlayerPosition)[] = ['Todos', 'Goleiro', 'Defensor', 'Meio-Campo', 'Atacante'];

  return (
    <div className="space-y-10 select-none">
      
      {/* Overview Stats Bento section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className={`${session?.role === 'player' ? 'md:col-span-12' : 'md:col-span-8'} bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between relative overflow-hidden`}>
          <div>
            <h3 className="text-xl font-bold text-primary tracking-tight">Visão Geral do Time</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {players.length} Atletas registrados • Futebol de Várzea raiz pelo Amor à Camisa ⚽
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 z-10">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Média de Idade</p>
              <p className="text-2xl font-bold text-primary">
                {stats.avgAge} <span className="text-xs font-normal text-on-surface-variant">anos</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Valor do Passe</p>
              <p className="text-lg font-black text-secondary uppercase tracking-tight py-1">
                Pelo Amor!
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Disponíveis</p>
              <p className="text-2xl font-bold text-primary">
                {stats.available} <span className="text-primary-fixed-dim text-xs">●</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">No Estaleiro</p>
              <p className="text-2xl font-bold text-error">
                {stats.injured} <span className="text-error/35 text-xs">●</span>
              </p>
            </div>
          </div>

          {/* Subtly blurred background gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        </div>

        {/* Novo Atleta action card */}
        {session?.role !== 'player' && (
          <div className="md:col-span-4 bg-primary text-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center gap-4 border border-primary text-center">
            <div>
              <h3 className="text-lg font-bold">Novo Atleta</h3>
              <p className="text-xs text-primary-fixed-dim mt-1 max-w-[240px] mx-auto">
                Adicione novos talentos ao elenco principal ou categorias de base.
              </p>
            </div>
            <button
              onClick={onOpenAddPlayer}
              className="bg-secondary text-white px-8 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md w-full cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 border-b border-outline-variant/30 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
        {tabs.map((tab) => {
          const isSelected = selectedFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-4 py-2 text-sm transition-all border-b-4 ${
                isSelected
                  ? 'border-secondary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-primary font-medium'
              }`}
            >
              {tab === 'Todos' ? 'Todos' : tab === 'Goleiro' ? 'Goleiros' : tab === 'Defensor' ? 'Defensores' : tab === 'Meio-Campo' ? 'Meias' : 'Atacantes'}
            </button>
          );
        })}
      </div>

      {/* Player Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {filteredPlayers.map((player) => {
          const isInjured = player.isInjured;
          return (
            <div
              key={player.id}
              className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col card-hover-effect transition-all duration-300 relative group"
            >
              {/* Image & position badges */}
              <div
                onClick={() => onPlayerClick(player)}
                className="h-60 relative overflow-hidden bg-surface-container cursor-pointer"
              >
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={player.image}
                  alt={player.name}
                  referrerPolicy="no-referrer"
                />
                
                {/* Number Badge */}
                <div className="absolute top-4 left-4 bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-md">
                  {player.number}
                </div>

                {/* Delete button (hidden by default, shown on hover for high flexibility) */}
                {session?.role !== 'player' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Deseja realmente excluir ${player.name} do elenco?`)) {
                        onDeletePlayer(player.id);
                      }
                    }}
                    className="absolute top-4 right-4 bg-white/80 hover:bg-error hover:text-white p-2 rounded-lg text-on-surface-variant transition-all shadow-md opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white shadow-sm ${
                    isInjured ? 'bg-error' : 'bg-secondary'
                  }`}>
                    {isInjured ? 'Lesionado' : 'Titular'}
                  </span>
                  <span className="bg-primary/80 text-white backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    {player.position}
                  </span>
                </div>
              </div>

              {/* Player text details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4
                          onClick={() => onPlayerClick(player)}
                          className="font-bold text-base text-primary hover:underline cursor-pointer truncate max-w-[150px]"
                        >
                          {player.name}
                        </h4>
                        {player.phone ? (
                          <a
                            href={`https://wa.me/55${player.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-500 hover:text-emerald-600 transition-colors p-1 flex items-center shrink-0"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-emerald-50" />
                          </a>
                        ) : (
                          <button
                            onClick={() => alert(`WhatsApp não cadastrado. Toque na ficha de ${player.name} para cadastrar!`)}
                            className="text-on-surface-variant/30 hover:text-emerald-400 transition-colors p-1 flex items-center shrink-0"
                            title="WhatsApp não cadastrado"
                          >
                            <MessageSquare className="w-3.5 h-3.5 opacity-55" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">{player.country} • {player.age} anos</p>
                    </div>

                    <div className="flex items-center gap-1 text-secondary font-bold text-sm">
                      <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
                      <span>{player.rating}</span>
                    </div>
                  </div>

                  {/* Physical condition progress bar */}
                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      <span>Condição Física</span>
                      <span className={player.condition < 60 ? 'text-error font-bold' : ''}>
                        {player.condition}% {isInjured && player.injuryNote ? `(${player.injuryNote})` : ''}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          player.condition > 85 ? 'bg-secondary' : player.condition > 60 ? 'bg-tertiary-container' : 'bg-error'
                        }`}
                        style={{ width: `${player.condition}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Individual statistics row */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20 mt-4 text-xs">
                  {player.position === 'Goleiro' ? (
                    <>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Jogos</p>
                        <p className="font-bold text-primary mt-0.5">{player.games}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Clean Sheets</p>
                        <p className="font-bold text-primary mt-0.5">{player.cleanSheets || 0}</p>
                      </div>
                    </>
                  ) : player.position === 'Defensor' ? (
                    <>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Jogos</p>
                        <p className="font-bold text-primary mt-0.5">{player.games}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Desarmes</p>
                        <p className="font-bold text-primary mt-0.5">{player.tackles || 0}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Jogos</p>
                        <p className="font-bold text-primary mt-0.5">{player.games}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Gols</p>
                        <p className="font-bold text-primary mt-0.5">{player.goals || 0}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty add player dashed placeholder */}
        <div
          onClick={onOpenAddPlayer}
          className="border-2 border-dashed border-outline-variant/60 rounded-xl flex flex-col items-center justify-center p-10 hover:border-secondary transition-all cursor-pointer group min-h-[380px] bg-white bg-opacity-50"
        >
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-all mb-4 shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <p className="font-bold text-sm text-on-surface group-hover:text-primary">Novo Atleta</p>
          <p className="text-xs text-on-surface-variant text-center mt-1.5 opacity-80 max-w-[180px]">
            Expandir o plantel com novos registros ou prospecção.
          </p>
        </div>

      </div>
    </div>
  );
}
