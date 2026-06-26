import { create } from 'zustand';

type OverlayType = 'none' | 'power' | 'notifications' | 'server-switcher';
type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface UIState {
  isServerOnline: boolean;
  isDataLoading: boolean;
  activeOverlay: OverlayType;
  toast: ToastState;
  setServerOnline: (status: boolean) => void;
  showOverlay: (type: OverlayType) => void;
  hideOverlay: () => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  setDataLoading: (status: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isServerOnline: true,
  isDataLoading: false,
  activeOverlay: 'none',
  toast: {
    visible: false,
    message: '',
    type: 'success',
  },
  
  setDataLoading: (status) => set({ isDataLoading: status }),
  
  setServerOnline: (status) => set({ isServerOnline: status }),
  
  showOverlay: (type) => set({ activeOverlay: type }),
  
  hideOverlay: () => set({ activeOverlay: 'none' }),
  
  showToast: (message, type = 'success') => {
    // If a toast is already showing, hide it first, then show new one to re-trigger animation
    set({ toast: { visible: false, message, type } });
    setTimeout(() => {
      set({ toast: { visible: true, message, type } });
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        // Only hide if it's still the exact same toast showing
        if (get().toast.message === message) {
          set((state) => ({ toast: { ...state.toast, visible: false } }));
        }
      }, 3000);
    }, 50);
  },
  
  hideToast: () => set((state) => ({ toast: { ...state.toast, visible: false } })),
}));
