import { useState } from 'react';
import { 
  CalendarCheck, 
  CheckCircle, 
  TrendingUp, 
  Timer, 
  Calendar as CalendarIcon, 
  MapPin, 
  Compass, 
  RefreshCw, 
  FileText, 
  UserCheck, 
  UserX, 
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { Match, Player, SquadCategory } from '../types';
import { MAP_IMAGE, UNIDOS_LOGO, IBERIA_LOGO } from '../data/initialData';

interface CalendarViewProps {
  matches: Match[];
  players: Player[];
  onOpenScheduleMatch: () => void;
  onMatchClick?: (match: Match) => void;
  onImportMatches: (imported: Match[]) => void;
  onConfirmAttendance: (matchId: string, playerId: string, status: 'CONFIRMADO' | 'AUSENTE') => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
}

export default function CalendarView({
  matches,
  players,
  onOpenScheduleMatch,
  onMatchClick,
  onImportMatches,
  onConfirmAttendance,
  session
}: CalendarViewProps) {
  // Filter matches
  const upcomingMatches = matches.filter(m => m.status === 'CONFIRMADO');
  const pastMatches = matches.filter(
    m => m.homeScore !== undefined || m.status === 'CANCELADO' || m.status === 'VITÓRIA' || m.status === 'EMPATE' || m.status === 'DERROTA'
  );

  // States
  const [isSynced, setIsSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Importer states
  const [showImporter, setShowImporter] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Attendance states (tracks which match card has the attendance drawer open)
  const [activeAttendanceMatchId, setActiveAttendanceMatchId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const handleSyncCalendar = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setIsSynced(true);
    }, 1500);
  };

  // Spreadsheet Copy/Paste Parsing logic
  const handleImportText = () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError('Por favor, cole as linhas de sua planilha.');
      return;
    }

    const lines = importText.split('\n');
    const parsedMatches: Match[] = [];

    // Let's parse each line
    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      // Try splitting by Tab (Excel/Sheets default), then Semicolon, then Comma
      let cols: string[] = [];
      if (trimmedLine.includes('\t')) {
        cols = trimmedLine.split('\t');
      } else if (trimmedLine.includes(';')) {
        cols = trimmedLine.split(';');
      } else {
        cols = trimmedLine.split(',');
      }

      // If it looks like a header line, skip it
      if (idx === 0 && (
        trimmedLine.toLowerCase().includes('data') || 
        trimmedLine.toLowerCase().includes('oponente') || 
        trimmedLine.toLowerCase().includes('advers')
      )) {
        return;
      }

      if (cols.length < 2) return;

      const date = cols[0]?.trim() || 'Data Jogo';
      const opponent = cols[1]?.trim() || 'Oponente F.C.';
      const time = cols[2]?.trim() || '10:30';
      const stadium = cols[3]?.trim() || 'Campo de Terra do Alvorada';
      const rawSquad = cols[4]?.trim()?.toLowerCase() || '';

      const squad: SquadCategory = rawSquad.includes('master') ? 'Master' : 'Veterano/Esporte';

      parsedMatches.push({
        id: `imported_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        date,
        type: 'AMISTOSO',
        homeTeam: 'Unidos',
        homeLogo: "https://lh3.googleusercontent.com/aida-public/AB6AXuArqoSFrq1SwthQh_1NBZ0AjFN1sCEacAGKG2jPeav6UcNvuuoWdZq94FOPiSyDtHk-m8NLTaE90CWYE5zwBoDcGSHcV_pmmrdEz8RexIu_m53m6K-eR4PjsbeAZvvwN5fVIOiY3SwOWjfVl4l8t5DWmDpVdr-PkWIsFYmJbCXePfXgPKZV-pUXtXcqmTQIq0lZopk4bJQYVP_HOtSckR5bFDwXyIRuZd6v2oPDu-1WDXWaERJbEL8cmWu5nikSNQlze7YtKCmKKesD",
        awayTeam: opponent,
        awayLogo: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6hYf9ZNWmYQF58XsMbF7A5tBQTdW2mdKBaPRHD381Wii3wPmIvFSIJWXStQ9QJV67fqiCFCX2oqDzwucr_ekxReOt1PQ_XFk6mKsYiBAvqmUE1NfgSZyEueejiC_0L7mkGnT_hi_IIolpQZ8EP8iA0D-i1uqZFtQtOQ4i-lpM4FURmi1WdYCftuJNreYJn-EUHxCOs7b4A3GnCB3hPoSuxgjChDlaKtZ2U9cJ7SY9YssmSbMES0n1C_GDN9nEY3XWw1EMe17uoCXH",
        isConfirmed: true,
        status: 'CONFIRMADO',
        time,
        stadium,
        squad,
        confirmedPlayers: []
      });
    });

    if (parsedMatches.length === 0) {
      setImportError('Nenhum jogo pôde ser decodificado. Use o formato sugerido.');
      return;
    }

    onImportMatches(parsedMatches);
    setImportText('');
    setShowImporter(false);
  };

  return (
    <div className="space-y-10 select-none">
      {/* Page Header Area with Buttons */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">Calendário de Partidas</h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Agenda oficial dos dois times ("Master" e "Veterano/Esporte"), confirmação de presença e importador.
          </p>
        </div>
        {session?.role !== 'player' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImporter(!showImporter)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-outline-variant hover:bg-surface-container font-bold text-sm transition-all cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 text-primary" />
              Importar de Planilha (Excel/Sheets)
            </button>
            
            <button
              onClick={onOpenScheduleMatch}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm hover:shadow-lg active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              Agendar Jogo Manual
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Importer Panel (Collapsible) */}
      {showImporter && (
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/40 shadow-md space-y-4 text-left">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-secondary" />
                Importar Agenda de Planilha
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Copie as linhas da sua planilha e cole abaixo. Separadores suportados: Tab (padrão de Excel/Google Sheets), ponto-e-vírgula ou vírgula.
              </p>
            </div>
            <button 
              onClick={() => { setShowImporter(false); setImportError(''); }}
              className="text-on-surface-variant hover:text-on-surface font-extrabold"
            >
              Fechar X
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-bold text-primary">Cole seus dados de tabela aqui:</label>
              <textarea
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="24 OUT&#11;Ajax da Favela&#11;10:30&#11;Campo de Terra do Alvorada&#11;Veterano/Esporte&#10;31 OUT&#11;Pé de Cana Master&#11;08:30&#11;Arena Poeirão&#11;Master"
                className="w-full p-3 font-mono text-xs bg-white border border-outline-variant/40 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              {importError && (
                <p className="text-xs font-bold text-error">{importError}</p>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-outline-variant/20 space-y-3">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Formato das Colunas:</h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Cada linha representa um jogo. Insira as colunas na ordem ou separe-as por tabulação:
              </p>
              <div className="bg-surface-container p-2.5 rounded text-[11px] font-mono text-primary space-y-1">
                <p>1. Data (Ex: <span className="font-bold">25 OUT</span>)</p>
                <p>2. Adversário (Ex: <span className="font-bold">Ajax</span>)</p>
                <p>3. Horário (Ex: <span className="font-bold">10:30</span>)</p>
                <p>4. Local (Ex: <span className="font-bold">Campo da Terra</span>)</p>
                <p>5. Time (Ex: <span className="font-bold">Master</span> ou <span className="font-bold">Veterano</span>)</p>
              </div>
              <button
                onClick={handleImportText}
                className="w-full py-2 bg-secondary text-white hover:brightness-110 rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                Processar e Adicionar Jogos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-medium mb-1">Partidas Confirmadas</p>
            <p className="text-2xl font-black text-primary">{upcomingMatches.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-medium mb-1">Jogos Realizados</p>
            <p className="text-2xl font-black text-primary">{pastMatches.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/5 text-secondary">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-medium mb-1">Time em Foco</p>
            <p className="text-sm font-bold text-secondary uppercase tracking-wider">Dual-Squad Ativo</p>
          </div>
          <div className="p-3 rounded-lg bg-tertiary-fixed text-tertiary">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant font-medium mb-1">Próxima Rodada</p>
            <p className="text-2xl font-black text-primary">Este Domingo</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-high text-primary">
            <Timer className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Upcoming Matches Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-secondary status-pulse"></span>
          <h3 className="text-lg font-bold text-primary">Próximos Confrontos Agendados</h3>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="text-center py-10 bg-white border border-outline-variant/30 rounded-xl space-y-2">
            <CalendarIcon className="w-8 h-8 text-on-surface-variant mx-auto opacity-40" />
            <p className="font-bold text-on-surface">Nenhum confronto agendado no momento</p>
            <p className="text-xs text-on-surface-variant">Use o agendador manual ou o importador de planilha para registrar partidas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {upcomingMatches.map((match) => {
              const dateParts = match.date.split(' ');
              const month = dateParts[1] || 'OUT';
              const dayNum = dateParts[0] || '24';
              
              // Get list of confirmed players for this match
              const matchConfirmedList = players.filter(p => match.confirmedPlayers?.includes(p.id));
              const squadPlayers = players.filter(p => p.squad === match.squad);

              return (
                <div
                  key={match.id}
                  className="bg-white rounded-xl border border-outline-variant/30 shadow-md hover:border-secondary transition-all flex flex-col overflow-hidden"
                >
                  <div className="p-5 flex flex-col md:flex-row items-center gap-6">
                    {/* Left Date Column */}
                    <div className="flex-shrink-0 text-center md:px-4 md:border-r border-outline-variant/30 w-full md:w-auto">
                      <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">{month}</p>
                      <p className="text-3xl font-extrabold text-primary">{dayNum}</p>
                      <p className="text-xs font-bold text-secondary">{match.squad.toUpperCase()}</p>
                    </div>

                    {/* Match logos / Versus */}
                    <div className="flex-1 flex items-center justify-between w-full">
                      <div className="flex items-center justify-center gap-4 w-full">
                        
                        {/* Home Team */}
                        <div className="text-right flex-1 min-w-0">
                          <p className="font-bold text-sm text-on-surface truncate">{match.homeTeam}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Mandante</p>
                        </div>

                        {/* Home Shield */}
                        <div className="w-11 h-11 bg-white flex items-center justify-center rounded-full border border-tertiary shrink-0 shadow-sm overflow-hidden relative">
                          <img
                            alt={match.homeTeam}
                            className={`w-full h-full object-cover ${match.homeLogo === UNIDOS_LOGO ? 'scale-[1.35]' : ''}`}
                            src={match.homeLogo}
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* VS divider */}
                        <div className="font-bold text-xs text-outline-variant uppercase italic px-1">VS</div>

                        {/* Away Shield */}
                        <div className="w-11 h-11 bg-white border border-outline-variant/30 flex items-center justify-center rounded-full overflow-hidden shrink-0 shadow-sm relative">
                          <img
                            alt={match.awayTeam}
                            className={`w-full h-full object-cover ${match.awayLogo === UNIDOS_LOGO ? 'scale-[1.35]' : ''}`}
                            src={match.awayLogo || IBERIA_LOGO}
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Away Team */}
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-bold text-sm text-on-surface truncate">{match.awayTeam}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Visitante</p>
                        </div>

                      </div>
                    </div>

                    {/* Right Details Info */}
                    <div className="flex flex-col items-center md:items-end shrink-0 gap-1 text-center md:text-right w-full md:w-auto border-t md:border-t-0 border-outline-variant/20 pt-3 md:pt-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[9px] uppercase tracking-wider border border-primary/5">
                        {match.type}
                      </span>
                      <div className="flex items-center gap-1 text-on-surface-variant mt-1">
                        <span className="text-xs font-bold text-on-surface">{match.time || '10:30'}h</span>
                      </div>
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <span className="text-[10px] font-bold text-on-surface-variant">{match.stadium}</span>
                      </div>
                      <button
                        onClick={() => {
                          const text = `⚽ *CONVOCAÇÃO - UNIDOS FC* ⚽\n\n🏆 Confronto: *${match.homeTeam} VS ${match.awayTeam}*\n📅 Data: *${match.date}*\n⏰ Horário: *${match.time || '10:30'}h*\n🏟️ Local: *${match.stadium}*\n📋 Elenco: *${match.squad}*\n\nBora pro jogo rapaziada! Confirmem a presença de vocês no nosso aplicativo! 🔴⚪`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="mt-2 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                        title="Compartilhar Convocatória no WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3 fill-emerald-50" />
                        Compartilhar WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Attendance Presence / confirmation drawer */}
                  <div className="bg-surface-container-low px-5 py-4 border-t border-outline-variant/35 flex flex-col gap-4 text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="text-xs font-black text-primary flex items-center gap-1.5 uppercase tracking-wide">
                          <UserCheck className="w-4 h-4 text-secondary" />
                          Confirmação de Presença ({matchConfirmedList.length} Atletas Confirmados)
                        </h4>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          Disponibilizado para os jogadores confirmarem presença para este jogo.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (activeAttendanceMatchId === match.id) {
                            setActiveAttendanceMatchId(null);
                          } else {
                            setActiveAttendanceMatchId(match.id);
                            setSelectedPlayerId('');
                          }
                        }}
                        className="text-xs font-bold bg-white px-3 py-1.5 rounded-full border border-outline-variant/40 hover:bg-surface-container flex items-center gap-1 shadow-sm transition-all text-secondary"
                      >
                        {activeAttendanceMatchId === match.id ? (
                          <>
                            Ocultar Painel <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Confirmar Minha Presença <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Active attendance confirmation selector inline */}
                    {activeAttendanceMatchId === match.id && (
                      <div className="bg-white p-3.5 rounded-lg border border-outline-variant/30 space-y-3 animate-fadeIn">
                        {session?.role === 'player' ? (
                          (() => {
                            const loggedPlayer = players.find(p => p.id === session.playerId);
                            const isConfirmed = match.confirmedPlayers?.includes(session.playerId || '');
                            return (
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-green-500' : 'bg-amber-500'}`} />
                                    Atleta: <span className="font-extrabold">{loggedPlayer?.name}</span> (Nº {loggedPlayer?.number})
                                  </p>
                                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                                    {isConfirmed 
                                      ? "Você já está confirmado para este jogo!"
                                      : "Sua presença ainda não está registrada para esta partida."}
                                  </p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                  {!isConfirmed ? (
                                    <>
                                      <button
                                        onClick={() => onConfirmAttendance(match.id, session.playerId || '', 'CONFIRMADO')}
                                        className="flex-1 sm:flex-initial px-4 py-1.5 bg-secondary text-white font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" /> Vou Jogar!
                                      </button>
                                      <button
                                        onClick={() => onConfirmAttendance(match.id, session.playerId || '', 'AUSENTE')}
                                        className="px-4 py-1.5 bg-error-container text-on-error-container font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                                      >
                                        <UserX className="w-3.5 h-3.5" /> Não vou
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => onConfirmAttendance(match.id, session.playerId || '', 'AUSENTE')}
                                      className="w-full sm:w-auto px-4 py-1.5 bg-error-container text-on-error-container font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                                    >
                                      <UserX className="w-3.5 h-3.5" /> Cancelar Minha Presença ❌
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <>
                            <p className="text-xs font-bold text-primary">Selecione seu nome do elenco de {match.squad}:</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={selectedPlayerId}
                                onChange={(e) => setSelectedPlayerId(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">-- Escolha seu nome --</option>
                                {squadPlayers.map(p => (
                                  <option key={p.id} value={p.id}>
                                    #{p.number} - {p.name} ({p.position})
                                  </option>
                                ))}
                              </select>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (!selectedPlayerId) return;
                                    onConfirmAttendance(match.id, selectedPlayerId, 'CONFIRMADO');
                                  }}
                                  disabled={!selectedPlayerId}
                                  className="px-4 py-1.5 bg-secondary text-white font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 disabled:opacity-40 flex items-center gap-1 shadow transition-all"
                                >
                                  <UserCheck className="w-3.5 h-3.5" /> Vou Jogar!
                                </button>
                                <button
                                  onClick={() => {
                                    if (!selectedPlayerId) return;
                                    onConfirmAttendance(match.id, selectedPlayerId, 'AUSENTE');
                                  }}
                                  disabled={!selectedPlayerId}
                                  className="px-4 py-1.5 bg-error-container text-on-error-container border border-error-container font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 disabled:opacity-40 flex items-center gap-1 shadow transition-all"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Tô Fora
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Roster of confirmed player avatars/tags */}
                    {matchConfirmedList.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {matchConfirmedList.map(p => (
                          <div 
                            key={p.id} 
                            className="inline-flex items-center gap-1.5 bg-white border border-outline-variant/35 px-2.5 py-1 rounded-full text-xs font-extrabold text-on-surface shadow-sm hover:border-secondary hover:text-secondary transition-all"
                          >
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-4 h-4 rounded-full object-cover shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                            <span>{p.name.split(' ')[0]}</span>
                            <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.2 rounded-full font-bold">#{p.number}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant italic">
                        Nenhum jogador confirmou presença ainda para este confronto. Seja o primeiro!
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Match Table Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-on-surface-variant"></span>
            <h3 className="text-lg font-bold text-primary">Resultados Recentes</h3>
          </div>
        </div>

        <div className="bg-white border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant/20">
                <tr>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Data &amp; Local</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Time</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Confronto</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Placar</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {pastMatches.slice(0, 5).map((match) => {
                  const isCancel = match.status === 'CANCELADO';
                  return (
                    <tr key={match.id} className="hover:bg-surface-container-low transition-all duration-150">
                      <td className="p-4">
                        <p className="font-bold text-sm text-on-surface">{match.date}</p>
                        <p className="text-[10px] text-on-surface-variant">{match.stadium}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-primary/5 text-primary border border-primary/5">
                          {match.squad}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className={match.homeTeam === 'Unidos' ? 'font-bold text-primary' : 'text-on-surface'}>{match.homeTeam}</span>
                          <span className="text-outline-variant text-xs">vs</span>
                          <span className={match.awayTeam === 'Unidos' ? 'font-bold text-primary' : 'text-on-surface'}>{match.awayTeam}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {isCancel ? (
                          <span className="text-outline-variant font-bold text-xs uppercase">N/A</span>
                        ) : (
                          <div className="inline-flex items-center bg-secondary-container text-white px-3 py-1 rounded-lg">
                            <span className="text-base font-bold">{match.homeScore} - {match.awayScore}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isCancel 
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-secondary/10 text-secondary'
                        }`}>
                          {isCancel ? 'CANCELADO' : 'FINALIZADO'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs italic text-on-surface-variant">
                        {match.scorers ? `Marcadores: ${match.scorers}` : (match.observation || 'Equilíbrio tático')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Travel Logistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Compass className="w-5 h-5 text-tertiary" />
            Carona e Localização do Jogo de Domingo
          </h3>
          <div className="relative w-full h-[300px] rounded-xl overflow-hidden border border-outline-variant/30 shadow-lg group">
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-[4000ms]"
              style={{ backgroundImage: `url(${MAP_IMAGE})` }}
            ></div>
            <div className="absolute inset-0 bg-primary/25 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all duration-500"></div>
            <div className="absolute bottom-4 left-4 bg-white p-3.5 rounded-lg shadow-xl border border-tertiary flex items-center gap-3">
              <MapPin className="w-5 h-5 text-tertiary" />
              <div>
                <p className="text-[10px] font-extrabold uppercase text-on-surface-variant tracking-wider">Próximo Destino</p>
                <p className="font-extrabold text-sm text-on-surface">Campo de Terra do Alvorada</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Summary widget */}
        <div className="bg-primary-container p-6 rounded-xl text-white flex flex-col justify-between shadow-lg">
          <div>
            <h4 className="text-lg font-bold text-tertiary-fixed mb-4">Resumo da Agenda</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-lg text-tertiary-fixed mt-0.5">🚩</span>
                <div>
                  <p className="text-sm font-bold">Jogos Fora de Casa</p>
                  <p className="text-xs text-primary-fixed-dim opacity-85">Carona coletiva com o time (organizar no grupo)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg text-tertiary-fixed mt-0.5">🏋️‍♂️</span>
                <div>
                  <p className="text-sm font-bold">Intervalo Médio de 5 dias</p>
                  <p className="text-xs text-primary-fixed-dim opacity-85">Período ideal de recuperação</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="pt-6 border-t border-white/10 mt-6">
            <p className="text-xs mb-3 text-primary-fixed-dim">Sincronize a agenda do Unidos com seus dispositivos.</p>
            <button
              onClick={handleSyncCalendar}
              disabled={isSynced || syncing}
              className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm border ${
                isSynced
                  ? 'bg-primary border-primary text-white cursor-default'
                  : 'bg-tertiary border-tertiary text-white hover:bg-tertiary-fixed hover:text-on-tertiary-fixed'
              }`}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </>
              ) : isSynced ? (
                <>
                  <CheckCircle className="w-4 h-4 text-tertiary-fixed" />
                  Sincronizado!
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sincronizar Google Calendar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
