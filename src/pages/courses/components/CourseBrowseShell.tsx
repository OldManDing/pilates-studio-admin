import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import EmptyState from '@/components/EmptyState';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';
import CourseListCard, { type CourseListCardProps } from './CourseListCard';

type CourseBrowseFilterOption = {
  label: string;
  value: string;
};

export type CourseBrowseShellProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  resultCountText: string;
  searchValue: string;
  searchPlaceholder: string;
  typeValue: string;
  typeOptions: CourseBrowseFilterOption[];
  levelValue: string;
  levelOptions: CourseBrowseFilterOption[];
  resetLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  courses: CourseListCardProps[];
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onReset: () => void;
};

export default function CourseBrowseShell({
  eyebrow,
  title,
  subtitle,
  resultCountText,
  searchValue,
  searchPlaceholder,
  typeValue,
  typeOptions,
  levelValue,
  levelOptions,
  resetLabel,
  emptyTitle,
  emptyDescription,
  courses,
  onSearchChange,
  onTypeChange,
  onLevelChange,
  onReset,
}: CourseBrowseShellProps) {
  return (
    <section className={`${pageCls.surface} ${styles.courseBrowseShell}`}>
      <div className={styles.courseBrowseHeader}>
        <div>
          {eyebrow ? <div className={styles.courseEyebrow}>{eyebrow}</div> : null}
          <div className={styles.courseBrowseTitleRow}>
            <h2 className={styles.courseBrowseTitle}>{title}</h2>
            <span className={styles.courseBrowseCount}>{resultCountText}</span>
          </div>
          <p className={styles.courseBrowseSubtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.courseBrowseToolbar}>
        <Input
          className={`${pageCls.toolbarSearch} ${styles.courseBrowseSearch}`}
          size="large"
          value={searchValue}
          prefix={<SearchOutlined />}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <div className={styles.courseBrowseFilters}>
          <Select
            value={typeValue}
            size="large"
            className={pageCls.toolbarSelect}
            options={typeOptions}
            onChange={onTypeChange}
          />
          <Select
            value={levelValue}
            size="large"
            className={pageCls.toolbarSelect}
            options={levelOptions}
            onChange={onLevelChange}
          />
          <Button size="large" className={pageCls.toolbarGhostAction} onClick={onReset}>
            {resetLabel}
          </Button>
        </div>
      </div>

      {courses.length ? (
        <div className={`${widgetCls.courseGrid} ${styles.courseBrowseGrid}`}>
          {courses.map((course) => (
            <CourseListCard key={course.id} {...course} />
          ))}
        </div>
      ) : (
        <div className={styles.courseBrowseEmpty}>
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}
    </section>
  );
}
