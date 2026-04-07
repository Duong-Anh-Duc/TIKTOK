import {
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Popconfirm,
  Space,
  Spin,
  Tooltip,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { gemloginApi } from '@/api/gemlogin/gemlogin.api';
import type { GemLoginProfileTableProps } from '@/types';

export default function GemLoginProfileTable({
  isRunning,
  isLoading,
}: GemLoginProfileTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: () => gemloginApi.start(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gemlogin-status'] });
      message.success(t('gemlogin.started'));
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? String(err));
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => gemloginApi.close(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gemlogin-status'] });
      message.success(t('gemlogin.closed'));
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? String(err));
    },
  });

  if (startMutation.isPending) {
    return (
      <Space size="small">
        <Spin size="small" />
        <span style={{ fontSize: 12, color: '#F59E0B' }}
          dangerouslySetInnerHTML={{ __html: t('gemlogin.starting') }} />
      </Space>
    );
  }

  return (
    <Space>
      {!isRunning ? (
        <Tooltip title={t('gemlogin.startTooltip')}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={isLoading}
            onClick={() => startMutation.mutate()}
            style={{
              background: 'linear-gradient(135deg, #FE2C55, #FF4571)',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              boxShadow: '0 2px 12px rgba(254,44,85,0.25)',
            }}
          >
            {t('gemlogin.start')}
          </Button>
        </Tooltip>
      ) : (
        <Popconfirm
          title={t('gemlogin.closeConfirm')}
          description={t('gemlogin.closeDescription')}
          onConfirm={() => closeMutation.mutate()}
          okText={t('gemlogin.close')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            icon={<StopOutlined />}
            loading={closeMutation.isPending}
            style={{ borderRadius: 10, fontWeight: 500 }}
          >
            {t('gemlogin.close')}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
}
