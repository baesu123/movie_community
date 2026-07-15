import { create } from "zustand";
import type { AppUser } from "../types";

interface AppState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
