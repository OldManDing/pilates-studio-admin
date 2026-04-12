import { Button } from 'antd';

type FilterModalFooterProps = {
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
  resetText?: string;
  applyText?: string;
};

export default function FilterModalFooter({
  onReset,
  onCancel,
  onApply,
  resetText = '重置筛选',
  applyText = '应用条件',
}: FilterModalFooterProps) {
  return (
    <>
      <Button onClick={onReset}>{resetText}</Button>
      <Button onClick={onCancel}>取消</Button>
      <Button type="primary" onClick={onApply}>{applyText}</Button>
    </>
  );
}
