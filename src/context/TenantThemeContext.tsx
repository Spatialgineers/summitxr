import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Tenant } from '../types/engine';
import { INITIAL_TENANTS } from '../lib/schemas';
import { findPillar, pillarTheme } from '../lib/sgxPillars';

/** Pillar themes always wear their official pillar color as the main color,
 *  whatever an older stored copy of the tenant says. */
export function withPillarBrand(t: Tenant): Tenant {
  const p = findPillar(t.pillarId || '');
  if (!p || !t.pillarId) return t;
  return { ...t, branding: { ...t.branding, ...pillarTheme(p.key) } };
}
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

const STORAGE_KEY = 'sgx_active_tenant_id';
const TENANTS_LIST_STORAGE_KEY = 'sgx_custom_tenants';

export function hexToRgbStr(hex: string): string {
  if (!hex || hex === 'transparent') return '0, 255, 255';
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  }
  return '0, 255, 255';
}

export function loadPersistedTenantsList(): Tenant[] {
  try {
    const raw = localStorage.getItem(TENANTS_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with initial defaults and always enforce canonical SGX branding for official pillars
        const merged = INITIAL_TENANTS.map(def => {
          const match = parsed.find(p => p.id === def.id);
          return match ? { ...match, ...def, branding: { ...def.branding } } : def;
        });
        // Add any custom created tenants
        const customOnly = parsed.filter(p => !INITIAL_TENANTS.some(def => def.id === p.id));
        return [...merged, ...customOnly];
      }
    }
  } catch (e) {
    console.warn('LocalStorage tenants read error:', e);
  }
  return INITIAL_TENANTS;
}

export function saveTenantsListLocally(tenantsList: Tenant[]) {
  try {
    localStorage.setItem(TENANTS_LIST_STORAGE_KEY, JSON.stringify(tenantsList));
  } catch (e) {
    console.warn('LocalStorage tenants save error:', e);
  }
}

export interface TenantStyleHelpers {
  cardStyle: React.CSSProperties;
  panelStyle: React.CSSProperties;
  primaryBtnStyle: React.CSSProperties;
  secondaryBtnStyle: React.CSSProperties;
  neonBadgeStyle: React.CSSProperties;
  neonTextStyle: React.CSSProperties;
  glowBorderStyle: React.CSSProperties;
  gradientTextStyle: React.CSSProperties;
  ambientBgStyle: React.CSSProperties;
}

interface TenantThemeContextType {
  tenant: Tenant;
  tenantId: string;
  pillarId: string;
  selectTenant: (tenant: Tenant) => void;
  selectTenantById: (tenantId: string) => void;
  selectPillar: (pillarId: string) => void;
  updateTenant: (tenant: Tenant) => Promise<void>;
  addTenant: (tenant: Tenant) => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<void>;
  resetTenantsToDefaults: () => void;
  colors: Tenant['branding'];
  styles: TenantStyleHelpers;
  tenants: Tenant[];
}

const TenantThemeContext = createContext<TenantThemeContextType | undefined>(undefined);

export function getInitialTenant(allTenants?: Tenant[]): Tenant {
  const currentTenants = allTenants || loadPersistedTenantsList();
  try {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTheme = searchParams.get('theme') || searchParams.get('tenant') || searchParams.get('pillar');
      if (urlTheme) {
        const clean = urlTheme.trim().toLowerCase();
        const found = currentTenants.find(
          t => t.id.toLowerCase() === clean ||
               t.slug?.toLowerCase() === clean ||
               t.id.toLowerCase() === `tenant_sgx_${clean}` ||
               t.pillarId?.toLowerCase() === clean ||
               t.pillarId?.toLowerCase() === `sgx.${clean}`
        );
        if (found) return found;
      }
    }
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = currentTenants.find(
        t => t.id === savedId || 
             t.slug === savedId || 
             t.pillarId === savedId ||
             (savedId === 'tenant_spatialgineers' && (t.id === 'tenant_sgx_story' || t.slug === 'story'))
      );
      if (found) return found;
    }
  } catch (e) {
    console.warn('LocalStorage access note:', e);
  }
  return currentTenants[0] || INITIAL_TENANTS[0];
}

/* Accessibility: theme colors used as text on the dark UI must reach 4.5:1,
   and text on a theme-colored fill must pick black or white, whatever pillar
   theme is active. */
