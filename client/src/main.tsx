import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import App from './App';
import { useAppStore } from './stores/app/appStore';
import { COLORS, API } from './constants';
import './i18n';
import './styles/global.css';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: API.queryRetry,
      refetchOnWindowFocus: false,
    },
  },
});

function Root() {
  const { locale, darkMode } = useAppStore();

  return (
    <ConfigProvider
      locale={locale === 'vi' ? viVN : enUS}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: COLORS.primary,
          colorInfo: COLORS.secondary,
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Layout: {
            siderBg: darkMode ? COLORS.dark : COLORS.sidebarLight,
            headerBg: darkMode ? COLORS.dark : COLORS.cardLight,
            bodyBg: darkMode ? COLORS.darkBg : COLORS.bgLight,
          },
          Menu: {
            darkItemBg: COLORS.dark,
            darkItemSelectedBg: 'rgba(254, 44, 85, 0.15)',
            darkItemSelectedColor: COLORS.primary,
            darkItemHoverBg: 'rgba(254, 44, 85, 0.08)',
            itemSelectedBg: 'rgba(254, 44, 85, 0.08)',
            itemSelectedColor: COLORS.primary,
          },
          Button: {
            primaryColor: COLORS.white,
            colorPrimaryHover: COLORS.primaryHover,
            colorPrimaryActive: COLORS.primaryActive,
          },
          Card: {
            colorBgContainer: darkMode ? COLORS.darkGray : COLORS.cardLight,
          },
          Table: {
            colorBgContainer: darkMode ? COLORS.darkGray : COLORS.cardLight,
            headerBg: darkMode ? COLORS.headerDark : COLORS.bgLight,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={API.toastDuration}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={darkMode ? 'dark' : 'light'}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
