import { create } from 'zustand';

export type TerminalLineType = 'command' | 'output' | 'error' | 'system';

export interface TerminalLine {
  id: string;
  text: string;
  type: TerminalLineType;
  timestamp: number;
}

interface TerminalState {
  isOpen: boolean;
  isExecuting: boolean;
  lines: TerminalLine[];
  openTerminal: () => void;
  closeTerminal: () => void;
  clearTerminal: () => void;
  addLine: (text: string, type?: TerminalLineType) => void;
  setExecuting: (isExecuting: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  isOpen: false,
  isExecuting: false,
  lines: [],
  openTerminal: () => set({ isOpen: true }),
  closeTerminal: () => set({ isOpen: false }),
  clearTerminal: () => set({ lines: [] }),
  setExecuting: (isExecuting: boolean) => set({ isExecuting }),
  addLine: (text: string, type: TerminalLineType = 'output') => set((state) => ({
    isOpen: true, // Auto-open when a line is added
    lines: [
      ...state.lines,
      {
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        text,
        type,
        timestamp: Date.now(),
      }
    ],
  })),
}));
