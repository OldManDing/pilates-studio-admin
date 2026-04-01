import type { FC } from 'react';
import { Avatar } from 'antd';
import { getToneColor } from '@/utils/format';
import type { AccentTone } from '@/types';

type Props = {
  name: string;
  tone?: AccentTone;
};

const MemberAvatar: FC<Props> = ({ name, tone = 'mint' }) => {
  const colors = getToneColor(tone);

  return (
    <Avatar style={{ background: colors.soft, color: colors.solid, fontWeight: 800 }}>
      {name.slice(0, 1)}
    </Avatar>
  );
};

export default MemberAvatar;
