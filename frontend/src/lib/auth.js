import { create } from 'zustand';

const KEY = 'inventra_demo_session';
function initialSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); }
  catch { return null; }
}

export const useAuth = create((set) => ({
  session: initialSession(),
  signIn: (data) => {
    sessionStorage.setItem(KEY, JSON.stringify(data));
    set({ session: data });
  },
  signOut: () => {
    sessionStorage.removeItem(KEY);
    set({ session: null });
  },
  updateUser: (user) => {
    const session = useAuth.getState().session;
    if (session) {
      const next = { ...session, user };
      sessionStorage.setItem(KEY, JSON.stringify(next));
      set({ session: next });
    }
  },
}));
