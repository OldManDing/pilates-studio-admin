import {
  BookOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Spin,
  Switch,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { authApi } from '@/services/auth';
import {
  knowledgeApi,
  type KnowledgeArticle,
  type KnowledgeArticlePayload,
} from '@/services/knowledge';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import styles from './index.module.css';

const { TextArea } = Input;

type ArticleFormValues = {
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const PAGE_SIZE = 10;

const categoryOptions = [
  { value: 'booking', label: '预约相关' },
  { value: 'member', label: '会员服务' },
  { value: 'account', label: '账号问题' },
  { value: 'general', label: '通用说明' },
];

const categoryLabelMap = categoryOptions.reduce<Record<string, string>>((map, item) => {
  map[item.value] = item.label;
  return map;
}, {});

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: '全部状态' },
  { value: 'ACTIVE', label: '小程序可见' },
  { value: 'INACTIVE', label: '已下架' },
];

const iconMap = {
  total: <BookOutlined />,
  active: <CheckCircleOutlined />,
  inactive: <StopOutlined />,
  categories: <TagsOutlined />,
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const getCategoryLabel = (category: string) => categoryLabelMap[category] || category;

const buildPayload = (values: ArticleFormValues): KnowledgeArticlePayload => ({
  category: values.category.trim(),
  question: values.question.trim(),
  answer: values.answer.trim(),
  sortOrder: values.sortOrder ?? 0,
  isActive: values.isActive ?? true,
});

export default function KnowledgePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ArticleFormValues>();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailArticle, setDetailArticle] = useState<KnowledgeArticle | null>(null);
  const [updatingArticleId, setUpdatingArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');

  const canWriteKnowledge = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['WRITE:KNOWLEDGE']);
  const canManageKnowledge = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['MANAGE:KNOWLEDGE']);

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await knowledgeApi.getAll({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: searchValue || undefined,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      });

      setArticles(response.data || []);
      setTotal(response.meta?.total ?? response.data?.length ?? 0);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载知识库失败'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, currentPage, messageApi, searchValue, statusFilter]);

  useEffect(() => {
    void authApi.getMe()
      .then((me) => {
        setCurrentUserPermissions(me.role?.permissions || []);
        setCurrentUserRoleCode(me.role?.code || '');
      })
      .catch(() => {
        setCurrentUserPermissions([]);
        setCurrentUserRoleCode('');
      });
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const summaryStats = useMemo(() => {
    const activeCount = articles.filter((article) => article.isActive).length;
    const categoryCount = new Set(articles.map((article) => article.category)).size;

    return [
      {
        title: '知识条目',
        value: String(total),
        hint: '当前筛选匹配总量',
        tone: 'mint' as const,
        icon: 'total' as const,
      },
      {
        title: '当前页可见',
        value: String(activeCount),
        hint: '会同步展示在小程序帮助页',
        tone: 'violet' as const,
        icon: 'active' as const,
      },
      {
        title: '当前页下架',
        value: String(articles.length - activeCount),
        hint: '小程序不再展示',
        tone: 'orange' as const,
        icon: 'inactive' as const,
      },
      {
        title: '当前页分类',
        value: String(categoryCount),
        hint: '用于帮助页筛选',
        tone: 'pink' as const,
        icon: 'categories' as const,
      },
    ];
  }, [articles, total]);

  const resultSummary = [
    categoryFilter !== 'ALL' ? `分类：${getCategoryLabel(categoryFilter)}` : null,
    statusFilter !== 'ALL' ? `状态：${statusFilter === 'ACTIVE' ? '小程序可见' : '已下架'}` : null,
    searchValue ? `关键词：${searchValue}` : null,
  ].filter(Boolean);

  const openCreateModal = () => {
    if (!canWriteKnowledge) {
      messageApi.warning('当前账号没有知识库写入权限');
      return;
    }

    setEditingArticle(null);
    form.resetFields();
    form.setFieldsValue({
      category: 'booking',
      question: '',
      answer: '',
      sortOrder: 0,
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEditModal = (article: KnowledgeArticle) => {
    if (!canWriteKnowledge) {
      messageApi.warning('当前账号没有知识库写入权限');
      return;
    }

    setEditingArticle(article);
    form.setFieldsValue({
      category: article.category,
      question: article.question,
      answer: article.answer,
      sortOrder: article.sortOrder,
      isActive: article.isActive,
    });
    setFormOpen(true);
  };

  const closeFormModal = () => {
    setFormOpen(false);
    setEditingArticle(null);
    form.resetFields();
  };

  const handleSaveArticle = async () => {
    if (!canWriteKnowledge) {
      messageApi.warning('当前账号没有知识库写入权限');
      return;
    }

    let values: ArticleFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload(values);

      if (editingArticle) {
        await knowledgeApi.update(editingArticle.id, payload);
        messageApi.success('知识条目已更新，小程序将展示最新内容');
      } else {
        await knowledgeApi.create(payload);
        messageApi.success('知识条目已新增，小程序帮助页可同步展示');
      }

      closeFormModal();
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await loadArticles();
      }
    } catch (err) {
      messageApi.error(getErrorMessage(err, editingArticle ? '更新知识条目失败' : '新增知识条目失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (article: KnowledgeArticle) => {
    if (!canWriteKnowledge) {
      messageApi.warning('当前账号没有知识库写入权限');
      return;
    }

    try {
      setUpdatingArticleId(article.id);
      await knowledgeApi.update(article.id, { isActive: !article.isActive });
      messageApi.success(article.isActive ? '已下架，小程序不再展示' : '已上架，小程序帮助页可见');
      await loadArticles();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '更新上下架状态失败'));
    } finally {
      setUpdatingArticleId(null);
    }
  };

  const handleDeleteArticle = async (article: KnowledgeArticle) => {
    if (!canManageKnowledge) {
      messageApi.warning('当前账号没有知识库删除权限');
      return;
    }

    try {
      setDeletingArticleId(article.id);
      await knowledgeApi.delete(article.id);
      messageApi.success('知识条目已删除');
      await loadArticles();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除知识条目失败'));
    } finally {
      setDeletingArticleId(null);
    }
  };

  const applySearch = () => {
    setCurrentPage(1);
    setSearchValue(searchDraft.trim());
  };

  if (loading && articles.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="帮助知识库"
          subtitle="维护小程序帮助页 FAQ 内容、分类与上下架状态。"
          extra={canWriteKnowledge ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增知识</ActionButton> : null}
        />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}

      <PageHeader
        title="帮助知识库"
        subtitle="维护小程序帮助页 FAQ 内容、分类与上下架状态。"
        extra={canWriteKnowledge ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增知识</ActionButton> : null}
      />

      <div className={pageCls.heroGrid}>
        {summaryStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard title="知识条目">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>
                {resultSummary.length
                  ? `已按${resultSummary.join('、')}筛选，当前匹配 ${total} 条知识内容。`
                  : `当前共 ${total} 条知识内容，上架状态会直接控制小程序帮助页展示。`}
              </div>
              <div className={pageCls.statusMetaWrap}>
                <span className={pageCls.sectionMetaPill}>新增后自动同步</span>
                <span className={pageCls.sectionMetaPill}>下架后小程序隐藏</span>
              </div>
            </div>

            <div className={pageCls.toolbar}>
              <div className={`${pageCls.toolbarLeft} ${styles.knowledgeFilters}`}>
                <Input
                  allowClear
                  className={pageCls.toolbarSearch}
                  prefix={<SearchOutlined />}
                  placeholder="搜索问题或答案"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onPressEnter={applySearch}
                />
                <Select
                  value={categoryFilter}
                  className={`${pageCls.toolbarSelect} ${styles.filterSelect}`}
                  options={[
                    { value: 'ALL', label: '全部分类' },
                    ...categoryOptions,
                  ]}
                  onChange={(value) => {
                    setCurrentPage(1);
                    setCategoryFilter(value);
                  }}
                />
                <Select
                  value={statusFilter}
                  className={`${pageCls.toolbarSelect} ${styles.filterSelect}`}
                  options={statusFilterOptions}
                  onChange={(value: StatusFilter) => {
                    setCurrentPage(1);
                    setStatusFilter(value);
                  }}
                />
                <Button className={pageCls.toolbarGhostAction} icon={<SearchOutlined />} onClick={applySearch}>查询</Button>
              </div>
            </div>

            {articles.length ? (
              <>
                <div className={pageCls.sectionListStack}>
                  {articles.map((article) => (
                    <article key={article.id} className={styles.articleCard}>
                      <div className={styles.articleMain}>
                        <div className={styles.articleHeader}>
                          <div className={styles.articleTitleWrap}>
                            <span className={styles.categoryPill}>{getCategoryLabel(article.category)}</span>
                            <h3 className={styles.articleTitle}>{article.question}</h3>
                          </div>
                          <StatusTag status={article.isActive ? '正常' : '已停用'} />
                        </div>
                        <p className={styles.articlePreview}>{article.answer}</p>
                        <div className={styles.articleMetaRow}>
                          <span className={styles.metaPill}>排序 {article.sortOrder}</span>
                          <span className={styles.metaPill}>更新 {formatDateTime(article.updatedAt)}</span>
                        </div>
                      </div>

                      <aside className={styles.articleAside}>
                        <Button
                          size="large"
                          className={pageCls.cardActionSecondary}
                          icon={<EyeOutlined />}
                          onClick={() => setDetailArticle(article)}
                        >
                          查看详情
                        </Button>
                        {canWriteKnowledge ? (
                          <>
                            <Button
                              size="large"
                              className={pageCls.cardActionSecondary}
                              icon={<EditOutlined />}
                              onClick={() => openEditModal(article)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="large"
                              className={article.isActive ? pageCls.cardActionWarning : pageCls.cardActionPrimary}
                              type={article.isActive ? 'default' : 'primary'}
                              loading={updatingArticleId === article.id}
                              disabled={updatingArticleId !== null && updatingArticleId !== article.id}
                              onClick={() => handleToggleActive(article)}
                            >
                              {article.isActive ? '下架' : '上架'}
                            </Button>
                          </>
                        ) : null}
                        {canManageKnowledge ? (
                          <Popconfirm
                            title="删除知识条目"
                            description="删除后小程序帮助页也将不再展示，确定继续吗？"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDeleteArticle(article)}
                          >
                            <Button
                              danger
                              size="large"
                              className={pageCls.cardActionSecondary}
                              icon={<DeleteOutlined />}
                              loading={deletingArticleId === article.id}
                              disabled={deletingArticleId !== null && deletingArticleId !== article.id}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        ) : null}
                      </aside>
                    </article>
                  ))}
                </div>

                <div className={pageCls.sectionPagination}>
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={total}
                    showSizeChanger={false}
                    onChange={setCurrentPage}
                  />
                </div>
              </>
            ) : (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="暂无知识内容"
                  description="当前筛选条件下暂无 FAQ。新增并上架后，小程序帮助页会同步展示。"
                  actionText={canWriteKnowledge ? '新增知识' : undefined}
                  onAction={canWriteKnowledge ? openCreateModal : undefined}
                />
              </div>
            )}
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingArticle ? '编辑知识条目' : '新增知识条目'}
        open={formOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveArticle}
        confirmLoading={saving}
        okText={editingArticle ? '保存修改' : '新增'}
        cancelText="取消"
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" className={pageCls.crudModalForm}>
          <Form.Item name="category" label="帮助分类" rules={[{ required: true, message: '请选择帮助分类' }]}>
            <Select className={pageCls.settingsInput} options={categoryOptions} />
          </Form.Item>
          <Form.Item name="question" label="问题标题" rules={[{ required: true, whitespace: true, message: '请输入问题标题' }]}>
            <Input className={pageCls.settingsInput} placeholder="例如：如何取消预约？" />
          </Form.Item>
          <Form.Item name="answer" label="回答内容" rules={[{ required: true, whitespace: true, message: '请输入回答内容' }]}>
            <TextArea className={pageCls.settingsInput} rows={6} placeholder="请输入展示给小程序用户的帮助说明" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序值" rules={[{ required: true, message: '请输入排序值' }]}>
            <InputNumber className={pageCls.settingsInput} min={0} precision={0} />
          </Form.Item>
          <Form.Item name="isActive" label="小程序展示" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        rootClassName={pageCls.responsiveDetailDrawer}
        open={Boolean(detailArticle)}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailArticle?.question || '知识详情'}
        onClose={() => setDetailArticle(null)}
        extra={detailArticle && canWriteKnowledge ? (
          <Button type="primary" icon={<EditOutlined />} onClick={() => openEditModal(detailArticle)}>编辑</Button>
        ) : null}
      >
        {detailArticle ? (
          <div className={styles.drawerStack}>
            <div className={styles.overviewCard}>
              <div className={styles.overviewTop}>
                <div>
                  <span className={styles.categoryPill}>{getCategoryLabel(detailArticle.category)}</span>
                  <h2 className={styles.overviewTitle}>{detailArticle.question}</h2>
                </div>
                <StatusTag status={detailArticle.isActive ? '正常' : '已停用'} />
              </div>
              <p className={styles.contentText}>{detailArticle.answer}</p>
            </div>

            <SectionCard title="同步信息">
              <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                <Descriptions.Item label="分类">{getCategoryLabel(detailArticle.category)}</Descriptions.Item>
                <Descriptions.Item label="排序">{detailArticle.sortOrder}</Descriptions.Item>
                <Descriptions.Item label="小程序可见">{detailArticle.isActive ? '是' : '否'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(detailArticle.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(detailArticle.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
