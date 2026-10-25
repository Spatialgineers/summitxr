import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '../types/summit';
import { SUMMIT_I18N } from '../lib/summitData';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('sgx_summit_language') as LanguageCode;
      if (saved && (saved === 'es' || saved === 'en' || saved === 'ja')) {
        return saved;
      }
    } catch {}
    return 'es';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('sgx_summit_language', lang);
    } catch {}
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = SUMMIT_I18N[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to Spanish dictionary
    if (SUMMIT_I18N.es && SUMMIT_I18N.es[key]) {
      return SUMMIT_I18N.es[key];
    }
    // Fallback to English dictionary
    if (SUMMIT_I18N.en && SUMMIT_I18N.en[key]) {
      return SUMMIT_I18N.en[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Convenient alias
export const useTranslation = useLanguage;
