import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAppStore } from '@/stores/app/appStore';
import useBreakpoint from 'antd/es/grid/hooks/useBreakpoint';

const { Content } = Layout;

export default function AppLayout() {
  const { sidebarCollapsed } = useAppStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 80 : 260);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.2s' }}>
        <Navbar />
        <Content
          style={{
            padding: isMobile ? 12 : 24,
            minHeight: 'calc(100vh - 64px)',
            background: 'var(--bg-primary)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
