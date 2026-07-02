import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, Target, CreditCard, PieChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { goToAppAuth } from "@/lib/app-url";

// Animated fake cursor component
const FakeCursor = ({ positions, screenIndex }: { positions: { x: number; y: number; click?: boolean }[]; screenIndex: number }) => {
  const [posIdx, setPosIdx] = useState(0);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    setPosIdx(0);
    setClicking(false);
  }, [screenIndex]);

  useEffect(() => {
    if (!positions.length) return;
    const interval = setInterval(() => {
      setPosIdx((prev) => {
        const next = (prev + 1) % positions.length;
        if (positions[next]?.click) {
          setClicking(true);
          setTimeout(() => setClicking(false), 200);
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [positions, screenIndex]);

  const pos = positions[posIdx] || positions[0];
  if (!pos) return null;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ zIndex: 50, top: 0, left: 0 }}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.8 }}
    >
      {/* Cursor SVG */}
      <motion.svg
        width="24" height="28" viewBox="0 0 20 24" fill="none"
        animate={{ scale: clicking ? 0.8 : 1 }}
        transition={{ duration: 0.1 }}
        style={{ filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.3))" }}
      >
        <path d="M1 1L1 18.5L5.5 14L10 22L13 20.5L8.5 12.5L14.5 12.5L1 1Z"
          fill="white" stroke="#222" strokeWidth="1.2" />
      </motion.svg>
      {/* Click ripple */}
      <AnimatePresence>
        {clicking && (
          <motion.div
            className="absolute top-0 left-0 w-6 h-6 rounded-full border-2 border-primary"
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Mini bar chart component
const MiniBarChart = ({ data, delay = 0 }: { data: number[]; delay?: number }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[3px] h-12">
      {data.map((val, i) => (
        <motion.div
          key={i}
          className="w-[6px] rounded-t bg-gradient-to-t from-primary to-primary-glow"
          initial={{ height: 0 }}
          animate={{ height: `${(val / max) * 100}%` }}
          transition={{ duration: 0.5, delay: delay + i * 0.06, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

// Mini line chart
const MiniLineChart = ({ color = "var(--primary)", delay = 0 }: { color?: string; delay?: number }) => {
  const points = "0,35 15,28 30,32 45,18 60,22 75,10 90,15 105,8 120,12";
  return (
    <svg viewBox="0 0 120 40" className="w-full h-10">
      <motion.polyline
        points={points}
        fill="none"
        stroke={`hsl(${color})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay, ease: "easeOut" }}
      />
    </svg>
  );
};

const cursorPaths: Record<string, { x: number; y: number; click?: boolean }[]> = {
  dashboard: [
    { x: 80, y: 90 },
    { x: 160, y: 140, click: true },
    { x: 100, y: 210 },
    { x: 220, y: 260, click: true },
    { x: 140, y: 320 },
  ],
  goals: [
    { x: 220, y: 100 },
    { x: 140, y: 160, click: true },
    { x: 200, y: 220 },
    { x: 120, y: 290, click: true },
    { x: 240, y: 340 },
  ],
  banks: [
    { x: 120, y: 120 },
    { x: 240, y: 170, click: true },
    { x: 170, y: 230 },
    { x: 220, y: 300, click: true },
    { x: 140, y: 370 },
  ],
  reports: [
    { x: 170, y: 110 },
    { x: 100, y: 200, click: true },
    { x: 220, y: 260 },
    { x: 150, y: 330, click: true },
    { x: 200, y: 380 },
  ],
};

const screens = [
  {
    id: "dashboard",
    label: "Dashboard",
    content: (
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Olá, Juliana</span>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Fev 2026</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-success/10 rounded-lg p-2.5 border border-success/20">
            <p className="text-[9px] text-muted-foreground">Receitas</p>
            <p className="text-sm font-bold text-success">R$ 8.350</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="h-2.5 w-2.5 text-success" />
              <span className="text-[9px] text-success">+12%</span>
            </div>
          </div>
          <div className="bg-danger/10 rounded-lg p-2.5 border border-danger/20">
            <p className="text-[9px] text-muted-foreground">Despesas</p>
            <p className="text-sm font-bold text-danger">R$ 4.760</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              <TrendingDown className="h-2.5 w-2.5 text-danger" />
              <span className="text-[9px] text-danger">-5%</span>
            </div>
          </div>
          <div className="bg-primary/10 rounded-lg p-2.5 border border-primary/20">
            <p className="text-[9px] text-muted-foreground">Saldo</p>
            <p className="text-sm font-bold text-primary">R$ 3.590</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="h-2.5 w-2.5 text-primary" />
              <span className="text-[9px] text-primary">+18%</span>
            </div>
          </div>
        </div>
        {/* Cash flow chart */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-2">Fluxo de Caixa — Últimos 6 meses</p>
          <div className="flex items-end justify-between gap-1 h-14">
            {[
              { income: 65, expense: 45 },
              { income: 70, expense: 55 },
              { income: 55, expense: 40 },
              { income: 80, expense: 50 },
              { income: 75, expense: 60 },
              { income: 90, expense: 48 },
            ].map((m, i) => (
              <div key={i} className="flex items-end gap-[2px] flex-1">
                <motion.div
                  className="flex-1 rounded-t bg-success/70"
                  initial={{ height: 0 }}
                  animate={{ height: `${m.income}%` }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                />
                <motion.div
                  className="flex-1 rounded-t bg-danger/60"
                  initial={{ height: 0 }}
                  animate={{ height: `${m.expense}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-1.5">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-success/70" /><span className="text-[8px] text-muted-foreground">Receitas</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-danger/60" /><span className="text-[8px] text-muted-foreground">Despesas</span></div>
          </div>
        </div>
        {/* Balance evolution */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Evolução do Saldo</p>
          <MiniLineChart color="var(--primary)" delay={0.5} />
        </div>
      </div>
    ),
  },
  {
    id: "goals",
    label: "Metas",
    content: (
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Minhas Metas</span>
          <Target className="h-4 w-4 text-primary" />
        </div>
        {[
          { name: "Viagem Europa", current: 8500, target: 15000, color: "from-primary to-primary-glow", emoji: "✈️", monthly: 650 },
          { name: "Reserva Emergência", current: 12000, target: 18000, color: "from-info to-primary", emoji: "🛡️", monthly: 500 },
          { name: "Carro Novo", current: 25000, target: 60000, color: "from-warning to-danger", emoji: "🚗", monthly: 1200 },
        ].map((goal, i) => (
          <motion.div
            key={goal.name}
            className="bg-muted/30 rounded-lg p-3 border border-border"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <span>{goal.emoji}</span> {goal.name}
              </span>
              <span className="text-[10px] font-semibold text-primary">
                {Math.round((goal.current / goal.target) * 100)}%
              </span>
            </div>
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className={`bg-gradient-to-r ${goal.color} h-full rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${(goal.current / goal.target) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.4 + i * 0.15 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">R$ {goal.current.toLocaleString("pt-BR")}</span>
              <span className="text-[9px] text-muted-foreground">Aporte: R$ {goal.monthly}/mês</span>
            </div>
          </motion.div>
        ))}
        <motion.div className="bg-primary/5 rounded-lg p-3 border border-primary/10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Total Investido em Metas</span>
            <span className="text-sm font-bold text-primary">R$ 45.500</span>
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: "banks",
    label: "Bancos",
    content: (
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Meus Bancos</span>
          <CreditCard className="h-4 w-4 text-primary" />
        </div>
        {[
          { name: "Nubank", balance: 3245.80, trend: [30, 45, 35, 50, 42, 55, 60, 48, 65], color: "#820AD1", logo: "/images/banks/nubank.png" },
          { name: "PicPay", balance: 1580.00, trend: [20, 25, 22, 30, 35, 28, 40, 38, 42], color: "#21C25E", logo: "/images/banks/picpay.png" },
          { name: "Inter", balance: 890.50, trend: [15, 18, 12, 20, 16, 22, 19, 25, 23], color: "#FF7A00", logo: "/images/banks/inter.png" },
        ].map((bank, i) => (
          <motion.div
            key={bank.name}
            className="p-3 rounded-lg border border-border bg-muted/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src={bank.logo} alt={bank.name} className="w-7 h-7 rounded-full object-contain bg-white p-0.5" />
                <span className="text-xs font-medium">{bank.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                R$ {bank.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <MiniBarChart data={bank.trend} delay={0.3 + i * 0.1} />
          </motion.div>
        ))}
        <motion.div className="bg-primary/10 rounded-lg p-3 border border-primary/20"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Total Consolidado</span>
            <span className="text-base font-bold text-primary">R$ 5.716,30</span>
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: "reports",
    label: "Relatórios",
    content: (
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Despesas por Categoria</span>
          <PieChart className="h-4 w-4 text-primary" />
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex justify-center">
            <svg viewBox="0 0 120 120" className="w-24 h-24">
              {[
                { color: "--success", dash: "110 204", offset: "-10", delay: 0.2 },
                { color: "--warning", dash: "70 244", offset: "-120", delay: 0.4 },
                { color: "--danger", dash: "50 264", offset: "-190", delay: 0.6 },
                { color: "--info", dash: "40 274", offset: "-240", delay: 0.8 },
              ].map((s, i) => (
                <motion.circle key={i} cx="60" cy="60" r="50" fill="none"
                  stroke={`hsl(var(${s.color}))`} strokeWidth="18"
                  strokeDasharray={s.dash} strokeDashoffset={s.offset}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: s.delay, duration: 0.5 }} />
              ))}
              <text x="60" y="56" textAnchor="middle" className="fill-foreground text-[11px] font-bold">R$ 4.760</text>
              <text x="60" y="70" textAnchor="middle" className="fill-muted-foreground text-[7px]">Total gasto</text>
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { name: "Alimentação", pct: 35, value: "1.666", color: "bg-success" },
              { name: "Moradia", pct: 22, value: "1.047", color: "bg-warning" },
              { name: "Transporte", pct: 16, value: "762", color: "bg-danger" },
              { name: "Lazer", pct: 13, value: "619", color: "bg-info" },
            ].map((cat, i) => (
              <motion.div key={cat.name} className="flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}>
                <div className={`w-2 h-2 rounded-full ${cat.color} shrink-0`} />
                <span className="text-[10px] flex-1 truncate">{cat.name}</span>
                <span className="text-[9px] text-muted-foreground">R${cat.value}</span>
                <span className="text-[9px] font-semibold w-7 text-right">{cat.pct}%</span>
              </motion.div>
            ))}
          </div>
        </div>
        {/* Monthly comparison */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-2">Comparativo Mensal</p>
          <div className="grid grid-cols-6 gap-1 items-end h-12">
            {[
              { m: "Set", v: 60 }, { m: "Out", v: 72 }, { m: "Nov", v: 55 },
              { m: "Dez", v: 85 }, { m: "Jan", v: 68 }, { m: "Fev", v: 48 },
            ].map((d, i) => (
              <div key={d.m} className="flex flex-col items-center gap-0.5">
                <motion.div
                  className="w-full rounded-t bg-gradient-to-t from-primary/80 to-primary-glow/60"
                  initial={{ height: 0 }}
                  animate={{ height: `${d.v}%` }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
                />
                <span className="text-[7px] text-muted-foreground">{d.m}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Trend line */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Tendência de Gastos</p>
          <MiniLineChart color="var(--danger)" delay={0.8} />
        </div>
      </div>
    ),
  },
];

const HeroSection = () => {
  const [activeScreen, setActiveScreen] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % screens.length);
    }, 6000); // Slightly slower for better readability
    return () => clearInterval(interval);
  }, []);

  const currentCursorPath = useMemo(() => cursorPaths[screens[activeScreen].id] || [], [activeScreen]);

  return (
    <section className="relative container mx-auto px-4 py-14 sm:py-20 lg:py-28 overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
          className="space-y-8 sm:space-y-10"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              LocalFiny 2.0
            </motion.div>
            
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Seu dinheiro organizado em um painel <span className="relative inline-block text-primary">
                inteligente
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <motion.path 
                    d="M1 6C50 2 150 2 199 6" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                  />
                </svg>
              </span>
            </motion.h1>
          </div>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Controle bancos, cartões, metas, dívidas, relatórios e lembretes em uma experiência simples, visual e pronta para a sua rotina financeira.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button
              size="lg"
              onClick={goToAppAuth}
              className="relative overflow-hidden group bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-10 rounded-xl shadow-2xl shadow-primary/20 w-full sm:w-auto transition-all duration-300 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Começar grátis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="text-lg h-14 px-10 rounded-xl border-2 hover:bg-muted w-full sm:w-auto transition-all duration-300"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              Ver planos
            </Button>
          </motion.div>

          <motion.div
            className="grid max-w-xl grid-cols-1 gap-3 pt-2 sm:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[
              ["PIX", "PushinPay e Mercado Pago"],
              ["IA", "análises e insights"],
              ["PWA", "instale como app"],
            ].map(([value, label]) => (
              <div key={value} className="rounded-2xl border border-border bg-card/75 p-4 shadow-sm">
                <p className="text-xl font-black text-foreground">{value}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="relative lg:mt-0 mt-12"
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />

          {/* Fake cursor overlay */}
          <FakeCursor positions={currentCursorPath} screenIndex={activeScreen} />
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative bg-card/80 backdrop-blur-xl rounded-[1.75rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/10 overflow-hidden">
              {/* Dashboard Frame Header */}
              <div className="bg-muted/40 border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-danger/20 border border-danger/40" />
                    <div className="w-3 h-3 rounded-full bg-warning/20 border border-warning/40" />
                    <div className="w-3 h-3 rounded-full bg-success/20 border border-success/40" />
                  </div>
                  <div className="ml-4 px-3 py-1 bg-background/50 rounded-lg border border-border text-[10px] font-medium text-muted-foreground">
                    app.localfiny.com/dashboard
                  </div>
                </div>
                <div className="h-2 w-24 bg-muted rounded-full" />
              </div>

              {/* Screen content area */}
              <div className="relative min-h-[440px] sm:min-h-[460px] overflow-hidden bg-background/40">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={screens[activeScreen].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full"
                  >
                    {screens[activeScreen].content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Tabs */}
              <div className="border-t border-border p-4 bg-muted/20">
                <div className="flex items-center justify-center gap-1">
                  {screens.map((screen, i) => (
                    <button
                      key={screen.id}
                      onClick={() => setActiveScreen(i)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                        i === activeScreen
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {screen.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
export default HeroSection;
