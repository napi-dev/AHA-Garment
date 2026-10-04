"use client";

import { useState, useTransition } from "react";
import { createHandover, receiveHandover, resolveInvestigation } from "./actions";
import { 
  ArrowRight, ArrowLeftRight, CheckCircle2, AlertTriangle, 
  Clock, ShieldAlert, Send, Plus, Search, Filter, Check, X
} from "lucide-react";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";

interface Department {
  id: string;
  nameAm: string;
  flowOrder: number | null;
  controllers: string[];
}

interface Order {
  id: string;
  orderNo: string;
}

interface HandoverItem {
  id: string;
  orderId: string;
  order: { orderNo: string };
  color: string | null;
  size: string | null;
  unit: string;
  sentQty: any;
  sentAt: Date;
  receivedQty: any | null;
  receivedAt: Date | null;
  fromDept: { id: string; nameAm: string } | null;
  toDept: { id: string; nameAm: string; controllers: string[] } | null;
  investigation: {
    id: string;
    status: string;
    reasonFound: string | null;
    signedBy: string | null;
    resolvedAt: Date | null;
  } | null;
}

interface FlowClientProps {
  handovers: HandoverItem[];
  departments: Department[];
  orders: Order[];
  userRole: string;
  userId: string;
  controllableDeptIds: string[];
}

