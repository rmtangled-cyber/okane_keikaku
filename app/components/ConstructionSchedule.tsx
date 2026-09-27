"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import {
  ConstructionTask, ConstructionCategory, CONSTRUCTION_CATEGORIES,
} from "@/lib/types";
import {
  loadConstructionTasks, saveConstructionTask, deleteConstructionTask,
} from "@/lib/storage";

function uid() { return Math.random().toString(36).slice(2); }

const CATEGORY_COLORS: Record<ConstructionCategory, string> = {
  "建物":       "#8b5cf6",
  "不動産":     "#0ea5e9",
  "調査":       "#f59e0b",
  "申請":       "#22c55e",
  "検査":       "#ef4444",
  "銀行・入金": "#14b8a6",
  "仮設工事":   "#f97316",
  "基礎・大工": "#b45309",
  "外部工事":   "#10b981",
  "内部下地":   "#6366f1",
  "内部仕上":   "#ec4899",
  "設備工事":   "#64748b",
  "その他":     "#9ca3af",
};

const DAY_PX = 4;
const ROW_H  = 28;
const HEADER_H = 36;
const CAT_W  = 96;

function parseDate(s: string): Date { return new Date(s + "T00:00:00"); }
function diffDays(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function calcRange(tasks: ConstructionTask[], today: Date): { start: Date; end: Date } {
  if (tasks.length === 0) {
    const start = new Date(today);
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 14);
    return { start, end };
  }
  const minMs = Math.min(...tasks.map(t => parseDate(t.startDate).getTime()));
  const maxMs = Math.max(...tasks.map(t => parseDate(t.endDate).getTime()));
  const start = new Date(minMs);
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  const end = new Date(maxMs);
  end.setDate(1);
  end.setMonth(end.getMonth() + 2);
  return { start, end };
}

