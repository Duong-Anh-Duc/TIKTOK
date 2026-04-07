import { useState } from 'react';
import { Layout, Button, Dropdown, Avatar, Space, Switch, Tooltip, Spin, Modal, Form, Input, message } from 'antd';
import '@/styles/navbar/navbar.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
  DesktopOutlined,
  LoadingOutlined,
  LockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/app/appStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { useGemLoginAutoStart } from '@/hooks/gemlogin/useGemLoginAutoStart';
import { authApi } from '@/api';
import useBreakpoint from 'antd/es/grid/hooks/useBreakpoint';
import type { MenuProps } from 'antd';

const { Header } = Layout;

export default function Navbar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode, locale, setLocale, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const { user, logout, setUser } = useAuthStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { isRunning, isStarting } = useGemLoginAutoStart();

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [form] = Form.useForm();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm] = Form.useForm();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'edit-profile',
      icon: <EditOutlined />,
      label: t('auth.editProfile'),
    },
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: t('auth.changePassword'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      danger: true,
    },
  ];

  const handleUserMenu: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'logout') {
      try { await authApi.logout(); } catch {}
      logout();
      window.location.href = '/login';
    } else if (key === 'change-password') {
      setPwModalOpen(true);
    } else if (key === 'edit-profile') {
      profileForm.setFieldsValue({ full_name: user?.full_name || '' });
      setProfileModalOpen(true);
    }
  };

  const handleChangePassword = async (values: { current_password: string; new_password: string }) => {
    setPwLoading(true);
    try {
      await authApi.changePassword(values);
      message.success(t('auth.passwordChanged'));
      setPwModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.message || t('common.error'));
    } finally {
      setPwLoading(false);
    }
  };

  const handleUpdateProfile = async (values: { full_name: string }) => {
    setProfileLoading(true);
    try {
      const res = await authApi.updateProfile({ full_name: values.full_name.trim() });
      const updated = res.data?.data;
      if (updated) setUser(updated);
      message.success(t('settings.profileSaved'));
      setProfileModalOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.message || t('common.error'));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggle = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      toggleSidebar();
    }
  };

  return (
    <>
      <Header className={`navbar-header ${isMobile ? 'navbar-header--mobile' : ''}`}>
        <Button
          type="text"
          icon={sidebarCollapsed || isMobile ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={handleToggle}
          className="navbar-toggle-btn"
        />

        <Space size={isMobile ? 6 : 12}>
          {/* GemLogin Status */}
          <Tooltip title={
            isStarting ? t('gemlogin.starting').replace(/<[^>]*>/g, '')
            : isRunning ? t('gemlogin.running')
            : t('gemlogin.notStarted')
          }>
            <div className={`navbar-gemlogin ${isRunning ? 'active' : isStarting ? 'starting' : 'inactive'}`}>
              {isStarting ? (
                <Spin indicator={<LoadingOutlined style={{ fontSize: 13 }} spin />} />
              ) : (
                <DesktopOutlined style={{ fontSize: 13 }} />
              )}
              {!isMobile && (
                <span className="navbar-gemlogin-text">
                  {isStarting ? t('common.loading') : 'GemLogin'}
                </span>
              )}
              <span className={`navbar-gemlogin-dot ${isRunning ? 'active' : isStarting ? 'starting' : 'inactive'}`} />
            </div>
          </Tooltip>

          {/* Language */}
          <Button
            type="text"
            icon={<GlobalOutlined />}
            onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
            className="navbar-lang-btn"
          >
            {locale === 'vi' ? 'VI' : 'EN'}
          </Button>

          {/* Dark Mode */}
          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />

          {/* User Menu */}
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }} size={6}>
              <Avatar size={28} icon={<UserOutlined />} src={user?.avatar_url}
                className="navbar-avatar" />
              {!isMobile && (
                <span className="navbar-user-name">
                  {user?.full_name}
                </span>
              )}
            </Space>
          </Dropdown>
        </Space>
      </Header>

      {/* Edit Profile Modal */}
      <Modal
        title={t('auth.editProfile')}
        open={profileModalOpen}
        onCancel={() => { setProfileModalOpen(false); profileForm.resetFields(); }}
        footer={null}
        width={400}
      >
        <div className="navbar-profile-center">
          <Avatar size={64} icon={<UserOutlined />} src={user?.avatar_url}
            className="navbar-profile-avatar" />
          <div className="navbar-profile-email">{user?.email}</div>
        </div>
        <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
          <Form.Item
            name="full_name"
            label={t('settings.fullName')}
            rules={[{ required: true, message: t('settings.enterName') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('settings.enterName')} size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setProfileModalOpen(false); profileForm.resetFields(); }}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" loading={profileLoading}
                className="navbar-modal-btn-primary">
                {t('settings.update')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={t('auth.changePassword')}
        open={pwModalOpen}
        onCancel={() => { setPwModalOpen(false); form.resetFields(); }}
        footer={null}
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item
            name="current_password"
            label={t('auth.currentPassword')}
            rules={[{ required: true, message: t('auth.currentPassword') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.currentPassword')} />
          </Form.Item>

          <Form.Item
            name="new_password"
            label={t('auth.newPassword')}
            rules={[
              { required: true, message: t('auth.newPassword') },
              { min: 6, message: t('auth.passwordMin') },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.newPassword')} />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label={t('auth.confirmPassword')}
            dependencies={['new_password']}
            rules={[
              { required: true, message: t('auth.confirmPassword') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setPwModalOpen(false); form.resetFields(); }}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" loading={pwLoading}
                className="navbar-modal-btn-primary">
                {t('common.confirm')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
