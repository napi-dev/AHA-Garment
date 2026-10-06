/**
 * Role-specific dashboard components
 * Each role sees only data relevant to their responsibilities
 */

import Link from "next/link";
import { 
  Package, Scissors, CheckCircle2, AlertTriangle, 
  TrendingUp, Clock, ShoppingCart, Banknote 
} from "lucide-react";

// ── Store Keeper Dashboard ────────────────────────────────────────────────────

interface StoreKeeperDashboardProps {
  lowStockCount: number;
  todayMovements: number;
  totalMaterials: number;
}

export function StoreKeeperDashboard({ 
  lowStockCount, 
  todayMovements, 
  totalMaterials 
}: StoreKeeperDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-ethiopic text-slate-900">
        የመጋዘን ዳሽቦርድ
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={<Package size={18} />}
          label="ጠቅላላ ቁሳቁሶች"
          value={totalMaterials}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="የዛሬ እንቅስቃሴዎች"
          value={todayMovements}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="ዝቅተኛ ክምችት"
          value={lowStockCount}
          color="red"
          alert={lowStockCount > 0}
        />
      </div>

      <QuickActions actions={[
        { label: "ቁሳቁስ ተቀብል", href: "/materials/receive", icon: <Package size={16} /> },
        { label: "ቁሳቁስ አውጣ", href: "/materials/issue", icon: <TrendingUp size={16} /> },
        { label: "የአቅርቦት ሰጪዎች", href: "/suppliers", icon: <CheckCircle2 size={16} /> },
      ]} />
    </div>
  );
}

// ── Cutting Manager Dashboard ─────────────────────────────────────────────────

interface CuttingManagerDashboardProps {
  todayCutPieces: number;
  wastageAlerts: number;
  cuttingJobs: number;
  cuttingWorkers: number;
}

export function CuttingManagerDashboard({ 
  todayCutPieces, 
  wastageAlerts, 
  cuttingJobs,
  cuttingWorkers 
}: CuttingManagerDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-ethiopic text-slate-900">
        የቆረጣ ክፍል ዳሽቦርድ
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          icon={<Scissors size={18} />}
          label="የዛሬ የተቆረጡ ፍሬዎች"
          value={todayCutPieces}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="የብክነት ማስጠንቀቂያዎች"
          value={wastageAlerts}
          color="red"
          alert={wastageAlerts > 0}
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="የቆረጣ ስራዎች"
          value={cuttingJobs}
          color="green"
        />
        <StatCard
          icon={<Package size={18} />}
          label="የቆረጣ ሠራተኞች"
          value={cuttingWorkers}
          color="purple"
        />
      </div>

      <QuickActions actions={[
        { label: "አዲስ የቆረጣ ስራ", href: "/cutting/new", icon: <Scissors size={16} /> },
        { label: "የቆረጣ ታሪክ", href: "/cutting", icon: <Clock size={16} /> },
        { label: "ማስጠንቀቂያዎች", href: "/alerts", icon: <AlertTriangle size={16} /> },
      ]} />
    </div>
  );
}

// ── QC Inspector Dashboard ────────────────────────────────────────────────────

interface QCInspectorDashboardProps {
  todayInspected: number;
  todayDefects: number;
  passRate: number;
  pendingRework: number;
}

export function QCInspectorDashboard({ 
  todayInspected, 
  todayDefects, 
  passRate,
  pendingRework 
}: QCInspectorDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-ethiopic text-slate-900">
        የጥራት ተቆጣጣሪ ዳሽቦርድ
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="የዛሬ የተመረመሩ"
          value={todayInspected}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="የተገኙ ጉድለቶች"
          value={todayDefects}
          color="red"
          alert={todayDefects > 0}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="የማለፍ መጠን"
          value={`${passRate}%`}
          color="green"
        />
        <StatCard
          icon={<Package size={18} />}
          label="በመጠገን ላይ"
          value={pendingRework}
          color="orange"
        />
      </div>

      <QuickActions actions={[
        { label: "አዲስ ምርመራ", href: "/quality/inspect", icon: <CheckCircle2 size={16} /> },
        { label: "ጉድለቶች ታሪክ", href: "/quality/defects", icon: <AlertTriangle size={16} /> },
        { label: "የመልሶ ስራ", href: "/quality/rework", icon: <Clock size={16} /> },
      ]} />
    </div>
  );
}