function genMonths(start: Date, end: Date): { label: string; short: string; dayOffset: number }[] {
  const months: { label: string; short: string; dayOffset: number }[] = [];
  const cur = new Date(start);
  cur.setDate(1);
  while (cur <= end) {
    const off = diffDays(start, cur);
    if (off >= 0) {
      months.push({
        label: `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, "0")}`,
        short: `${cur.getMonth() + 1}月`,
        dayOffset: off,
      });
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

// ── TaskModal ─────────────────────────────────────────────────────────────────

function TaskModal({
  task, onSave, onClose,
}: {
  task?: ConstructionTask | null;
  onSave: (data: Omit<ConstructionTask, "id" | "updatedAt">) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ConstructionCategory>(task?.category ?? "建物");
  const [name, setName] = useState(task?.name ?? "");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [endDate, setEndDate] = useState(task?.endDate ?? "");
  const [note, setNote] = useState(task?.note ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    onSave({ category, name, startDate, endDate, note: note || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? "工程を編集" : "工程を追加"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ConstructionCategory)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {CONSTRUCTION_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タスク名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 基礎工事着工"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="担当者・備考など"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-violet-600 rounded-xl text-sm font-medium text-white hover:bg-violet-700 transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Gantt chart ───────────────────────────────────────────────────────────────

function ConstructionGantt({
  tasks,
  onEdit,
  onDelete,
}: {
  tasks: ConstructionTask[];
  onEdit: (t: ConstructionTask) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date();
  const { start: chartStart, end: chartEnd } = calcRange(tasks, today);
  const totalDays = diffDays(chartStart, chartEnd);
  const totalWidth = totalDays * DAY_PX;
  const months = genMonths(chartStart, chartEnd);
  const todayOff = diffDays(chartStart, today);

  // Group by category order
  const grouped: [ConstructionCategory, ConstructionTask[]][] = [];
  for (const cat of CONSTRUCTION_CATEGORIES) {
    const catTasks = tasks
      .filter(t => t.category === cat)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (catTasks.length > 0) grouped.push([cat, catTasks]);
  }

  const [popup, setPopup] = useState<ConstructionTask | null>(null);

  return (
    <>
      <div className="rounded-xl border border-gray-200 overflow-hidden text-xs select-none">
        <div className="flex">
          {/* Left sticky label column */}
          <div style={{ width: CAT_W, minWidth: CAT_W }} className="bg-gray-50 border-r border-gray-200 z-10">
            <div style={{ height: HEADER_H }} className="border-b border-gray-200 flex items-end px-2 pb-1">
              <span className="text-gray-400">工程</span>
            </div>
            {grouped.map(([cat, catTasks]) => (
              <div
                key={cat}
                style={{ height: catTasks.length * ROW_H + 4 }}
                className="flex items-center px-2 border-b border-gray-100"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                  <span className="text-gray-700 font-medium truncate">{cat}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable chart */}
          <div className="overflow-x-auto flex-1">
            <div style={{ width: totalWidth, position: "relative" }}>
              {/* Month header row */}
              <div style={{ height: HEADER_H }} className="relative border-b border-gray-200 bg-gray-50">
                {months.map(({ label, short, dayOffset }) => (
                  <div
                    key={label}
                    style={{
                      position: "absolute",
                      left: dayOffset * DAY_PX,
                      top: 0,
                      height: "100%",
                      borderLeft: "1px solid #e5e7eb",
                      paddingLeft: 4,
                      display: "flex",
                      alignItems: "flex-end",
                      paddingBottom: 4,
                    }}
                  >
                    <span className="text-gray-500 whitespace-nowrap">{label.startsWith(String(new Date().getFullYear())) ? short : label}</span>
                  </div>
                ))}
              </div>

              {/* Today line */}
              {todayOff >= 0 && todayOff <= totalDays && (
                <div
                  style={{
                    position: "absolute",
                    left: todayOff * DAY_PX,
                    top: 0,
                    width: 2,
                    height: "100%",
                    backgroundColor: "#ef4444",
                    zIndex: 4,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Category rows */}
              {grouped.map(([cat, catTasks]) => (
                <div
                  key={cat}
                  style={{ height: catTasks.length * ROW_H + 4, position: "relative" }}
                  className="border-b border-gray-100"
                >
                  {/* Vertical grid lines per month */}
                  {months.map(({ label, dayOffset }) => (
                    <div
                      key={label}
                      style={{
                        position: "absolute",
                        left: dayOffset * DAY_PX,
                        top: 0,
                        width: 1,
                        height: "100%",
                        backgroundColor: "#f3f4f6",
                      }}
                    />
                  ))}

                  {/* Task bars */}
                  {catTasks.map((task, i) => {
                    const tStart = parseDate(task.startDate);
                    const tEnd = parseDate(task.endDate);
                    const left = Math.max(0, diffDays(chartStart, tStart)) * DAY_PX;
                    const rawWidth = (diffDays(tStart, tEnd) + 1) * DAY_PX;
                    const width = Math.max(DAY_PX * 2, rawWidth);
                    const top = i * ROW_H + 4;
                    const color = CATEGORY_COLORS[cat];
                    const labelInside = width >= 56;
                    return (
                      <div
                        key={task.id}
                        style={{
                          position: "absolute",
                          left,
                          top,
                          height: ROW_H - 8,
                          overflow: "visible",
                          zIndex: 2,
                          cursor: "pointer",
                        }}
                        onClick={() => setPopup(prev => prev?.id === task.id ? null : task)}
                      >
                        {/* colored bar */}
                        <div style={{
                          width,
                          height: "100%",
                          backgroundColor: color,
                          borderRadius: 4,
                          opacity: 0.85,
                        }} />
                        {/* label inside bar */}
                        {labelInside && (
                          <span style={{
                            position: "absolute",
                            left: 0, top: 0,
                            width,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 6,
                            paddingRight: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            color: "white",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            pointerEvents: "none",
                          }}>
                            {task.name}
                          </span>
                        )}
                        {/* label outside bar (when bar is too narrow) */}
                        {!labelInside && (
                          <span style={{
                            position: "absolute",
                            left: width + 4,
                            top: 0,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            fontSize: 11,
                            fontWeight: 500,
                            color,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                          }}>
                            {task.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task detail popup */}
      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-4 mx-4 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[popup.category] }} />
                  <span className="text-xs text-gray-500">{popup.category}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{popup.name}</p>
              </div>
              <button onClick={() => setPopup(null)} className="p-1 hover:bg-gray-100 rounded ml-2 shrink-0">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1">{popup.startDate} → {popup.endDate}</p>
            {popup.note && <p className="text-xs text-gray-600 mb-3">{popup.note}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { onEdit(popup); setPopup(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Pencil size={12} /> 編集
              </button>
              <button
                onClick={() => { onDelete(popup.id); setPopup(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} /> 削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function ConstructionSchedule() {
  const [tasks, setTasks] = useState<ConstructionTask[]>([]);
  const [modal, setModal] = useState<{ task?: ConstructionTask | null; open: boolean }>({ open: false });

  useEffect(() => {
    loadConstructionTasks().then(setTasks);
  }, []);

  async function handleSave(data: Omit<ConstructionTask, "id" | "updatedAt">) {
    const existing = modal.task;
    const task: ConstructionTask = {
      ...data,
      id: existing?.id ?? uid(),
      updatedAt: new Date().toISOString(),
    };
    const next = existing
      ? tasks.map(t => t.id === task.id ? task : t)
      : [...tasks, task].sort((a, b) => a.startDate.localeCompare(b.startDate));
    setTasks(next);
    await saveConstructionTask(task);
    setModal({ open: false });
  }

  async function handleDelete(id: string) {
    if (!confirm("この工程を削除しますか？")) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await deleteConstructionTask(id);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">工程表</h2>
        <button
          onClick={() => setModal({ task: null, open: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus size={14} /> 工程を追加
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">工程をまだ登録していません</p>
          <p className="text-xs text-gray-300 mt-1">「工程を追加」からタスクを登録するとガントチャートが表示されます</p>
        </div>
      ) : (
        <ConstructionGantt
          tasks={tasks}
          onEdit={task => setModal({ task, open: true })}
          onDelete={handleDelete}
        />
      )}

      {modal.open && (
        <TaskModal
          task={modal.task}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
