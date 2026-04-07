import { Layout, Menu, Drawer } from 'antd';
import { CloudDownloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/app/appStore';
import useBreakpoint from 'antd/es/grid/hooks/useBreakpoint';

const { Sider } = Layout;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { sidebarCollapsed, darkMode, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const menuItems = [
    {
      key: '/scraper',
      icon: <CloudDownloadOutlined />,
      label: t('sidebar.scraper'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('settings.title'),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const logo = (
    <div className="sidebar-logo" style={{ height: 64 }}>
      <img src="/tiktok.avif" alt="TikTok" />
      {(isMobile || !sidebarCollapsed) && (
        <h2 style={{ whiteSpace: 'nowrap' }}>TikTok Shop</h2>
      )}
    </div>
  );

  const menu = (
    <Menu
      mode="inline"
      theme={darkMode ? 'dark' : 'light'}
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ border: 'none', padding: '8px' }}
    />
  );

  // Mobile: Drawer overlay
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        width={260}
        styles={{ body: { padding: 0, background: darkMode ? '#161823' : '#fff' }, header: { display: 'none' } }}
      >
        {logo}
        {menu}
      </Drawer>
    );
  }

  // Desktop: Fixed Sider
  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={sidebarCollapsed}
      width={260}
      collapsedWidth={80}
      theme={darkMode ? 'dark' : 'light'}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {logo}
      {menu}
    </Sider>
  );
}
