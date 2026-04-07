import React from 'react';
import { useTranslation } from 'react-i18next';

const LoginBrandPanel: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="lp-brand">
      <div className="lp-logo-wrap">
        <img src="/tiktok.avif" alt="TikTok Shop" className="lp-logo" />
        <div className="lp-ring" />
        <div className="lp-ring lp-ring-2" />
      </div>
      <h1 className="lp-brand-name">TikTok <span>Shop</span></h1>
      <p className="lp-brand-sub">{t('auth.loginSubtitle')}</p>
      <div className="lp-dots">
        <span className="lp-dot" style={{ background: '#FE2C55' }} />
        <span className="lp-dot" style={{ background: '#FF6B8A' }} />
        <span className="lp-dot" style={{ background: '#25F4EE' }} />
      </div>
    </div>
  );
};

export default LoginBrandPanel;
