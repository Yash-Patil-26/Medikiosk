import { createContext, useContext, useState } from 'react';
import { clearKioskCredentials } from '../services/kioskCredentials.js';

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

function createDefaultState() {
  return {
    ...defaultState,
    consents: { ...defaultState.consents },
    slots: {}
  };
}

export function KioskProvider({ children }) {
  const [kiosk, setKiosk] = useState(() => {
    // Remove legacy persisted identity and clinical state from prior versions.
    try {
      sessionStorage.removeItem('kiosk');
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }

    return createDefaultState();
  });

  const update = patch => {
    setKiosk(prev => ({ ...prev, ...patch }));
  };

  const reset = () => {
    clearKioskCredentials();

    try {
      sessionStorage.removeItem('kiosk');
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }

    setKiosk(createDefaultState());
  };

  return (
    <KioskContext.Provider value={{ kiosk, update, reset }}>
      {children}
    </KioskContext.Provider>
  );
}

export const useKiosk = () => useContext(KioskContext);
