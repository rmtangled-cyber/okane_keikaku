"use client";

import { Asset, Goal, MonthlySnapshot, StockHolding, FundHolding } from "./types";

const ASSETS_KEY = "okane_assets";
const GOALS_KEY = "okane_goals";
const SNAPSHOTS_KEY = "okane_snapshots";
const STOCKS_KEY = "okane_stocks";
const FUNDS_KEY = "okane_funds";

// ── Assets ──────────────────────────────────────────────
export function getAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ASSETS_KEY);
  return raw ? JSON.parse(raw) : getDefaultAssets();
}
export function saveAssets(assets: Asset[]): void {
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

// ── Goals ───────────────────────────────────────────────
export function getGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(GOALS_KEY);
  return raw ? JSON.parse(raw) : getDefaultGoals();
}
export function saveGoals(goals: Goal[]): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

// ── Snapshots ───────────────────────────────────────────
export function getSnapshots(): MonthlySnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SNAPSHOTS_KEY);
  return raw ? JSON.parse(raw) : getDefaultSnapshots();
}
export function saveSnapshots(snapshots: MonthlySnapshot[]): void {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

// ── Stocks ──────────────────────────────────────────────
export function getStocks(): StockHolding[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STOCKS_KEY);
  return raw ? JSON.parse(raw) : getDefaultStocks();
}
export function saveStocks(stocks: StockHolding[]): void {
  localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
}

// ── Funds ───────────────────────────────────────────────
export function getFunds(): FundHolding[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(FUNDS_KEY);
  return raw ? JSON.parse(raw) : getDefaultFunds();
}
export function saveFunds(funds: FundHolding[]): void {
  localStorage.setItem(FUNDS_KEY, JSON.stringify(funds));
}

// ── Export ──────────────────────────────────────────────
export function exportToCSV(assets: Asset[]): void {
  const header = ["カテゴリ", "資産名", "金額（円）", "メモ", "更新日時"];
  const rows = assets.map(a => [
    a.category, a.name, String(a.amount), a.note ?? "",
    new Date(a.updatedAt).toLocaleDateString("ja-JP"),
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `okane_assets_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Defaults ────────────────────────────────────────────
function getDefaultAssets(): Asset[] {
  return [
    { id: "1", name: "普通預金（メインバンク）", category: "現金・預金", amount: 1500000, updatedAt: new Date().toISOString() },
    { id: "2", name: "定期預金", category: "現金・預金", amount: 3000000, updatedAt: new Date().toISOString() },
    { id: "3", name: "個人向け国債", category: "債券", amount: 500000, updatedAt: new Date().toISOString() },
  ];
}

function getDefaultGoals(): Goal[] {
  return [
    { id: "1", title: "緊急予備費", targetAmount: 1000000, currentAmount: 800000, targetDate: "2026-12-31" },
    { id: "2", title: "住宅購入頭金", targetAmount: 5000000, currentAmount: 2000000, targetDate: "2030-03-31" },
    { id: "3", title: "老後資金（FIRE）", targetAmount: 30000000, currentAmount: 10500000, targetDate: "2045-03-31" },
  ];
}

function getDefaultSnapshots(): MonthlySnapshot[] {
  const months = ["2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08"];
  const base = 9000000;
  return months.map((month, i) => ({
    month,
    total: base + i * 150000,
    breakdown: {
      "現金・預金": 4500000 + i * 20000,
      "株式": 2500000 + i * 80000,
      "投資信託": 1500000 + i * 40000,
      "債券": 500000,
    },
  }));
}

function getDefaultStocks(): StockHolding[] {
  return [
    {
      id: "s1", ticker: "7203", name: "トヨタ自動車", accountType: "特定口座",
      purchasePrice: 2500, shares: 100, currentPrice: 3200,
      purchaseDate: "2023-04-01", updatedAt: new Date().toISOString(),
    },
    {
      id: "s2", ticker: "VTI", name: "Vanguard Total Stock Market ETF", accountType: "NISA（成長投資枠）",
      purchasePrice: 22000, shares: 10, currentPrice: 28000,
      purchaseDate: "2022-10-15", updatedAt: new Date().toISOString(),
    },
  ];
}

function getDefaultFunds(): FundHolding[] {
  return [
    {
      id: "f1", name: "eMAXIS Slim 全世界株式（オール・カントリー）",
      accountType: "NISA（つみたて投資枠）",
      purchaseAmount: 1200000, currentValue: 1450000,
      expectedAnnualReturn: 7, monthlyContribution: 50000,
      startDate: "2022-01-01", updatedAt: new Date().toISOString(),
    },
    {
      id: "f2", name: "SBI・全米株式インデックス・ファンド",
      accountType: "iDeCo",
      purchaseAmount: 800000, currentValue: 980000,
      expectedAnnualReturn: 7, monthlyContribution: 23000,
      startDate: "2021-06-01", updatedAt: new Date().toISOString(),
    },
  ];
}
