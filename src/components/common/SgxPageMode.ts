import { createContext, useContext } from 'react';

/* PAGE MODE: every menu module is its own page. A module built on SgxDialog
   renders inline as page content (no overlay, no close X, no scroll lock)
   when it sits inside a page that provides this context; the page owns the
   title (the section banner) and the way back. Dialogs opened from inside a
   page (a confirmation, a detail) are still real dialogs: the first SgxDialog
   in page mode resets the context for its children. */

export interface SgxPageModeValue {
  /** The page is the module itself (always true when provided). */
  page: true;
}

export const SgxPageModeContext = createContext<SgxPageModeValue | null>(null);

export const useSgxPageMode = () => useContext(SgxPageModeContext);