export function FlowClient({
  handovers,
  departments,
  orders,
  userRole,
  controllableDeptIds,
}: FlowClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showSendModal, setShowSendModal] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receiveInputQty, setReceiveInputQty] = useState<string>("");
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [invStatus, setInvStatus] = useState("recount");
  const [invReason, setInvReason] = useState("");
  const [invSignature, setInvSignature] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pending" | "variance">("all");
  const [orderSearch, setOrderSearch] = useState("");

  const filteredHandovers = handovers.filter((h) => {
    if (orderSearch && !h.order.orderNo.toLowerCase().includes(orderSearch.toLowerCase())) {
      return false;
    }
    const isPendingRec = h.receivedQty === null;
    const sent = Number(h.sentQty);
    const rec = h.receivedQty !== null ? Number(h.receivedQty) : null;
    const hasVariance = rec !== null && rec !== sent;

    if (filterType === "pending") return isPendingRec;
    if (filterType === "variance") return hasVariance;
    return true;
  });

  const pendingReceiveCount = handovers.filter(
    (h) => h.receivedQty === null && h.toDept && controllableDeptIds.includes(h.toDept.id)
  ).length;

  const varianceCount = handovers.filter((h) => {
    if (h.receivedQty === null) return false;
    return Number(h.sentQty) !== Number(h.receivedQty);
  }).length;

  const handleReceiveSubmit = (handover: HandoverItem) => {
    const qty = parseFloat(receiveInputQty);
    if (isNaN(qty)) return;

    startTransition(async () => {
      try {
        await receiveHandover(handover.id, qty);
        setReceivingId(null);
        setReceiveInputQty("");
      } catch (err: any) {
        alert(err.message || "ስህተት ተከስቷል");
      }
    });
  };

  const handleResolveSubmit = (handoverId: string) => {
    if (!invReason.trim()) {
      alert("እባክዎ የተገኘበትን ምክንያት ይግለጹ");
      return;
    }

    startTransition(async () => {
      try {
        await resolveInvestigation(handoverId, invStatus, invReason, invSignature);
        setInvestigatingId(null);
        setInvReason("");
        setInvSignature("");
      } catch (err: any) {
        alert(err.message || "ስህተት ተከስቷል");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-ethiopic">
        <div className="erp-card p-4 border-l-4 border-l-blue-600 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">ጠቅላላ የርክክብ እንቅስቃሴዎች</p>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-1">{handovers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowLeftRight size={20} />
          </div>
        </div>

        <div className="erp-card p-4 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">እርስዎን የሚጠብቁ ርክክቦች</p>
            <p className="text-2xl font-mono font-bold text-amber-600 mt-1">{pendingReceiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="erp-card p-4 border-l-4 border-l-rose-500 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">ፍልልያ የተገኘባቸው (ውጥረት)</p>
            <p className="text-2xl font-mono font-bold text-rose-600 mt-1">{varianceCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Action Controls & Filters */}
      <div className="erp-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-ethiopic">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            ሁሉም ({handovers.length})
          </button>
          <button
            onClick={() => setFilterType("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            በጥበቃ ላይ ({handovers.filter((h) => h.receivedQty === null).length})
          </button>
          <button
            onClick={() => setFilterType("variance")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === "variance" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            ፍልልያ ያለበት ({varianceCount})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="በትዕዛዝ ቁጥር ፈልግ..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <button
            onClick={() => setShowSendModal(true)}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Plus size={15} />
            <span>አዲስ እቃ ላክ</span>
          </button>
        </div>
      </div>

      {/* Main Handover Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-ethiopic text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                <th className="py-3 px-4 text-left">ትዕዛዝ</th>
                <th className="py-3 px-4 text-left">የላከ ክፍል (① ላክሁ)</th>
                <th className="py-3 px-4 text-left">ተቀባይ ክፍል (② ተቀብያለሁ)</th>
                <th className="py-3 px-4">ቀለም/ሳይዝ</th>
                <th className="py-3 px-4">የተላከ ብዛት</th>
                <th className="py-3 px-4">የተረከበ ብዛት</th>
                <th className="py-3 px-4 text-center">ሁኔታና ፍልልያ</th>
                <th className="py-3 px-4 text-center">እርምጃ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ምንም የርክክብ እንቅስቃሴ አልተገኘም
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((h) => {
                  const sent = Number(h.sentQty);
                  const isReceived = h.receivedQty !== null;
                  const rec = isReceived ? Number(h.receivedQty) : null;
                  const diff = rec !== null ? rec - sent : null;
                  const canUserReceive =
                    !isReceived &&
                    h.toDept &&
                    (userRole === "ADMIN" ||
                      userRole === "PRODUCTION_MANAGER" ||
                      controllableDeptIds.includes(h.toDept.id));

                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-50/50 transition ${
                        diff !== null && diff !== 0 ? "bg-rose-50/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                        {h.order.orderNo}
                      </td>
                      <td className="py-3 px-4 text-left">
                        <span className="font-semibold text-slate-800">{h.fromDept?.nameAm ?? "—"}</span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatAsEthDate(h.sentAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <span className="font-semibold text-slate-800">{h.toDept?.nameAm ?? "—"}</span>
                        {h.receivedAt && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatAsEthDate(h.receivedAt)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {h.color || "—"} / {h.size || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sent} {h.unit}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {isReceived ? (
                          <strong className="text-slate-900">
                            {rec} {h.unit}
                          </strong>
                        ) : (
                          <span className="text-amber-600 font-sans italic text-[11px]">በጥበቃ ላይ...</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isReceived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            በጥበቃ ላይ
                          </span>
                        ) : diff === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            0 ✓ ትክክል
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertTriangle size={12} />
                            ⚠ ውጥረት አለ ({diff! > 0 ? `+${diff}` : diff} {h.unit})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canUserReceive && (
                          <button
                            onClick={() => {
                              setReceivingId(h.id);
                              setReceiveInputQty(String(sent));
                            }}
                            className="btn-secondary py-1 px-2.5 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            እቃ ተረከብ
                          </button>
                        )}

                        {diff !== null && diff !== 0 && (
                          <button
                            onClick={() => {
                              setInvestigatingId(h.id);
                              setInvStatus(h.investigation?.status || "recount");
                              setInvReason(h.investigation?.reasonFound || "");
                              setInvSignature(h.investigation?.signedBy || "");
                            }}
                            className="ml-2 text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline"
                          >
                            {h.investigation?.resolvedAt ? "ምርመራ እይ" : "ምርመራ ጀምር"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal */}
      {receivingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="erp-card max-w-sm w-full p-6 space-y-4 font-ethiopic animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                እቃ መረከቢያ ማረጋገጫ
              </h3>
              <button
                onClick={() => setReceivingId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              የላከው ክፍል ያስመዘገበውን እና በእጅዎ የደረሰውን ትክክለኛ ብዛት አስገብተው ያረጋግጡ።
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                የተረከቡት ትክክለኛ ብዛት
              </label>
              <input
                type="number"
                step="any"
                value={receiveInputQty}
                onChange={(e) => setReceiveInputQty(e.target.value)}
                className="input-field text-base font-mono font-bold"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReceivingId(null)}
                className="btn-secondary py-2 px-4 text-xs"
                disabled={isPending}
              >
                ይቅር
              </button>
              <button
                onClick={() => {
                  const h = handovers.find((item) => item.id === receivingId);
                  if (h) handleReceiveSubmit(h);
                }}
                className="btn-primary py-2 px-4 text-xs"
                disabled={isPending}
              >
                {isPending ? "በማረጋገጥ ላይ..." : "ተረክቤያለሁ አረጋግጥ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investigation Modal */}
      {investigatingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="erp-card max-w-md w-full p-6 space-y-4 font-ethiopic animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle size={18} />
                የፍልልያ (ውጥረት) ምርመራ መዝገብ
              </h3>
              <button
                onClick={() => setInvestigatingId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  የምርመራ ሁኔታ (Status)
                </label>
                <select
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="recount">እንደገና እየተቆጠረ ነው (Recount)</option>
                  <option value="found_in_rework">በRework መዝገብ ተገኝቷል (Found in Rework)</option>
                  <option value="reported">ወደ ማኔጀር ሪፖርት ተደርጓል (Reported)</option>
                  <option value="resolved">ተፈቷል / ተስተካክሏል (Resolved)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  የተገኘበት ምክንያት / ማብራሪያ
                </label>
                <textarea
                  rows={3}
                  value={invReason}
                  onChange={(e) => setInvReason(e.target.value)}
                  placeholder="ፍልልያው እንዴት እንደተከሰተ ወይም እቃው የት እንደተገኘ..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  የኃላፊ ፊርማ / ስም
                </label>
                <input
                  type="text"
                  value={invSignature}
                  onChange={(e) => setInvSignature(e.target.value)}
                  placeholder="የመርማሪው ወይም የኃላፊው ስም"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setInvestigatingId(null)}
                className="btn-secondary py-2 px-4 text-xs"
                disabled={isPending}
              >
                ይቅር
              </button>
              <button
                onClick={() => handleResolveSubmit(investigatingId)}
                className="btn-primary py-2 px-4 text-xs bg-rose-600 hover:bg-rose-700"
                disabled={isPending}
              >
                {isPending ? "በመመዝገብ ላይ..." : "ምርመራውን መዝግብ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="erp-card max-w-lg w-full p-6 space-y-4 font-ethiopic animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Send size={18} className="text-blue-600" />
                አዲስ የእቃ ርክክብ ላክ (① ላክሁ)
              </h3>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              action={async (formData) => {
                startTransition(async () => {
                  try {
                    await createHandover(formData);
                    setShowSendModal(false);
                  } catch (err: any) {
                    alert(err.message || "ስህተት ተከስቷል");
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  የምርት ትዕዛዝ (Order) *
                </label>
                <select name="orderId" required className="input-field font-mono">
                  <option value="">ትዕዛዝ ይምረጡ...</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    የሚልከው ክፍል *
                  </label>
                  <select name="fromDeptId" required className="input-field">
                    <option value="">ክፍል ይምረጡ...</option>
                    {departments
                      .filter((d) => userRole === "ADMIN" || userRole === "PRODUCTION_MANAGER" || controllableDeptIds.includes(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nameAm}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    የሚቀበለው ክፍል *
                  </label>
                  <select name="toDeptId" required className="input-field">
                    <option value="">ተቀባይ ክፍል ይምረጡ...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameAm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ብዛት (Quantity) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="sentQty"
                    required
                    placeholder="ለምሳሌ፦ 400"
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    መለኪያ (Unit)
                  </label>
                  <select name="unit" defaultValue="PCS" className="input-field font-mono">
                    <option value="PCS">PCS (ፍሬ)</option>
                    <option value="KG">KG (ኪ.ግ)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ቀለም
                  </label>
                  <input
                    type="text"
                    name="color"
                    placeholder="ለምሳሌ፦ ነጭ"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                  disabled={isPending}
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 text-xs"
                  disabled={isPending}
                >
                  {isPending ? "በመላክ ላይ..." : "ላክሁ መዝግብ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
