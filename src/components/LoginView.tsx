import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Player, SquadCategory } from '../types';
import { UNIDOS_LOGO } from '../data/initialData';
import { hashPin } from '../lib/utils';
import { Shield, User, Lock, LogIn, ChevronDown, Key } from 'lucide-react';

interface LoginViewProps {
  players: Player[];
  adminPassword: string;
  onLoginSuccess: (session: { role: 'admin' | 'player'; playerId?: string }) => void;
  onUpdatePlayerPin?: (id: string, newPin: string) => Promise<void>;
}

function PlayerSelect({ players, value, onChange, disabled, placeholder }: {
  players: Player[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const squadOrder: SquadCategory[] = ['Veterano/Esporte', 'Master'];
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); }}
        className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm font-bold text-primary outline-none transition-all ${
          disabled
            ? 'bg-surface-container border border-outline-variant/20 text-on-surface-variant/70 cursor-not-allowed opacity-80 font-black'
            : 'bg-surface-container-low border border-outline-variant/40 hover:border-outline focus:ring-2 focus:ring-secondary focus:border-transparent cursor-pointer'
        } appearance-none`}
      >
        <option value="">{placeholder || '-- Quem é você? --'}</option>
        {squadOrder.map(squad => (
          <optgroup key={squad} label={squad}>
            {players
              .filter(p => p.squad === squad)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <option key={p.id} value={p.id}>
                  #{p.number} - {p.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-on-surface-variant/70" />
      {!disabled && <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />}
    </div>
  );
}

export default function LoginView({ players, adminPassword, onLoginSuccess, onUpdatePlayerPin }: LoginViewProps) {
  const [role, setRole] = useState<'admin' | 'player'>('player');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password / PIN change states
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [changePlayerId, setChangePlayerId] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  // Admin access type states
  const [adminLoginType, setAdminLoginType] = useState<'master' | 'individual'>('master');
  const [selectedAdminId, setSelectedAdminId] = useState('');

  // Individual URL access locking state
  const [lockedPlayerId, setLockedPlayerId] = useState<string | null>(null);

  // Read "?atleta=ID" or "?atleta=NAME" or "?id=ID" from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const athleteParam = params.get('atleta') || params.get('player') || params.get('id');
    if (athleteParam && players.length > 0) {
      let found = players.find(p => p.id === athleteParam);
      if (!found) {
        found = players.find(p => String(p.number) === athleteParam);
      }
      if (!found) {
        found = players.find(p => p.name.toLowerCase().includes(athleteParam.toLowerCase()));
      }

      if (found) {
        setSelectedPlayerId(found.id);
        setChangePlayerId(found.id);
        setLockedPlayerId(found.id);
        setRole('player');
        setError('');
      }
    }
  }, [players]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (role === 'admin') {
      if (adminLoginType === 'master') {
        const hashedInput = await hashPin(pin);
        if (hashedInput === adminPassword) {
          onLoginSuccess({ role: 'admin' });
        } else {
          setError('Senha de administrador master incorreta.');
        }
      } else {
        if (!selectedAdminId) {
          setError('Selecione seu nome da lista de membros da diretoria.');
          return;
        }

        const member = players.find(p => p.id === selectedAdminId);
        if (!member) {
          setError('Membro não encontrado.');
          return;
        }

        if (!member.pin) {
          setError('Você ainda não possui um PIN cadastrado. Peça à diretoria para gerar um.');
          return;
        }

        const hashedInput = await hashPin(pin);
        if (hashedInput === member.pin) {
          onLoginSuccess({ role: 'admin', playerId: member.id });
        } else {
          setError('PIN pessoal incorreto.');
        }
      }
    } else {
      if (!selectedPlayerId) {
        setError('Selecione seu nome da lista de atletas.');
        return;
      }

      const player = players.find(p => p.id === selectedPlayerId);
      if (!player) {
        setError('Atleta não encontrado.');
        return;
      }

      if (!player.pin) {
        setError('Você ainda não possui um PIN cadastrado. Peça à diretoria para gerar um.');
        return;
      }

      const hashedInput = await hashPin(pin);
      if (hashedInput === player.pin) {
        if (player.isBoardMember) {
          onLoginSuccess({ role: 'admin', playerId: player.id });
        } else {
          onLoginSuccess({ role: 'player', playerId: player.id });
        }
      } else {
        setError('Código PIN incorreto.');
      }
    }
  };

  const handlePinChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!changePlayerId) {
      setError('Selecione seu nome da lista para trocar o PIN.');
      return;
    }

    const player = players.find(p => p.id === changePlayerId);
    if (!player) {
      setError('Atleta não encontrado.');
      return;
    }

    if (!player.pin) {
      setError('Você ainda não possui um PIN inicial. Solicite à diretoria.');
      return;
    }

    const hashedCurrent = await hashPin(currentPin);
    if (hashedCurrent !== player.pin) {
      setError('O PIN atual digitado está incorreto.');
      return;
    }

    if (newPin.length < 4) {
      setError('O novo PIN deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setError('O novo PIN e a confirmação não coincidem.');
      return;
    }

    try {
      if (onUpdatePlayerPin) {
        await onUpdatePlayerPin(changePlayerId, newPin);
        setSuccessMessage(`PIN de ${player.name} atualizado com sucesso! Agora você já pode entrar com seu novo PIN.`);
        setIsChangingPin(false);
        setChangePlayerId('');
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
        setSelectedPlayerId(player.id);
      } else {
        setError('Erro interno do sistema de PIN.');
      }
    } catch (err) {
      setError('Não foi possível salvar o novo PIN. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-slate-950 to-black z-0" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative z-10"
        id="login-card"
      >
        <div className="bg-gradient-to-br from-primary via-[#1c2e9b] to-[#0c1652] p-8 text-center text-white relative border-b-4 border-tertiary">
          <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-tertiary shadow-2xl relative">
              <img
                alt="Unidos Crest"
                className="w-full h-full object-cover scale-[1.35]"
                src={UNIDOS_LOGO}
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="font-black text-2xl text-white tracking-tight leading-tight uppercase">Unidos FC</h2>
              <p className="text-[10px] font-extrabold text-tertiary-fixed uppercase tracking-widest mt-1">Diretoria & Atletas • Fundado em 1984</p>
            </div>
          </div>
        </div>

        {!lockedPlayerId ? (
          <div className="flex border-b border-outline-variant/30 bg-surface-container-low">
            <button
              onClick={() => {
                setRole('player');
                setError('');
                setPin('');
              }}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                role === 'player'
                  ? 'border-secondary text-secondary bg-white'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
              }`}
            >
              <User className="w-4 h-4" />
              Sou Atleta
            </button>
            <button
              onClick={() => {
                setRole('admin');
                setError('');
                setPin('');
              }}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                role === 'admin'
                  ? 'border-secondary text-secondary bg-white'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              Diretoria (Admin)
            </button>
          </div>
        ) : (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3.5 flex items-center justify-between text-xs font-bold text-amber-800 animate-in fade-in duration-300">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
              Link de Acesso Individualizado e Seguro
            </span>
            <button
              onClick={() => {
                setLockedPlayerId(null);
                setSelectedPlayerId('');
                setChangePlayerId('');
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
              className="text-[10px] text-amber-900 hover:underline uppercase font-black tracking-wider cursor-pointer bg-white px-2 py-1 rounded-md shadow-xs"
            >
              Ver Elenco Completo
            </button>
          </div>
        )}

        {isChangingPin ? (
          <form onSubmit={handlePinChangeSubmit} className="p-8 space-y-5">
            <div className="text-center pb-2">
              <h3 className="font-extrabold text-lg text-primary flex items-center justify-center gap-2">
                <Key className="w-5 h-5 text-secondary animate-bounce" />
                Definir PIN Personalizado
              </h3>
              <p className="text-xs text-on-surface-variant/80 mt-1 leading-relaxed">
                Configure uma senha pessoal para que outros atletas não acessem ou confirmem presença no seu lugar.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-bold border border-error-container/30 leading-relaxed"
              >
                ⚠️ {error}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black text-primary uppercase tracking-wider block">
                Seu Nome
              </label>
              <PlayerSelect
                players={players}
                value={changePlayerId}
                onChange={(v) => { setChangePlayerId(v); setError(''); }}
                disabled={!!lockedPlayerId}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-primary uppercase tracking-wider block">
                PIN Atual
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Digite seu PIN atual"
                  value={currentPin}
                  onChange={(e) => {
                    setCurrentPin(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-extrabold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all tracking-widest placeholder:tracking-normal placeholder:font-normal"
                  required
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-on-surface-variant/70" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-primary uppercase tracking-wider block">
                  Novo PIN (4 dígitos)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Novo PIN"
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    className="w-full pl-9 pr-2 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-extrabold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all tracking-widest placeholder:tracking-normal placeholder:font-normal"
                    required
                  />
                  <Lock className="absolute left-3 top-3.5 w-3.5 h-3.5 text-on-surface-variant/70" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-primary uppercase tracking-wider block">
                  Confirmar Novo PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Repita o PIN"
                    value={confirmNewPin}
                    onChange={(e) => {
                      setConfirmNewPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    className="w-full pl-9 pr-2 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-extrabold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all tracking-widest placeholder:tracking-normal placeholder:font-normal"
                    required
                  />
                  <Lock className="absolute left-3 top-3.5 w-3.5 h-3.5 text-on-surface-variant/70" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPin(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className="flex-1 py-3 bg-surface-container text-on-surface hover:bg-surface-container-high active:scale-[0.98] rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-secondary text-white hover:brightness-110 active:scale-[0.98] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                Salvar Novo PIN
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-emerald-500/10 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-500/20 leading-relaxed"
              >
                ✅ {successMessage}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-bold border border-error-container/30 leading-relaxed"
              >
                ⚠️ {error}
              </motion.div>
            )}

            {role === 'player' ? (
              <div className="space-y-2">
                <label className="text-xs font-black text-primary uppercase tracking-wider block">
                  Selecione Seu Nome
                </label>
                <PlayerSelect
                  players={players}
                  value={selectedPlayerId}
                  onChange={(v) => { setSelectedPlayerId(v); setError(''); setSuccessMessage(''); }}
                  disabled={!!lockedPlayerId}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-primary uppercase tracking-wider block">
                    Forma de Acesso Admin
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminLoginType('master');
                        setSelectedAdminId('');
                        setError('');
                      }}
                      className={`py-2 px-3 rounded-xl font-extrabold text-[11px] uppercase tracking-wider border transition-all ${
                        adminLoginType === 'master'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                      }`}
                    >
                      Acesso Geral (Master)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminLoginType('individual');
                        setError('');
                      }}
                      className={`py-2 px-3 rounded-xl font-extrabold text-[11px] uppercase tracking-wider border transition-all ${
                        adminLoginType === 'individual'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                      }`}
                    >
                      PIN Individual
                    </button>
                  </div>
                </div>

                {adminLoginType === 'individual' ? (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-black text-primary uppercase tracking-wider block">
                      Selecione Seu Nome (Diretoria)
                    </label>
                    {players.filter(p => p.isBoardMember).length === 0 ? (
                      <div className="p-3 bg-amber-500/5 text-amber-800 rounded-xl text-[11px] font-bold border border-amber-500/10 leading-relaxed">
                        Nenhum membro da diretoria individual cadastrado no elenco ainda. Use o "Acesso Geral (Master)" ou ative a opção "Diretoria (Admin)" na ficha de algum atleta.
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedAdminId}
                          onChange={(e) => {
                            setSelectedAdminId(e.target.value);
                            setError('');
                          }}
                          className="w-full pl-10 pr-10 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent appearance-none transition-all cursor-pointer"
                        >
                          <option value="">-- Quem é você? --</option>
                          {players
                            .filter(p => p.isBoardMember)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                #{p.number} - {p.name} ({p.squad})
                              </option>
                            ))}
                        </select>
                        <User className="absolute left-3.5 top-3.5 w-4 h-4 text-on-surface-variant/70" />
                        <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/10 text-xs text-primary font-medium leading-relaxed">
                    Você terá permissão para agendar jogos, cobrar mensalidades, aplicar treinos e cadastrar elenco. Use a senha mestre.
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-primary uppercase tracking-wider block">
                {role === 'player'
                  ? 'Senha / Código PIN'
                  : adminLoginType === 'master'
                    ? 'Senha Geral da Diretoria'
                    : 'Seu PIN Pessoal'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  pattern={role === 'player' || adminLoginType === 'individual' ? "[0-9]*" : "[0-9a-zA-Z]*"}
                  inputMode={role === 'player' || adminLoginType === 'individual' ? "numeric" : "text"}
                  placeholder={
                    role === 'player'
                      ? "Digite seu PIN"
                      : adminLoginType === 'master'
                        ? "Senha de acesso admin"
                        : "Digite seu PIN pessoal"
                  }
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-extrabold text-primary outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all tracking-widest placeholder:tracking-normal placeholder:font-normal"
                  required
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-on-surface-variant/70" />
              </div>
              
              {role === 'player' && (
                <div className="text-right pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPin(true);
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="text-xs font-extrabold text-secondary hover:underline cursor-pointer flex items-center gap-1 justify-end ml-auto"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Definir ou trocar PIN personalizado
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-secondary text-white hover:brightness-110 active:scale-[0.98] rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Entrar no Painel
            </button>
          </form>
        )}

        <div className="p-4 bg-surface-container border-t border-outline-variant/20 text-center text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
          Unidos Futebol de Várzea • Fundado em 1984
        </div>
      </motion.div>
    </div>
  );
}
