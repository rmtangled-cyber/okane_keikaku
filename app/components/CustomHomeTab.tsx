"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, X, Edit2, Save,
  ImagePlus, Lightbulb, Plug, PaintBucket, Layers, Wind, Monitor, Pin,
  Home, Building2, ArrowLeft,
} from "lucide-react";
import {
  loadCustomHomeData, saveCustomHomeData,
  loadFloorPlans, saveFloorPlan, deleteFloorPlan,
} from "@/lib/storage";
import {
  CustomHomeData, CustomHomeRoom, FloorPlan, FloorPlanAnnotation,
  RoomSpec, ANNOTATION_TYPES, ROOM_SPEC_CATEGORIES,
} from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const ANNOTATION_META: Record<string, { icon: React.ReactNode; color: string }> = {
  "照明":           { icon: <Lightbulb size={11} />, color: "#f59e0b" },
  "コンセント・スイッチ": { icon: <Plug size={11} />,       color: "#3b82f6" },
  "クロス":         { icon: <PaintBucket size={11} />, color: "#8b5cf6" },
  "床材":           { icon: <Layers size={11} />,     color: "#92400e" },
  "エアコン":       { icon: <Wind size={11} />,       color: "#06b6d4" },
  "TV・LAN":        { icon: <Monitor size={11} />,    color: "#6b7280" },
  "その他":         { icon: <Pin size={11} />,        color: "#374151" },
};

function annotationMeta(type: string) {
  return ANNOTATION_META[type] ?? { icon: <Pin size={11} />, color: "#374151" };
}

const EMPTY_BASIC = {
  builder: "", builderContact: "", manager: "",
  structure: "", totalAreaSqm: 0, startDate: "", completionDate: "", note: "",
};

const STRUCTURES = ["木造（在来軸組）", "木造（2×4）", "RC造", "鉄骨造", "木造ハイブリッド", "その他"];

// ── FloorPlanViewer ───────────────────────────────────────────────────────────

interface AnnotationModalState {
  mode: "add" | "edit";
  annotation: FloorPlanAnnotation;
  clickX?: number;
  clickY?: number;
}

