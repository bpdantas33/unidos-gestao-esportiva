import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Match, Transaction, UnpaidMember, TeamStandings, TrainingLog, SquadCategory } from './types';
import {
  initialPlayers,
  initialMatches,
  initialStandings,
  DIRECTOR_NAMES,
  TITAN_FC_LOGO,
  IBERIA_LOGO,
  MNT_LOGO,
  CTY_LOGO,
  EGL_LOGO,
  UNIDOS_LOGO
} from './data/initialData';

// Supabase (substitui Firebase)
import { saveItem, deleteItem, saveCollectionData, getDocData, getCollectionData, setDocData, getStatsStartDate, callFunction, refreshSession, clearWriteToken } from './lib/supabase';
import { formatCurrency, hashPin, parseMatchDate, normalizeMatchDate, isIntraSquadMatch } from './lib/utils';

// Confirmations — documento único (1 read por update vs 100)
import { updateConfirmation, migrateConfirmationsIfNeeded, normalizeConfirmationsMap, type ConfirmationsMap } from './lib/confirmations';

// Sub-components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import SquadView from './components/SquadView';
import StatsView from './components/StatsView';
import FinanceView from './components/FinanceView';
import AlmoxarifadoView from './components/AlmoxarifadoView';
import LoginView from './components/LoginView';

// Modals
import {
  TrainingModal,
  ScheduleMatchModal,
  AddPlayerModal,
  AddTransactionModal,
  PlayerDetailsModal,
  EditMatchModal
} from './components/Modals';

// Limpa IndexedDB do Firestore antigo e Cache Storage do PWA removido
export default function App() {
  // Firebase sync status
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  // Mapa de confirmações: matchId → playerIds (documento único no Firebase)
  const [confirmationsMap, setConfirmationsMap] = useState<ConfirmationsMap>({});

  // 1. Core State persisted in LocalStorage (and synchronized with Firebase)
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('unidos_active_tab') || 'inicio';
  });

  const [currentSquad, setCurrentSquad] = useState<SquadCategory>(() => {
    return (localStorage.getItem('unidos_current_squad') as SquadCategory) || 'Veterano/Esporte';
  });

const [players, setPlayers] = useState<Player[]>(() => {
     // Tentar formato novo primeiro, depois formato antigo como fallback
     const cached = localStorage.getItem('unidos_cache_players');
     if (cached) {
       try {
         const parsed = JSON.parse(cached);
         return parsed.map(p => ({
           ...p,
           image: p.image === '' ? undefined : p.image,
           mustChangePin: p.mustChangePin === true ? true : undefined,
         }));
       } catch (_) {
         // Se falhar, tenta formato antigo
       }
     }
     const local = localStorage.getItem('unidos_players');
     return local ? JSON.parse(local) : initialPlayers;
   });
  const playersRef = useRef(players);
  playersRef.current = players;

const [matches, setMatches] = useState<Match[]>(() => {
     // Tentar formato novo primeiro, depois formato antigo como fallback
     const cached = localStorage.getItem('unidos_cache_matches');
     if (cached) {
       try {
         return JSON.parse(cached);
       } catch (_) {
         // Se falhar, tenta formato antigo
       }
     }
     const local = localStorage.getItem('unidos_matches');
     return local ? JSON.parse(local) : initialMatches;
   });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
     // Tentar formato novo primeiro, depois formato antigo como fallback
     const cached = localStorage.getItem('unidos_cache_transactions');
     if (cached) {
       try {
         return JSON.parse(cached);
       } catch (_) {
         // Se falhar, tenta formato antigo (embora provavelmente não exista para transactions)
       }
     }
     // Não há formato antigo padrão para transactions, então retorna array vazio
     return [];
   });

  const [unpaidMembers, setUnpaidMembers] = useState<UnpaidMember[]>(() => {
     // Tentar formato novo primeiro, depois formato antigo como fallback
     const cached = localStorage.getItem('unidos_cache_unpaid');
     if (cached) {
       try {
         return JSON.parse(cached);
       } catch (_) {
         // Se falhar, tenta formato antigo (embora provavelmente não exista para unpaidMembers)
       }
     }
     // Não há formato antigo padrão para unpaidMembers, então retorna array vazio
     return [];
   });

