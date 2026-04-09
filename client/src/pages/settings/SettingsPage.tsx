import { useState, useEffect, useCallback } from 'react';
import { Typography, Input, Button, Card, message, Space, Tag, Row, Col } from 'antd';
import { SaveOutlined, CheckCircleOutlined, CloseCircleOutlined, MailOutlined, LockOutlined, TikTokFilled, ShopOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import AnimatedPage from '@/components/common/AnimatedPage';
import ScheduleManager from '@/components/settings/ScheduleManager';
import apiClient from '@/api/client';
import '@/styles/settings/settings.css';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { t } = useTranslation();
  const [ommoKey, setOmmoKey] = useState('');
  const [ommoKeySet, setOmmoKeySet] = useState(false);
  const [tiktokEmail, setTiktokEmail] = useState('');
  const [tiktokPassword, setTiktokPassword] = useState('');
  const [tiktokPasswordSet, setTiktokPasswordSet] = useState(false);
  const [tiktokShopId, setTiktokShopId] = useState('');
  const [tiktokShopRegion, setTiktokShopRegion] = useState('VN');
  const [mailtmAddress, setMailtmAddress] = useState('');
  const [mailtmPassword, setMailtmPassword] = useState('');
  const [mailtmPasswordSet, setMailtmPasswordSet] = useState(false);
  const [savingOmmo, setSavingOmmo] = useState(false);
  const [savingTiktok, setSavingTiktok] = useState(false);
  const [savingMailtm, setSavingMailtm] = useState(false);

  const loadSettings = useCallback(() => {
    apiClient.get('/settings').then((res: any) => {
      const data = res.data?.data;
      if (data) {
        setOmmoKeySet(data.ommoCaptchaKeySet);
        setOmmoKey(data.ommoCaptchaKey || '');
        setTiktokEmail(data.tiktokEmail || '');
        setTiktokPassword(data.tiktokPassword || '');
        setTiktokPasswordSet(data.tiktokPasswordSet);
        setTiktokShopId(data.tiktokShopId || '');
        setTiktokShopRegion(data.tiktokShopRegion || 'VN');
        setMailtmAddress(data.mailtmAddress || '');
        setMailtmPassword(data.mailtmPassword || '');
        setMailtmPasswordSet(data.mailtmPasswordSet);
      }
    }).catch((err: any) => {
      console.error('[Settings] API error:', err.response?.status, err.message);
    });
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSaveOmmo = async () => {
    if (!ommoKey.trim()) { message.warning(t('settings.enterOmmoKey')); return; }
    setSavingOmmo(true);
    try {
      await apiClient.put('/settings', { ommoCaptchaKey: ommoKey.trim() });
      message.success(t('settings.ommoSaved'));
      loadSettings();
    } catch { message.error(t('common.error')); }
    finally { setSavingOmmo(false); }
  };

  const handleSaveTiktok = async () => {
    if (!tiktokEmail.trim()) { message.warning(t('settings.enterTiktokEmail')); return; }
    setSavingTiktok(true);
    try {
      await apiClient.put('/settings', {
        tiktokEmail: tiktokEmail.trim(),
        ...(tiktokPassword.trim() ? { tiktokPassword: tiktokPassword.trim() } : {}),
        tiktokShopId: tiktokShopId.trim(),
        tiktokShopRegion: tiktokShopRegion.trim() || 'VN',
      });
      message.success(t('settings.tiktokSaved'));
      loadSettings();
    } catch { message.error(t('common.error')); }
    finally { setSavingTiktok(false); }
  };

  const handleSaveMailtm = async () => {
    if (!mailtmAddress.trim()) { message.warning(t('settings.enterMailtmEmail')); return; }
    setSavingMailtm(true);
    try {
      await apiClient.put('/settings', {
        mailtmAddress: mailtmAddress.trim(),
        ...(mailtmPassword.trim() ? { mailtmPassword: mailtmPassword.trim() } : {}),
      });
      message.success(t('settings.mailtmSaved'));
      loadSettings();
    } catch { message.error(t('common.error')); }
    finally { setSavingMailtm(false); }
  };

  return (
    <AnimatedPage>
      <div className="settings-page">
        <Title level={3} className="settings-title">
          {t('settings.title')}
        </Title>

        <Row gutter={[16, 16]}>
          {/* OMMO Captcha */}
          <Col xs={24} md={12} lg={8}>
            <Card
              title={<Space><img src="/omo.png" alt="OMMO" style={{ width: 20, height: 20, objectFit: 'contain' }} /><span>{t('settings.ommoTitle')}</span></Space>}
              className="settings-card--flex"
              styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">{t('settings.ommoDesc')}</Text>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text strong>{t('settings.status')}: </Text>
                {ommoKeySet
                  ? <Tag icon={<CheckCircleOutlined />} color="success">{t('settings.configured')}</Tag>
                  : <Tag icon={<CloseCircleOutlined />} color="error">{t('settings.notConfigured')}</Tag>}
              </div>
              <div style={{ flex: 1 }} />
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Input
                  placeholder={t('settings.enterOmmoKey')}
                  value={ommoKey}
                  onChange={(e) => setOmmoKey(e.target.value)}
                  onPressEnter={handleSaveOmmo}
                  size="large"
                />
                <Button type="primary" icon={<SaveOutlined />} loading={savingOmmo} onClick={handleSaveOmmo} size="large" block>
                  {t('common.save')}
                </Button>
              </Space>
            </Card>
          </Col>

          {/* TikTok Shop Login */}
          <Col xs={24} md={12} lg={8}>
            <Card
              title={<Space><TikTokFilled /><span>{t('settings.tiktokTitle')}</span></Space>}
              className="settings-card--flex"
              styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">{t('settings.tiktokDesc')}</Text>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text strong>{t('settings.status')}: </Text>
                {tiktokEmail && tiktokPasswordSet
                  ? <Tag icon={<CheckCircleOutlined />} color="success">{t('settings.configured')} ({tiktokEmail})</Tag>
                  : <Tag icon={<CloseCircleOutlined />} color="error">{t('settings.notConfigured')}</Tag>}
              </div>
              <div style={{ flex: 1 }} />
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Input
                  prefix={<ShopOutlined />}
                  placeholder={t('settings.tiktokShopIdPlaceholder')}
                  value={tiktokShopId}
                  onChange={(e) => setTiktokShopId(e.target.value)}
                  size="large"
                />
                <Input
                  prefix={<GlobalOutlined />}
                  placeholder={t('settings.tiktokShopRegionPlaceholder')}
                  value={tiktokShopRegion}
                  onChange={(e) => setTiktokShopRegion(e.target.value)}
                  size="large"
                />
                <Input
                  prefix={<MailOutlined />}
                  placeholder={t('settings.tiktokEmailPlaceholder')}
                  value={tiktokEmail}
                  onChange={(e) => setTiktokEmail(e.target.value)}
                  size="large"
                />
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('settings.tiktokPasswordPlaceholder')}
                  value={tiktokPassword}
                  onChange={(e) => setTiktokPassword(e.target.value)}
                  onPressEnter={handleSaveTiktok}
                  size="large"
                />
                <Button type="primary" icon={<SaveOutlined />} loading={savingTiktok} onClick={handleSaveTiktok} size="large" block>
                  {t('settings.saveTiktok')}
                </Button>
              </Space>
            </Card>
          </Col>

          {/* Mail.tm */}
          <Col xs={24} md={12} lg={8}>
            <Card
              title={<Space><img src="/mailtm1.png" alt="Mail.tm" style={{ width: 20, height: 20, objectFit: 'contain' }} /><span>{t('settings.mailtmTitle')}</span></Space>}
              className="settings-card--flex"
              styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">{t('settings.mailtmDesc')}</Text>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text strong>{t('settings.status')}: </Text>
                {mailtmAddress && mailtmPasswordSet
                  ? <Tag icon={<CheckCircleOutlined />} color="success">{t('settings.configured')} ({mailtmAddress})</Tag>
                  : <Tag icon={<CloseCircleOutlined />} color="error">{t('settings.notConfigured')}</Tag>}
              </div>
              <div style={{ flex: 1 }} />
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Input
                  prefix={<MailOutlined />}
                  placeholder={t('settings.mailtmEmailPlaceholder')}
                  value={mailtmAddress}
                  onChange={(e) => setMailtmAddress(e.target.value)}
                  size="large"
                />
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('settings.mailtmPasswordPlaceholder')}
                  value={mailtmPassword}
                  onChange={(e) => setMailtmPassword(e.target.value)}
                  onPressEnter={handleSaveMailtm}
                  size="large"
                />
                <Button type="primary" icon={<SaveOutlined />} loading={savingMailtm} onClick={handleSaveMailtm} size="large" block>
                  {t('settings.saveMailtm')}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        <ScheduleManager />
      </div>
    </AnimatedPage>
  );
}
