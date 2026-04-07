import type { ReactNode } from 'react';
export interface CheckboxOption {
  label: string;
  value: string;
}

export interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export interface LoginBackgroundProps {
  mousePos: { x: number; y: number };
}

export interface AnimatedPageProps {
  children: ReactNode;
}

export interface CheckboxDropdownProps {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}

export interface GemLoginStatus {
  isRunning: boolean;
  activeProfileId: string | null;
  apiUrl: string;
  cdpInjected: boolean;
}

export interface GemLoginProfileTableProps {
  status: GemLoginStatus | undefined;
  isRunning: boolean;
  isLoading: boolean;
}
