// 認証実装前の匿名ユーザーID。
// ブラウザごとに固有のIDを生成してlocalStorageに保存する。
// 将来、Firebase Auth導入時はここをgetAuth().currentUser.uidに差し替えるだけでよい。
export function getUid(): string {
  if (typeof window === "undefined") return "ssr";
  let uid = localStorage.getItem("okane_uid");
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem("okane_uid", uid);
  }
  return uid;
}