function lum(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const DARK_SURFACE = 0.036; // ~#353739: the lightest dark surface (a card with a tinted chip) text sits on
function readableOnDark(hex: string): string {
  if (!/^#?[0-9a-f]{3,8}$/i.test(hex)) return hex;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const to = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  for (let i = 0; i < 20 && ratio(lum(`#${to(r)}${to(g)}${to(b)}`), DARK_SURFACE) < 4.6; i++) {
    r += (255 - r) * 0.12; g += (255 - g) * 0.12; b += (255 - b) * 0.12;
  }
  return `#${to(r)}${to(g)}${to(b)}`;
}
const inkOn = (hex: string) => (/^#?[0-9a-f]{3,8}$/i.test(hex) && ratio(lum(hex), 0) >= ratio(lum(hex), 1) ? '#050505' : '#FFFFFF');

export function applyRootTenantCSSVariables(tenant: Tenant) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const b = withPillarBrand(tenant).branding;
  const primaryRgb = hexToRgbStr(b.primaryColor);
  const secondaryRgb = hexToRgbStr(b.secondaryColor || '#32527B');

  const accentRgb = hexToRgbStr(b.accentColor || "#FDCC0D");
  const neonRgb = hexToRgbStr(b.neonHighlightColor || b.primaryColor);
  const bgRgb = hexToRgbStr(b.backgroundColor || "#101010");
  const cardBgRgb = hexToRgbStr(b.cardBgColor || "#1F1F1F");

  root.style.setProperty("--sgx-accent-rgb", accentRgb);
  root.style.setProperty("--sgx-neon-rgb", neonRgb);
  root.style.setProperty("--sgx-bg-rgb", bgRgb);
  root.style.setProperty("--sgx-card-bg-rgb", cardBgRgb);
  root.style.setProperty('--sgx-primary', b.primaryColor);
  root.style.setProperty('--sgx-primary-rgb', primaryRgb);
  root.style.setProperty('--sgx-secondary', b.secondaryColor || '#32527B');
  root.style.setProperty('--sgx-secondary-rgb', secondaryRgb);
  root.style.setProperty('--sgx-accent', b.accentColor);
  root.style.setProperty('--sgx-bg', b.backgroundColor || '#101010');
  root.style.setProperty('--sgx-card-bg', b.cardBgColor || '#1F1F1F');
  root.style.setProperty('--sgx-border', b.borderColor || b.primaryColor);
  root.style.setProperty('--sgx-neon', b.neonHighlightColor || b.primaryColor);
  root.style.setProperty('--sgx-glow', b.glowShadow || `rgba(${primaryRgb}, 0.5)`);
  root.style.setProperty('--sgx-erratic-level', String(tenant.erraticRating || 1));
  if (b.gradientCss) {
    root.style.setProperty('--sgx-gradient', b.gradientCss);
  }

  const themed: Record<string, string> = {
    primary: b.primaryColor,
    secondary: b.secondaryColor || '#32527B',
    accent: b.accentColor || '#FDCC0D',
    neon: b.neonHighlightColor || b.primaryColor,
  };
  for (const [k, v] of Object.entries(themed)) {
    root.style.setProperty(`--sgx-${k}-text`, readableOnDark(v));
    root.style.setProperty(`--sgx-${k}-ink`, inkOn(v));
  }

  try {
    localStorage.setItem(STORAGE_KEY, tenant.id);
  } catch (e) {
    // ignore
  }

  // Dispatch global custom event for 3D engine and non-React modules
  window.dispatchEvent(new CustomEvent('sgx_tenant_changed', { detail: tenant }));
}

export const TenantThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(loadPersistedTenantsList);
  const [tenant, setTenantStateRaw] = useState<Tenant>(() => withPillarBrand(getInitialTenant(loadPersistedTenantsList())));
  const setTenantState = (t: Tenant) => setTenantStateRaw(withPillarBrand(t));

  // Sync with Firestore on mount if available
  useEffect(() => {
    async function syncFirestoreTenants() {
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        if (!snap.empty) {
          const remoteTenants: Tenant[] = [];
          snap.forEach(docSnap => {
            remoteTenants.push(docSnap.data() as Tenant);
          });
          if (remoteTenants.length > 0) {
            setTenants(prev => {
              const updated = prev.map(p => {
                const canonicalDef = INITIAL_TENANTS.find(d => d.id === p.id);
                if (canonicalDef) {
                  return { ...p, ...canonicalDef, branding: { ...canonicalDef.branding } };
                }
                const remote = remoteTenants.find(r => r.id === p.id);
                return remote ? { ...p, ...remote } : p;
              });
              const customRemote = remoteTenants.filter(r => !prev.some(p => p.id === r.id));
              const final = [...updated, ...customRemote];
              saveTenantsListLocally(final);
              return final;
            });
          }
        }
      } catch (e) {
        console.warn('Firestore tenants fetch skipped/unreachable:', e);
      }
    }
    syncFirestoreTenants();
  }, []);

  useEffect(() => {
    applyRootTenantCSSVariables(tenant);
  }, [tenant]);

  const selectTenant = (newTenant: Tenant) => {
    setTenantState(newTenant);
    applyRootTenantCSSVariables(newTenant);
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const slug = newTenant.slug || newTenant.id.replace('tenant_sgx_', '').replace('tenant_', '');
        url.searchParams.delete('theme');
        // A pillar page already names its pillar in the path (/pilar/spark).
        if (/^\/pilar\//i.test(url.pathname)) url.searchParams.delete('pillar');
        else url.searchParams.set('pillar', slug);
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch {}
  };

  const selectTenantById = (tenantId: string) => {
    const found = tenants.find(t => t.id === tenantId || t.slug === tenantId);
    if (found) {
      selectTenant(found);
    }
  };

  const selectPillar = (pillarId: string) => {
    const found = tenants.find(t => t.pillarId === pillarId || t.pillarId === `SGX.${pillarId}`);
    if (found) {
      selectTenant(found);
    }
  };

  const updateTenant = async (updatedTenant: Tenant) => {
    const newTenants = tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
    setTenants(newTenants);
    saveTenantsListLocally(newTenants);

    if (tenant.id === updatedTenant.id) {
      setTenantState(updatedTenant);
      applyRootTenantCSSVariables(updatedTenant);
    }

    try {
      await setDoc(doc(db, 'tenants', updatedTenant.id), updatedTenant, { merge: true });
    } catch (e) {
      console.warn('Firestore update tenant error:', e);
    }
  };

  const addTenant = async (newTenant: Tenant) => {
    const newTenants = [...tenants, newTenant];
    setTenants(newTenants);
    saveTenantsListLocally(newTenants);

    try {
      await setDoc(doc(db, 'tenants', newTenant.id), newTenant);
    } catch (e) {
      console.warn('Firestore add tenant error:', e);
    }
  };

  const deleteTenant = async (tenantId: string) => {
    const newTenants = tenants.filter(t => t.id !== tenantId);
    setTenants(newTenants);
    saveTenantsListLocally(newTenants);
    if (tenant.id === tenantId && newTenants.length > 0) {
      selectTenant(newTenants[0]);
    }
  };

  const resetTenantsToDefaults = () => {
    setTenants(INITIAL_TENANTS);
    saveTenantsListLocally(INITIAL_TENANTS);
    selectTenant(INITIAL_TENANTS[0]);
  };

  const styles = useMemo<TenantStyleHelpers>(() => {
    const b = tenant.branding;
    const pRgb = hexToRgbStr(b.primaryColor);
    const sRgb = hexToRgbStr(b.secondaryColor);

    return {
      cardStyle: {
        backgroundColor: b.cardBgColor || '#1B1B1B',
        borderColor: b.borderColor || b.primaryColor,
        boxShadow: `0 0 16px ${b.glowShadow || `rgba(${pRgb}, 0.3)`}`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      },
      panelStyle: {
        backgroundColor: `rgba(${pRgb}, 0.08)`,
        borderColor: b.borderColor || b.primaryColor,
        boxShadow: `0 0 20px ${b.glowShadow || `rgba(${pRgb}, 0.4)`}`,
        backdropFilter: 'blur(12px)',
        clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
      },
      primaryBtnStyle: {
        backgroundColor: `rgba(${pRgb}, 0.15)`,
        color: b.primaryColor === '#000000' ? '#00DDFF' : b.primaryColor,
        borderColor: b.primaryColor === '#000000' ? '#00DDFF' : b.primaryColor,
        boxShadow: `0 0 14px ${b.glowShadow}`,
        clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
      },
      secondaryBtnStyle: {
        backgroundColor: `rgba(${sRgb}, 0.12)`,
        color: b.secondaryColor || '#FFFFFF',
        borderColor: b.secondaryColor || '#767676',
        clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
      },
      neonBadgeStyle: {
        backgroundColor: `rgba(${pRgb}, 0.2)`,
        color: b.primaryColor === '#000000' ? '#00DDFF' : b.primaryColor,
        borderColor: b.borderColor || b.primaryColor,
        boxShadow: `0 0 10px ${b.glowShadow}`,
        clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
      },
      neonTextStyle: {
        color: b.neonHighlightColor || b.primaryColor,
        textShadow: `0 0 12px ${b.glowShadow}`,
      },
      glowBorderStyle: {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: b.borderColor || b.primaryColor,
        boxShadow: `0 0 20px ${b.glowShadow}`,
        clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
      },
      gradientTextStyle: {
        background: b.gradientCss || `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      ambientBgStyle: {
        background: `radial-gradient(circle at 50% 20%, rgba(${pRgb}, 0.18) 0%, ${b.backgroundColor || '#101010'} 80%)`,
      },
    };
  }, [tenant]);

  return (
    <TenantThemeContext.Provider
      value={{
        tenant,
        tenantId: tenant.id,
        pillarId: tenant.pillarId || 'SGX.STORY',
        selectTenant,
        selectTenantById,
        selectPillar,
        updateTenant,
        addTenant,
        deleteTenant,
        resetTenantsToDefaults,
        colors: tenant.branding,
        styles,
        tenants,
      }}
    >
      {children}
    </TenantThemeContext.Provider>
  );
};

export const useTenantTheme = (): TenantThemeContextType => {
  const context = useContext(TenantThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }
  return context;
};
