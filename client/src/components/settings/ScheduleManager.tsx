import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Card, Table, Button, Switch, Space, Modal, Form, Input, Select,
  InputNumber, Popconfirm, message, Tag, Tooltip, Cascader, Row, Col,
  Slider, Checkbox, Typography, Dropdown, TimePicker,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined,
  ClockCircleOutlined, DownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { scheduleApi } from '@/api/schedule/schedule.api';
import type { ScrapeSchedule } from '@/types';
import { CATEGORIES, CONTENT_TYPES, GMV_OPTIONS, ITEMS_SOLD_OPTIONS } from '@/data/categories';
import { LIVE_VIEWER_MARKS, sliderToValue, valueToSlider } from '@/constants';
import CheckboxDropdown from '@/components/common/CheckboxDropdown';

const { Text } = Typography;

const DAY_SHORT: Record<string, string> = { '0': 'CN', '1': 'T2', '2': 'T3', '3': 'T4', '4': 'T5', '5': 'T6', '6': 'T7' };

function buildCron(type: string, hour: number, minute: number, days: string[]): string {
  if (type === 'monthly') return `${minute} ${hour} ${days.join(',')} * *`;
  if (type === 'weekly') return `${minute} ${hour} * * ${days.join(',')}`;
  return `${minute} ${hour} * * *`; // daily
}

function parseCron(expr: string): { type: string; hour: number; minute: number; days: string[] } {
  try {
    const parts = expr.split(' ');
    if (parts.length !== 5) return { type: 'daily', hour: 8, minute: 0, days: [] };
    const [min, hour, dom, , dow] = parts;
    if (dom !== '*' && dow === '*') return { type: 'monthly', hour: +hour, minute: +min, days: dom.split(',') };
    if (dow !== '*' && dom === '*') return { type: 'weekly', hour: +hour, minute: +min, days: dow.split(',') };
    return { type: 'daily', hour: +hour, minute: +min, days: [] };
  } catch {
    return { type: 'daily', hour: 8, minute: 0, days: [] };
  }
}