// ── Line Supervisor Dashboard ─────────────────────────────────────────────────

interface LineSupervisorDashboardProps {
  lineNumber: number;
  todayProduction: number;
  targetAchieved: number;
  workersPresent: number;
  totalWorkers: number;
}

export function LineSupervisorDashboard({ 
  lineNumber,
  todayProduction, 
  targetAchieved,
  workersPresent,
  totalWorkers 
}: LineSupervisorDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-ethiopic text-slate-900">
        የመስመር {lineNumber} ሱፐርቫይዘር ዳሽቦርድ
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          icon={<Package size={18} />}
          label="የዛሬ ምርት"
          value={todayProduction}
          unit="ፍሬ"
          color="blue"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="ዒላማ ያሳኩ"
          value={targetAchieved}
          unit="ሠራተኞች"
          color="green"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="የተገኙ ሠራተኞች"
          value={`${workersPresent}/${totalWorkers}`}
          color="purple"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="የሰዓት አማካይ"
          value={totalWorkers > 0 ? Math.round(todayProduction / (totalWorkers * 8)) : 0}
          unit="ፍሬ"
          color="orange"
        />
      </div>

      <QuickActions actions={[
        { label: "የቁጥር መሙላት", href: "/counts/enter", icon: <Package size={16} /> },
        { label: "መገኘት መሙላት", href: "/attendance", icon: <CheckCircle2 size={16} /> },
        { label: "ቀን መዝጋት", href: "/counts/close", icon: <Clock size={16} /> },
      ]} />
    </div>
  );
}

// ── Order Placer Dashboard ────────────────────────────────────────────────────

interface OrderPlacerDashboardProps {
  activeOrders: number;
  orders72h: number;
  orders48h: number;
  orders24h: number;
  shopSales: string;
  shopInventory: number;
}

export function OrderPlacerDashboard({ 
  activeOrders,
  orders72h,
  orders48h,
  orders24h,
  shopSales,
  shopInventory 
}: OrderPlacerDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-ethiopic text-slate-900">
        የትዕዛዝ ተቀባይ ዳሽቦርድ
      </h2>
      
      {/* Order Countdown Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          icon={<Clock size={18} />}
          label="ንቁ ትዕዛዞች"
          value={activeOrders}
          color="blue"
        />
        <StatCard
          icon={<span className="text-lg">🟢</span>}
          label="በ3 ቀናት ውስጥ"
          value={orders72h}
          color="green"
        />
        <StatCard
          icon={<span className="text-lg">🟡</span>}
          label="በ2 ቀናት ውስጥ"
          value={orders48h}
          color="yellow"
          alert={orders48h > 0}
        />
        <StatCard
          icon={<span className="text-lg">🔴</span>}
          label="በ1 ቀን ውስጥ!"
          value={orders24h}
          color="red"
          alert={orders24h > 0}
        />
      </div>

      {/* Shop Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard
          icon={<Banknote size={18} />}
          label="የሱቅ ሽያጭ (ዛሬ)"
          value={shopSales}
          unit="ብር"
          color="green"
        />
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="የሱቅ ክምችት"
          value={shopInventory}
          unit="ፍሬዎች"
          color="purple"
        />
      </div>

      <QuickActions actions={[
        { label: "አዲስ ትዕዛዝ", href: "/production/orders/new", icon: <Package size={16} /> },
        { label: "የሱቅ ሽያጭ", href: "/shop/sales", icon: <Banknote size={16} /> },
        { label: "የሱቅ እቃ መቀበል", href: "/shop/receive", icon: <ShoppingCart size={16} /> },
      ]} />
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color: "blue" | "green" | "red" | "purple" | "orange" | "yellow";
  alert?: boolean;
}

function StatCard({ icon, label, value, unit, color, alert }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };

  return (
    <div className={`erp-card p-5 ${alert ? 'ring-2 ring-rose-300 bg-rose-50/30' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 font-ethiopic">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 tabular-nums">
        {value}
        {unit && <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">{unit}</span>}
      </p>
    </div>
  );
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="erp-card p-5">
      <h3 className="text-sm font-bold font-ethiopic text-slate-900 mb-4">
        ፈጣን የስራ ተግባራት
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-ethiopic text-sm font-medium transition-all group"
          >
            <span className="text-slate-400 group-hover:text-blue-600">{action.icon}</span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
