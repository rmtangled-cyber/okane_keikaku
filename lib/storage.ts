"use client";

import { Asset, Goal, MonthlySnapshot } from "./types";

const ASSETS_KEY = "okane_assets";
const GOALS_KEY = "okane_goals";
const SNAPSHOTS_KEY = "okane_snapshots";

export function getAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ASSETS_KEY);
  return raw ? JSON.parse(raw) : getDefaultAssets();
}

export function saveAssets(assets: Asset[]): void {
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

export function getGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(GOALS_KEY);
  return raw ? JSON.parse(raw) : getDefaultGoals();
}

export function saveGoals(goals: Goal[]): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function getSnapshots(): MonthlySnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SNAPSHOTS_KEY);
  return raw ? JSON.parse(raw) : getDefaultSnapshots();
}

export function saveSnapshots(snapshots: MonthlySnapshot[]): void {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

function getDefaultAssets(): Asset[] {
  return [
    { id: "1", name: "普通預金（メインバンク）", category: "現金・預金", amount: 1500000, updatedAt: new Date().toISOString() },
    { id: "2", name: "定期預金", category: "現金・預金", amount: 3000000, updatedAt: new Date().toISOString() },
    { id: "3", name: "日本株ポートフォリオ", category: "株式", amount: 2000000, updatedAt: new Date().toISOString() },
    { id: "4", name: "米国ETF (VTI)", category: "株式", amount: 1500000, updatedAt: new Date().toISOString() },
    { id: "5", name: "eMAXIS Slim 全世界株式", category: "投資信託", amount: 1200000, updatedAt: new Date().toISOString() },
    { id: "6", name: "iDeCo", category: "投資信託", amount: 800000, updatedAt: new Date().toISOString() },
    { id: "7", name: "個人向け国債", category: "債券", amount: 500000, updatedAt: new Date().toISOString() },
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
  const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
  const base = 9000000;
  return months.map((month, i) => ({
    month,
    total: base + i * 150000 + Math.floor(Math.random() * 100000 - 50000),
    breakdown: {
      "現金・預金": 4500000 + i * 20000,
      "株式": 2500000 + i * 80000,
      "投資信託": 1500000 + i * 40000,
      "債券": 500000,
    },
  }));
}
