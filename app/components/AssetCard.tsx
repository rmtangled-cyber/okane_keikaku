"use client";

import { Asset } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "現金・預金": "bg-blue-100 text-blue-800",
  "株式": "bg-green-100 text-green-800",
  "投資信託": "bg-purple-100 text-purple-800",
  "債券": "bg-yellow-100 text-yellow-800",
  "不動産": "bg-orange-100 text-orange-800",
  "その他": "bg-gray-100 text-gray-800",
};

interface Props {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

export default function AssetCard({ asset, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${CATEGORY_COLORS[asset.category] ?? "bg-gray-100 text-gray-800"}`}>
          {asset.category}
        </span>
        <span className="font-medium text-gray-900">{asset.name}</span>
        {asset.note && <span className="text-xs text-gray-400">{asset.note}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-gray-800">
          ¥{asset.amount.toLocaleString()}
        </span>
        <button onClick={() => onEdit(asset)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          <Pencil size={16} />
        </button>
        <button onClick={() => onDelete(asset.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
