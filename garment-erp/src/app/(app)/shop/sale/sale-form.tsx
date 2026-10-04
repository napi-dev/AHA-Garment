"use client";

import { useState } from "react";
import { recordShopSale } from "../actions";
import { ShoppingBag, CheckCircle2, AlertTriangle } from "lucide-react";

interface SkuOption {
  typeId: string;
  color: string;
  size: string;
  balance: number;
}

export function ShopSaleForm({ availableSkus }: { availableSkus: SkuOption[] }) {
  const [selectedSku, setSelectedSku] = useState<string>(
    availableSkus[0] ? `${availableSkus[0].typeId}__${availableSkus[0].color}__${availableSkus[0].size}` : ""
  );
  const [qty, setQty] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [buyerName, setBuyerName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSku = availableSkus.find(
    (s) => `${s.typeId}__${s.color}__${s.size}` === selectedSku
  );

  const maxAvailable = currentSku?.balance ?? 0;
  const numPrice = parseFloat(price) || 0;
  const total = qty * numPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSku) return;
    if (qty > maxAvailable) {
      setError(`የተጠየቀው ብዛት (${qty}) ካለው ክምችት (${maxAvailable}) ይበልጣል!`);
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("typeId", currentSku.typeId);
    fd.append("color", currentSku.color);
    fd.append("size", currentSku.size);
    fd.append("qty", String(qty));
    fd.append("unitPrice", price);
    fd.append("buyerName", buyerName);
    fd.append("date", date);

    try {
      await recordShopSale(fd);
      setPrice("");
      setBuyerName("");
      setQty(1);
    } catch (err: any) {
      setError(err.message || "ስህተት ተከስቷል");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-ethiopic">
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="font-semibold text-slate-700 block mb-1">ቀን *</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="input-field font-mono"
        />
      </div>

      <div>
        <label className="font-semibold text-slate-700 block mb-1">
          የሚሸጥ እቃ ምረጥ (በሱቅ ያለ ክምችት) *
        </label>
        {availableSkus.length === 0 ? (
          <div className="p-3 bg-amber-50 text-amber-800 rounded-lg">
            በሱቅ ውስጥ የሚሸጥ ምንም ክምችት የለም። መጀመሪያ እቃ ይቀበሉ።
          </div>
        ) : (
          <select
            value={selectedSku}
            onChange={(e) => {
              setSelectedSku(e.target.value);
              setQty(1);
            }}
            required
            className="input-field"
          >
            {availableSkus.map((s) => (
              <option
                key={`${s.typeId}__${s.color}__${s.size}`}
                value={`${s.typeId}__${s.color}__${s.size}`}
              >
                {s.typeId} — {s.color} ({s.size}) [ቀሪ፦ {s.balance} ፍሬ]
              </option>
            ))}
          </select>
        )}
      </div>

      {currentSku && (
        <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">በሱቅ ያለው ቀሪ ክምችት፦</span>
          <span className="font-mono font-bold text-blue-800 text-sm">
            {maxAvailable} ፍሬ
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">የሚወጣ ብዛት *</label>
          <input
            type="number"
            min="1"
            max={maxAvailable}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            required
            className="input-field font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            የአንድ ፍሬ ዋጋ (ብር) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
            className="input-field font-mono font-bold text-emerald-800"
          />
        </div>
      </div>

      {/* Auto Total */}
      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
        <span className="font-semibold text-emerald-900">ጠቅላላ ሽያጭ ዋጋ፦</span>
        <span className="font-mono font-bold text-lg text-emerald-700">
          {total.toFixed(2)} ብር
        </span>
      </div>

      <div>
        <label className="font-semibold text-slate-700 block mb-1">የገዢ ስም (አማራጭ)</label>
        <input
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="የገዢው ስም ወይም ደረሰኝ ቁጥር"
          className="input-field"
        />
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          disabled={loading || availableSkus.length === 0}
          className="btn-primary py-2.5 px-6 text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
        >
          <CheckCircle2 size={16} />
          <span>{loading ? "በመመዝገብ ላይ..." : "ሽያጩን አረጋግጥ"}</span>
        </button>
      </div>
    </form>
  );
}