const [standings, setStandings] = useState<TeamStandings[]>(() => {
     // Tentar formato novo primeiro, depois formato antigo como fallback
     const cached = localStorage.getItem('unidos_cache_standings');
     if (cached) {
       try {
         return JSON.parse(cached);
       } catch (_) {
         // Se falhar, tenta formato antigo
       }
     }
     const local = localStorage.getItem('unidos_standings');
     return local ? JSON.parse(local) : initialStandings;
   });

  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>(() => {
     // Tentar formato novo primeiro, depois formato antigo como fallback
     const cached = localStorage.getItem('unidos_cache_training');
     if (cached) {
       try {
         return JSON.parse(cached);
       } catch (_) {
         // Se falhar, tenta formato antigo (embora provavelmente não exista para trainingLogs)
       }
     }
     // Não há formato antigo padrão para trainingLogs, então retorna array vazio
     return [];
   });

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('unidos_admin_password_hash') || '';
  });

  const [pixKey, setPixKey] = useState(() => localStorage.getItem('unidos_pix_key') || '');
  const [pixOwnerId, setPixOwnerId] = useState(() => localStorage.getItem('unidos_pix_owner_id') || '');

  function generatePlayerPin(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

    // Limpeza única de cache na primeira carga de cada usuário
    useEffect(() => {
      // Forçar limpeza total de cache — v7: seguro contra cota 15min + debounce — 02/09
      console.log('[cache] v7 seguro cota');
      if (localStorage.getItem('unidos_cache_migrated_to_neon_v7')) return;

      const cacheKeys = [
        'unidos_last_sync',
        'unidos_cache_players',
        'unidos_cache_matches',
        'unidos_cache_transactions',
        'unidos_cache_unpaid',
        'unidos_cache_standings',
        'unidos_cache_training',
        'unidos_cache_confirmations',
        'unidos_players',
        'unidos_matches',
        'unidos_transactions',
        'unidos_unpaidMembers',
        'unidos_standings',
        'unidos_trainingLogs',
        'unidos_confirmations'
      ];
      cacheKeys.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });

      localStorage.setItem('unidos_cache_migrated_to_neon_v7', '1');
      window.location.reload();
    }, []);

  // Sincronização: uma vez no load com guard 15min (seguro contra cota)
  useEffect(() => {
    let cancelled = false;

    async function initFirebase() {
      try {
        // Guard 15min: usa cache localStorage sem bater no Neon
        const lastSync = Number(localStorage.getItem('unidos_last_sync') || 0);
        const hasCache = !!localStorage.getItem('unidos_cache_players');
        if (hasCache && Date.now() - lastSync < 15 * 60 * 1000) {
          console.log('[sync] guard 15min ativo, usando cache', new Date(lastSync).toLocaleTimeString());
          if (!cancelled) { setFirebaseStatus('connected'); setFirebaseLoading(false); }
          return;
        }
        if (!cancelled) setFirebaseStatus('loading');

        // Config
        try {
          const config = await getDocData<{ id: string; adminPassword: string; pixKey: string; pixOwnerId: string }>('config', 'app');
          if (config?.adminPassword) {
            setAdminPassword(config.adminPassword);
            try { localStorage.setItem('unidos_admin_password_hash', config.adminPassword); } catch (_) {}
          }
          if (config?.pixKey) {
            setPixKey(config.pixKey);
            try { localStorage.setItem('unidos_pix_key', config.pixKey); } catch (_) {}
          }
          if (config?.pixOwnerId) {
            setPixOwnerId(config.pixOwnerId);
            try { localStorage.setItem('unidos_pix_owner_id', config.pixOwnerId); } catch (_) {}
          }
        } catch { }

        // Sync todos os dados necessários uma única vez (allSettled para não perder dados se 1 falhar)
        console.log('[sync] iniciando fetch v7 seguro...');
        const results = await Promise.allSettled([
            getCollectionData<Player>('players'),
            getCollectionData<Match>('matches'),
            getCollectionData<Transaction>('transactions'),
            getCollectionData<UnpaidMember>('unpaidMembers'),
            getCollectionData<TeamStandings>('standings'),
            getCollectionData<TrainingLog>('trainingLogs'),
            getDocData<any>('confirmations', 'singleton')
        ]);
        console.log('[sync] resultados', results.map(r => r.status));

        if (cancelled) return;

        const [players, matches, trans, unpaid, stands, train, confsRaw] = results.map(r => r.status === 'fulfilled' ? (r as PromiseFulfilledResult<any>).value : null) as [Player[]|null, Match[]|null, Transaction[]|null, UnpaidMember[]|null, TeamStandings[]|null, TrainingLog[]|null, any];

        // Só aplica se veio array/objeto válido, senão mantém cache
        if (players) { console.log('[sync] players', players.length, players.find(p=>p.id==='6')?.name); setPlayers(players); }
        else console.warn('[sync] players falhou, mantendo cache', players);
        if (matches) setMatches(matches);
        if (trans) setTransactions(trans);
        if (unpaid) { console.log('[sync] unpaid', unpaid.length); setUnpaidMembers(unpaid); }
        if (stands) setStandings(stands);
        if (train) setTrainingLogs(train);
        // confirmations vem como {id:'singleton', data:{...}} ou direto map
        const confsMap = (confsRaw?.data || confsRaw || {}) as ConfirmationsMap;
        console.log('[sync] confirmations keys', Object.keys(confsMap).length);
        setConfirmationsMap(confsMap);

        // Salva no cache para uso futuro (só o que veio)
        try {
          if (players) localStorage.setItem('unidos_cache_players', JSON.stringify(players));
          if (matches) localStorage.setItem('unidos_cache_matches', JSON.stringify(matches));
          if (trans) localStorage.setItem('unidos_cache_transactions', JSON.stringify(trans));
          if (unpaid) localStorage.setItem('unidos_cache_unpaid', JSON.stringify(unpaid));
          if (stands) localStorage.setItem('unidos_cache_standings', JSON.stringify(stands));
          if (train) localStorage.setItem('unidos_cache_training', JSON.stringify(train));
          localStorage.setItem('unidos_cache_confirmations', JSON.stringify(confsMap || {}));
          localStorage.setItem('unidos_last_sync', String(Date.now()));
        } catch (_) {}

        setFirebaseStatus('connected');
        setFirebaseLoading(false);
} catch (err) {
         console.error("Sync error:", err, (err as any)?.message);
         if (!cancelled) setFirebaseStatus('error');
         setFirebaseLoading(false);
       }
    }

    initFirebase();
    return () => { cancelled = true; };
  }, []);

  // Desativa qualquer service worker antigo (PWA removido)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      });
    }
  }, []);

  // Session state management
  const [session, setSession] = useState<{ role: 'admin' | 'player'; playerId?: string } | null>(() => {
    const saved = localStorage.getItem('unidos_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (role: 'admin' | 'player', playerId?: string) => {
    const newSession = { role, playerId };
    setSession(newSession);
    localStorage.setItem('unidos_session', JSON.stringify(newSession));
    // Refresh Supabase session to pick up admin role in user_metadata (for Edge Functions)
    if (role === 'admin') refreshSession();
    showToast(`Conectado com sucesso como ${role === 'admin' ? 'Diretor' : 'Atleta'}!`, "success");
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('unidos_session');
    clearWriteToken();
    showToast("Você saiu do aplicativo.", "info");
  };

  // Save states to localStorage (as local backup)
  useEffect(() => {
    localStorage.setItem('unidos_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('unidos_current_squad', currentSquad);
  }, [currentSquad]);

  // Force squad for regular players — they see only their own squad
  useEffect(() => {
    if (session?.role === 'player' && session?.playerId) {
      const player = players.find(p => p.id === session.playerId);
      if (player && player.squad !== currentSquad) {
        setCurrentSquad(player.squad);
      }
    }
  }, [session, players, currentSquad]);

useEffect(() => {
  try {
    // Salvar nos dois formatos para compatibilidade
    localStorage.setItem('unidos_players', JSON.stringify(players));
    localStorage.setItem('unidos_cache_players', JSON.stringify(players));
  } catch (_) {}
}, [players]);

useEffect(() => {
  try {
    // Salvar nos dois formatos para compatibilidade
    localStorage.setItem('unidos_matches', JSON.stringify(matches));
    localStorage.setItem('unidos_cache_matches', JSON.stringify(matches));
  } catch (_) {}
}, [matches]);

  useEffect(() => {
    try {
      // Salvar nos dois formatos para compatibilidade
      localStorage.setItem('unidos_standings', JSON.stringify(standings));
      localStorage.setItem('unidos_cache_standings', JSON.stringify(standings));
    } catch (_) {}
  }, [standings]);

  useEffect(() => {
    try {
      // Salvar nos dois formatos para compatibilidade
      localStorage.setItem('unidos_transactions', JSON.stringify(transactions));
      localStorage.setItem('unidos_cache_transactions', JSON.stringify(transactions));
    } catch (_) {}
  }, [transactions]);

  useEffect(() => {
    try {
      // Salvar nos dois formatos para compatibilidade
      localStorage.setItem('unidos_unpaidMembers', JSON.stringify(unpaidMembers));
      localStorage.setItem('unidos_cache_unpaid', JSON.stringify(unpaidMembers));
    } catch (_) {}
  }, [unpaidMembers]);

  useEffect(() => {
    try {
      // Salvar nos dois formatos para compatibilidade
      localStorage.setItem('unidos_trainingLogs', JSON.stringify(trainingLogs));
      localStorage.setItem('unidos_cache_training', JSON.stringify(trainingLogs));
    } catch (_) {}
  }, [trainingLogs]);

  // Reset search query on tab change
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // 2. Modals Control States
  const [activeModal, setActiveModal] = useState<null | 'training' | 'scheduleMatch' | 'addPlayer' | 'addTransaction' | 'playerDetails' | 'adminSettings' | 'editMatch'>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 3. Elegant Action Toast Notification Alert State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // 4. Action Handlers

  // Start Training session
  const handleApplyTraining = async (data: { type: 'Tático' | 'Físico' | 'Recuperação'; duration: number; notes: string }) => {
    // Apply stats changes to players based on training focus
    const updatedPlayers = players.map(p => {
      if (p.isInjured) {
        // Recovery speeds up slightly
        if (data.type === 'Recuperação') {
          return { ...p, condition: Math.min(100, p.condition + 15) };
        }
        return p;
      }

      if (data.type === 'Tático') {
        return {
          ...p,
          rating: Math.min(99, p.rating + (Math.random() > 0.6 ? 1 : 0)),
          condition: Math.max(10, p.condition - 5)
        };
      } else if (data.type === 'Físico') {
        return {
          ...p,
          condition: Math.max(10, p.condition - 12)
        };
      } else if (data.type === 'Recuperação') {
        return {
          ...p,
          condition: Math.min(100, p.condition + 18)
        };
      }
      return p;
    });

    const prevPlayers = players;
    const prevLogs = trainingLogs;
    setPlayers(updatedPlayers);
    
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newLog: TrainingLog = {
      id: "tr_" + Date.now(),
      date: formattedDate,
      type: data.type,
      duration: data.duration,
      playersCount: players.filter(p => !p.isInjured && p.squad === currentSquad).length,
      notes: data.notes,
      squad: currentSquad
    };
    
    setTrainingLogs(prev => [newLog, ...prev]);
    setActiveModal(null);

    try {
      // Salva apenas jogadores que tiveram alteração (condition, rating)
      await Promise.all(updatedPlayers.map(async (p, i) => {
        const orig = players[i];
        if (!orig) return;
        const changed = p.condition !== orig.condition || p.rating !== orig.rating;
        if (changed) await saveItem('players', p);
      }));
      await saveItem('trainingLogs', newLog);
      showToast(`Sessão de Treino ${data.type} aplicada para o time ${currentSquad}!`, 'success');
    } catch (e) {
      console.error("Firebase training save error:", e);
      setPlayers(prevPlayers);
      setTrainingLogs(prevLogs);
      showToast("Erro ao salvar treino no banco de dados.", "error");
    }
  };

  // Schedule Match
  const handleScheduleMatch = async (data: Omit<Match, 'id' | 'homeLogo' | 'awayLogo' | 'isConfirmed' | 'status' | 'squad'>) => {
    const getLogo = (name: string) => {
      if (name.includes('Unidos')) return UNIDOS_LOGO;
      if (name.includes('Titan FC')) return TITAN_FC_LOGO;
      if (name.includes('Iberia')) return IBERIA_LOGO;
      if (name.includes('MNT') || name.includes('Coastal')) return MNT_LOGO;
      if (name.includes('CTY') || name.includes('Youth')) return CTY_LOGO;
      return EGL_LOGO;
    };

    const newMatch: Match = {
      ...data,
      id: "m_" + Date.now(),
      date: normalizeMatchDate(data.date),
      homeLogo: getLogo(data.homeTeam),
      awayLogo: getLogo(data.awayTeam),
      isConfirmed: true,
      status: 'CONFIRMADO',
      squad: currentSquad,
      confirmedPlayers: []
    };

    const prevMatches = matches;
    setMatches([newMatch, ...matches]);
    setActiveModal(null);

    try {
      await saveItem('matches', newMatch);
      showToast(`Confronto contra ${data.homeTeam.includes('Unidos') ? data.awayTeam : data.homeTeam} agendado para o time ${currentSquad}!`, 'success');
    } catch (e) {
      console.error("Firebase match save error:", e);
      setMatches(prevMatches);
      showToast("Erro ao salvar partida no banco de dados.", "error");
    }
  };

  // Add Athlete
  const handleAddPlayer = async (playerData: Omit<Player, 'id' | 'image' | 'games' | 'squad'>) => {
    const genericPhotos = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBF1LVhWUZnFla0LwkJo6umZHn7LA36eRpaoHz9UHXs9jiqP6p-jASZsi1BzPLo3wR5YPfoFwaZEw3N0QaYudZPxBZratlgK9sfdZgEtsLLysmNYHcjJrr8Rle1GoiIUfVRHgsZXcI0MnlBXnqtRCEurM5HpHOHv04lXddjXZBnfLY8-Vl9diIK24pRUP2syNZS6Oh3NqIiCBut-MG2La-hca-z7XZFn-smSuPHo8EIgv5BGZG76VQ6sJkur7FuhoYh3X48lL1I34GW",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDuzPlzWPLBaVOKvpbE-N8iigdn1CJlBVE3TPvX2KbpPfgd91S2imqOYAN7oRrF4qlbLiqg5DWX6ETyVVE1s0avNPQnzLr9mXo6nKb4PJWAsysZ-mf_XsRHA3zNSt6GdWLix3hfnJsL5bcdopPYogWwcrR_zHyyLNnWECrl25GvWS9960PTO-Glmig0oOya_5MntZxjczi4xCCoPxZyzV8Ho0oYa_5MntZxjczi4xCCoPxZyzV8Ho0oYiMhUQpND4zSaYK7x8wJD4l-A1Il3otgo8bZu0DjM_2wNUqunbupN",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC6ab_1loO75AthtqLF1mY0GG_dL8hzIK-1t1aciEgofQ2TMcs7QvKzXjXnoxJAIKMfE5xMrDLxpQ_2T38IyKD7isJoRJKtQfPtLjiyS9LLjG4EYDIzCipZDjJguh2julNN-jcIZPrBxRbhBRG4qGKeiUXmRBFs1D8SXpFJq1iljVxVAbGuclTZYOv1IvFV9OHDNPSaC_6u_ELktYkY7NbCP9TGApta-2S6yYDkyUwaMZ76rvPNOm_W7axUUa4YxMBrO3KKurOaXA4"
    ];

    const randomPhoto = genericPhotos[Math.floor(Math.random() * genericPhotos.length)];

    const rawPin = generatePlayerPin();
    const hashedPin = await hashPin(rawPin);

    const newPlayer: Player = {
      ...playerData,
      id: "p_" + Date.now(),
      pin: hashedPin,
      image: randomPhoto,
      games: 0,
      goals: playerData.position === 'Atacante' || playerData.position === 'Meio-Campo' ? 0 : undefined,
      tackles: playerData.position === 'Defensor' ? 0 : undefined,
      cleanSheets: playerData.position === 'Goleiro' ? 0 : undefined,
      squad: currentSquad
    };

    const prevPlayers = players;
    setPlayers([...players, newPlayer]);
    setActiveModal(null);

    try {
      await saveItem('players', newPlayer);
      showToast(`Atleta ${playerData.name} adicionado ao elenco ${currentSquad}! PIN: ${rawPin}`, 'success');
    } catch (e) {
      console.error("Firebase player save error:", e);
      setPlayers(prevPlayers);
      showToast("Erro ao salvar atleta no banco de dados.", "error");
    }
  };

  // Add Transaction & handle uniform player charges
  const handleAddTransaction = async (data: Omit<Transaction, 'id'> & { chargePlayers?: boolean }) => {
    const newTx: Transaction = {
      ...data,
      id: "t_" + Date.now(),
    };

    const prevTransactions = transactions;
    const prevUnpaid = unpaidMembers;
    setTransactions([newTx, ...transactions]);

    try {
      await saveItem('transactions', newTx);
    } catch (e) {
      console.error("Firebase transaction save error:", e);
      setTransactions(prevTransactions);
      showToast("Erro ao salvar transação no banco de dados.", "error");
    }

    if (data.chargePlayers && data.amount > 0) {
      const squadPlayers = players.filter(p => p.squad === currentSquad);
      if (squadPlayers.length > 0) {
        const splitAmount = Math.ceil(data.amount / squadPlayers.length);
        const newUnpaidMembers: UnpaidMember[] = squadPlayers.map((p, idx) => ({
          id: `up_uniform_${Date.now()}_${idx}`,
          name: p.name,
          daysLate: 1,
          amount: splitAmount,
          image: p.image,
          reason: `Compra de Uniforme (${currentSquad})`
        }));
        setUnpaidMembers(prev => [...newUnpaidMembers, ...prev]);

        try {
          await saveCollectionData('unpaidMembers', newUnpaidMembers);
          showToast(`Uniforme registrado! R$ ${splitAmount} lançado como débito para cada um dos ${squadPlayers.length} atletas do elenco ${currentSquad}.`, 'success');
        } catch (e) {
          console.error("Firebase unpaid members save error:", e);
          setUnpaidMembers(prevUnpaid);
          showToast("Erro ao lançar débitos no banco de dados.", "error");
        }
      } else {
        showToast(`Gasto registrado, porém nenhum atleta cadastrado no time ${currentSquad} para divisão de custos.`, 'info');
      }
    } else {
      showToast(`Lançamento de ${formatCurrency(data.amount)} registrado!`, 'success');
    }

    setActiveModal(null);
    setEditingTransaction(null);
  };

  const handleEditTransaction = async (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
    try {
      const current = transactions.find(tx => tx.id === id);
      if (current) await saveItem('transactions', { ...current, ...updates } as Transaction);
      showToast('Lançamento atualizado!', 'success');
    } catch (e) {
      console.error('Error updating transaction:', e);
      showToast('Erro ao atualizar lançamento.', 'error');
    }
    setActiveModal(null);
    setEditingTransaction(null);
  };

  // Collect / Pay late fees
  const handlePayLateFee = async (memberId: string, amount: number) => {
    let updatedMember: UnpaidMember | undefined;
    setUnpaidMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        updatedMember = { ...m, isPaid: true };
        return updatedMember;
      }
      return m;
    }));
    
    // Auto-record as a receipt in transactions ledger
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const targetMember = unpaidMembers.find(m => m.id === memberId);

    if (targetMember) {
      const newReceipt: Transaction = {
        id: "t_" + Date.now(),
        description: `Mensalidade recebida: ${targetMember.name}`,
        category: 'RECEITA',
        date: formattedDate,
        amount
      };
      setTransactions(prev => [newReceipt, ...prev]);

      try {
        if (updatedMember) {
          await saveItem('unpaidMembers', updatedMember);
        }
        await saveItem('transactions', newReceipt);
      } catch (e) {
        console.error("Firebase pay late fee save error:", e);
      }
    }

    showToast(`Pagamento de ${formatCurrency(amount)} recebido!`, 'success');
  };

  // PIX: atleta clicou "Já paguei" — marca como aguardando confirmação
  const handlePixPay = async (memberId: string) => {
    setUnpaidMembers(prev => prev.map(m => {
      if (m.id === memberId) return { ...m, paymentStatus: 'awaiting' as const };
      return m;
    }));
    const member = unpaidMembers.find(m => m.id === memberId);
    if (member) {
      try {
        await saveItem('unpaidMembers', { ...member, paymentStatus: 'awaiting' });
      } catch (e) {
        console.error("PIX pay save error:", e);
      }
    }
    showToast('Pagamento enviado para confirmação!', 'success');
  };

  // PIX: dono do PIX confirma pagamento
  const handlePixConfirm = async (memberId: string) => {
    let updatedMember: UnpaidMember | undefined;
    setUnpaidMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        updatedMember = { ...m, paymentStatus: 'paid' as const, isPaid: true };
        return updatedMember;
      }
      return m;
    }));

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const targetMember = unpaidMembers.find(m => m.id === memberId);

    if (targetMember && updatedMember) {
      const newReceipt: Transaction = {
        id: "t_" + Date.now(),
        description: `Mensalidade recebida: ${targetMember.name}`,
        category: 'RECEITA',
        date: formattedDate,
        amount: targetMember.amount,
      };
      setTransactions(prev => [newReceipt, ...prev]);

      try {
        await saveItem('unpaidMembers', updatedMember);
        await saveItem('transactions', newReceipt);
      } catch (e) {
        console.error("PIX confirm save error:", e);
      }
    }

    showToast(`Pagamento de ${formatCurrency(targetMember?.amount || 0)} confirmado!`, 'success');
  };

  // Refresh manual com debounce 30s (seguro contra cota)
  const lastRefreshRef = useRef(0);
  const handleRefresh = async () => {
    if (Date.now() - lastRefreshRef.current < 30 * 1000) {
      showToast('Aguarde 30s para atualizar novamente', 'info');
      return;
    }
    lastRefreshRef.current = Date.now();
    try {
      const [fbPlayers, fbMatches, fbTransactions, fbUnpaid] = await Promise.all([
        getCollectionData<Player>('players'),
        getCollectionData<Match>('matches'),
        getCollectionData<Transaction>('transactions'),
        getCollectionData<UnpaidMember>('unpaidMembers'),
      ]);

      if (fbPlayers) { setPlayers(fbPlayers); localStorage.setItem('unidos_cache_players', JSON.stringify(fbPlayers)); }
      if (fbMatches) { setMatches(fbMatches); localStorage.setItem('unidos_cache_matches', JSON.stringify(fbMatches)); }
      if (fbTransactions) { setTransactions(fbTransactions); localStorage.setItem('unidos_cache_transactions', JSON.stringify(fbTransactions)); }
      if (fbUnpaid) { setUnpaidMembers(fbUnpaid); localStorage.setItem('unidos_cache_unpaid', JSON.stringify(fbUnpaid)); }

      // Standings
      try {
        const fbStandings = await getCollectionData<TeamStandings>('standings');
        if (fbStandings) { setStandings(fbStandings); localStorage.setItem('unidos_cache_standings', JSON.stringify(fbStandings)); }
      } catch {}

      // Confirmations
      try {
        const conf = await getDocData<{ id: string; data: Record<string, unknown> }>('confirmations', 'singleton');
        if (conf?.data) {
          const map = normalizeConfirmationsMap(conf.data);
          setConfirmationsMap(map);
          localStorage.setItem('unidos_cache_confirmations', JSON.stringify(map));
        }
      } catch {}

      showToast('Dados atualizados!', 'success');
    } catch (e) {
      showToast('Erro ao atualizar dados.', 'error');
    }
  };

  // Generate monthly fee (R$70 per player)
  const handleGenerateMonthlyFee = async () => {
    const squadPlayers = players.filter(p => p.squad === currentSquad);
    if (squadPlayers.length === 0) {
      showToast('Nenhum jogador cadastrado nesta categoria.', 'error');
      return;
    }

    const MAX_OVERDUE = 3;
    const pendingCount = new Map<string, number>();
    unpaidMembers
      .filter(u => u.reason === 'Mensalidade' && !u.cancelled && !u.isPaid)
      .forEach(u => {
        pendingCount.set(u.name, (pendingCount.get(u.name) || 0) + 1);
      });

    const exemptedPlayers = squadPlayers.filter(p => p.isExempt);
    const atLimit = squadPlayers.filter(p => (pendingCount.get(p.name) || 0) >= MAX_OVERDUE && !p.isExempt);
    const playersToCharge = squadPlayers.filter(p => (pendingCount.get(p.name) || 0) < MAX_OVERDUE && !p.isExempt);

    if (playersToCharge.length === 0) {
      showToast('Todos os jogadores já atingiram o limite de 3 mensalidades em aberto ou são isentos.', 'info');
      return;
    }

    const total = playersToCharge.length * 70;
    const exemptCount = exemptedPlayers.length;
    const msg = `Gerar mensalidade de R$70 para ${playersToCharge.length} jogadores do ${currentSquad}?`;
    const skipParts = [];
    if (atLimit.length > 0) skipParts.push(`${atLimit.length} no limite (${MAX_OVERDUE} pendências)`);
    if (exemptCount > 0) skipParts.push(`${exemptCount} isentos`);
    const skipMsg = skipParts.length > 0 ? ` (${skipParts.join(', ')})` : '';
    if (!confirm(`${msg}${skipMsg}\nTotal: R$ ${total.toLocaleString('pt-BR')}`)) return;

    const newUnpaidMembers: UnpaidMember[] = playersToCharge.map((p, idx) => ({
      id: `up_mensalidade_${Date.now()}_${idx}`,
      name: p.name,
      daysLate: 0,
      amount: 70,
      image: p.image,
      reason: `Mensalidade`
    }));

    const prevUnpaid = unpaidMembers;
    setUnpaidMembers(prev => [...newUnpaidMembers, ...prev]);

    try {
      await saveCollectionData('unpaidMembers', newUnpaidMembers);
      showToast(`Mensalidade de R$70 gerada para ${playersToCharge.length} jogadores do ${currentSquad}!`, 'success');
    } catch (e) {
      console.error("Firebase generate monthly fee error:", e);
      setUnpaidMembers(prevUnpaid);
      showToast("Erro ao gerar mensalidades no banco de dados.", "error");
    }
  };

  // Player attendance toggler for matches — salva status ('CONFIRMADO' | 'AUSENTE') por atleta
  const handleConfirmAttendance = async (matchId: string, playerId: string, status: 'CONFIRMADO' | 'AUSENTE') => {
    // Atualização otimista local (instantânea para o usuário)
    setConfirmationsMap(prev => {
      const responses = { ...(prev[matchId] || {}) };
      responses[playerId] = status;
      return { ...prev, [matchId]: responses };
    });

    const pName = players.find(p => p.id === playerId)?.name || 'Atleta';

    try {
      // Grava no documento único — status CONFIRMADO ou AUSENTE
      const newMap = await updateConfirmation(matchId, playerId, status);
      setConfirmationsMap(newMap);
      showToast(
        status === 'CONFIRMADO' 
          ? `${pName} confirmado para a partida!` 
          : `${pName} registrou ausência para este jogo.`, 
        status === 'CONFIRMADO' ? 'success' : 'info'
      );
    } catch (e) {
      console.error("Supabase attendance save error:", e);
      // Reverter atualização otimista em caso de erro
      setConfirmationsMap(prev => {
        const responses = { ...(prev[matchId] || {}) };
        delete responses[playerId];
        return { ...prev, [matchId]: responses };
      });
      showToast("Erro ao salvar presença no banco de dados.", "error");
    }
  };

  // Spreadsheet copy-paste matching import
  const handleImportMatches = async (importedMatches: Match[]) => {
    const prevMatches = matches;
    setMatches(prev => [...importedMatches, ...prev]);

    try {
      await saveCollectionData('matches', importedMatches);
      showToast(`${importedMatches.length} confrontos importados com sucesso!`, 'success');
    } catch (e) {
      console.error("Firebase import matches save error:", e);
      setMatches(prevMatches);
      showToast("Erro ao importar partidas no banco de dados.", "error");
    }
  };

  // Individual athlete status update slider
  const handleUpdatePlayerDetails = async (id: string, updates: Partial<Player>) => {
    const existing = playersRef.current.find(p => p.id === id);
    if (!existing) {
      showToast('Erro: atleta não encontrado.', 'error');
      return;
    }
    const updatedPlayer = { ...existing, ...updates };
    try {
      // Envia o objeto completo: o proxy faz merge por coluna (nunca apaga o resto)
      await saveItem('players', updatedPlayer as any);
      showToast(`Ficha física do atleta atualizada!`, 'info');
      setPlayers(prev => prev.map(p => p.id === id ? updatedPlayer : p));
          try {
            const cached = JSON.parse(localStorage.getItem('unidos_cache_players') || '[]');
            const idx = cached.findIndex((p: any) => p.id === id);
            if (idx >= 0) { cached[idx] = updatedPlayer; localStorage.setItem('unidos_cache_players', JSON.stringify(cached)); }
            // Também atualizar chave legada
            const legacy = JSON.parse(localStorage.getItem('unidos_players') || '[]');
            const idxLegacy = legacy.findIndex((p: any) => p.id === id);
            if (idxLegacy >= 0) { legacy[idxLegacy] = updatedPlayer; localStorage.setItem('unidos_players', JSON.stringify(legacy)); }
          } catch (_) {}
    } catch (e) {
      console.error("Firebase update player details error:", e);
      showToast("Erro ao atualizar ficha no banco de dados.", "error");
    }
  };

  // Update Match
  const handleUpdateMatch = async (id: string, updates: Partial<Match>) => {
    let updatedMatch: Match | undefined;
    const prevMatches = matches;
    setMatches(prev => prev.map(m => {
      if (m.id === id) {
        updatedMatch = { ...m, ...updates };
        return updatedMatch;
      }
      return m;
    }));

    if (!updatedMatch) return;

    try {
      await saveItem('matches', updatedMatch);
      showToast(`Partida atualizada!`, 'success');

      // Recalcular stats a partir da data de corte configurável
      const matchDate = parseMatchDate(updatedMatch.date || '');
      const [cD, cM, cY] = getStatsStartDate().split('/').map(Number);
      const cutoff = new Date(cY, cM - 1, cD);

      if (matchDate >= cutoff && updatedMatch.goalScorers && updatedMatch.goalScorers.length > 0) {
        const allMatches = matches.map(m => m.id === id ? updatedMatch! : m);

        // Recalcular goals: somar de todas as partidas >= cutoff com goalScorers (exceto rachão interno)
        const goalCounts: Record<string, number> = {};
        for (const m of allMatches) {
          if (!m.date) continue;
          if (isIntraSquadMatch(m)) continue;
          const md = parseMatchDate(m.date);
          if (md && md >= cutoff && m.goalScorers) {
            for (const gs of m.goalScorers) {
              goalCounts[gs.playerId] = (goalCounts[gs.playerId] || 0) + gs.goals;
            }
          }
        }

        // Recalcular clean sheets
        const gkCleanSheets: Record<string, number> = {};
        for (const m of allMatches) {
          if (!m.date || !m.goalkeeperId) continue;
          if (isIntraSquadMatch(m)) continue;
          const md = parseMatchDate(m.date);
          if (!md || md < cutoff) continue;
          const isUnidosHome = m.homeTeam.includes('Unidos');
          const goalsConceded = isUnidosHome ? (m.awayScore || 0) : (m.homeScore || 0);
          if (goalsConceded === 0 && (m.homeScore !== undefined || m.awayScore !== undefined)) {
            gkCleanSheets[m.goalkeeperId] = (gkCleanSheets[m.goalkeeperId] || 0) + 1;
          }
        }

        setPlayers(prev => prev.map(p => {
          const newGoals = goalCounts[p.id];
          const newCS = gkCleanSheets[p.id];
          if (newGoals !== undefined || newCS !== undefined) {
            return {
              ...p,
              goals: newGoals !== undefined ? newGoals : p.goals,
              cleanSheets: newCS !== undefined ? newCS : p.cleanSheets,
            };
          }
          return p;
        }));

        // Salvar stats atualizadas no Supabase
        const updatedPlayers = playersRef.current.map(p => {
          const newGoals = goalCounts[p.id];
          const newCS = gkCleanSheets[p.id];
          if (newGoals !== undefined || newCS !== undefined) {
            return { ...p, goals: newGoals !== undefined ? newGoals : p.goals, cleanSheets: newCS !== undefined ? newCS : p.cleanSheets };
          }
          return p;
        });
        try { await saveCollectionData('players', updatedPlayers); } catch (_) {}
        try { localStorage.setItem('unidos_cache_players', JSON.stringify(updatedPlayers)); } catch (_) {}
      }
    } catch (e) {
      console.error("Firebase update match error:", e);
      setMatches(prevMatches);
      showToast("Erro ao salvar alterações da partida no banco de dados.", "error");
    }
  };

  // Delete Player
  const handleDeletePlayer = async (id: string) => {
    const prevPlayers = players;
    setPlayers(prev => prev.filter(p => p.id !== id));

    try {
      await deleteItem('players', id);
      showToast(`Atleta removido do elenco.`, 'info');
    } catch (e) {
      console.error("Firebase delete player error:", e);
      setPlayers(prevPlayers);
      showToast("Erro ao remover atleta do Firebase.", "error");
    }
  };

  // Add goal to scorer directly in Artilharia
  // Cancel a transaction (soft delete)
  const handleCancelTransaction = async (id: string) => {
    const prevTx = transactions;
    const tx = prevTx.find(t => t.id === id);
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, cancelled: true } : t
    ));

    try {
      if (tx) await saveItem('transactions', { ...tx, cancelled: true });
      showToast(`Lançamento cancelado.`, 'info');
    } catch (e) {
      console.error("Firebase cancel transaction error:", e);
      setTransactions(prevTx);
      showToast("Erro ao cancelar lançamento no banco de dados.", "error");
    }
  };

  // Remove an unpaid member record
  const handleRemoveUnpaidMember = async (id: string) => {
    const prevUp = unpaidMembers;
    const member = prevUp.find(m => m.id === id);
    setUnpaidMembers(prev => prev.map(m =>
      m.id === id ? { ...m, cancelled: true } : m
    ));

    try {
      if (member) await saveItem('unpaidMembers', { ...member, cancelled: true });
      showToast(`Registro removido.`, 'info');
    } catch (e) {
      console.error("Firebase remove unpaid member error:", e);
      setUnpaidMembers(prevUp);
      showToast("Erro ao remover registro no banco de dados.", "error");
    }
  };

  // Other support buttons
  const handleSupport = () => {
    showToast("Canal de ajuda acionado. Fale com o diretor esportivo!", "info");
  };

  const handleLogoutAction = () => {
    if (confirm("Deseja desconectar e sair do painel Unidos?")) {
      handleLogout();
    }
  };

  const handleOpenSettings = () => {
    setActiveModal('adminSettings');
  };

  // Merge confirmations from the single doc into the match objects
  const matchesWithConfirmations = useMemo(() => {
    return matches.map(m => {
      const responses = confirmationsMap[m.id];
      if (responses) {
        const confirmedPlayers: string[] = [];
        const absentPlayers: string[] = [];
        for (const [pid, s] of Object.entries(responses)) {
          if (s === 'CONFIRMADO') confirmedPlayers.push(pid);
          else absentPlayers.push(pid);
        }
        return { ...m, confirmedPlayers, absentPlayers };
      }
      return { ...m, confirmedPlayers: m.confirmedPlayers || [], absentPlayers: [] };
    });
  }, [matches, confirmationsMap]);

  // Filtered lists based on current selected squad filter + data de corte
  const filteredPlayers = players.filter(p => p.squad === currentSquad);
  const [cD, cM, cY] = getStatsStartDate().split('/').map(Number);
  const cutoff = new Date(cY, cM - 1, cD);
  const filteredMatches = matchesWithConfirmations
    .filter(m => m.squad === currentSquad)
    .filter(m => {
      const md = parseMatchDate(m.date);
      if (!md) return false;
      return md >= cutoff;
    });
  const upcomingMatches = filteredMatches.filter(m => {
    const md = parseMatchDate(m.date);
    return md ? md >= new Date(new Date().toDateString()) : false;
  });


  if (firebaseLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden select-none">
        {/* Subtle glowing accents */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
          <div className="w-24 h-24 mb-6 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="text-7xl"
            >
              ⚽
            </motion.div>
          </div>
          
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Unidos Suzano Futebol Master</h1>
          <div className="h-1 w-12 bg-emerald-500 rounded-full mb-4 mx-auto" />
          
          <p className="text-sm font-semibold text-slate-300">Carregando...</p>
          <p className="text-xs text-slate-400 mt-1">Sincronizando dados do time.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen bg-background font-sans">
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed top-5 right-5 z-[100] bg-primary text-white border-2 border-tertiary px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3"
            >
              <span className="text-xl">⚽</span>
              <p className="text-sm font-bold tracking-tight">{toast.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <LoginView
          players={players}
          onLoginSuccess={(sData) => handleLogin(sData.role, sData.playerId)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:pl-64 relative flex flex-col font-sans">
      
      {/* Toast Alert Toast Notification container */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-5 right-5 z-[100] bg-primary text-white border-2 border-tertiary px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <span className="text-xl">⚽</span>
            <p className="text-sm font-bold tracking-tight">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-45 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Persistent Sidebar (Left Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogoutAction}
        onSupport={handleSupport}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        session={session}
        players={players}
      />

      {/* Layout Content wrapper */}
      <div className="flex-1 flex flex-col">
        {/* Dynamic Top Bar */}
        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSettings={handleOpenSettings}
          onToggleNotifications={() => showToast("Sem novas notificações de federação no momento.", "info")}
          notificationCount={2}
          currentSquad={currentSquad}
          setCurrentSquad={setCurrentSquad}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          session={session}
          players={players}
          firebaseStatus={firebaseStatus}
          onRefresh={handleRefresh}
        />

        {/* Dynamic Nav View Render with framer-motion transitions */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {activeTab === 'inicio' && (
                <DashboardView
                  players={players}
                  matches={filteredMatches}
                  transactions={transactions}
                  onPlayerClick={(player) => {
                    setSelectedPlayer(player);
                    setActiveModal('playerDetails');
                  }}
                  onOpenNewSession={() => setActiveModal('training')}
                  onConfirmAttendance={handleConfirmAttendance}
                  onMatchClick={(match) => {
                    setSelectedMatch(match);
                    setActiveModal('editMatch');
                  }}
                  session={session}
                  currentSquad={currentSquad}
                />
              )}

              {activeTab === 'calendario' && (
                <CalendarView
                  matches={filteredMatches}
                  players={players}
                  onOpenScheduleMatch={() => setActiveModal('scheduleMatch')}
                  onMatchClick={(match) => {
                    setSelectedMatch(match);
                    setActiveModal('editMatch');
                  }}
                  onImportMatches={handleImportMatches}
                  onConfirmAttendance={handleConfirmAttendance}
                  session={session}
                />
              )}

              {activeTab === 'elenco' && (
                <SquadView
                  players={filteredPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                  matches={filteredMatches}
                  onPlayerClick={(player) => {
                    setSelectedPlayer(player);
                    setActiveModal('playerDetails');
                  }}
                  onOpenAddPlayer={() => setActiveModal('addPlayer')}
                  onDeletePlayer={handleDeletePlayer}
                  session={session}
                />
              )}

              {activeTab === 'estatisticas' && (
                <StatsView
                  players={filteredPlayers}
                  matches={filteredMatches}
                  session={session}
                />
              )}

              {activeTab === 'financeiro' && (
                <FinanceView
                  transactions={transactions}
                  unpaidMembers={unpaidMembers}
                  players={players}
                  onAddTransaction={handleAddTransaction}
                  onPayLateFee={handlePayLateFee}
                  onCancelTransaction={handleCancelTransaction}
                  onRemoveUnpaidMember={handleRemoveUnpaidMember}
                  onOpenNewTransaction={() => { setEditingTransaction(null); setActiveModal('addTransaction'); }}
                  onEditTransaction={(tx) => { setEditingTransaction(tx); setActiveModal('addTransaction'); }}
                  onGenerateMonthlyFee={handleGenerateMonthlyFee}
                  session={session}
                  showToast={showToast}
                  pixKey={pixKey}
                  pixOwnerId={pixOwnerId}
                  onPixPay={handlePixPay}
                  onPixConfirm={handlePixConfirm}
                />
              )}

              {activeTab === 'almoxarifado' && session?.role === 'admin' && (
                <AlmoxarifadoView />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals Portals Overlay */}
      <AnimatePresence>
        {activeModal === 'training' && (
          <TrainingModal
            onClose={() => setActiveModal(null)}
            onSubmit={handleApplyTraining}
          />
        )}

        {activeModal === 'scheduleMatch' && (
          <ScheduleMatchModal
            onClose={() => setActiveModal(null)}
            onSubmit={handleScheduleMatch}
          />
        )}

        {activeModal === 'addPlayer' && (
          <AddPlayerModal
            onClose={() => setActiveModal(null)}
            onSubmit={handleAddPlayer}
          />
        )}

        {activeModal === 'addTransaction' && (
          <AddTransactionModal
            onClose={() => { setActiveModal(null); setEditingTransaction(null); }}
            onSubmit={handleAddTransaction}
            onEdit={handleEditTransaction}
            initialTransaction={editingTransaction || undefined}
          />
        )}

        {activeModal === 'playerDetails' && selectedPlayer && (
          <PlayerDetailsModal
            player={selectedPlayer}
            onClose={() => {
              setActiveModal(null);
              setSelectedPlayer(null);
            }}
            onUpdatePlayer={handleUpdatePlayerDetails}
            session={session}
          />
        )}

        {activeModal === 'editMatch' && selectedMatch && (
          <EditMatchModal
            match={selectedMatch}
            players={players}
            onClose={() => {
              setActiveModal(null);
              setSelectedMatch(null);
            }}
            onSubmit={handleUpdateMatch}
            onConfirmAttendance={handleConfirmAttendance}
          />
        )}

        {activeModal === 'adminSettings' && (
          <AdminSettingsModal
            onClose={() => setActiveModal(null)}
            players={players}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminSettingsModal({ onClose, players }: {
  onClose: () => void;
  players: Player[];
}) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (newPwd.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { alert('As senhas não coincidem.'); return; }

    setSaving(true);
    try {
      await callFunction('save-config', {
        currentPassword: currentPwd || undefined,
        newPassword: newPwd || undefined,
      });
      alert('Senha master alterada com sucesso!');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Erro: ${msg}`);
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-primary p-6 text-white">
          <h2 className="font-black text-lg">Alterar Senha Master</h2>
          <p className="text-sm text-primary-fixed-dim mt-1">Apenas o administrador master pode alterar</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-black text-primary uppercase tracking-wider block mb-1">Senha Atual</label>
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                placeholder="Digite a senha atual" className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs font-black text-primary uppercase tracking-wider block mb-1">Nova Senha</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Mínimo 6 caracteres" className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent" minLength={6} />
            </div>
            <div>
              <label className="text-xs font-black text-primary uppercase tracking-wider block mb-1">Confirmar Nova Senha</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repita a nova senha" className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-surface-container text-on-surface hover:bg-surface-container-high active:scale-[0.98] rounded-xl text-xs font-bold transition-all cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-secondary text-white hover:brightness-110 active:scale-[0.98] rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
