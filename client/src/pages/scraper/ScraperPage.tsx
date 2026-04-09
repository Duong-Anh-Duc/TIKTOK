import { useState, useEffect, useRef } from 'react';
import {
  Typography, Button, Table, Space, Popconfirm, message, Tooltip,
  Progress, InputNumber, Cascader, Select, Row, Col, Slider,
  Checkbox, Dropdown, Card, Modal,
} from 'antd';
import {
  PlayCircleOutlined, DownloadOutlined,
  DeleteOutlined, FileExcelOutlined, FilterOutlined,
  DownOutlined, EyeOutlined, LinkOutlined, EditOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AnimatedPage from '@/components/common/AnimatedPage';
import apiClient from '@/api/client';
import { scraperApi } from '@/api/scraper/scraper.api';
import { CATEGORIES, CONTENT_TYPES, GMV_OPTIONS, ITEMS_SOLD_OPTIONS } from '@/data/categories';
import { API, LIVE_VIEWER_MARKS, sliderToValue, valueToSlider } from '@/constants';
import CheckboxDropdown from '@/components/common/CheckboxDropdown';

const { Title, Text } = Typography;

export default function ScraperPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);

  const [selectedCategories, setSelectedCategories] = useState<string[][]>([]);
  const [contentType, setContentType] = useState('');
  const [gmv, setGmv] = useState<string[]>([]);
  const [itemsSold, setItemsSold] = useState<string[]>([]);
  const [liveViewerMin, setLiveViewerMin] = useState(0);
  const [filterLiveLink, setFilterLiveLink] = useState(false);
  const [filterTab, setFilterTab] = useState<'creator' | 'performance'>('creator');
  const [maxCreators, setMaxCreators] = useState<number>(0);
  const [concurrentTabs, setConcurrentTabs] = useState<number>(5);

  // Load concurrentTabs từ settings
  useEffect(() => {
    apiClient.get('/settings').then((res: any) => {
      const tabs = res.data?.data?.concurrentTabs;
      if (tabs) setConcurrentTabs(tabs);
    }).catch(() => {});
  }, []);

  // Bulk selection
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState('');
  const [renameValue, setRenameValue] = useState('');

  // Excel preview
  const [preparing, setPreparing] = useState(false);
  const [preparingMsg, setPreparingMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handlePreview = async (fileName: string) => {
    setPreviewName(fileName);
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await scraperApi.downloadFile(fileName);
      const arrayBuffer = await (res.data as Blob).arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (json.length > 0) {
        const cols = Object.keys(json[0]).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          width: 150,
          ellipsis: true,
          render: (v: any) => v != null ? String(v) : '',
        }));
        setPreviewColumns(cols);
        setPreviewData(json.map((row, i) => ({ ...row, __key: i })));
      } else {
        setPreviewColumns([]);
        setPreviewData([]);
      }
    } catch {
      message.error(t('scraper.downloadError'));
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const { data: filesRes, isLoading: filesLoading } = useQuery({
    queryKey: ['scraper-files'],
    queryFn: () => scraperApi.listFiles(),
    refetchInterval: jobId ? API.filesPollInterval : false,
  });
  const allFiles = filesRes?.data?.data || [];
  const files = allFiles.filter((f: any) => !f.name.includes('-simple'));

  const { data: jobRes } = useQuery({
    queryKey: ['scrape-job', jobId],
    queryFn: () => scraperApi.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status;
      return status === 'running' ? API.jobPollInterval : false;
    },
  });
  const job = jobRes?.data?.data;
  const isRunning = job?.status === 'running';

  useEffect(() => {
    if (job?.status === 'completed') {
      message.success(t('scraper.scrapeComplete', { count: job.scraped }));
      queryClient.invalidateQueries({ queryKey: ['scraper-files'] });
      setTimeout(() => setJobId(null), 3000);
    } else if (job?.status === 'failed') {
      if (job.scraped > 0) {
        message.warning(t('scraper.scrapeFailedPartial', { scraped: job.scraped, error: job.error }));
        queryClient.invalidateQueries({ queryKey: ['scraper-files'] });
      } else {
        message.error(t('scraper.scrapeFailed', { error: job.error }));
      }
      setTimeout(() => setJobId(null), 5000);
    }
  }, [job?.status]);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (preparing || isRunning) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [preparing, isRunning]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const buildFilters = () => {
    const categoryLabels = selectedCategories.map((path) => {
      let current: any = CATEGORIES;
      const labels: string[] = [];
      for (const val of path) {
        const found = current.find((c: any) => c.value === val);
        if (found) { labels.push(found.label); current = found.children || []; }
      }
      return labels;
    });
    const gmvLabels = gmv.map(v => GMV_OPTIONS.find(o => o.value === v)?.label || v);
    const itemsSoldLabels = itemsSold.map(v => ITEMS_SOLD_OPTIONS.find(o => o.value === v)?.label || v);
    return { categories: categoryLabels, contentType, gmv: gmvLabels, itemsSold: itemsSoldLabels, liveViewerMin };
  };

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const filters = buildFilters();
      setPreparing(true);
      setPreparingMsg(t('scraper.preparingFilter'));
      await scraperApi.testFilter(filters);
      setPreparingMsg(t('scraper.preparingScrape'));
      return scraperApi.scrape({ minCreators: maxCreators || 0, concurrentTabs, ...filters });
    },
    onSuccess: (res) => {
      const id = res.data?.data?.jobId;
      if (id) { setJobId(id); }
      setPreparing(false);
      setPreparingMsg('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || t('scraper.scrapeError'));
      setPreparing(false);
      setPreparingMsg('');
    },
  });

  const handleDownload = async (fileName: string) => {
    try {
      const res = await scraperApi.downloadFile(fileName);
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error(t('scraper.downloadError')); }
  };

  const deleteMutation = useMutation({
    mutationFn: (name: string) => scraperApi.deleteFile(name),
    onSuccess: () => { message.success(t('scraper.deleted')); queryClient.invalidateQueries({ queryKey: ['scraper-files'] }); },
  });

  const renameMutation = useMutation({
    mutationFn: ({ name, newName }: { name: string; newName: string }) => scraperApi.renameFile(name, newName),
    onSuccess: () => {
      message.success(t('scraper.fileRenamed'));
      queryClient.invalidateQueries({ queryKey: ['scraper-files'] });
      setRenameOpen(false);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || t('common.error')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (names: string[]) => scraperApi.deleteBulk(names),
    onSuccess: () => {
      message.success(t('scraper.deleted'));
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['scraper-files'] });
    },
  });

  const handleBulkDownload = async () => {
    for (const fileName of selectedFiles) {
      await handleDownload(fileName);
    }
  };

  const handleCopyLink = (fileName: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/api/scraper/files/public/${encodeURIComponent(fileName)}`;
    navigator.clipboard.writeText(link);
    message.success(t('scraper.linkCopied'));
  };

  const openRename = (fileName: string) => {
    setRenameTarget(fileName);
    setRenameValue(fileName.replace('.xlsx', ''));
    setRenameOpen(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const creatorFilterCount = selectedCategories.length + (contentType ? 1 : 0);
  const perfFilterCount = gmv.length + itemsSold.length + (liveViewerMin > 0 ? 1 : 0);
  const filterCount = creatorFilterCount + perfFilterCount;

  const columns = [
    {
      title: t('scraper.stt'), key: 'stt', width: 60, align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: 13 }}>{(currentPage - 1) * currentPageSize + index + 1}</span>
      ),
    },
    {
      title: t('scraper.file'), dataIndex: 'name', key: 'name',
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileExcelOutlined style={{ fontSize: 16, color: '#25F4EE' }} />
          <span className="file-name">{name}</span>
        </div>
      ),
    },
    {
      title: t('scraper.fileSize'), dataIndex: 'size', key: 'size', width: 100,
      align: 'center' as const,
      responsive: ['md' as const],
      render: (size: number) => <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatSize(size)}</span>,
    },
    {
      title: t('scraper.duration'), dataIndex: 'duration', key: 'duration', width: 120,
      align: 'center' as const,
      responsive: ['md' as const],
      render: (duration: number | null) => (
        <span style={{ fontSize: 13, color: duration ? '#25F4EE' : 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {duration ? formatElapsed(duration) : '—'}
        </span>
      ),
    },
    {
      title: t('scraper.createdAt'), dataIndex: 'createdAt', key: 'createdAt', width: 170,
      responsive: ['lg' as const],
      render: (v: string) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {new Date(v).toLocaleString()}
        </span>
      ),
    },
    {
      title: t('common.actions'), key: 'actions', width: 160, align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size={6}>
          <Tooltip title={t('scraper.preview')}>
            <Button type="link" size="small" icon={<EyeOutlined />}
              onClick={() => handlePreview(record.name)}
              style={{ color: '#FE2C55', padding: 0 }} />
          </Tooltip>
          <Dropdown menu={{ items: [
            { key: 'full', label: t('scraper.downloadFull'), onClick: () => handleDownload(record.name) },
            ...(allFiles.some((f: any) => f.name === record.name.replace('.xlsx', '-simple.xlsx'))
              ? [{ key: 'simple', label: t('scraper.downloadSimple'), onClick: () => handleDownload(record.name.replace('.xlsx', '-simple.xlsx')) }]
              : []),
          ]}} trigger={['click']}>
            <Button type="link" size="small" icon={<DownloadOutlined />}
              style={{ color: '#25F4EE', padding: 0 }} />
          </Dropdown>
          <Dropdown menu={{ items: [
            { key: 'full', label: t('scraper.shareFull'), onClick: () => handleCopyLink(record.name) },
            ...(allFiles.some((f: any) => f.name === record.name.replace('.xlsx', '-simple.xlsx'))
              ? [{ key: 'simple', label: t('scraper.shareSimple'), onClick: () => handleCopyLink(record.name.replace('.xlsx', '-simple.xlsx')) }]
              : []),
          ]}} trigger={['click']}>
            <Button type="link" size="small" icon={<LinkOutlined />}
              style={{ color: '#9B59B6', padding: 0 }} />
          </Dropdown>
          <Tooltip title={t('scraper.rename')}>
            <Button type="link" size="small" icon={<EditOutlined />}
              onClick={() => openRename(record.name)}
              style={{ color: '#F59E0B', padding: 0 }} />
          </Tooltip>
          <Popconfirm title={t('scraper.deleteFile')} onConfirm={() => deleteMutation.mutate(record.name)}
            okText={t('scraper.deleteConfirm')} cancelText={t('common.cancel')}>
            <Tooltip title={t('common.delete')}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}
                style={{ padding: 0 }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AnimatedPage>
      {/* Animated Steps */}
      <div className="scraper-steps">
        <div className="steps-flow">
          {[
            { icon: <img src="/omo.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' as const }} />, label: t('scraper.stepOmmo'), tip: t('scraper.tipOmmo') },
            { icon: <img src="/tiktok.avif" alt="" style={{ width: 18, height: 18, objectFit: 'contain' as const }} />, label: t('scraper.stepLogin'), tip: t('scraper.tipLogin') },
            { icon: <img src="/mailtm1.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' as const }} />, label: t('scraper.stepMailtm'), tip: t('scraper.tipMailtm') },
            { icon: <FilterOutlined />, label: t('scraper.step1'), tip: t('scraper.tipFilter') },
            { icon: <PlayCircleOutlined />, label: t('scraper.step2'), tip: t('scraper.tipScrape') },
            { icon: <DownloadOutlined />, label: t('scraper.step3'), tip: t('scraper.tipDownload') },
          ].map((step, i) => (
            <div key={i} style={{ display: 'contents' }}>
              {i > 0 && (
                <div className="step-flow-line">
                  <div className="step-flow-line-fill" style={{ animationDelay: `${i * 1.5 - 0.9}s` }} />
                </div>
              )}
              <Tooltip title={step.tip} placement="bottom">
                <div className="step-flow-item" style={{ animationDelay: `${i * 1.5}s`, cursor: 'pointer' }}>
                  <div className="step-flow-icon" style={{ animationDelay: `${i * 1.5}s` }}>
                    {step.icon}
                  </div>
                  <span className="step-flow-label">{step.label}</span>
                </div>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <Card
            size="small"
            styles={{ body: { padding: 0 } }}
            style={{ borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="filter-card-header">
              <FilterOutlined style={{ fontSize: 16, color: '#FE2C55' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('scraper.filterBy')}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={`filter-tab ${filterTab === 'creator' ? 'active' : ''}`}
                  onClick={() => setFilterTab('creator')}>
                  {t('scraper.creator')}
                  {creatorFilterCount > 0 && <span className="filter-tab-badge">{creatorFilterCount}</span>}
                </button>
                <button className={`filter-tab ${filterTab === 'performance' ? 'active' : ''}`}
                  onClick={() => setFilterTab('performance')}>
                  {t('scraper.performance')}
                  {perfFilterCount > 0 && <span className="filter-tab-badge">{perfFilterCount}</span>}
                </button>
              </div>
              {filterCount > 0 && (
                <button className="filter-reset" onClick={() => {
                  setSelectedCategories([]); setContentType(''); setGmv([]); setItemsSold([]); setLiveViewerMin(0); setFilterLiveLink(false);
                }}>{t('scraper.reset')}</button>
              )}
            </div>

            <div className="filter-card-body">
              {filterTab === 'creator' && (
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={14}>
                    <Cascader options={CATEGORIES} value={selectedCategories}
                      onChange={(val) => setSelectedCategories(val as string[][])}
                      multiple placeholder={t('scraper.productCategory')} style={{ width: '100%' }}
                      showSearch={{ filter: (input, path) =>
                        path.some((opt) => (opt.label as string).toLowerCase().includes(input.toLowerCase()))
                      }}
                      maxTagCount="responsive" disabled={isRunning} />
                  </Col>
                  <Col xs={24} md={10}>
                    <Select options={CONTENT_TYPES} value={contentType || undefined}
                      onChange={setContentType} placeholder={t('scraper.contentType')}
                      style={{ width: '100%' }} disabled={isRunning} allowClear />
                  </Col>
                </Row>
              )}

              {filterTab === 'performance' && (
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <CheckboxDropdown options={GMV_OPTIONS} value={gmv} onChange={setGmv}
                      placeholder={t('scraper.gmv')} disabled={isRunning} />
                  </Col>
                  <Col xs={24} sm={12}>
                    <CheckboxDropdown options={ITEMS_SOLD_OPTIONS} value={itemsSold}
                      onChange={setItemsSold} placeholder={t('scraper.itemsSold')} disabled={isRunning} />
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
                            marks={LIVE_VIEWER_MARKS} step={1} disabled={isRunning}
                            tooltip={{ formatter: (pos) => pos !== undefined ? sliderToValue(pos).toLocaleString() : '0' }} />
                          <Checkbox checked={filterLiveLink} onChange={(e) => setFilterLiveLink(e.target.checked)}
                            disabled={isRunning} style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 12 }}>{t('scraper.filterByLiveLink')}</Text>
                          </Checkbox>
                        </div>
                      )}
                      disabled={isRunning}>
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

            <div className="filter-card-footer">
              <InputNumber
                min={0}
                value={maxCreators || undefined}
                onChange={(v) => setMaxCreators(v || 0)}
                placeholder={t('scraper.maxCreators')}
                className="input-max-creators"
                size="large"
              />
              <Button
                type="primary" size="large" icon={<PlayCircleOutlined />}
                loading={scrapeMutation.isPending || isRunning}
                onClick={() => scrapeMutation.mutate()}
                className="btn-scrape"
                style={{ flex: 1 }}>
                {isRunning ? t('scraper.scraping') : t('scraper.startScraping')}
              </Button>
            </div>

            {isRunning && job && (
              <div style={{ padding: '0 24px 16px' }}>
                <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('scraper.scrapingCreators', { scraped: job.scraped, total: job.total || '?' })}
                </div>
                <Progress percent={job.total > 0 ? Math.round((job.scraped / job.total) * 100) : 0}
                  status="active" strokeColor={{ from: '#FE2C55', to: '#25F4EE' }} size="small" />
              </div>
            )}
      </Card>

      {/* File Table */}
      <Card
        style={{ borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', marginTop: 20 }}
        styles={{ body: { padding: 0 } }}
      >
        {selectedFiles.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            background: 'rgba(254,44,85,0.04)', borderBottom: '1px solid var(--border-color)',
          }}>
            <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('scraper.selected', { count: selectedFiles.length })}
            </Text>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleBulkDownload}
              style={{ borderRadius: 8 }}>
              {t('scraper.downloadAll')}
            </Button>
            <Popconfirm
              title={t('scraper.deleteSelectedConfirm', { count: selectedFiles.length })}
              onConfirm={() => bulkDeleteMutation.mutate(selectedFiles)}
              okText={t('scraper.deleteConfirm')}
              cancelText={t('common.cancel')}
            >
              <Button size="small" danger icon={<DeleteOutlined />}
                loading={bulkDeleteMutation.isPending} style={{ borderRadius: 8 }}>
                {t('scraper.deleteAll')}
              </Button>
            </Popconfirm>
          </div>
        )}
        <Table
          dataSource={files}
          columns={columns}
          rowKey="name"
          loading={filesLoading}
          size="middle"
          scroll={{ x: 800 }}
          rowSelection={{
            selectedRowKeys: selectedFiles,
            onChange: (keys) => setSelectedFiles(keys as string[]),
          }}
          locale={{ emptyText: t('scraper.noFiles') }}
          pagination={{
            current: currentPage,
            pageSize: currentPageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            showTotal: (total) => t('scraper.total', { count: total }),
            showQuickJumper: true,
            size: 'default',
            style: { padding: '12px 16px', margin: 0 },
            onChange: (page, pageSize) => {
              setCurrentPage(page);
              setCurrentPageSize(pageSize);
            },
          }}
        />
      </Card>

      {/* Fullscreen Overlay */}
      {(preparing || (isRunning && job)) && (
        <div className="scraper-overlay">
          {/* Animated background */}
          <div className="overlay-grid" />
          <div className="overlay-orb overlay-orb-1" />
          <div className="overlay-orb overlay-orb-2" />
          <div className="overlay-orb overlay-orb-3" />
          <div className="overlay-shooting overlay-shooting-1" />
          <div className="overlay-shooting overlay-shooting-2" />

          {/* Floating particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`overlay-particle overlay-particle-${(i % 3) + 1}`}
              style={{
                top: `${[10,25,45,65,80,15,55,35,85,50,30,70][i]}%`,
                left: `${[8,30,75,20,60,85,42,92,18,55,68,12][i]}%`,
                width: [3,4,2,5,3,4,2,3,5,2,4,3][i],
                height: [3,4,2,5,3,4,2,3,5,2,4,3][i],
                animationDelay: `${i * 0.25}s`,
                animationDuration: `${[3,4,5,3,4,5,3,4,3,5,4,3][i]}s`,
              }} />
          ))}

          <div className="scraper-overlay-content">
            {/* Logo with rings */}
            <div className="overlay-logo-wrap">
              <img src="/tiktok.avif" alt="TikTok" className="overlay-logo" />
              <div className="overlay-ring" />
              <div className="overlay-ring overlay-ring-2" />
            </div>

            <Title level={4} style={{ color: '#fff', margin: '28px 0 8px', letterSpacing: '-0.3px', fontSize: 22 }}>
              {t('scraper.scrapingData')}
            </Title>

            <div className="overlay-timer">
              <span className="overlay-timer-icon">&#9201;</span>
              {formatElapsed(elapsed)}
            </div>

            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              {preparing
                ? preparingMsg
                : (job?.message || ((job?.scraped ?? 0) > 0
                  ? t('scraper.scrapingCreators', { scraped: job!.scraped, total: job!.total || '?' })
                  : t('scraper.applyingFilter')))
              }
            </Text>

            {/* Progress */}
            {(job?.total ?? 0) > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('common.loading')}
                  </span>
                  <span style={{ color: '#FE2C55', fontSize: 13, fontWeight: 700 }}>
                    {Math.round((job!.scraped / job!.total) * 100)}%
                  </span>
                </div>
                <Progress
                  percent={Math.round((job!.scraped / job!.total) * 100)}
                  showInfo={false}
                  strokeColor={{ from: '#FE2C55', to: '#25F4EE' }}
                  trailColor="rgba(255,255,255,0.06)"
                  size={{ height: 6 }}
                />
              </div>
            )}

            {/* Stats */}
            <div className="overlay-stats">
              <div className="overlay-stat-box">
                <div className="overlay-stat-value" style={{ color: '#25F4EE' }}>{job?.scraped ?? 0}</div>
                <div className="overlay-stat-label">{t('scraper.scraped')}</div>
              </div>
              <div className="overlay-stat-divider" />
              <div className="overlay-stat-box">
                <div className="overlay-stat-value" style={{ color: '#FE2C55' }}>{job?.total || '...'}</div>
                <div className="overlay-stat-label">{t('scraper.detected')}</div>
              </div>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 28, letterSpacing: 0.3 }}>
              {t('scraper.doNotClose')}
            </div>
          </div>
        </div>
      )}
      {/* Excel Preview Modal */}
      <Modal
        title={previewName}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0, maxHeight: 'calc(100vh - 120px)', overflow: 'auto' } }}
      >
        <Table
          dataSource={previewData}
          columns={previewColumns}
          rowKey="__key"
          loading={previewLoading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={false}
        />
      </Modal>

      {/* Rename Modal */}
      <Modal
        title={t('scraper.renameTitle')}
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        onOk={() => renameMutation.mutate({ name: renameTarget, newName: renameValue })}
        confirmLoading={renameMutation.isPending}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={400}
      >
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
            {t('scraper.newFileName')}
          </Typography.Text>
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border-color)', fontSize: 14,
              background: 'var(--bg-card)', color: 'var(--text-primary)',
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
            .xlsx
          </Typography.Text>
        </div>
      </Modal>
    </AnimatedPage>
  );
}
