import React, { useState } from 'react';
import { X, Check, Dumbbell, Calendar, Users, DollarSign, Star, AlertTriangle, RefreshCw, MessageSquare, Camera, Upload, Key } from 'lucide-react';
import { Player, PlayerPosition, Match, Transaction, ExpenseCategory, SquadCategory } from '../types';
import { UNIDOS_LOGO, TITAN_FC_LOGO, IBERIA_LOGO, MNT_LOGO, CTY_LOGO, EGL_LOGO } from '../data/initialData';
import { hashPin } from '../lib/utils';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalWrapper({ title, onClose, children }: ModalWrapperProps) {
  return (
    <div className="fixed inset-0 bg-primary-container/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-outline-variant/30 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-primary text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
          <h3 className="font-bold text-lg tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

// 1. TRAINING SESSION MODAL
interface TrainingModalProps {
  onClose: () => void;
  onSubmit: (data: { type: 'Tático' | 'Físico' | 'Recuperação'; duration: number; notes: string }) => void;
}

export function TrainingModal({ onClose, onSubmit }: TrainingModalProps) {
  const [type, setType] = useState<'Tático' | 'Físico' | 'Recuperação'>('Tático');
  const [duration, setDuration] = useState(90);
  const [notes, setNotes] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type, duration, notes });
  };

  return (
    <ModalWrapper title="Iniciar Sessão de Treinamento" onClose={onClose}>
      <form onSubmit={handleFormSubmit} className="space-y-5 text-sm">
        <div className="flex gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10 mb-2">
          <Dumbbell className="w-10 h-10 text-primary shrink-0" />
          <div>
            <p className="font-bold text-primary">Preparo Unidos Pro</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Sessões registradas aumentam o ritmo ou aceleram a recuperação do elenco.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Tipo de Foco</label>
          <div className="grid grid-cols-3 gap-2.5">
            {(['Tático', 'Físico', 'Recuperação'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2.5 rounded-lg font-bold border transition-all text-center text-xs ${
                  type === t
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Duração Estimada (Minutos)</label>
          <input
            type="number"
            min={15}
            max={240}
            required
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Observações e Metas do Dia</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Focar na saída de bola defensiva e recomposição rápida..."
            rows={3}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
          />
        </div>

        <div className="pt-4 border-t border-outline-variant/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container font-bold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-secondary text-white hover:brightness-110 font-bold rounded-lg transition-all shadow-md active:scale-95"
          >
            Aplicar Treino
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 2. SCHEDULE MATCH MODAL
interface ScheduleMatchModalProps {
  onClose: () => void;
  onSubmit: (match: Omit<Match, 'id' | 'homeLogo' | 'awayLogo' | 'isConfirmed' | 'status' | 'squad'>) => void;
}

export function ScheduleMatchModal({ onClose, onSubmit }: ScheduleMatchModalProps) {
  const [opponent, setOpponent] = useState('Ajax da Favela');
  const [date, setDate] = useState('12 NOV');
  const [time, setTime] = useState('10:30');
  const [stadium, setStadium] = useState('Campo de Terra do Alvorada');
  const [type, setType] = useState('AMISTOSO');
  const [isHome, setIsHome] = useState(true);

  const opponents = ['Ajax da Favela', 'Palmeirinha do Morro', 'Unidos do Pagode', 'Família Alvinegra', 'Esporte Clube Ressaca'];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      type,
      homeTeam: isHome ? 'Unidos' : opponent,
      awayTeam: isHome ? opponent : 'Unidos',
      time,
      stadium
    });
  };

  return (
    <ModalWrapper title="Agendar Confronto Oficial" onClose={onClose}>
      <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Adversário</label>
            <select
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
            >
              {opponents.map(opp => (
                <option key={opp} value={opp}>{opp}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Mando de Campo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsHome(true)}
                className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                  isHome ? 'bg-primary text-white border-primary' : 'bg-surface-container border-transparent'
                }`}
              >
                Casa
              </button>
              <button
                type="button"
                onClick={() => setIsHome(false)}
                className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                  !isHome ? 'bg-primary text-white border-primary' : 'bg-surface-container border-transparent'
                }`}
              >
                Fora
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Data do Evento</label>
            <input
              type="text"
              required
              placeholder="Ex: 15 NOV"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Horário</label>
            <input
              type="text"
              required
              placeholder="Ex: 21:00"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Estádio / Arena</label>
          <input
            type="text"
            required
            value={stadium}
            onChange={(e) => setStadium(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Campeonato</label>
          <input
            type="text"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="pt-4 border-t border-outline-variant/10 flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container font-bold rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-secondary text-white hover:brightness-110 font-bold rounded-lg transition-all shadow-md active:scale-95"
          >
            Confirmar Agenda
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 2.5 EDIT MATCH MODAL
interface EditMatchModalProps {
  match: Match;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<Match>) => void;
}

export function EditMatchModal({ match, onClose, onSubmit }: EditMatchModalProps) {
  const isUnidosHome = match.homeTeam.includes('Unidos');
  const [opponentName, setOpponentName] = useState(isUnidosHome ? match.awayTeam : match.homeTeam);
  const [opponentLogo, setOpponentLogo] = useState(isUnidosHome ? match.awayLogo : match.homeLogo);
  const [isHome, setIsHome] = useState(isUnidosHome);
  const [date, setDate] = useState(match.date);
  const [time, setTime] = useState(match.time || '');
  const [stadium, setStadium] = useState(match.stadium);
  const [type, setType] = useState(match.type);
  const [homeScore, setHomeScore] = useState(match.homeScore !== undefined ? String(match.homeScore) : '');
  const [awayScore, setAwayScore] = useState(match.awayScore !== undefined ? String(match.awayScore) : '');

  const handleSave = () => {
    const hScore = homeScore ? parseInt(homeScore) : undefined;
    const aScore = awayScore ? parseInt(awayScore) : undefined;
    let status = match.status;
    if (hScore !== undefined && aScore !== undefined) {
      if (hScore > aScore) status = 'VITÓRIA';
      else if (hScore < aScore) status = 'DERROTA';
      else status = 'EMPATE';
    } else if (status !== 'CONFIRMADO' && status !== 'CANCELADO') {
      status = 'CONFIRMADO';
    }

    onSubmit(match.id, {
      homeTeam: isHome ? 'Unidos Suzano' : opponentName,
      awayTeam: isHome ? opponentName : 'Unidos Suzano',
      homeLogo: isHome ? UNIDOS_LOGO : opponentLogo,
      awayLogo: isHome ? opponentLogo : UNIDOS_LOGO,
      date,
      time: time || undefined,
      stadium,
      type,
      homeScore: hScore,
      awayScore: aScore,
      status
    });
    onClose();
  };

  return (
    <ModalWrapper title="Editar Partida" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Adversário</label>
            <input
              type="text"
              required
              value={opponentName}
              onChange={e => setOpponentName(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Mando de Campo</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsHome(true)}
                className={`py-2 rounded-lg font-bold text-xs border transition-all ${isHome ? 'bg-primary text-white border-primary' : 'bg-surface-container border-transparent'}`}>
                Casa
              </button>
              <button type="button" onClick={() => setIsHome(false)}
                className={`py-2 rounded-lg font-bold text-xs border transition-all ${!isHome ? 'bg-primary text-white border-primary' : 'bg-surface-container border-transparent'}`}>
                Fora
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">URL do Logo do Adversário</label>
          <input
            type="text"
            value={opponentLogo}
            onChange={e => setOpponentLogo(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Data (DD/MM/AAAA)</label>
            <input
              type="text"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Horário</label>
            <input
              type="text"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Estádio</label>
          <input
            type="text"
            required
            value={stadium}
            onChange={e => setStadium(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Campeonato</label>
          <input
            type="text"
            required
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Placar Casa</label>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Placar Visitante</label>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container font-bold rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-secondary text-white hover:brightness-110 font-bold rounded-lg transition-all shadow-md active:scale-95"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// 3. ADD ATHLETE MODAL
interface AddPlayerModalProps {
  onClose: () => void;
  onSubmit: (player: Omit<Player, 'id' | 'image' | 'games' | 'squad'>) => void;
}

export function AddPlayerModal({ onClose, onSubmit }: AddPlayerModalProps) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState(9);
  const [position, setPosition] = useState<PlayerPosition>('Atacante');
  const [age, setAge] = useState(24);
  const [rating, setRating] = useState(82);
  const [condition, setCondition] = useState(100);
  const [country, setCountry] = useState('Brasil');
  const [phone, setPhone] = useState('');
  const [isBoardMember, setIsBoardMember] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      number,
      position,
      age,
      rating,
      condition,
      country,
      isInjured: false,
      phone: phone || undefined,
      isBoardMember: isBoardMember || undefined
    });
  };

  return (
    <ModalWrapper title="Registrar Novo Atleta" onClose={onClose}>
      <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Nome Completo</label>
          <input
            type="text"
            required
            placeholder="Ex: Gabriel Barbosa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">WhatsApp (DDD + Número)</label>
          <input
            type="tel"
            placeholder="Ex: 11999999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        {/* Board Member Designation checkbox */}
        <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBoardMember"
              checked={isBoardMember}
              onChange={(e) => setIsBoardMember(e.target.checked)}
              className="w-4 h-4 text-secondary border-outline-variant rounded focus:ring-secondary cursor-pointer"
            />
            <label htmlFor="isBoardMember" className="font-extrabold text-xs text-amber-900 uppercase tracking-wider cursor-pointer select-none">
              Membro da Diretoria (Acesso Admin)
            </label>
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed pl-6">
            Se ativado, este atleta poderá entrar no Painel de Controle como Administrador usando seu PIN de acesso pessoal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Número da Camisa</label>
            <input
              type="number"
              min={1}
              max={99}
              required
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Posição</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as PlayerPosition)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Goleiro">Goleiro</option>
              <option value="Defensor">Defensor</option>
              <option value="Meio-Campo">Meio-Campo</option>
              <option value="Atacante">Atacante</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Nacionalidade</label>
            <input
              type="text"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Idade</label>
            <input
              type="number"
              min={15}
              max={45}
              required
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Habilidade Geral (Rating 1-99)</label>
            <input
              type="number"
              min={40}
              max={99}
              required
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Condição Física Inicial (%)</label>
            <input
              type="number"
              min={10}
              max={100}
              required
              value={condition}
              onChange={(e) => setCondition(Number(e.target.value))}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/10 flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container font-bold rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-secondary text-white hover:brightness-110 font-bold rounded-lg transition-all shadow-md active:scale-95"
          >
            Salvar Atleta
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 4. ADD TRANSACTION MODAL
interface AddTransactionModalProps {
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id'> & { chargePlayers?: boolean }) => void;
}

export function AddTransactionModal({ onClose, onSubmit }: AddTransactionModalProps) {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'RECEITA' | 'DESPESA'>('RECEITA');
  const [expenseType, setExpenseType] = useState<ExpenseCategory>('Lavagem de uniforme');
  const [chargePlayers, setChargePlayers] = useState(false);
  const [amount, setAmount] = useState<number>(70);
  const [transDate, setTransDate] = useState(todayStr);

  const expenseCategories: ExpenseCategory[] = [
    'Lavagem de uniforme',
    'Aluguel de campo',
    'Compra de medicamentos',
    'Despesas extras',
    'Compra de uniforme',
    'Arbitragem',
    'Água',
    'Marketing',
    'Outras despesas'
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      description,
      category,
      amount,
      date: transDate,
      expenseType: category === 'DESPESA' ? expenseType : undefined,
      chargedToPlayers: category === 'DESPESA' && expenseType === 'Compra de uniforme' ? chargePlayers : undefined,
      chargePlayers: category === 'DESPESA' && expenseType === 'Compra de uniforme' ? chargePlayers : undefined
    });
  };

  return (
    <ModalWrapper title="Registrar Lançamento Financeiro" onClose={onClose}>
      <form onSubmit={handleFormSubmit} className="space-y-4 text-sm text-left">
        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Descrição do Lançamento</label>
          <input
            type="text"
            required
            placeholder="Ex: Mensalidade de Junho ou Lavagem de Colete"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-on-surface">Data (DD/MM/AAAA)</label>
          <input
            type="text"
            required
            placeholder="Ex: 15/06/2026"
            value={transDate}
            onChange={(e) => setTransDate(e.target.value)}
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Fluxo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('RECEITA')}
                className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                  category === 'RECEITA' ? 'bg-primary text-white border-primary' : 'bg-surface-container border-transparent'
                }`}
              >
                Receita (Entrada)
              </button>
              <button
                type="button"
                onClick={() => setCategory('DESPESA')}
                className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                  category === 'DESPESA' ? 'bg-primary text-white border-primary' : 'bg-surface-container border-transparent'
                }`}
              >
                Despesa (Custo)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">Valor (R$)</label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {category === 'DESPESA' && (
          <div className="space-y-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/25 transition-all">
            <div className="space-y-1.5">
              <label className="font-bold text-on-surface text-xs block">Tipo de Custo (Diretoria)</label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-white border border-outline-variant/40 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold text-xs text-primary"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {expenseType === 'Compra de uniforme' && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-dashed border-outline-variant/20">
                <input
                  id="chargePlayersCheckbox"
                  type="checkbox"
                  checked={chargePlayers}
                  onChange={(e) => setChargePlayers(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary mt-0.5"
                />
                <label htmlFor="chargePlayersCheckbox" className="text-xs text-on-surface-variant font-bold leading-tight cursor-pointer">
                  Cobrar dos atletas: Dividir valor igualmente e cadastrar débito na "caixinha" de cada jogador do elenco.
                </label>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-outline-variant/10 flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container font-bold rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-secondary text-white hover:brightness-110 font-bold rounded-lg transition-all shadow-md active:scale-95"
          >
            Registrar Lançamento
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 5. PLAYER INSPECTION DETAILS MODAL (highly interactive!)
interface PlayerDetailsModalProps {
  player: Player;
  onClose: () => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  adminPassword?: string;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
}

export function PlayerDetailsModal({ player, onClose, onUpdatePlayer, adminPassword, session }: PlayerDetailsModalProps) {
  const [editingName, setEditingName] = useState(player.name);
  const [editingPosition, setEditingPosition] = useState(player.position);
  const [editingNumber, setEditingNumber] = useState(player.number);
  const [editingSquad, setEditingSquad] = useState(player.squad);
  const [editingAge, setEditingAge] = useState(player.age);
  const [condition, setCondition] = useState(player.condition);
  const [isInjured, setIsInjured] = useState(player.isInjured);
  const [injuryNote, setInjuryNote] = useState(player.injuryNote || 'Est. 15 dias');
  const [phone, setPhone] = useState(player.phone || '');
  const [image, setImage] = useState(player.image);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões de câmera do seu dispositivo.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyChanges = () => {
    onUpdatePlayer(player.id, {
      name: editingName,
      position: editingPosition,
      number: editingNumber,
      squad: editingSquad,
      age: editingAge,
      condition,
      isInjured,
      injuryNote: isInjured ? injuryNote : undefined,
      phone: phone || undefined,
      image
    });
    onClose();
  };

  return (
    <ModalWrapper title={`Ficha Fisiológica: ${player.name}`} onClose={onClose}>
      <div className="space-y-6 text-sm">
        
        {/* Profile Card Inspector */}
        <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10 select-none">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-md bg-surface-container shrink-0">
            <img
              alt={player.name}
              className="w-full h-full object-cover"
              src={image}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-base text-primary truncate">{player.name}</h4>
            <p className="text-xs text-on-surface-variant font-medium">
              Camisa {player.number} • {player.position}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (isCameraActive) {
                    stopCamera();
                  } else {
                    startCamera();
                  }
                }}
                className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                {isCameraActive ? 'Fechar Câmera' : 'Tirar Foto'}
              </button>
              <label className="px-2.5 py-1 bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Camera stream container */}
        {isCameraActive && (
          <div className="p-4 bg-zinc-950 rounded-xl overflow-hidden relative flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-emerald-500 bg-zinc-900 shadow-lg">
              {cameraError ? (
                <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs text-rose-400 font-bold">
                  {cameraError}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {!cameraError && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Capturar Foto
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-extrabold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
            
            <p className="text-[10px] text-zinc-400 font-semibold text-center max-w-xs">
              Posicione o rosto do atleta no círculo verde e clique em Capturar.
            </p>
          </div>
        )}

        {/* Admin editable fields: nome, posição, número, categoria, idade */}
        {session?.role === 'admin' && (
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <p className="font-bold text-on-surface">Dados do Atleta (Admin)</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-on-surface">Nome</label>
              <input
                type="text"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">Posição</label>
                <select
                  value={editingPosition}
                  onChange={e => setEditingPosition(e.target.value as PlayerPosition)}
                  className="w-full px-3 py-2 bg-white border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Goleiro">Goleiro</option>
                  <option value="Defensor">Defensor</option>
                  <option value="Meio-Campo">Meio-Campo</option>
                  <option value="Atacante">Atacante</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">Nº Camisa</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={editingNumber}
                  onChange={e => setEditingNumber(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">Categoria</label>
                <select
                  value={editingSquad}
                  onChange={e => setEditingSquad(e.target.value as SquadCategory)}
                  className="w-full px-3 py-2 bg-white border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Master">Master</option>
                  <option value="Veterano/Esporte">Veterano/Esporte</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">Idade</label>
                <input
                  type="number"
                  min={15}
                  max={60}
                  value={editingAge}
                  onChange={e => setEditingAge(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white border border-outline-variant/20 rounded-lg font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Admin PIN management option */}
        {session?.role === 'admin' && (
          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600 animate-pulse" />
              <div>
                <p className="font-bold text-on-surface">Controle de PIN / Senha & Diretoria</p>
                <p className="text-[11px] text-on-surface-variant font-semibold">
                  Configure o status de diretoria ou resete o PIN de acesso deste atleta.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-dashed border-outline-variant/20">
              <div className="text-xs text-on-surface-variant font-medium">
                {player.pin ? (
                  <>Status: <span className="font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">PIN PERSONALIZADO ATIVO 🔒</span></>
                ) : (
                  <>Status: <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">SEM PIN</span></>
                )}
              </div>
              {player.pin && (
                <button
                  type="button"
                  onClick={async () => {
                    const masterPwd = prompt('Digite a senha master para confirmar o reset do PIN:');
                    if (!masterPwd) return;
                    if (!adminPassword) {
                      alert('Erro: senha master não carregada.');
                      return;
                    }
                    const hashedInput = await hashPin(masterPwd);
                    if (hashedInput !== adminPassword) {
                      alert('Senha master incorreta. Operação cancelada.');
                      return;
                    }
                    if (confirm(`Deseja mesmo resetar o PIN de ${player.name}? Um novo PIN aleatório será gerado.`)) {
                      const newPin = String(Math.floor(100000 + Math.random() * 900000));
                      const hashedPin = await hashPin(newPin);
                      onUpdatePlayer(player.id, { pin: hashedPin });
                      alert(`PIN de ${player.name} resetado! Novo PIN: ${newPin}. Anote e entregue ao atleta.`);
                      onClose();
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
                >
                  Resetar PIN
                </button>
              )}
            </div>

            {/* Acesso à diretoria switch */}
            <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-dashed border-outline-variant/20">
              <div className="text-xs text-on-surface-variant font-medium">
                <p className="font-bold text-on-surface">Membro da Diretoria (Acesso Admin)</p>
                <p className="text-[10px] text-on-surface-variant/80">Permite que este atleta faça login administrativo usando o PIN dele.</p>
              </div>
              <input
                type="checkbox"
                checked={!!player.isBoardMember}
                onChange={(e) => {
                  onUpdatePlayer(player.id, { isBoardMember: e.target.checked });
                  alert(`${player.name} agora ${e.target.checked ? 'é' : 'não é mais'} membro da diretoria com acesso administrador.`);
                  onClose();
                }}
                className="w-4.5 h-4.5 text-secondary border-outline-variant rounded focus:ring-secondary cursor-pointer shrink-0"
              />
            </div>
          </div>
        )}

        {/* WhatsApp field */}
        <div className="space-y-2 p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
          <div className="flex items-center justify-between">
            <label className="font-bold text-on-surface flex items-center gap-1.5 text-emerald-600">
              <MessageSquare className="w-4 h-4" /> WhatsApp (DDD + Número)
            </label>
            {player.phone && (
              <a
                href={`https://wa.me/55${player.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 shadow-xs"
              >
                Chamar Atleta 💬
              </a>
            )}
          </div>
          <input
            type="tel"
            placeholder="Ex: 11999999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3 py-1.5 bg-white border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
          />
        </div>

        {/* Adjust condition slider */}
        <div className="space-y-2.5">
          <div className="flex justify-between font-bold text-on-surface">
            <span>Editar Condição Física</span>
            <span className={condition > 80 ? 'text-primary' : condition > 50 ? 'text-tertiary-container' : 'text-error font-black'}>
              {condition}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={condition}
            onChange={(e) => setCondition(Number(e.target.value))}
            className="w-full accent-secondary h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
            <span>Fadiga Extrema</span>
            <span>Excelente / Pleno</span>
          </div>
        </div>

        {/* Toggle Injury status */}
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-secondary" />
              <div>
                <p className="font-bold text-on-surface">Boletim de Lesão</p>
                <p className="text-[11px] text-on-surface-variant font-semibold">Tornar o jogador indisponível</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsInjured(!isInjured);
                if (!isInjured) {
                  setCondition(45);
                } else {
                  setCondition(90);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isInjured
                  ? 'bg-secondary text-white shadow'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {isInjured ? 'Lesionado' : 'Liberado'}
            </button>
          </div>

          {isInjured && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="font-bold text-xs text-on-surface-variant uppercase tracking-wider">
                Previsão de Retorno (Observação)
              </label>
              <input
                type="text"
                placeholder="Ex: Est. 15 dias"
                value={injuryNote}
                onChange={(e) => setInjuryNote(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-outline-variant/20 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-outline-variant/10 flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container font-bold rounded-lg"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleApplyChanges}
            className="flex-1 py-2.5 bg-secondary text-white hover:brightness-110 font-bold rounded-lg transition-all shadow-md active:scale-95"
          >
            Aplicar Boletim
          </button>
        </div>

      </div>
    </ModalWrapper>
  );
}
