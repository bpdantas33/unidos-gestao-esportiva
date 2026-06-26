import { useState, useEffect } from 'react';
import { Timer, ArrowUp, Activity, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, MapPin, Copy, ExternalLink, Check, Cake } from 'lucide-react';
import { Player, Match, Transaction, SquadCategory } from '../types';
import { UNIDOS_LOGO, TITANS_LOGO } from '../data/initialData';
import { formatCurrency } from '../lib/utils';

interface DashboardViewProps {
  players: Player[];
  matches: Match[];
  transactions: Transaction[];
  onPlayerClick: (player: Player) => void;
  onOpenNewSession: () => void;
  onConfirmAttendance: (matchId: string, playerId: string, status: 'CONFIRMADO' | 'AUSENTE') => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
  currentSquad: SquadCategory;
}

export default function DashboardView({
  players,
  matches,
  transactions,
  onPlayerClick,
  onOpenNewSession,
  onConfirmAttendance,
  session,
  currentSquad
}: DashboardViewProps) {
  // 1. Live Countdown State
  const [countdown, setCountdown] = useState({ days: 2, hours: 14, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Results Carousel Index
  const [carouselIndex, setCarouselIndex] = useState(0);
  const squadMatches = matches.filter(m => m.squad === currentSquad);
  const recentMatches = squadMatches.filter(m => m.homeScore !== undefined || m.status === 'CANCELADO');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextMatch = squadMatches
    .filter(m => m.status === 'CONFIRMADO')
    .find(m => {
      const [dia, mes, ano] = m.date.split('/');
      return new Date(+ano, +mes - 1, +dia) >= today;
    });
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [showBirthdayWidget, setShowBirthdayWidget] = useState(true);

  // Find players with birthdays in the current week
  const getWeeklyBirthdays = () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const currentYear = now.getFullYear();

    return players.filter(p => {
      if (!p.birthDate) return false;
      const [dayStr, monthStr] = p.birthDate.split('/');
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);

      const birthdayThisYear = new Date(currentYear, month - 1, day, 12, 0, 0);
      return birthdayThisYear >= startOfWeek && birthdayThisYear <= endOfWeek;
    });
  };

  const getWeekdayName = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length < 2) return '';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const now = new Date();
    const date = new Date(now.getFullYear(), month - 1, day);
    const weekdays = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];
    const today = now;
    if (day === today.getDate() && month === today.getMonth() + 1) {
      return 'Hoje!';
    }
    return weekdays[date.getDay()];
  };

  const weeklyBirthdays = getWeeklyBirthdays();

  const getStadiumAddress = (stadiumName?: string) => {
    if (!stadiumName) return 'Av. Alvorada, 1984 - Jardim Alvorada, Suzano - SP';
    const name = stadiumName.toLowerCase();
    if (name.includes('alvorada')) {
      return 'Av. Alvorada, 1984 - Jardim Alvorada, Suzano - SP';
    } else if (name.includes('poeirão') || name.includes('poeirao')) {
      return 'Rua do Poeirão, s/n - Vila Amorim, Suzano - SP';
    } else if (name.includes('sete de setembro')) {
      return 'Rua Sete de Setembro, 77 - Jardim Suzanópolis, Suzano - SP';
    } else if (name.includes('jatobá') || name.includes('jatoba')) {
      return 'Av. dos Jatobás, 120 - Parque Maria Helena, Suzano - SP';
    }
    return `${stadiumName}, Suzano - SP`;
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const scrollCarousel = (direction: number) => {
    const nextIdx = carouselIndex + direction;
    if (nextIdx >= 0 && nextIdx < recentMatches.length) {
      setCarouselIndex(nextIdx);
    }
  };

  // 3. Dynamic Financial Stats
  const calculateFinance = () => {
    const monthlyRevenues = transactions
      .filter((t) => t.category === 'RECEITA')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthlyExpenses = transactions
      .filter((t) => t.category === 'DESPESA')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const finalBalance = transactions.reduce((acc, curr) => acc + (curr.category === 'RECEITA' ? curr.amount : -curr.amount), 0);

    return {
      balance: finalBalance,
      revenue: monthlyRevenues,
      expense: monthlyExpenses
    };
  };

  const finStats = calculateFinance();

  // 4. Injured player count
  const injuredCount = players.filter(p => p.isInjured).length;

  return (
    <div className="space-y-8 select-none">
      {/* Birthday Alert Widget */}
      {showBirthdayWidget && weeklyBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden text-left">
          {/* Confetti ambient decor */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-rose-500 to-indigo-500 pointer-events-none rounded-full blur-xl"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/15 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
              <Cake className="w-6 h-6 status-pulse text-emerald-600" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-primary flex items-center gap-2 uppercase tracking-tight">
                Aniversariantes da Semana! 🎂🎉
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 font-medium leading-relaxed max-w-2xl">
                Temos atletas soprando as velinhas nesta semana! Deixe os parabéns e comemore com eles na próxima resenha do Unidos.
              </p>
            </div>
          </div>

          {/* List of birthday athletes with photos */}
          <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto md:justify-end">
            {weeklyBirthdays.map((player) => (
              <div 
                key={player.id}
                onClick={() => onPlayerClick(player)}
                className="flex items-center gap-2.5 bg-white hover:bg-emerald-50/50 hover:border-emerald-500/40 p-2 pr-4 rounded-xl border border-outline-variant/30 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                title="Ver detalhes do atleta"
              >
                <div className="w-8 h-8 rounded-full border border-emerald-500/30 overflow-hidden shadow-xs shrink-0">
                  <img
                    alt={player.name}
                    className="w-full h-full object-cover"
                    src={player.image}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-on-surface line-clamp-1">
                    {player.name.split(' ')[0]} <span className="text-emerald-600">#{player.number}</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-1">
                    <span>{player.birthDate}</span>
                    <span className="text-emerald-600 font-extrabold">•</span>
                    <span className="text-emerald-600 font-bold">{getWeekdayName(player.birthDate || '')}</span>
                  </p>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setShowBirthdayWidget(false)}
              className="text-xs font-bold text-on-surface-variant/70 hover:text-on-surface bg-surface-container/60 hover:bg-surface-container/90 px-3 py-2 rounded-xl transition-all border border-outline-variant/10 cursor-pointer active:scale-95 ml-2 shrink-0"
            >
              Dispensar
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid Layer 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Next Match Hero Card (8 Cols) */}
        <section className="lg:col-span-8 bg-primary rounded-xl overflow-hidden relative min-h-[380px] flex items-center p-8 md:p-12 shadow-2xl border-b-4 border-tertiary">
          <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary text-white font-bold text-[11px] rounded-full w-fit shadow-lg tracking-wider">
                <Timer className="w-4 h-4 status-pulse rounded-full text-tertiary-fixed-dim" />
                PRÓXIMO CONFRONTO
              </span>
              
              <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none mt-2">
                {nextMatch ? `Contra o ${nextMatch.homeTeam .includes('Unidos') ? nextMatch.awayTeam : nextMatch.homeTeam}` : 'Clássico de Sábado'}
              </h2>
              <p className="text-primary-fixed-dim font-medium text-base md:text-lg max-w-md">
                {nextMatch ? `${nextMatch.stadium} • ${nextMatch.date} • ${nextMatch.time}h` : 'Campo de Terra do Alvorada • Sábado, 10:30h'}
              </p>
              <p className="text-xs text-white/70 font-semibold flex items-center gap-1.5 -mt-2">
                <span className="text-tertiary">📍</span>
                {nextMatch?.stadium === 'Campo de Terra do Alvorada' || !nextMatch
                  ? 'Av. Alvorada, 1984 - Jardim Alvorada, Suzano - SP'
                  : nextMatch.stadium === 'Arena Poeirão'
                  ? 'Rua do Poeirão, s/n - Vila Amorim, Suzano - SP'
                  : nextMatch.stadium === 'Campo do Sete de Setembro'
                  ? 'Rua Sete de Setembro, 77 - Jardim Suzanópolis, Suzano - SP'
                  : nextMatch.stadium === 'Arena Jatobá'
                  ? 'Av. dos Jatobás, 120 - Parque Maria Helena, Suzano - SP'
                  : 'Rua do Campo, s/n - Suzano - SP'}
              </p>
              
              {/* Dynamic Quick RSVP Widget */}
              {nextMatch && (
                <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 flex flex-col gap-2 w-full max-w-sm">
                  {session?.role === 'player' ? (
                    (() => {
                      const loggedPlayer = players.find(p => p.id === session.playerId);
                      const isConfirmed = nextMatch.confirmedPlayers?.includes(session.playerId || '');
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isConfirmed ? 'bg-green-400' : 'bg-amber-400'} status-pulse`} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              Olá, {loggedPlayer?.name.split(' ')[0]}!
                            </span>
                          </div>
                          <p className="text-[11px] text-primary-fixed-dim font-semibold leading-relaxed">
                            {isConfirmed 
                              ? "Você está confirmado para o jogo deste sábado! Vamos com tudo! ⚽🔥"
                              : "Você ainda não confirmou presença para este sábado. Por favor, responda abaixo:"}
                          </p>
                          <div className="flex gap-2">
                            {!isConfirmed ? (
                              <>
                                <button
                                  onClick={() => onConfirmAttendance(nextMatch.id, session.playerId || '', 'CONFIRMADO')}
                                  className="flex-1 py-2 bg-secondary text-white hover:brightness-110 active:scale-95 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                                >
                                  Vou Jogar! 👍
                                </button>
                                <button
                                  onClick={() => onConfirmAttendance(nextMatch.id, session.playerId || '', 'AUSENTE')}
                                  className="px-4 py-2 bg-error-container text-on-error-container hover:brightness-95 active:scale-95 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                                >
                                  Não vou ❌
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onConfirmAttendance(nextMatch.id, session.playerId || '', 'AUSENTE')}
                                className="w-full py-2 bg-error-container text-on-error-container hover:brightness-95 active:scale-95 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                              >
                                Cancelar Presença (Não vou) ❌
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-tertiary status-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Confirme se Você Vai para o Jogo:</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedPlayerId}
                          onChange={(e) => setSelectedPlayerId(e.target.value)}
                          className="px-2.5 py-1.5 bg-white text-primary rounded-lg text-xs font-bold outline-none border border-transparent focus:ring-2 focus:ring-tertiary w-full"
                        >
                          <option value="">-- Escolha seu nome --</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>
                              #{p.number} - {p.name}
                            </option>
                          ))}
                        </select>
                        
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => {
                              if (!selectedPlayerId) return;
                              onConfirmAttendance(nextMatch.id, selectedPlayerId, 'CONFIRMADO');
                              setSelectedPlayerId('');
                            }}
                            disabled={!selectedPlayerId}
                            className="px-3 py-1.5 bg-secondary text-white hover:brightness-110 active:scale-95 disabled:opacity-40 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                          >
                            Vou 👍
                          </button>
                          <button
                            onClick={() => {
                              if (!selectedPlayerId) return;
                              onConfirmAttendance(nextMatch.id, selectedPlayerId, 'AUSENTE');
                              setSelectedPlayerId('');
                            }}
                            disabled={!selectedPlayerId}
                            className="px-3 py-1.5 bg-error-container text-on-error-container hover:brightness-95 active:scale-95 disabled:opacity-40 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                          >
                            Não ❌
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <p className="text-[10px] text-primary-fixed-dim font-bold pt-1 border-t border-white/5">
                    {nextMatch.confirmedPlayers?.length || 0} confirmados para este sábado • Elenco: {nextMatch.squad}
                  </p>
                </div>
              )}

              {/* Live Countdown */}
              {!nextMatch && (
                <div className="flex gap-6 mt-6">
                  <div className="flex flex-col">
                    <span className="text-3xl font-extrabold text-tertiary-fixed leading-none">
                      {String(countdown.days).padStart(2, '0')}
                    </span>
                    <span className="text-primary-fixed-dim font-bold uppercase tracking-widest text-[10px] mt-1">Dias</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-extrabold text-tertiary-fixed leading-none">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-primary-fixed-dim font-bold uppercase tracking-widest text-[10px] mt-1">Horas</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-extrabold text-tertiary-fixed leading-none">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-primary-fixed-dim font-bold uppercase tracking-widest text-[10px] mt-1">Minutos</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-extrabold text-white/50 leading-none">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-primary-fixed-dim font-bold uppercase tracking-widest text-[10px] mt-1">Segundos</span>
                  </div>
                </div>
              )}
            </div>

            {/* Shield vs Shield visualizer */}
            <div className="flex items-center gap-6 md:gap-8 bg-white/5 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-white/10 shadow-inner">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-2xl border-4 border-tertiary relative">
                  <img
                    alt="Unidos Logo"
                    className="w-full h-full object-cover scale-[1.35]"
                    src={UNIDOS_LOGO}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="font-bold text-sm text-white uppercase tracking-wider">Unidos</span>
              </div>
              
              <span className="text-3xl font-black text-tertiary-fixed opacity-70 italic font-mono">VS</span>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-white/15 backdrop-blur rounded-full flex items-center justify-center p-4 shadow-xl border-4 border-transparent">
                  <img
                    alt="Oponente Logo"
                    className="w-full h-full object-contain"
                    src={nextMatch ? (nextMatch.homeTeam .includes('Unidos') ? nextMatch.awayLogo : nextMatch.homeLogo) : TITANS_LOGO}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="font-bold text-sm text-white/80 uppercase tracking-wider">
                  {nextMatch ? (nextMatch.homeTeam .includes('Unidos') ? nextMatch.awayTeam : nextMatch.homeTeam) : "Titans F.C."}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Next Match Stadium Address & Map Panel (4 Cols) */}
        <aside className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Local do Próximo Jogo</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Elenco: {currentSquad === 'Veterano/Esporte' ? 'Esporte' : 'Master'}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 text-left">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Estádio / Campo</span>
              <h4 className="text-base font-bold text-primary mt-0.5">
                {nextMatch ? nextMatch.stadium : 'Campo de Terra do Alvorada (Casa)'}
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">
                {getStadiumAddress(nextMatch?.stadium)}
              </p>
            </div>

            {/* Google Map Embedded Iframe */}
            <div className="w-full h-44 rounded-lg overflow-hidden border border-outline-variant/40 bg-surface-container relative my-4">
              <iframe
                title="Mapa do Próximo Jogo"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(getStadiumAddress(nextMatch?.stadium))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleCopyAddress(getStadiumAddress(nextMatch?.stadium))}
              className="w-full py-2.5 bg-surface-container hover:bg-secondary/10 hover:text-secondary text-primary font-bold text-xs rounded-lg transition-all border border-outline-variant/30 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Endereço</span>
                </>
              )}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getStadiumAddress(nextMatch?.stadium))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Rotas no Google Maps</span>
            </a>
          </div>
        </aside>
      </div>

      {/* Recent Matches Carousel Section */}
      <section className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Resultados Recentes</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">Últimos placares na temporada</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scrollCarousel(-1)}
              disabled={carouselIndex === 0}
              className={`w-9 h-9 rounded-full border border-outline-variant/40 flex items-center justify-center transition-colors ${
                carouselIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container active:bg-surface-container-high'
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-on-surface" />
            </button>
            <button
              onClick={() => scrollCarousel(1)}
              disabled={carouselIndex >= Math.max(0, recentMatches.length - 3)}
              className={`w-9 h-9 rounded-full border border-outline-variant/40 flex items-center justify-center transition-colors ${
                carouselIndex >= Math.max(0, recentMatches.length - 3) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container active:bg-surface-container-high'
              }`}
            >
              <ChevronRight className="w-5 h-5 text-on-surface" />
            </button>
          </div>
        </div>

        {/* Carousel slide track */}
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
          {recentMatches.slice(carouselIndex, carouselIndex + 3).map((match) => {
            const isWin = match.status === 'VITÓRIA';
            const isDraw = match.status === 'EMPATE';
            const isCancel = match.status === 'CANCELADO';
            
            return (
              <div
                key={match.id}
                className="flex-1 min-w-[280px] md:min-w-[320px] bg-white p-5 rounded-xl border border-outline-variant/30 shadow-sm hover:border-secondary transition-all card-hover-effect relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {match.date} • {match.type}
                  </span>
                  
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                    isWin
                      ? 'bg-primary text-white'
                      : isDraw
                      ? 'bg-surface-container-highest text-on-surface-variant'
                      : 'bg-error-container text-on-error-container'
                  }`}>
                    {match.status}
                  </span>
                </div>

                {/* Score visualization */}
                <div className="flex items-center justify-around py-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-outline-variant/30 shadow-sm overflow-hidden relative">
                      <img
                        alt={match.homeTeam}
                        className="w-full h-full object-cover"
                        src={match.homeLogo}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-tight text-on-surface">
                      {match.homeTeam .includes('Unidos') ? 'UNI' : match.homeTeam.substring(0, 3).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-black ${isWin ? 'text-primary' : 'text-on-surface'}`}>
                      {match.homeScore !== undefined ? match.homeScore : ''}
                    </span>
                    <span className="text-outline text-lg font-semibold">-</span>
                    <span className="text-2xl font-black text-on-surface">
                      {match.awayScore !== undefined ? match.awayScore : (isCancel ? 'N/A' : '')}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-outline-variant/30 shadow-sm overflow-hidden relative">
                      <img
                        alt={match.awayTeam}
                        className="w-full h-full object-cover"
                        src={match.awayLogo}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="font-bold text-xs text-on-surface-variant uppercase tracking-tight">
                      {match.awayTeam .includes('Unidos') ? 'UNI' : match.awayTeam.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Footer Notes (Scorers or cancelled explanation) */}
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center gap-2">
                  {isCancel ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-error" />
                      <p className="text-xs text-on-surface-variant italic">
                        Cancelado por {match.observation || 'clima adverso'}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-[12px] text-secondary font-bold">⚽</span>
                      <p className="text-xs text-on-surface-variant font-medium">
                        {match.scorers ? (
                          <span>Marcadores: <strong className="text-on-surface">{match.scorers}</strong></span>
                        ) : (
                          <span>Sem gols anotados</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bento Grid Layer 3: Finance Overview & Squad Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cash Flow Panel (5 Cols) */}
        <section className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Fluxo de Caixa</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Saldo consolidado do clube</p>
            </div>
            <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary border border-primary/10 shadow-sm">
              <span className="text-lg font-bold">R$</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-outline-variant/20 pb-5">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  SALDO DISPONÍVEL
                </p>
                <h4 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {formatCurrency(finStats.balance)}
                </h4>
              </div>
              
              <span className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/10 shadow-sm">
                +12% <ArrowUp className="w-3.5 h-3.5 text-primary" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
                <p className="text-xs text-on-surface-variant font-medium mb-1">Receitas Mês</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(finStats.revenue)}</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
                <p className="text-xs text-on-surface-variant font-medium mb-1">Despesas Mês</p>
                <p className="text-lg font-bold text-secondary">{formatCurrency(finStats.expense)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Squad Status / Player Monitor (7 Cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Status do Elenco</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Monitoramento fisiológico</p>
            </div>
            
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold border border-primary/10">
                {players.length} ATLETAS
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/5 text-secondary text-[10px] font-bold border border-secondary/10">
                {injuredCount} LESIONADOS
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {players.slice(0, 3).map((player) => {
              const conditionColor = player.condition > 85 ? 'text-primary' : player.condition > 60 ? 'text-tertiary' : 'text-secondary';
              const isInjured = player.isInjured;

              return (
                <div
                  key={player.id}
                  onClick={() => onPlayerClick(player)}
                  className="flex items-center justify-between p-3.5 hover:bg-surface-container rounded-xl transition-all cursor-pointer group border border-transparent hover:border-outline-variant/20"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shadow-sm ${
                      isInjured ? 'border-secondary' : 'border-primary'
                    }`}>
                      <img
                        alt={player.name}
                        className="w-full h-full object-cover"
                        src={player.image}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                        {player.name}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {player.position} • Condição:{' '}
                        <span className={`font-bold ${conditionColor}`}>
                          {player.condition}% {isInjured ? `(${player.injuryNote || 'Lesionado'})` : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Icon Status Indicator */}
                  {isInjured ? (
                    <AlertTriangle className="w-5 h-5 text-secondary" />
                  ) : player.condition >= 90 ? (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                      <Activity className="w-4 h-4 text-on-surface-variant" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
