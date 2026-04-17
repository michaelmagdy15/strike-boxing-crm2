import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CRMProvider, useCRMData } from './contexts/CRMContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

// Re-export hooks for easy access
export { useAuth } from './contexts/AuthContext';
export { useCRMData } from './contexts/CRMContext';
export { useSettings } from './contexts/SettingsContext';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CRMProvider>
          {children}
        </CRMProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

// Backward compatibility hook - DO NOT USE FOR NEW COMPONENTS
// Using this hook will still cause re-renders when ANY context value changes.
export const useAppContext = () => {
  const auth = useAuth();
  const crm = useCRMData();
  const settings = useSettings();

  return {
    ...auth,
    ...crm,
    ...settings
  } as any;
};
