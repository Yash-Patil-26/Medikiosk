import { createContext, useContext, useState } from 'react';

const KioskContext = createContext(null);

const defaultState = {
  sessionId: null,
  patientId: null,
  language: 'en',
  ayushMode: false,
  consents: { voice: false, document: false, his: false, dashboard: false },
  complaint: null,
  slots: {},
  encounterId: null,
  audioGuided: false,
  highContrast: false,
  largeText: false
};

export function KioskProvider({ children }) {
  const [kiosk, setKiosk] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kiosk');
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch { return defaultState; }
  });

  const update = (patch) => {
    setKiosk(prev => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem('kiosk', JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    sessionStorage.removeItem('kiosk');
    setKiosk(defaultState);
  };

  return (
    <KioskContext.Provider value={{ kiosk, update, reset }}>
      {children}
    </KioskContext.Provider>
  );
}

export const useKiosk = () => useContext(KioskContext);
