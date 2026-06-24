import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Match, Transaction, UnpaidMember, TeamStandings, TrainingLog, SquadCategory } from './types';
import {
  initialPlayers,
  initialMatches,
  initialTransactions,
  initialUnpaidMembers,
  initialStandings,
  TITAN_FC_LOGO,
  IBERIA_LOGO,
  MNT_LOGO,
  CTY_LOGO,
  EGL_LOGO,
  UNIDOS_LOGO
} from './data/initialData';

// Firebase
import { getCollectionData, saveItem, deleteItem, saveCollectionData, getDocData, initAuth, db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { formatCurrency } from './lib/utils';

// Sub-components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import SquadView from './components/SquadView';
import StatsView from './components/StatsView';
import FinanceView from './components/FinanceView';
import LoginView from './components/LoginView';

// Modals
import {
  TrainingModal,
  ScheduleMatchModal,
  AddPlayerModal,
  AddTransactionModal,
  PlayerDetailsModal
} from './components/Modals';

export default function App() {
  // Firebase sync status
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  // 1. Core State persisted in LocalStorage (and synchronized with Firebase)
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('unidos_active_tab') || 'inicio';
  });

  const [currentSquad, setCurrentSquad] = useState<SquadCategory>(() => {
    return (localStorage.getItem('unidos_current_squad') as SquadCategory) || 'Veterano/Esporte';
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const local = localStorage.getItem('unidos_players');
    return local ? JSON.parse(local) : initialPlayers;
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    const local = localStorage.getItem('unidos_matches');
    return local ? JSON.parse(local) : initialMatches;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('unidos_transactions');
    return local ? JSON.parse(local) : initialTransactions;
  });

  const [unpaidMembers, setUnpaidMembers] = useState<UnpaidMember[]>(() => {
    const local = localStorage.getItem('unidos_unpaid_members');
    return local ? JSON.parse(local) : initialUnpaidMembers;
  });

  const [standings, setStandings] = useState<TeamStandings[]>(() => {
    const local = localStorage.getItem('unidos_standings');
    return local ? JSON.parse(local) : initialStandings;
  });

  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Admin master password (from Firebase config)
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('unidos_admin_password') || '';
  });

  function generateAdminPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  function generatePlayerPin(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // Sincronização inicial com o Firebase Firestore
  useEffect(() => {
    async function initFirebase() {
      try {
        setFirebaseStatus('loading');

        // Autenticação anônima para Firestore
        await initAuth();

        // 0. Carregar/Criar Config (admin password)
        let config = await getDocData<{ id: string; adminPassword: string }>('config', 'app');
        if (!config) {
          const newPwd = generateAdminPassword();
          await setDoc(doc(db, 'config', 'app'), { adminPassword: newPwd });
          config = { id: 'app', adminPassword: newPwd };
          showToast(`App configurado! A senha master foi salva no Firebase.`, 'info');
          console.log('Admin master password (guarde em local seguro):', newPwd);
        }
        setAdminPassword(config.adminPassword);
        localStorage.setItem('unidos_admin_password', config.adminPassword);

        // 1. Carregar Jogadores
        let fbPlayers = await getCollectionData<Player>('players');
        if (fbPlayers.length === 0) {
          const local = localStorage.getItem('unidos_players');
          const dataToSave = local ? JSON.parse(local) : initialPlayers.map(p => ({
            ...p,
            pin: p.pin || generatePlayerPin()
          }));
          await saveCollectionData('players', dataToSave);
          fbPlayers = dataToSave;
        } else {
          // Garantir que todo jogador tenha PIN
          let needsUpdate = false;
          fbPlayers = fbPlayers.map(p => {
            if (!p.pin) {
              needsUpdate = true;
              return { ...p, pin: generatePlayerPin() };
            }
            return p;
          });
          if (needsUpdate) {
            await saveCollectionData('players', fbPlayers);
          }
        }
        setPlayers(fbPlayers);

        // 2. Carregar Partidas
        let fbMatches = await getCollectionData<Match>('matches');
        if (fbMatches.length === 0) {
          const local = localStorage.getItem('unidos_matches');
          const dataToSave = local ? JSON.parse(local) : initialMatches;
          await saveCollectionData('matches', dataToSave);
          fbMatches = dataToSave;
        }
        setMatches(fbMatches);

        // 3. Carregar Transações
        let fbTransactions = await getCollectionData<Transaction>('transactions');
        if (fbTransactions.length === 0) {
          const local = localStorage.getItem('unidos_transactions');
          const dataToSave = local ? JSON.parse(local) : initialTransactions;
          await saveCollectionData('transactions', dataToSave);
          fbTransactions = dataToSave;
        }
        setTransactions(fbTransactions);

        // 4. Carregar Inadimplentes
        let fbUnpaid = await getCollectionData<UnpaidMember>('unpaidMembers');
        if (fbUnpaid.length === 0) {
          const local = localStorage.getItem('unidos_unpaid_members');
          const dataToSave = local ? JSON.parse(local) : initialUnpaidMembers;
          await saveCollectionData('unpaidMembers', dataToSave);
          fbUnpaid = dataToSave;
        }
        setUnpaidMembers(fbUnpaid);

        // 5. Carregar Classificação
        let fbStandings = await getCollectionData<TeamStandings>('standings');
        if (fbStandings.length === 0) {
          const local = localStorage.getItem('unidos_standings');
          const dataToSave = local ? JSON.parse(local) : initialStandings;
          await saveCollectionData('standings', dataToSave);
          fbStandings = dataToSave;
        }
        setStandings(fbStandings);

        // 6. Carregar Logs de Treino
        let fbTrainingLogs = await getCollectionData<TrainingLog>('trainingLogs');
        setTrainingLogs(fbTrainingLogs);

        setFirebaseStatus('connected');
        showToast("Conectado ao Firebase com sucesso!", "success");
      } catch (error) {
        console.error("Firebase connection failed:", error);
        setFirebaseStatus('error');
        // Fallback: usar admin password do localStorage
        const localPwd = localStorage.getItem('unidos_admin_password');
        if (localPwd) setAdminPassword(localPwd);
        showToast("Erro de conexão ao Firebase. Usando dados locais.", "error");
      } finally {
        setFirebaseLoading(false);
      }
    }

    initFirebase();
  }, []);

  // Save states to localStorage (as local backup)
  useEffect(() => {
    localStorage.setItem('unidos_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('unidos_current_squad', currentSquad);
  }, [currentSquad]);

  useEffect(() => {
    localStorage.setItem('unidos_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('unidos_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('unidos_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('unidos_unpaid_members', JSON.stringify(unpaidMembers));
  }, [unpaidMembers]);

  useEffect(() => {
    localStorage.setItem('unidos_standings', JSON.stringify(standings));
  }, [standings]);

  // Reset search query on tab change
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // 2. Modals Control States
  const [activeModal, setActiveModal] = useState<null | 'training' | 'scheduleMatch' | 'addPlayer' | 'addTransaction' | 'playerDetails' | 'adminSettings'>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
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

  // Session state management
  const [session, setSession] = useState<{ role: 'admin' | 'player'; playerId?: string } | null>(() => {
    const saved = localStorage.getItem('unidos_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (role: 'admin' | 'player', playerId?: string) => {
    const newSession = { role, playerId };
    setSession(newSession);
    localStorage.setItem('unidos_session', JSON.stringify(newSession));
    showToast(`Conectado com sucesso como ${role === 'admin' ? 'Diretor' : 'Atleta'}!`, "success");
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('unidos_session');
    showToast("Você saiu do aplicativo.", "info");
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
    showToast(`Sessão de Treino ${data.type} aplicada para o time ${currentSquad}!`, 'success');

    try {
      await saveCollectionData('players', updatedPlayers);
      await saveItem('trainingLogs', newLog);
    } catch (e) {
      console.error("Firebase training save error:", e);
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
      homeLogo: getLogo(data.homeTeam),
      awayLogo: getLogo(data.awayTeam),
      isConfirmed: true,
      status: 'CONFIRMADO',
      squad: currentSquad,
      confirmedPlayers: []
    };

    setMatches([newMatch, ...matches]);
    setActiveModal(null);
    showToast(`Confronto contra ${data.homeTeam === 'Unidos' ? data.awayTeam : data.homeTeam} agendado para o time ${currentSquad}!`, 'success');

    try {
      await saveItem('matches', newMatch);
    } catch (e) {
      console.error("Firebase match save error:", e);
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

    const newPlayer: Player = {
      ...playerData,
      id: "p_" + Date.now(),
      image: randomPhoto,
      games: 0,
      goals: playerData.position === 'Atacante' || playerData.position === 'Meio-Campo' ? 0 : undefined,
      tackles: playerData.position === 'Defensor' ? 0 : undefined,
      cleanSheets: playerData.position === 'Goleiro' ? 0 : undefined,
      squad: currentSquad
    };

    setPlayers([...players, newPlayer]);
    setActiveModal(null);
    showToast(`Atleta ${playerData.name} adicionado ao elenco ${currentSquad}!`, 'success');

    try {
      await saveItem('players', newPlayer);
    } catch (e) {
      console.error("Firebase player save error:", e);
    }
  };

  // Add Transaction & handle uniform player charges
  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'date'> & { chargePlayers?: boolean }) => {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTx: Transaction = {
      ...data,
      id: "t_" + Date.now(),
      date: formattedDate
    };

    setTransactions([newTx, ...transactions]);

    try {
      await saveItem('transactions', newTx);
    } catch (e) {
      console.error("Firebase transaction save error:", e);
    }

    if (data.chargePlayers && data.amount > 0) {
      // Find players in the current squad
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
        showToast(`Uniforme registrado! R$ ${splitAmount} lançado como débito para cada um dos ${squadPlayers.length} atletas do elenco ${currentSquad}.`, 'success');
        
        try {
          await saveCollectionData('unpaidMembers', newUnpaidMembers);
        } catch (e) {
          console.error("Firebase unpaid members save error:", e);
        }
      } else {
        showToast(`Gasto registrado, porém nenhum atleta cadastrado no time ${currentSquad} para divisão de custos.`, 'info');
      }
    } else {
      showToast(`Lançamento de ${formatCurrency(data.amount)} registrado!`, 'success');
    }

    setActiveModal(null);
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

  // Player attendance toggler for matches
  const handleConfirmAttendance = async (matchId: string, playerId: string, status: 'CONFIRMADO' | 'AUSENTE') => {
    let updatedMatch: Match | undefined;
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        const confirmed = m.confirmedPlayers || [];
        let updatedConfirmed = [...confirmed];
        if (status === 'CONFIRMADO') {
          if (!updatedConfirmed.includes(playerId)) {
            updatedConfirmed.push(playerId);
          }
        } else {
          updatedConfirmed = updatedConfirmed.filter(id => id !== playerId);
        }
        updatedMatch = { ...m, confirmedPlayers: updatedConfirmed };
        return updatedMatch;
      }
      return m;
    }));
    
    const pName = players.find(p => p.id === playerId)?.name || 'Atleta';
    showToast(
      status === 'CONFIRMADO' 
        ? `${pName} confirmado para a partida!` 
        : `${pName} registrou ausência para este jogo.`, 
      status === 'CONFIRMADO' ? 'success' : 'info'
    );

    try {
      if (updatedMatch) {
        await saveItem('matches', updatedMatch);
      }
    } catch (e) {
      console.error("Firebase attendance save error:", e);
    }
  };

  // Spreadsheet copy-paste matching import
  const handleImportMatches = async (importedMatches: Match[]) => {
    setMatches(prev => [...importedMatches, ...prev]);
    showToast(`${importedMatches.length} confrontos importados com sucesso!`, 'success');

    try {
      await saveCollectionData('matches', importedMatches);
    } catch (e) {
      console.error("Firebase import matches save error:", e);
    }
  };

  // Individual athlete status update slider
  const handleUpdatePlayerDetails = async (id: string, updates: Partial<Player>) => {
    let updatedPlayer: Player | undefined;
    setPlayers(prev => prev.map(p => {
      if (p.id === id) {
        updatedPlayer = { ...p, ...updates };
        return updatedPlayer;
      }
      return p;
    }));
    showToast(`Ficha física do atleta atualizada!`, 'info');

    try {
      if (updatedPlayer) {
        await saveItem('players', updatedPlayer);
      }
    } catch (e) {
      console.error("Firebase update player details error:", e);
    }
  };

  // Update athlete custom login PIN / password
  const handleUpdatePlayerPin = async (id: string, newPin: string) => {
    let updatedPlayer: Player | undefined;
    setPlayers(prev => prev.map(p => {
      if (p.id === id) {
        updatedPlayer = { ...p, pin: newPin };
        return updatedPlayer;
      }
      return p;
    }));
    showToast(`PIN de acesso atualizado com sucesso!`, 'success');

    try {
      if (updatedPlayer) {
        await saveItem('players', updatedPlayer);
      }
    } catch (e) {
      console.error("Firebase update player PIN error:", e);
    }
  };

  // Delete Player
  const handleDeletePlayer = async (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    showToast(`Atleta removido do elenco.`, 'info');

    try {
      await deleteItem('players', id);
    } catch (e) {
      console.error("Firebase delete player error:", e);
    }
  };

  // Add goal to scorer directly in Artilharia
  const handleAddGoalToScorer = async (playerId: string) => {
    let updatedPlayer: Player | undefined;
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        updatedPlayer = { ...p, goals: (p.goals || 0) + 1 };
        return updatedPlayer;
      }
      return p;
    }));
    
    // Dynamic standing update: simulated goal increment bodes well for team goals difference
    let updatedStanding: TeamStandings | undefined;
    setStandings(prev => prev.map(t => {
      if (t.club === 'Unidos' && t.squad === currentSquad) {
        updatedStanding = {
          ...t,
          goalDifference: t.goalDifference + 1
        };
        return updatedStanding;
      }
      return t;
    }));

    showToast(`Gol anotado! Artilharia do Unidos atualizada.`, 'success');

    try {
      if (updatedPlayer) {
        await saveItem('players', updatedPlayer);
      }
      if (updatedStanding) {
        await saveItem('standings', updatedStanding);
      }
    } catch (e) {
      console.error("Firebase goal scorer save error:", e);
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

  const handleChangeAdminPassword = async (newPassword: string) => {
    try {
      await setDoc(doc(db, 'config', 'app'), { adminPassword: newPassword });
      setAdminPassword(newPassword);
      localStorage.setItem('unidos_admin_password', newPassword);
      showToast('Senha master alterada com sucesso!', 'success');
      setActiveModal(null);
    } catch (e) {
      console.error('Error changing admin password:', e);
      showToast('Erro ao alterar senha. Tente novamente.', 'error');
    }
  };

  // Filtered lists based on current selected squad filter
  const filteredPlayers = players.filter(p => p.squad === currentSquad);
  const filteredMatches = matches.filter(m => m.squad === currentSquad);
  const filteredStandings = standings.filter(s => s.squad === currentSquad);

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
          
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Unidos FC</h1>
          <div className="h-1 w-12 bg-emerald-500 rounded-full mb-4 mx-auto" />
          
          <p className="text-sm font-semibold text-slate-300">Conectando ao Firebase...</p>
          <p className="text-xs text-slate-400 mt-1">Sincronizando elenco, finanças e partidas em nuvem.</p>
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
          adminPassword={adminPassword}
          onLoginSuccess={(sData) => handleLogin(sData.role, sData.playerId)}
          onUpdatePlayerPin={handleUpdatePlayerPin}
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
                  matches={matches}
                  transactions={transactions}
                  onPlayerClick={(player) => {
                    setSelectedPlayer(player);
                    setActiveModal('playerDetails');
                  }}
                  onOpenNewSession={() => setActiveModal('training')}
                  onConfirmAttendance={handleConfirmAttendance}
                  session={session}
                  currentSquad={currentSquad}
                />
              )}

              {activeTab === 'calendario' && (
                <CalendarView
                  matches={filteredMatches}
                  players={players}
                  onOpenScheduleMatch={() => setActiveModal('scheduleMatch')}
                  onImportMatches={handleImportMatches}
                  onConfirmAttendance={handleConfirmAttendance}
                  session={session}
                />
              )}

              {activeTab === 'elenco' && (
                <SquadView
                  players={filteredPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
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
                  onAddGoalToScorer={handleAddGoalToScorer}
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
                  onOpenNewTransaction={() => setActiveModal('addTransaction')}
                  session={session}
                  showToast={showToast}
                />
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
            onClose={() => setActiveModal(null)}
            onSubmit={handleAddTransaction}
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

        {activeModal === 'adminSettings' && (
          <AdminSettingsModal
            currentPassword={adminPassword}
            onChangePassword={handleChangeAdminPassword}
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminSettingsModal({ currentPassword, onChangePassword, onClose }: {
  currentPassword: string;
  onChangePassword: (newPwd: string) => Promise<void>;
  onClose: () => void;
}) {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { alert('As senhas não coincidem.'); return; }
    setSaving(true);
    await onChangePassword(newPwd);
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
          <h2 className="font-black text-lg">Configurações da Diretoria</h2>
          <p className="text-sm text-primary-fixed-dim mt-1">Alterar senha master de acesso</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-primary uppercase tracking-wider block mb-1">
              Senha Atual
            </label>
            <input
              type="text"
              value={currentPassword}
              readOnly
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-mono font-bold text-primary outline-none"
            />
            <p className="text-[10px] text-on-surface-variant mt-1">Anote esta senha antes de alterar</p>
          </div>

          <div>
            <label className="text-xs font-black text-primary uppercase tracking-wider block mb-1">
              Nova Senha
            </label>
            <input
              type="text"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="text-xs font-black text-primary uppercase tracking-wider block mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="text"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container text-on-surface hover:bg-surface-container-high active:scale-[0.98] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-secondary text-white hover:brightness-110 active:scale-[0.98] rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
