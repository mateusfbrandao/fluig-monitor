/* eslint-disable react/prop-types */
/* eslint-disable react/require-default-props */
import './index.scss';

interface StatProps {
  heading: string;
  prefix: string;
  suffix?: string;
  description?: string;
}

/**
 * Stat component. Ideal for displaying a number on dashboards.
 *  Receives a "heading" property that will display it.
 */
const Stat: React.FC<StatProps> = ({ heading, prefix, suffix, description }) => {
  return (
    <div className="stat-container">
      <span className="font-soft stat-label">{prefix}</span>
      <h3>{heading}</h3>
      {description && <p className="stat-description">{description}</p>}
      {suffix && <span className="font-soft stat-suffix">{suffix}</span>}
    </div>
  );
};

export default Stat;
