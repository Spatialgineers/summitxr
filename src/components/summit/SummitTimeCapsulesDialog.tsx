import React from 'react';
import { SgxDialog } from '../common/SgxDialog';
import { useLanguage } from '../../context/LanguageContext';
import { SummitWeeklyCapsules } from './SummitWeeklyCapsules';

/* The weekly capsules in the shared SGX dialog (opened from the clocks band). */
export const SummitTimeCapsulesDialog: React.FC<{ onClose: () => void; onNavigateToSection?: (sectionKey: string) => void }> = ({ onClose, onNavigateToSection }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  return (
    <SgxDialog
      onClose={onClose}
      title={es ? 'Cápsulas del Summit' : 'Summit capsules'}
      kicker={es ? 'Contenido semanal y retos rumbo al 11 de diciembre' : 'Weekly content and challenges on the road to December 11'}
      icon={<img src="/holo/summitIcon.png" alt="" />}
      size="lg"
    >
      <SummitWeeklyCapsules
        onNavigateToSection={(sec) => {
          onClose();
          onNavigateToSection?.(sec);
        }}
      />
    </SgxDialog>
  );
};

export default SummitTimeCapsulesDialog;
