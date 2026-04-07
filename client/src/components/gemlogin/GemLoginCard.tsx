import { DesktopOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { gemloginApi } from '@/api/gemlogin/gemlogin.api';
import GemLoginProfileTable from './GemLoginProfileTable';

export default function GemLoginCard() {
  const { t } = useTranslation();
  const { data: statusRes, isLoading } = useQuery({
    queryKey: ['gemlogin-status'],
    queryFn: () => gemloginApi.getStatus(),
    refetchInterval: 10000,
  });

  const status = statusRes?.data;
  const isRunning = status?.isRunning ?? false;

  return (
    <div className="gemlogin-card">
      <div className="gemlogin-header">
        <div className="gemlogin-info">
          <div className={`gemlogin-icon ${isRunning ? 'active' : 'inactive'}`}>
            <DesktopOutlined />
          </div>
          <div>
            <div className="gemlogin-title">{t('gemlogin.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              <span className={`gemlogin-status-dot ${isRunning ? 'active' : 'inactive'}`} />
              {isRunning ? t('gemlogin.running') : t('gemlogin.notStarted')}
            </div>
          </div>
        </div>
        <GemLoginProfileTable
          status={status}
          isRunning={isRunning}
          isLoading={isLoading}
        />
      </div>
      {!isRunning && (
        <div className="gemlogin-desc"
          dangerouslySetInnerHTML={{ __html: t('gemlogin.startDescription') }} />
      )}
      {isRunning && (
        <div className="gemlogin-tags">
          {status?.activeProfileId && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(34,197,94,0.08)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)',
              fontWeight: 500,
            }}>
              Profile: {status.activeProfileId}
            </span>
          )}
          {status?.cdpInjected && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(37,244,238,0.08)', color: '#25F4EE', border: '1px solid rgba(37,244,238,0.15)',
              fontWeight: 500,
            }}>
              {t('gemlogin.cdpInjected')}
            </span>
          )}
          {!status?.cdpInjected && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.15)',
              fontWeight: 500,
            }}>
              {t('gemlogin.cdpNotInjected')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
