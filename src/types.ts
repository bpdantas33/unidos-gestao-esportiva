export type PlayerPosition = 'Goleiro' | 'Defensor' | 'Meio-Campo' | 'Atacante';
export type SquadCategory = 'Master' | 'Veterano/Esporte';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: PlayerPosition;
  country: string; // Used for "Quebrada/Bairro" origin
  age: number;
  rating: number;
  condition: number; // Percentage (e.g. 98)
  isInjured: boolean;
  injuryNote?: string;
  games: number;
  goals?: number;
  cleanSheets?: number;
  tackles?: number;
  image: string;
  squad: SquadCategory; // 'Master' or 'Veterano/Esporte'
  birthDate?: string; // Format: "DD/MM", e.g. "24/06"
  phone?: string; // WhatsApp number (e.g., "11999999999")
  pin?: string; // Custom login PIN
  isBoardMember?: boolean; // If true, this member belongs to the diretoria (admin access)
}

export interface Match {
  id: string;
  date: string; // "12 JUN", "15 OUT 2024" etc.
  type: string; // "COPA DA VÁRZEA", "AMISTOSO" etc.
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  isConfirmed: boolean;
  status: 'VITÓRIA' | 'EMPATE' | 'DERROTA' | 'CANCELADO' | 'CONFIRMADO';
  time?: string;
  stadium: string;
  scorers?: string;
  observation?: string;
  squad: SquadCategory; // For which squad this match is
  confirmedPlayers?: string[]; // Player IDs who confirmed presence
}

export type ExpenseCategory = 
  | 'Lavagem de uniforme'
  | 'Aluguel de campo'
  | 'Compra de medicamentos'
  | 'Despesas extras'
  | 'Compra de uniforme'
  | 'Arbitragem'
  | 'Água'
  | 'Marketing'
  | 'Outras despesas';

export interface Transaction {
  id: string;
  description: string;
  category: 'RECEITA' | 'DESPESA';
  expenseType?: ExpenseCategory; // Specific cost type for diretoria
  chargedToPlayers?: boolean; // Whether uniform cost is split/charged to players
  date: string; // "14/06/2024"
  amount: number;
}

export interface UnpaidMember {
  id: string;
  name: string;
  daysLate: number;
  amount: number;
  image: string;
  isPaid?: boolean;
  reason?: string; // e.g. "Mensalidade", "Uniforme"
}

export interface TeamStandings {
  id: string;
  rank: number;
  club: string;
  logo?: string;
  logoText?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  squad: SquadCategory;
}

export interface TrainingLog {
  id: string;
  date: string;
  type: 'Tático' | 'Físico' | 'Recuperação';
  duration: number;
  playersCount: number;
  notes: string;
  squad: SquadCategory;
}
