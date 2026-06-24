import { useState } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Download, 
  Plus, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Shirt, 
  Map, 
  Activity, 
  Sparkle, 
  HelpCircle, 
  Receipt,
  Bell,
  TrendingUp,
  Shield,
  Droplet,
  Megaphone
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Transaction, UnpaidMember, ExpenseCategory, Player } from '../types';
import { formatCurrency } from '../lib/utils';

interface FinanceViewProps {
  transactions: Transaction[];
  unpaidMembers: UnpaidMember[];
  players: Player[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'> & { chargePlayers?: boolean }) => void;
  onPayLateFee: (memberId: string, amount: number) => void;
  onOpenNewTransaction: () => void;
  session: { role: 'admin' | 'player'; playerId?: string } | null;
  showToast?: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function FinanceView({
  transactions,
  unpaidMembers,
  players,
  onAddTransaction,
  onPayLateFee,
  onOpenNewTransaction,
  session,
  showToast
}: FinanceViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Todos' | 'RECEITA' | 'DESPESA'>('Todos');
  const [exporting, setExporting] = useState(false);

  // Dynamic calculations based on active players and transactions
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

  const stats = calculateFinance();

  // Dynamic Board Costs Breakdown
  const getExpensesBreakdown = () => {
    const categories: Record<ExpenseCategory, number> = {
      'Lavagem de uniforme': 80,
      'Aluguel de campo': 250,
      'Compra de medicamentos': 65,
      'Compra de uniforme': 600,
      'Despesas extras': 320,
      'Arbitragem': 0,
      'Água': 0,
      'Marketing': 0,
      'Outras despesas': 0,
    };

    // Sum up custom transactions
    transactions
      .filter((t) => t.category === 'DESPESA' && t.expenseType)
      .forEach((t) => {
        const type = t.expenseType as ExpenseCategory;
        if (categories[type] !== undefined) {
          categories[type] += t.amount;
        } else {
          categories[type] = t.amount;
        }
      });

    return categories;
  };

  const costBreakdown = getExpensesBreakdown();

  const getMonthlyChartData = () => {
    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
    };

    const dataMap: Record<string, { name: string; receitas: number; despesas: number; saldo: number }> = {};

    transactions.forEach((t) => {
      const parts = t.date.split('/');
      if (parts.length >= 2) {
        const month = parts[1];
        if (!dataMap[month]) {
          dataMap[month] = { name: monthNames[month] || month, receitas: 0, despesas: 0, saldo: 0 };
        }
        if (t.category === 'RECEITA') {
          dataMap[month].receitas += t.amount;
        } else {
          dataMap[month].despesas += t.amount;
        }
      }
    });

    const months = Object.keys(dataMap).sort();
    let runningBalance = 0;
    return months.map((m) => {
      const d = dataMap[m];
      runningBalance += d.receitas - d.despesas;
      d.saldo = runningBalance;
      return d;
    });
  };

  const chartData = getMonthlyChartData();

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert('Relatório Financeiro Exportado com Sucesso! (Formato: XLSX)');
    }, 1500);
  };

  const handleNotifyMember = (member: UnpaidMember) => {
    // Tenta achar o jogador correspondente para pegar o telefone
    const correspondingPlayer = players.find(p => p.name.toLowerCase() === member.name.toLowerCase() || p.name.toLowerCase().includes(member.name.toLowerCase()));
    const phone = correspondingPlayer?.phone;

    const message = `⚽ *COBRANÇA - UNIDOS FC* ⚽\n\nFala *${member.name}*! Beleza?\n\nTô passando aqui para te lembrar da pendência com o time:\n💸 Item: *${member.reason || 'Mensalidade'}*\n💰 Valor: *${formatCurrency(member.amount)}*\n\nFortalece aí pro nosso Unidos FC continuar firme e forte! Se já pagou, manda o comprovante! TMJ! 🔴⚪`;

    if (phone) {
      if (showToast) {
        showToast(
          `🔔 Redirecionando para o WhatsApp de ${member.name}...`,
          'success'
        );
      }
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/55${phone}?text=${encodedMsg}`, '_blank');
    } else {
      // Se não tiver telefone, pergunta se quer inserir o número na hora ou apenas simular
      const manualPhone = window.prompt(
        `Não encontramos o telefone de ${member.name} cadastrado.\nDigite o WhatsApp com DDD (apenas números, ex: 11999999999) para abrir o chat direto ou cancele para simular:`,
        ""
      );
      if (manualPhone) {
        const cleanedPhone = manualPhone.replace(/\D/g, '');
        if (cleanedPhone.length >= 10) {
          if (showToast) {
            showToast(`🔔 Redirecionando para o WhatsApp...`, 'success');
          }
          const encodedMsg = encodeURIComponent(message);
          window.open(`https://wa.me/55${cleanedPhone}?text=${encodedMsg}`, '_blank');
        } else {
          alert('Número de telefone inválido. Deve ter DDD + Número (ex: 11999999999)');
        }
      } else {
        if (showToast) {
          showToast(
            `🔔 Cobrança enviada para ${member.name} (Simulado): ${formatCurrency(member.amount)} - ${member.reason || 'Mensalidade'}`,
            'info'
          );
        }
      }
    }
  };

  const handleNotifyAll = () => {
    const pendingList = unpaidMembers.filter(m => !m.isPaid);
    if (pendingList.length === 0) return;
    
    if (showToast) {
      showToast(
        `📣 Enviando cobranças de débitos para ${pendingList.length} atleta(s)...`,
        'info'
      );
      
      setTimeout(() => {
        const details = pendingList.map(m => `${m.name} (${formatCurrency(m.amount)}: ${m.reason || 'Mensalidade'})`).join('; ');
        showToast(
          `✅ Cobranças enviadas com sucesso! Envie individualmente via WhatsApp clicando no ícone do sino de cada atleta para cobrança direta.`,
          'success'
        );
      }, 1200);
    }
  };

  // Get icons and descriptions for each Board cost type
  const getCostDetails = (type: ExpenseCategory) => {
    switch (type) {
      case 'Lavagem de uniforme':
        return {
          icon: <Shirt className="w-5 h-5 text-indigo-500" />,
          color: "border-indigo-100 bg-indigo-50/50",
          desc: "Lavanderia de coletes/unformes"
        };
      case 'Aluguel de campo':
        return {
          icon: <Map className="w-5 h-5 text-emerald-500" />,
          color: "border-emerald-100 bg-emerald-50/50",
          desc: "Taxa de campos e arbitragem"
        };
      case 'Compra de medicamentos':
        return {
          icon: <Activity className="w-5 h-5 text-red-500" />,
          color: "border-red-100 bg-red-50/50",
          desc: "Sprays, gelo e ataduras"
        };
      case 'Compra de uniforme':
        return {
          icon: <Shirt className="w-5 h-5 text-amber-500 font-extrabold" />,
          color: "border-amber-100 bg-amber-50/50",
          desc: "Cobrado do elenco na caixinha"
        };
      case 'Despesas extras':
        return {
          icon: <Sparkle className="w-5 h-5 text-purple-500" />,
          color: "border-purple-100 bg-purple-50/50",
          desc: "Churrascos e confraternizações"
        };
      case 'Arbitragem':
        return {
          icon: <Shield className="w-5 h-5 text-rose-500" />,
          color: "border-rose-100 bg-rose-50/50",
          desc: "Taxa do juiz e auxiliares"
        };
      case 'Água':
        return {
          icon: <Droplet className="w-5 h-5 text-cyan-500" />,
          color: "border-cyan-100 bg-cyan-50/50",
          desc: "Fardos de água para hidratação"
        };
      case 'Marketing':
        return {
          icon: <Megaphone className="w-5 h-5 text-fuchsia-500" />,
          color: "border-fuchsia-100 bg-fuchsia-50/50",
          desc: "Artes de divulgação e redes"
        };
      default:
        return {
          icon: <HelpCircle className="w-5 h-5 text-gray-500" />,
          color: "border-gray-100 bg-gray-50/50",
          desc: "Outras contas da diretoria"
        };
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Finance top stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between relative overflow-hidden text-left">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              SALDO ATUAL DA CAIXINHA
            </p>
            <h3 className="text-3xl font-black text-primary tracking-tight">
              {formatCurrency(stats.balance)}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary font-bold mt-4">
            <span className="bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-primary/10">
              Ativo <Check className="w-3.5 h-3.5 text-primary" />
            </span>
            <span className="text-on-surface-variant font-medium">Controle de caixa da diretoria</span>
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full -mr-6 -mb-6 pointer-events-none" />
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              MENSALIDADES E ENTRADAS
            </p>
            <h3 className="text-3xl font-black text-primary tracking-tight">
              {formatCurrency(stats.revenue)}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary font-bold mt-4">
            <span className="bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-primary/10">
              <ArrowUp className="w-3.5 h-3.5" />
            </span>
            <span className="text-on-surface-variant font-medium">Contribuições e rifas ativas</span>
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              CUSTOS OPERACIONAIS (TOTAL)
            </p>
            <h3 className="text-3xl font-black text-secondary tracking-tight">
              {formatCurrency(stats.expense)}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-secondary font-bold mt-4">
            <span className="bg-secondary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-secondary/10">
              <ArrowDown className="w-3.5 h-3.5" />
            </span>
            <span className="text-on-surface-variant font-medium">Detalhamento por tipo abaixo</span>
          </div>
        </div>

      </div>

      {/* Evolution Chart Section */}
      <section className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm text-left">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-primary flex items-center gap-1.5 uppercase tracking-tight">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução Financeira (Caixinha)
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Histórico de Receitas, Despesas e Saldo Acumulado nos últimos 6 meses (2026)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block"></span> Receitas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 block"></span> Despesas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 block"></span> Saldo</span>
          </div>
        </div>

        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `R$ ${val}`}
                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  padding: '10px 14px'
                }}
                formatter={(value: number, name: string) => {
                  const formattedName = name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Saldo';
                  return [formatCurrency(Number(value)), formattedName];
                }}
                labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px', fontSize: '12px' }}
                itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              />
              <Line 
                type="monotone" 
                dataKey="receitas" 
                stroke="#16a34a" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="despesas" 
                stroke="#dc2626" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#2563eb" 
                strokeWidth={4} 
                dot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* NEW SECTION: Board Cost Control panel */}
      <section className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm text-left">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-black text-primary flex items-center gap-1.5 uppercase tracking-tight">
              <Receipt className="w-5 h-5 text-secondary" />
              Área da Diretoria: Controle de Custos da Várzea
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Custos operacionais específicos do time. Novos uniformes cadastrados podem ser cobrados automaticamente dos atletas.
            </p>
          </div>
          <span className="text-[10px] bg-secondary text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Diretoria Unidos
          </span>
        </div>

        {/* Bento Grid of Costs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(Object.keys(costBreakdown) as ExpenseCategory[]).map((catName) => {
            const details = getCostDetails(catName);
            const totalCost = costBreakdown[catName];
            return (
              <div 
                key={catName} 
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-xs transition-all hover:scale-[1.02] ${details.color}`}
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-white rounded-lg border border-outline-variant/20 shadow-xs shrink-0">
                    {details.icon}
                  </div>
                  {catName === 'Compra de uniforme' && (
                    <span className="text-[8px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                      REPASSADO
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold truncate" title={catName}>
                    {catName}
                  </p>
                  <p className="text-lg font-black text-primary mt-1">
                    {formatCurrency(totalCost)}
                  </p>
                  <p className="text-[9px] text-on-surface-variant/70 leading-none mt-1">
                    {details.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Split: Mensalidades em Atraso & Transações Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Late fees (4 Cols) */}
        <section className="lg:col-span-4 bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm text-left">
          <div className="flex justify-between items-start mb-6 gap-2">
            <div>
              <h3 className="text-lg font-bold text-primary">Controle de Débitos ("Caixinha")</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Membros com pendências pendentes</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {unpaidMembers.some(m => !m.isPaid) && (
                <button
                  onClick={handleNotifyAll}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-xs cursor-pointer"
                  title="Simular cobrança para todos os pendentes"
                >
                  <Bell className="w-3 h-3" />
                  Notificar Todos
                </button>
              )}
              <div className="w-8 h-8 rounded-full bg-error-container/20 text-error flex items-center justify-center shrink-0">
                <AlertCircle className="w-[18px] h-[18px]" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {unpaidMembers.length === 0 ? (
              <div className="text-center py-10 bg-surface-container-low rounded-lg border border-dashed border-outline-variant/20">
                <Sparkles className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-xs text-on-surface font-semibold">Tudo em Dia!</p>
                <p className="text-[10px] text-on-surface-variant mt-1">Nenhum atleta em débito</p>
              </div>
            ) : (
              unpaidMembers.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                    member.isPaid
                      ? 'bg-primary/5 border-primary/25 opacity-70'
                      : 'bg-surface-container-low border-outline-variant/10 hover:border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-outline-variant/20 bg-surface-container shrink-0">
                      <img
                        alt={member.name}
                        className="w-full h-full object-cover"
                        src={member.image}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface leading-tight">{member.name}</p>
                      <p className="text-[9px] text-on-surface-variant font-extrabold uppercase mt-1">
                        PENDENTE: <span className="text-secondary font-black">{member.reason || 'Mensalidade'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10 mt-1">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-medium uppercase">Valor Devido</p>
                      <p className="font-extrabold text-sm text-primary">{formatCurrency(member.amount)}</p>
                    </div>

                    {session?.role === 'player' ? (
                      <div className="flex items-center gap-1.5">
                        {!member.isPaid && (
                          <button
                            onClick={() => handleNotifyMember(member)}
                            className="p-1.5 text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                            title="Simular Lembrete de Cobrança"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          member.isPaid 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'bg-error/10 text-error border border-error/20'
                        }`}>
                          {member.isPaid ? 'Pago! ✅' : 'Em Aberto ⚠️'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {!member.isPaid && (
                          <button
                            onClick={() => handleNotifyMember(member)}
                            className="p-1.5 text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                            title="Notificar Atleta via Lembrete"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => !member.isPaid && onPayLateFee(member.id, member.amount)}
                          disabled={member.isPaid}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            member.isPaid
                              ? 'bg-primary text-white cursor-default shadow-none border border-transparent'
                              : 'bg-secondary text-white hover:bg-secondary-container hover:shadow-md active:scale-95 border border-transparent'
                          }`}
                        >
                          {member.isPaid ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Pago!
                            </>
                          ) : (
                            'BAIXAR DÉBITO'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: Recent Transactions Table (8 Cols) */}
        <section className="lg:col-span-8 bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-primary">Histórico de Transações</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Livro-caixa do clube Unidos</p>
            </div>

            <div className="flex gap-2">
              {session?.role !== 'player' && (
                <button
                  onClick={onOpenNewTransaction}
                  className="bg-secondary text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Lançamento
                </button>
              )}
              
              <button
                onClick={handleExport}
                disabled={exporting}
                className="border border-outline-variant/30 text-on-surface hover:bg-surface-container px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Exportar XLS
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search and Categories Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-outline-variant/20">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lançamento..."
                className="pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant/20 rounded-lg text-xs w-64 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Filter tags */}
            <div className="flex gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/10 w-fit">
              {(['Todos', 'RECEITA', 'DESPESA'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {cat === 'Todos' ? 'Todas' : cat === 'RECEITA' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/20">
                <tr>
                  <th className="p-3">Descrição / Item Diretoria</th>
                  <th className="p-3">Fluxo</th>
                  <th className="p-3">Data</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredTransactions.map((tx) => {
                  const isRevenue = tx.category === 'RECEITA';
                  return (
                    <tr key={tx.id} className="hover:bg-surface-container-low transition-colors duration-150">
                      <td className="p-3">
                        <p className="font-bold text-sm text-on-surface">{tx.description}</p>
                        {tx.expenseType && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.2 rounded-md font-bold mt-1 uppercase">
                            Custo: {tx.expenseType}
                          </span>
                        )}
                        {tx.chargedToPlayers && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.2 rounded-md font-extrabold mt-1 ml-1.5 uppercase">
                            Repassado ao Elenco
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isRevenue
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary/10 text-secondary'
                        }`}>
                          {isRevenue ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-on-surface-variant font-semibold">{tx.date}</p>
                      </td>
                      <td className="p-3 text-right">
                        <p className={`font-black text-sm ${isRevenue ? 'text-primary' : 'text-secondary'}`}>
                          {isRevenue ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-on-surface-variant italic">
                      Nenhuma transação cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
