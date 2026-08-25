let _authUid: string | null = null;

export function setAuthUid(uid: string | null) {
  _authUid = uid;
}

export function getUid(): string {
  return _authUid ?? "no-user";
}
