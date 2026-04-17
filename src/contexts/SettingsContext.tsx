import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BrandingSettings, SalesTarget } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { addAuditLog } from '../services/auditService';

interface SettingsContextType {
  branding: BrandingSettings;
  updateBranding: (branding: Partial<BrandingSettings>) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  salesTarget: SalesTarget;
  updateSalesTarget: (target: number) => Promise<void>;
  setSalesTarget: React.Dispatch<React.SetStateAction<SalesTarget>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>({
    companyName: 'Strike',
    logoUrl: '/strikelogo.png'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [salesTarget, setSalesTarget] = useState<SalesTarget>({
    targetAmount: 50000,
    currentAmount: 0,
    privateSessionsSold: 0,
    groupSessionsSold: 0,
  });

  useEffect(() => {
    const unsubBranding = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        setBranding(snapshot.data() as BrandingSettings);
      }
    }, (error) => console.error('Firestore Error (branding):', error));

    return () => unsubBranding();
  }, []);

  const updateBranding = async (updates: Partial<BrandingSettings>) => {
    await setDoc(doc(db, 'settings', 'branding'), updates, { merge: true });
    await addAuditLog('UPDATE', 'TARGET', 'branding', `Updated branding settings`);
  };

  const updateSalesTarget = async (target: number) => {
    setSalesTarget(prev => ({ ...prev, targetAmount: target }));
    await addAuditLog('UPDATE', 'TARGET', 'sales-target', `Updated sales target to ${target}`);
  };

  const value = useMemo(() => ({
    branding,
    updateBranding,
    searchQuery,
    setSearchQuery,
    salesTarget,
    setSalesTarget,
    updateSalesTarget
  }), [branding, searchQuery, salesTarget]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
