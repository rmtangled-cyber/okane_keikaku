let _authUid: string | null = null;

export function setAuthUid(uid: string | null) {
  _authUid = uid;
}

export function getUid(): string {
  if (_authUid) return _authUid;
  if (typeof window === "undefined") return "ssr";
  let uid = localStorage.getItem("okane_uid");
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem("okane_uid", uid);
  }
  return uid;
}
