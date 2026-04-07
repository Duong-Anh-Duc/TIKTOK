import { useEffect, useRef, useState } from 'react';
import { GlobalOutlined, LockOutlined, MailOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Form, Input, Select, theme as antTheme } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth/authStore';
import { useAppStore } from '@/stores/app/appStore';
import LoginBackground from '@/components/login/LoginBackground';
import LoginBrandPanel from '@/components/login/LoginBrandPanel';
import ForgotPasswordModal from '@/components/login/ForgotPasswordModal';
import '@/styles/login/login.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const { setAuth, isAuthenticated } = useAuthStore();
  const { darkMode, toggleDarkMode, locale, setLocale } = useAppStore();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  if (isAuthenticated) return <Navigate to="/scraper" replace />;

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      if (data.data) {
        setAuth(data.data.user, data.data.access_token);
        toast.success(t('auth.welcomeBack'));
        navigate('/scraper');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; data?: { attemptsLeft?: number; remainingMinutes?: number } } } };
      const resData = err.response?.data;
      let errorMsg = resData?.message || t('common.error');
      if (resData?.data?.attemptsLeft !== undefined && resData.data.attemptsLeft > 0) {
        errorMsg += ` (${t('auth.attemptsLeft', { count: resData.data.attemptsLeft })})`;
      }
      if (resData?.data?.remainingMinutes) {
        errorMsg = t('auth.accountLockedMinutes', { minutes: resData.data.remainingMinutes });
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root" ref={rootRef}>
      <LoginBackground mousePos={mousePos} />

      {/* Top controls */}
      <div className="lp-controls">
        <ConfigProvider theme={{ algorithm: antTheme.darkAlgorithm, token: { colorPrimary: '#FE2C55', borderRadius: 8 } }}>
          <Select
            value={locale}
            onChange={(val: 'vi' | 'en') => setLocale(val)}
            style={{ width: 130 }}
            suffixIcon={<GlobalOutlined />}
            options={[
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'en', label: 'English' },
            ]}
          />
        </ConfigProvider>
        <button onClick={toggleDarkMode} className="lp-icon-btn">
          {darkMode ? <SunOutlined /> : <MoonOutlined />}
        </button>
      </div>

      {/* Card */}
      <div className={`lp-wrap ${visible ? 'lp-wrap--in' : ''}`}>
        <div className="lp-glow-border" />
        <div className="lp-card">
          <LoginBrandPanel />

          {/* Form panel */}
          <div className="lp-form-side">
            <p className={`lp-welcome ${visible ? 'lp-stagger-1' : ''}`}>{t('auth.loginTitle')}</p>

            <ConfigProvider
              theme={{
                algorithm: antTheme.darkAlgorithm,
                token: {
                  colorPrimary: '#FE2C55',
                  colorBgContainer: 'rgba(255,255,255,0.04)',
                  colorBorder: 'rgba(254,44,85,0.25)',
                  colorText: '#f1f5f9',
                  colorTextPlaceholder: '#64748b',
                  borderRadius: 10,
                  fontSize: 15,
                },
              }}
            >
              <Form layout="vertical" onFinish={onFinish} autoComplete="off" style={{ marginTop: 28 }}>
                <div className={`lp-field-wrap ${visible ? 'lp-stagger-2' : ''}`}>
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: t('auth.emailRequired') },
                      { type: 'email', message: t('auth.emailInvalid') },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined className="lp-input-icon" />}
                      placeholder={t('auth.email')}
                      size="large"
                      className="lp-input"
                    />
                  </Form.Item>
                </div>

                <div className={`lp-field-wrap ${visible ? 'lp-stagger-3' : ''}`}>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: t('auth.passwordRequired') }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined className="lp-input-icon" />}
                      placeholder={t('auth.password')}
                      size="large"
                      className="lp-input"
                    />
                  </Form.Item>
                </div>

                <div className={`lp-field-wrap ${visible ? 'lp-stagger-4' : ''}`}>
                  <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={loading}
                      className="lp-btn"
                      style={{
                        height: 50, fontWeight: 700, fontSize: 15,
                        letterSpacing: '0.3px', border: 'none',
                        background: 'linear-gradient(135deg, #FE2C55 0%, #FF6B8A 100%)',
                        boxShadow: '0 4px 20px rgba(254,44,85,0.35)',
                      }}
                    >
                      {t('auth.login')}
                    </Button>
                  </Form.Item>
                </div>
              </Form>
            </ConfigProvider>

            <div className={`lp-footer ${visible ? 'lp-stagger-5' : ''}`}>
              <span className="lp-link" onClick={() => setForgotOpen(true)}>
                {t('auth.forgotPassword')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
