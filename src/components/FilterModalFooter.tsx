import { Button } from 'antd';

type FilterModalFooterProps = {
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
};

export default function FilterModalFooter({ onReset, onCancel, onApply }: FilterModalFooterProps) {
  return (
    <>
      <Button onClick={onReset}>重置</Button>
      <Button onClick={onCancel}>取消</Button>
      <Button type="primary" onClick={onApply}>应用筛选</Button>
    </>
  );
}
