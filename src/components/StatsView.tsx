import { useState } from 'react';
import { Award, Plus, Flame, Swords } from 'lucide-react';
import { Player, Match } from '../types';

interface StatsViewProps {
  players: Player[];
  matches: Match[];
  onAddGoalToScorer: (playerId: string) => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
}

export default function StatsView({
  players,
  matches,
  onAddGoalToScorer,
  session
}: StatsViewProps) {
  const [tableFilter, setTableFilter] = useState<'Geral' | 'Casa' | 'Fora'>('Geral');

  // Filter finished matches
  const finishedMatches = matches.filter(m => 
    (m.homeScore !== undefined && m.awayScore !== undefined) ||
    ['VITÓRIA', 'EMPATE', 'DERROTA'].includes(m.status)
  );

  // Filter based on tableFilter (Geral, Casa, Fora)
  const displayMatches = finishedMatches.filter(m => {
    if (tableFilter === 'Casa') {
      return m.homeTeam === 'Unidos';
    }
    if (tableFilter === 'Fora') {
      return m.awayTeam === 'Unidos';
    }
    return true; // Geral
  });

  // Calculate dynamic stats
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  displayMatches.forEach(m => {
    const homeScore = m.homeScore ?? 0;
    const awayScore = m.awayScore ?? 0;
    const isHome = m.homeTeam === 'Unidos';
    
    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    
    goalsFor += teamScore;
    goalsAgainst += opponentScore;
    
    if (teamScore > opponentScore) {
      won++;
    } else if (teamScore < opponentScore) {
      lost++;
    } else {
      drawn++;
    }
  });

  const played = displayMatches.length;
  const goalDifference = goalsFor - goalsAgainst;
  const points = won * 3 + drawn;
  const successRate = played > 0 ? ((points / (played * 3)) * 100).toFixed(1) : "0.0";
  const goalsAverage = played > 0 ? (goalsFor / played).toFixed(1) : "0.0";

  // Group stats by opponent (using all finished matches of this squad)
  const opponentStatsMap: { 
    [key: string]: { 
      played: number, 
      won: number, 
      drawn: number, 
      lost: number, 
      goalsFor: number, 
      goalsAgainst: number, 
      lastScore?: string 
    } 
  } = {};

  finishedMatches.forEach(m => {
    const opponent = m.homeTeam === 'Unidos' ? m.awayTeam : m.homeTeam;
    const homeScore = m.homeScore ?? 0;
    const awayScore = m.awayScore ?? 0;
    const isHome = m.homeTeam === 'Unidos';
    
    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    
    if (!opponentStatsMap[opponent]) {
      opponentStatsMap[opponent] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
    }
    
    const stat = opponentStatsMap[opponent];
    stat.played++;
    stat.goalsFor += teamScore;
    stat.goalsAgainst += opponentScore;
    
    if (teamScore > opponentScore) {
      stat.won++;
    } else if (teamScore < opponentScore) {
      stat.lost++;
    } else {
      stat.drawn++;
    }
    
    stat.lastScore = `${homeScore} - ${awayScore}`;
  });

  const opponentList = Object.keys(opponentStatsMap).map(name => {
    const o = opponentStatsMap[name];
    const oPoints = o.won * 3 + o.drawn;
    const oSuccess = o.played > 0 ? ((oPoints / (o.played * 3)) * 100).toFixed(0) : "0";
    return {
      name,
      ...o,
      successRate: oSuccess
    };
  }).sort((a, b) => b.played - a.played); // Sort by most played

  // Sorted list of scorers dynamically calculated from our live players state
  const scorersList = [...players]
    .filter(p => p.goals !== undefined && p.goals > 0)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0));

  // Dynamic Leaders
  const cleanSheetsLeader = [...players]
    .filter(p => p.cleanSheets !== undefined && p.cleanSheets > 0)
    .sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0))[0];

  const tackleLeader = [...players]
    .filter(p => p.tackles !== undefined && p.tackles > 0)
    .sort((a, b) => (b.tackles || 0) - (a.tackles || 0))[0];

  return (
    <div className="space-y-10 select-none">
      
      {/* Top Section: League Standings & Top Scorers */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* League Table (8 Cols) */}
        <section className="xl:col-span-8 bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <Swords className="w-5 h-5 text-secondary" />
                Aproveitamento de Amistosos
              </h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Métricas de desempenho e histórico contra adversários em tempo real</p>
            </div>
            {/* Filter buttons */}
            <div className="flex gap-1.5 bg-surface-container rounded-full p-1 border border-outline-variant/15 w-fit">
              {(['Geral', 'Casa', 'Fora'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTableFilter(filter)}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                    tableFilter === filter
                      ? 'bg-primary text-white shadow'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Unidos performance metrics cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15 text-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Jogos</span>
              <p className="text-xl font-black text-primary mt-1">{played}</p>
            </div>
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15 text-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Vitórias / E / D</span>
              <p className="text-xl font-black text-secondary mt-1">
                {won} <span className="text-xs text-outline-variant font-medium">/</span> {drawn} <span className="text-xs text-outline-variant font-medium">/</span> {lost}
              </p>
            </div>
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15 text-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Aproveitamento</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                <p className="text-xl font-black text-orange-500">{successRate}%</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/15 text-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Gols (GP / GC)</span>
              <p className="text-xl font-black text-primary mt-1">
                {goalsFor} <span className="text-xs text-outline-variant font-medium">/</span> {goalsAgainst}
                <span className="text-xs text-on-surface-variant font-bold ml-1.5">
                  ({goalDifference >= 0 ? `+${goalDifference}` : goalDifference})
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-3">Histórico de Confrontos por Adversário</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant/20">
                  <tr className="text-on-surface-variant font-bold">
                    <th className="p-3">Adversário</th>
                    <th className="p-3 text-center w-16">Jogos</th>
                    <th className="p-3 text-center w-16">V</th>
                    <th className="p-3 text-center w-16">E</th>
                    <th className="p-3 text-center w-16">D</th>
                    <th className="p-3 text-center w-24">Gols (GP-GC)</th>
                    <th className="p-3 text-center w-24">Aproveit.</th>
                    <th className="p-3 text-center w-24 hidden sm:table-cell">Último Placar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {opponentList.map((opp) => (
                    <tr key={opp.name} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-[10px] font-black text-primary flex items-center justify-center border border-outline-variant/20 uppercase">
                            {opp.name.substring(0, 2)}
                          </div>
                          <span className="font-bold text-on-surface">{opp.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-semibold">{opp.played}</td>
                      <td className="p-3 text-center text-secondary font-semibold">{opp.won}</td>
                      <td className="p-3 text-center text-on-surface-variant">{opp.drawn}</td>
                      <td className="p-3 text-center text-error font-semibold">{opp.lost}</td>
                      <td className="p-3 text-center text-on-surface-variant">
                        {opp.goalsFor} <span className="text-[10px] opacity-60">-</span> {opp.goalsAgainst}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          Number(opp.successRate) >= 60 
                            ? 'bg-secondary/10 text-secondary' 
                            : Number(opp.successRate) >= 40 
                            ? 'bg-outline/15 text-outline' 
                            : 'bg-error/10 text-error'
                        }`}>
                          {opp.successRate}%
                        </span>
                      </td>
                      <td className="p-3 text-center hidden sm:table-cell">
                        <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded text-primary">
                          {opp.lastScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {opponentList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-on-surface-variant font-medium italic">
                        Nenhum confronto finalizado registrado para este elenco.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Top Scorers (4 Cols) */}
        <section className="xl:col-span-4 bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <Award className="w-5 h-5 text-secondary" />
                  Artilharia
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Líderes de gols do Unidos</p>
              </div>
            </div>

            <div className="space-y-4">
              {scorersList.map((scorer, i) => (
                <div
                  key={scorer.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/10 hover:border-secondary transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-outline-variant">#{i + 1}</span>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary shrink-0 shadow-sm">
                      <img
                        alt={scorer.name}
                        className="w-full h-full object-cover"
                        src={scorer.image}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface leading-tight">{scorer.name}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase font-medium">{scorer.position}</p>
                    </div>
                  </div>

                  {/* Add Goal dynamic button */}
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-lg text-primary">{scorer.goals} Gols</span>
                    {session?.role !== 'player' && (
                      <button
                        onClick={() => onAddGoalToScorer(scorer.id)}
                        title="Registrar gol para este jogador"
                        className="w-6 h-6 rounded-full bg-secondary text-white hover:bg-secondary-container hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant text-center italic mt-6 border-t border-outline-variant/10 pt-4">
            *Atualizado em tempo real com base nos gols registrados.
          </p>
        </section>
      </div>

      {/* Bento Grid Individual Leaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Clean Sheet Leader */}
        <div className="bg-white p-5 rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary shadow-sm bg-surface-container">
              {cleanSheetsLeader && cleanSheetsLeader.image ? (
                <img
                  alt={cleanSheetsLeader.name}
                  className="w-full h-full object-cover"
                  src={cleanSheetsLeader.image}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-lg">
                  {cleanSheetsLeader ? cleanSheetsLeader.name.charAt(0) : '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Goleiro Menos Vazado</p>
              <h4 className="font-bold text-base text-on-surface mt-1">{cleanSheetsLeader?.name || 'N/A'}</h4>
              <p className="text-xs text-secondary font-bold mt-0.5">{cleanSheetsLeader?.cleanSheets || 0} Clean Sheets</p>
            </div>
          </div>
          <div className="text-3xl">🧤</div>
        </div>

        {/* Defensive Leader (Tackles) */}
        <div className="bg-white p-5 rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary shadow-sm bg-surface-container">
              {tackleLeader && tackleLeader.image ? (
                <img
                  alt={tackleLeader.name}
                  className="w-full h-full object-cover"
                  src={tackleLeader.image}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-lg">
                  {tackleLeader ? tackleLeader.name.charAt(0) : '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Líder em Desarmes</p>
              <h4 className="font-bold text-base text-on-surface mt-1">{tackleLeader?.name || 'N/A'}</h4>
              <p className="text-xs text-secondary font-bold mt-0.5">{tackleLeader?.tackles || 0} desarmes</p>
            </div>
          </div>
          <div className="text-3xl">🛡️</div>
        </div>

      </div>
    </div>
  );
}