function FloorPlanViewer({
  plan, rooms, onChange, onBack,
}: {
  plan: FloorPlan;
  rooms: CustomHomeRoom[];
  onChange: (plan: FloorPlan) => void;
  onBack: () => void;
}) {
  const [filterType, setFilterType] = useState<string>("すべて");
  const [modal, setModal] = useState<AnnotationModalState | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const visibleAnnotations = filterType === "すべて"
    ? plan.annotations
    : plan.annotations.filter(a => a.type === filterType);

  function handleImgClick(e: React.MouseEvent<HTMLDivElement>) {
    if (modal) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setModal({
      mode: "add",
      annotation: { id: uid(), x, y, type: "照明", label: "", note: "", roomId: "" },
      clickX: x, clickY: y,
    });
  }

  function saveAnnotation(a: FloorPlanAnnotation) {
    const existing = plan.annotations.find(x => x.id === a.id);
    const annotations = existing
      ? plan.annotations.map(x => x.id === a.id ? a : x)
      : [...plan.annotations, a];
    onChange({ ...plan, annotations });
    setModal(null);
  }

  function deleteAnnotation(id: string) {
    onChange({ ...plan, annotations: plan.annotations.filter(a => a.id !== id) });
    setModal(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> 一覧に戻る
        </button>
        <h3 className="text-sm font-semibold text-gray-800 flex-1">{plan.title}</h3>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="すべて">すべて表示</option>
          {ANNOTATION_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-2">図面をクリックしてマーカーを追加</p>

      <div
        ref={imgRef}
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 cursor-crosshair select-none"
        onClick={handleImgClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plan.imageBase64} alt={plan.title} className="w-full h-auto block" draggable={false} />

        {visibleAnnotations.map(a => {
          const meta = annotationMeta(a.type);
          return (
            <button
              key={a.id}
              onClick={ev => { ev.stopPropagation(); setModal({ mode: "edit", annotation: a }); }}
              style={{ left: `${a.x}%`, top: `${a.y}%`, background: meta.color }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md hover:scale-125 transition-transform z-10"
              title={`${a.type}${a.label ? `: ${a.label}` : ""}`}
            >
              {meta.icon}
            </button>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-2 mt-3">
        {ANNOTATION_TYPES.map(t => {
          const count = plan.annotations.filter(a => a.type === t).length;
          if (count === 0) return null;
          const meta = annotationMeta(t);
          return (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? "すべて" : t)}
              style={{ borderColor: meta.color, color: filterType === t ? "white" : meta.color, background: filterType === t ? meta.color : "transparent" }}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors"
            >
              {meta.icon} {t} ({count})
            </button>
          );
        })}
      </div>

      {/* アノテーション追加/編集モーダル */}
      {modal && (
        <AnnotationModal
          annotation={modal.annotation}
          rooms={rooms}
          onSave={saveAnnotation}
          onDelete={modal.mode === "edit" ? () => deleteAnnotation(modal.annotation.id) : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── AnnotationModal ───────────────────────────────────────────────────────────

function AnnotationModal({ annotation, rooms, onSave, onDelete, onClose }: {
  annotation: FloorPlanAnnotation;
  rooms: CustomHomeRoom[];
  onSave: (a: FloorPlanAnnotation) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FloorPlanAnnotation>(annotation);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">マーカー</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">種別</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ANNOTATION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">ラベル（品番・商品名など）</label>
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="例: HH-CF1234A / Panasonic"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">部屋</label>
            <select
              value={form.roomId}
              onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">未設定</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={3}
              placeholder="詳細メモ..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {onDelete && (
            <button onClick={onDelete} className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={13} /> 削除
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">キャンセル</button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save size={13} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FloorPlanCard ─────────────────────────────────────────────────────────────

function FloorPlanCard({ plan, onOpen, onDelete, onMoveUp, onMoveDown }: {
  plan: FloorPlan;
  onOpen: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button onClick={onOpen} className="w-full text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plan.imageBase64} alt={plan.title} className="w-full max-h-48 object-contain bg-gray-50" />
      </button>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-sm font-medium text-gray-800 flex-1">{plan.title}</span>
        <span className="text-xs text-gray-400">{plan.annotations.length}件</span>
        <button onClick={onMoveUp} className="p-1 text-gray-400 hover:text-gray-700"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-700"><ChevronDown size={14} /></button>
        <button onClick={onOpen} className="p-1 text-blue-500 hover:text-blue-700"><Edit2 size={14} /></button>
        <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

// ── RoomSpecSection ───────────────────────────────────────────────────────────

function RoomSpecSection({ rooms, specs, floorPlans, onChangeRooms, onChangeSpecs }: {
  rooms: CustomHomeRoom[];
  specs: RoomSpec[];
  floorPlans: FloorPlan[];
  onChangeRooms: (r: CustomHomeRoom[]) => void;
  onChangeSpecs: (s: RoomSpec[]) => void;
}) {
  const [newRoomName, setNewRoomName] = useState("");
  const [editingSpec, setEditingSpec] = useState<RoomSpec | null>(null);
  const [addingToRoomId, setAddingToRoomId] = useState<string | null>(null);

  function addRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    onChangeRooms([...rooms, { id: uid(), name, order: rooms.length }]);
    setNewRoomName("");
  }

  function deleteRoom(id: string) {
    if (!confirm("この部屋と関連する仕様をすべて削除しますか？")) return;
    onChangeRooms(rooms.filter(r => r.id !== id));
    onChangeSpecs(specs.filter(s => s.roomId !== id));
  }

  function saveSpec(spec: RoomSpec) {
    const existing = specs.find(s => s.id === spec.id);
    const next = existing ? specs.map(s => s.id === spec.id ? spec : s) : [...specs, spec];
    onChangeSpecs(next);
    setEditingSpec(null);
    setAddingToRoomId(null);
  }

  function deleteSpec(id: string) {
    onChangeSpecs(specs.filter(s => s.id !== id));
  }

  const grandTotal = specs.reduce((sum, s) => sum + (s.additionalCost || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">部屋別仕様一覧</h3>
        {grandTotal > 0 && (
          <span className="text-sm font-semibold text-rose-600">
            合計追加金額: ¥{grandTotal.toLocaleString()}
          </span>
        )}
      </div>

      {/* 部屋追加 */}
      <div className="flex gap-2 mb-4">
        <input
          value={newRoomName}
          onChange={e => setNewRoomName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addRoom()}
          placeholder="部屋名を入力（例: LDK）"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addRoom}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} /> 部屋を追加
        </button>
      </div>

      {rooms.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">部屋を追加すると仕様を登録できます</p>
      )}

      <div className="space-y-4">
        {rooms.map(room => {
          const roomSpecs = specs.filter(s => s.roomId === room.id);
          const roomAnnotations = floorPlans.flatMap(fp => fp.annotations.filter(a => a.roomId === room.id));
          const roomTotal = roomSpecs.reduce((sum, s) => sum + (s.additionalCost || 0), 0);

          return (
            <div key={room.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50">
                <Home size={13} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-800 flex-1">{room.name}</span>
                {roomAnnotations.length > 0 && (
                  <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                    図面マーカー {roomAnnotations.length}件
                  </span>
                )}
                {roomTotal > 0 && (
                  <span className="text-xs text-rose-500 font-medium">¥{roomTotal.toLocaleString()}</span>
                )}
                <button
                  onClick={() => setAddingToRoomId(room.id)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50"
                >
                  <Plus size={12} /> 仕様追加
                </button>
                <button onClick={() => deleteRoom(room.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>

              {roomSpecs.length === 0 && addingToRoomId !== room.id && (
                <p className="text-xs text-gray-400 px-4 py-3">仕様がまだ登録されていません</p>
              )}

              {roomSpecs.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {roomSpecs.map(spec => (
                    <div key={spec.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-0.5 shrink-0">{spec.category}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium">{spec.item || "—"}</p>
                        {spec.maker && <p className="text-xs text-gray-500">{spec.maker}</p>}
                        {spec.note && <p className="text-xs text-gray-400 mt-0.5">{spec.note}</p>}
                      </div>
                      {spec.additionalCost > 0 && (
                        <span className="text-sm text-rose-500 font-medium shrink-0">+¥{spec.additionalCost.toLocaleString()}</span>
                      )}
                      <button onClick={() => setEditingSpec(spec)} className="p-1 text-gray-400 hover:text-blue-500">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteSpec(spec.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(editingSpec || addingToRoomId) && (
        <SpecModal
          spec={editingSpec ?? {
            id: uid(), roomId: addingToRoomId!, category: "クロス",
            item: "", maker: "", quantity: 1, unit: "式", additionalCost: 0, note: "",
          }}
          rooms={rooms}
          onSave={saveSpec}
          onDelete={editingSpec ? () => { deleteSpec(editingSpec.id); setEditingSpec(null); } : undefined}
          onClose={() => { setEditingSpec(null); setAddingToRoomId(null); }}
        />
      )}
    </div>
  );
}

// ── SpecModal ─────────────────────────────────────────────────────────────────

function SpecModal({ spec, rooms, onSave, onDelete, onClose }: {
  spec: RoomSpec;
  rooms: CustomHomeRoom[];
  onSave: (s: RoomSpec) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RoomSpec>(spec);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">仕様を{spec.item ? "編集" : "追加"}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">部屋</label>
            <select
              value={form.roomId}
              onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROOM_SPEC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">品番・商品名</label>
            <input
              value={form.item}
              onChange={e => setForm(f => ({ ...f, item: e.target.value }))}
              placeholder="例: SB-1234"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">メーカー</label>
            <input
              value={form.maker}
              onChange={e => setForm(f => ({ ...f, maker: e.target.value }))}
              placeholder="例: シンコール"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">数量</label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">単位</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="式 / m² / 本"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">追加金額（円）</label>
            <input
              type="number"
              value={form.additionalCost}
              onChange={e => setForm(f => ({ ...f, additionalCost: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {onDelete && (
            <button onClick={onDelete} className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 size={13} /> 削除
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">キャンセル</button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save size={13} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomHomeTab() {
  const [data, setData] = useState<CustomHomeData>({
    basicInfo: EMPTY_BASIC,
    rooms: [],
    roomSpecs: [],
  });
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [viewingPlan, setViewingPlan] = useState<FloorPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [basicEditing, setBasicEditing] = useState(false);
  const [basicDraft, setBasicDraft] = useState(EMPTY_BASIC);
  const [addingPlan, setAddingPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCustomHomeData().then(d => {
      if (d) setData(d);
    });
    loadFloorPlans().then(setFloorPlans);
  }, []);

  const autoSaveData = useCallback((next: CustomHomeData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveCustomHomeData(next), 800);
  }, []);

  function updateData(next: CustomHomeData) {
    setData(next);
    autoSaveData(next);
  }

  async function handleFloorPlanChange(plan: FloorPlan) {
    const next = floorPlans.map(p => p.id === plan.id ? plan : p);
    setFloorPlans(next);
    setViewingPlan(plan);
    await saveFloorPlan(plan);
  }

  async function handleAddPlan(imageBase64: string) {
    const title = newPlanTitle.trim() || "間取り図";
    const plan: FloorPlan = {
      id: uid(), title, imageBase64, order: floorPlans.length, annotations: [],
    };
    const next = [...floorPlans, plan];
    setFloorPlans(next);
    await saveFloorPlan(plan);
    setAddingPlan(false);
    setNewPlanTitle("");
    pendingImageRef.current = null;
  }

  async function handleDeletePlan(id: string) {
    if (!confirm("この図面を削除しますか？")) return;
    const next = floorPlans.filter(p => p.id !== id);
    setFloorPlans(next);
    await deleteFloorPlan(id);
    if (viewingPlan?.id === id) setViewingPlan(null);
  }

  async function movePlan(id: string, dir: -1 | 1) {
    const idx = floorPlans.findIndex(p => p.id === id);
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= floorPlans.length) return;
    const next = [...floorPlans];
    [next[idx], next[nIdx]] = [next[nIdx], next[idx]];
    const reordered = next.map((p, i) => ({ ...p, order: i }));
    setFloorPlans(reordered);
    await Promise.all(reordered.map(saveFloorPlan));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await compressImage(file);
    e.target.value = "";
    if (addingPlan) {
      pendingImageRef.current = b64;
      await handleAddPlan(b64);
    }
  }

  const tsubo = data.basicInfo.totalAreaSqm ? (data.basicInfo.totalAreaSqm / 3.3058).toFixed(1) : null;

  return (
    <div className="space-y-6 pb-8">
      {/* ── 基本情報 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">基本情報</h2>
          <div className="flex-1" />
          {!basicEditing ? (
            <button
              onClick={() => { setBasicDraft({ ...data.basicInfo }); setBasicEditing(true); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50"
            >
              <Edit2 size={12} /> 編集
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setBasicEditing(false)} className="text-xs text-gray-500 px-2 py-1 hover:bg-gray-50 rounded-lg">キャンセル</button>
              <button
                onClick={() => {
                  const next = { ...data, basicInfo: basicDraft };
                  updateData(next);
                  setBasicEditing(false);
                }}
                className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg"
              >
                <Save size={11} /> 保存
              </button>
            </div>
          )}
        </div>

        {!basicEditing ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ["建築会社", data.basicInfo.builder],
              ["担当者", data.basicInfo.manager],
              ["連絡先", data.basicInfo.builderContact],
              ["構造", data.basicInfo.structure],
              ["延床面積", data.basicInfo.totalAreaSqm ? `${data.basicInfo.totalAreaSqm} m²（${tsubo} 坪）` : "—"],
              ["着工予定日", data.basicInfo.startDate || "—"],
              ["竣工予定日", data.basicInfo.completionDate || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-gray-400">{label}</span>
                <p className="text-gray-800 mt-0.5">{value || "—"}</p>
              </div>
            ))}
            {data.basicInfo.note && (
              <div className="col-span-2">
                <span className="text-xs text-gray-400">メモ</span>
                <p className="text-gray-800 mt-0.5 whitespace-pre-wrap">{data.basicInfo.note}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">建築会社</label>
                <input value={basicDraft.builder} onChange={e => setBasicDraft(d => ({ ...d, builder: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">担当者</label>
                <input value={basicDraft.manager} onChange={e => setBasicDraft(d => ({ ...d, manager: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">連絡先</label>
                <input value={basicDraft.builderContact} onChange={e => setBasicDraft(d => ({ ...d, builderContact: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">構造</label>
                <select value={basicDraft.structure} onChange={e => setBasicDraft(d => ({ ...d, structure: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">選択...</option>
                  {STRUCTURES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">延床面積（m²）</label>
                <input type="number" value={basicDraft.totalAreaSqm || ""} onChange={e => setBasicDraft(d => ({ ...d, totalAreaSqm: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">着工予定日</label>
                <input type="date" value={basicDraft.startDate} onChange={e => setBasicDraft(d => ({ ...d, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">竣工予定日</label>
                <input type="date" value={basicDraft.completionDate} onChange={e => setBasicDraft(d => ({ ...d, completionDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">メモ</label>
              <textarea value={basicDraft.note} onChange={e => setBasicDraft(d => ({ ...d, note: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* ── 間取り図面 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ImagePlus size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">間取り図面</h2>
          <div className="flex-1" />
          {!viewingPlan && (
            <button
              onClick={() => { setAddingPlan(true); setTimeout(() => fileInputRef.current?.click(), 0); }}
              className="flex items-center gap-1 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <Plus size={12} /> 図面を追加
            </button>
          )}
        </div>

        {/* 追加フォーム */}
        {addingPlan && (
          <div className="flex gap-2 mb-4">
            <input
              value={newPlanTitle}
              onChange={e => setNewPlanTitle(e.target.value)}
              placeholder="タイトル（例: 1F 間取り図）"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
              <ImagePlus size={13} /> 画像選択
            </button>
            <button onClick={() => { setAddingPlan(false); setNewPlanTitle(""); }}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
              キャンセル
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {viewingPlan ? (
          <FloorPlanViewer
            plan={viewingPlan}
            rooms={data.rooms}
            onChange={handleFloorPlanChange}
            onBack={() => setViewingPlan(null)}
          />
        ) : floorPlans.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">図面をアップロードするとマーカーを追加できます</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {floorPlans.map((plan, idx) => (
              <FloorPlanCard
                key={plan.id}
                plan={plan}
                onOpen={() => setViewingPlan(plan)}
                onDelete={() => handleDeletePlan(plan.id)}
                onMoveUp={() => movePlan(plan.id, -1)}
                onMoveDown={() => movePlan(plan.id, 1)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 部屋別仕様一覧 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <RoomSpecSection
          rooms={data.rooms}
          specs={data.roomSpecs}
          floorPlans={floorPlans}
          onChangeRooms={rooms => updateData({ ...data, rooms })}
          onChangeSpecs={roomSpecs => updateData({ ...data, roomSpecs })}
        />
      </div>
    </div>
  );
}