export default function ScheduleManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Schedule time state
  const [schedType, setSchedType] = useState('daily');
  const [schedHour, setSchedHour] = useState(8);
  const [schedMinute, setSchedMinute] = useState(0);
  const [schedDays, setSchedDays] = useState<string[]>([]);

  // Filter state (same as ScraperPage)
  const [filterTab, setFilterTab] = useState<'creator' | 'performance'>('creator');
  const [selectedCategories, setSelectedCategories] = useState<string[][]>([]);
  const [contentType, setContentType] = useState('');
  const [gmv, setGmv] = useState<string[]>([]);
  const [itemsSold, setItemsSold] = useState<string[]>([]);
  const [liveViewerMin, setLiveViewerMin] = useState(0);
  const [filterLiveLink, setFilterLiveLink] = useState(false);

  const SCHEDULE_TYPES = [
    { label: t('schedule.daily'), value: 'daily' },
    { label: t('schedule.monthly'), value: 'monthly' },
    { label: t('schedule.weekly'), value: 'weekly' },
  ];

  const WEEKDAY_OPTIONS = [
    { label: t('schedule.mon'), value: '1' },
    { label: t('schedule.tue'), value: '2' },
    { label: t('schedule.wed'), value: '3' },
    { label: t('schedule.thu'), value: '4' },
    { label: t('schedule.fri'), value: '5' },
    { label: t('schedule.sat'), value: '6' },
    { label: t('schedule.sun'), value: '0' },
  ];

  const cronToDisplay = (expr: string): string => {
    try {
      const parts = expr.split(' ');
      if (parts.length !== 5) return expr;
      const [min, hour, dom, , dow] = parts;
      const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
      if (dom !== '*' && dow === '*') return t('schedule.monthlyAt', { dom, time });
      if (dow !== '*' && dom === '*') {
        const days = dow.split(',').map((d) => DAY_SHORT[d] || d).join(', ');
        return t('schedule.weeklyAt', { days, time });
      }
      return t('schedule.dailyAt', { time });
    } catch {
      return expr;
    }
  };

  const { data: schedulesRes, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => scheduleApi.list(),
  });
  const schedules = schedulesRes?.data?.data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schedules'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => scheduleApi.create(data),
    onSuccess: () => { message.success(t('schedule.created')); invalidate(); setModalOpen(false); },
    onError: (err: any) => message.error(err?.response?.data?.message || t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => scheduleApi.update(id, data),
    onSuccess: () => { message.success(t('schedule.updated')); invalidate(); setModalOpen(false); },
    onError: (err: any) => message.error(err?.response?.data?.message || t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.remove(id),
    onSuccess: () => { message.success(t('schedule.deleted')); invalidate(); },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.toggle(id),
    onSuccess: () => invalidate(),
  });

  const runNowMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.runNow(id),
    onSuccess: () => message.success(t('schedule.runStarted')),
    onError: (err: any) => message.error(err?.response?.data?.message || t('common.error')),
  });

  const resetForm = () => {
    form.resetFields();
    setSchedType('daily');
    setSchedHour(8);
    setSchedMinute(0);
    setSchedDays([]);
    setFilterTab('creator');
    setSelectedCategories([]);
    setContentType('');
    setGmv([]);
    setItemsSold([]);
    setLiveViewerMin(0);
    setFilterLiveLink(false);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (record: ScrapeSchedule) => {
    setEditingId(record.id);
    const parsed = parseCron(record.cron_expr);
    setSchedType(parsed.type);
    setSchedHour(parsed.hour);
    setSchedMinute(parsed.minute);
    setSchedDays(parsed.days);
    setSelectedCategories(record.categories || []);
    setContentType(record.content_type || '');
    setGmv(record.gmv || []);
    setItemsSold(record.items_sold || []);
    setLiveViewerMin(record.live_viewer_min || 0);
    setFilterTab('creator');
    form.setFieldsValue({
      name: record.name,
      max_creators: record.max_creators,
    });
    setModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    const cronExpr = buildCron(schedType, schedHour, schedMinute, schedDays);
    const data = {
      name: values.name,
      cron_expr: cronExpr,
      max_creators: values.max_creators || 0,
      categories: selectedCategories,
      content_type: contentType,
      gmv,
      items_sold: itemsSold,
      live_viewer_min: liveViewerMin,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      title: t('schedule.name'), dataIndex: 'name', key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: t('schedule.cron'), dataIndex: 'cron_expr', key: 'cron_expr',
      render: (expr: string) => (
        <Tooltip title={expr}>
          <Tag icon={<ClockCircleOutlined />}>{cronToDisplay(expr)}</Tag>
        </Tooltip>
      ),
    },
    {
      title: t('schedule.lastRun'), dataIndex: 'last_run_at', key: 'last_run_at', responsive: ['md' as const],
      render: (date: string | null) => date ? new Date(date).toLocaleString('vi-VN') : '-',
    },
    {
      title: t('schedule.enabled'), key: 'is_enabled', width: 70, align: 'center' as const,
      render: (_: any, record: ScrapeSchedule) => (
        <Switch checked={record.is_enabled} size="small"
          onChange={() => toggleMutation.mutate(record.id)} />
      ),
    },
    {
      title: t('common.actions'), key: 'actions', width: 120,
      render: (_: any, record: ScrapeSchedule) => (
        <Space size={4}>
          <Tooltip title={t('schedule.runNow')}>
            <Button type="text" size="small" icon={<PlayCircleOutlined />}
              onClick={() => runNowMutation.mutate(record.id)} />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button type="text" size="small" icon={<EditOutlined />}
              onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title={t('schedule.deleteConfirm')} onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const creatorFilterCount = (selectedCategories.length > 0 ? 1 : 0) + (contentType ? 1 : 0);
  const perfFilterCount = (gmv.length > 0 ? 1 : 0) + (itemsSold.length > 0 ? 1 : 0) + (liveViewerMin > 0 ? 1 : 0);

  return (
    <>
      <Card
        title={<Space><ClockCircleOutlined /><span>{t('schedule.title')}</span></Space>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('schedule.add')}</Button>}
        style={{ borderRadius: 12, marginTop: 16 }}
      >
        <Table dataSource={schedules} columns={columns} rowKey="id" loading={isLoading}
          size="middle" pagination={false} locale={{ emptyText: t('schedule.empty') }} />
      </Card>

      <Modal
        title={editingId ? t('schedule.edit') : t('schedule.add')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          {/* Name */}
          <Form.Item name="name" label={t('schedule.name')}
            rules={[{ required: true, message: t('schedule.nameRequired') }]}>
            <Input placeholder={t('schedule.namePlaceholder')} />
          </Form.Item>

          {/* Time picker */}
          <Form.Item label={t('schedule.cron')}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Select value={schedType} onChange={(v) => { setSchedType(v); setSchedDays([]); }}
                options={SCHEDULE_TYPES} style={{ width: '100%' }} />

              {schedType === 'monthly' && (
                <Select mode="multiple" value={schedDays} onChange={setSchedDays}
                  placeholder={t('schedule.selectDays')} style={{ width: '100%' }}
                  options={Array.from({ length: 31 }, (_, i) => ({ label: t('schedule.day', { n: i + 1 }), value: String(i + 1) }))}
                />
              )}

              {schedType === 'weekly' && (
                <Select mode="multiple" value={schedDays} onChange={setSchedDays}
                  placeholder={t('schedule.selectWeekdays')} style={{ width: '100%' }}
                  options={WEEKDAY_OPTIONS}
                />
              )}

              <TimePicker
                value={dayjs().hour(schedHour).minute(schedMinute).second(0)}
                onChange={(time) => {
                  if (time) {
                    setSchedHour(time.hour());
                    setSchedMinute(time.minute());
                  }
                }}
                format="HH:mm"
                style={{ width: '100%' }}
                placeholder={t('schedule.selectTime')}
              />

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                Cron: <Tag>{buildCron(schedType, schedHour, schedMinute, schedDays) || '...'}</Tag>
                → {cronToDisplay(buildCron(schedType, schedHour, schedMinute, schedDays))}
              </div>
            </Space>
          </Form.Item>

          {/* Max creators */}
          <Form.Item name="max_creators" label={t('scraper.maxCreators')}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder={t('schedule.noLimit')} />
          </Form.Item>

          {/* Filters - exactly like ScraperPage */}
          <Form.Item label={t('scraper.filterBy')}>
            <div style={{
              border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Tab header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <button className={`filter-tab ${filterTab === 'creator' ? 'active' : ''}`}
                  onClick={() => setFilterTab('creator')} type="button">
                  {t('scraper.creator')}
                  {creatorFilterCount > 0 && <span className="filter-tab-badge">{creatorFilterCount}</span>}
                </button>
                <button className={`filter-tab ${filterTab === 'performance' ? 'active' : ''}`}
                  onClick={() => setFilterTab('performance')} type="button">
                  {t('scraper.performance')}
                  {perfFilterCount > 0 && <span className="filter-tab-badge">{perfFilterCount}</span>}
                </button>
              </div>

              {/* Filter body */}
              <div style={{ padding: 16 }}>
                {filterTab === 'creator' && (
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={14}>
                      <Cascader options={CATEGORIES} value={selectedCategories}
                        onChange={(val) => setSelectedCategories(val as string[][])}
                        multiple placeholder={t('scraper.productCategory')} style={{ width: '100%' }}
                        showSearch={{ filter: (input, path) =>
                          path.some((opt) => (opt.label as string).toLowerCase().includes(input.toLowerCase()))
                        }}
                        maxTagCount="responsive" />
                    </Col>
                    <Col xs={24} md={10}>
                      <Select options={CONTENT_TYPES} value={contentType || undefined}
                        onChange={setContentType} placeholder={t('scraper.contentType')}
                        style={{ width: '100%' }} allowClear />
                    </Col>
                  </Row>
                )}

                {filterTab === 'performance' && (
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12}>
                      <CheckboxDropdown options={GMV_OPTIONS} value={gmv} onChange={setGmv}
                        placeholder={t('scraper.gmv')} />
                    </Col>
                    <Col xs={24} sm={12}>
                      <CheckboxDropdown options={ITEMS_SOLD_OPTIONS} value={itemsSold}
                        onChange={setItemsSold} placeholder={t('scraper.itemsSold')} />
                    </Col>
                    <Col xs={24}>
                      <Dropdown trigger={['click']}
                        dropdownRender={() => (
                          <div style={{
                            background: 'var(--bg-card)', borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: 20, minWidth: 280,
                            border: '1px solid var(--border-color)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <Text style={{ fontSize: 13 }}>{t('scraper.above')}</Text>
                              <InputNumber min={0} max={100000} value={liveViewerMin}
                                onChange={(v) => setLiveViewerMin(v || 0)} size="small" style={{ width: 80 }} />
                            </div>
                            <Slider value={valueToSlider(liveViewerMin)}
                              onChange={(pos) => setLiveViewerMin(sliderToValue(pos))}
                              marks={LIVE_VIEWER_MARKS} step={1}
                              tooltip={{ formatter: (pos) => pos !== undefined ? sliderToValue(pos).toLocaleString() : '0' }} />
                            <Checkbox checked={filterLiveLink} onChange={(e) => setFilterLiveLink(e.target.checked)}
                              style={{ marginTop: 8 }}>
                              <Text style={{ fontSize: 12 }}>{t('scraper.filterByLiveLink')}</Text>
                            </Checkbox>
                          </div>
                        )}>
                        <Button style={{
                          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          height: 32, borderColor: liveViewerMin > 0 ? '#FE2C55' : undefined, borderRadius: 8,
                        }}>
                          <Space>
                            <Text style={{ color: liveViewerMin > 0 ? '#FE2C55' : 'var(--text-secondary)', fontSize: 13 }}>
                              {t('scraper.liveViewerAvg')}
                            </Text>
                            {liveViewerMin > 0 && (
                              <span style={{
                                fontSize: 10, background: 'rgba(254,44,85,0.1)', color: '#FE2C55',
                                padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                              }}>1</span>
                            )}
                          </Space>
                          <DownOutlined style={{ fontSize: 10, color: 'var(--text-secondary)' }} />
                        </Button>
                      </Dropdown>
                    </Col>
                  </Row>
                )}
              </div>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? t('settings.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
