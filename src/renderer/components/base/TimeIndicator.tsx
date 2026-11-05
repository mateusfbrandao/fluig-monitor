/* eslint-disable react/require-default-props */
import { FiClock } from 'react-icons/fi';
import { safeDate } from '../../utils/formatDate';

interface Props {
  date: Date | string | number | null | undefined;
  mode?: 'FULL' | 'COMPACT' | 'AUTO';
  noMargin?: boolean;
}

/**
 * Renders a time indicator string.
 * Accepts Date, string (ISO), or timestamp number, handling conversion safely.
 */
export default function TimeIndicator({
  date,
  mode = 'AUTO',
  noMargin = false,
}: Props) {
  const parsedDate = safeDate(date);
  if (!parsedDate) {
    return null;
  }

  let dateFormat = '';

  switch (mode) {
    case 'AUTO':
      dateFormat =
        parsedDate.toLocaleDateString() === new Date().toLocaleDateString()
          ? parsedDate.toLocaleTimeString()
          : parsedDate.toLocaleString();
      break;
    case 'COMPACT':
      dateFormat = parsedDate.toLocaleTimeString();
      break;
    case 'FULL':
      dateFormat = parsedDate.toLocaleString();
      break;
    default:
      dateFormat = parsedDate.toLocaleString();
      break;
  }

  return (
    <div className="time-indicator" style={noMargin ? { margin: 0 } : {}}>
      <FiClock />
      {dateFormat}
    </div>
  );
}
