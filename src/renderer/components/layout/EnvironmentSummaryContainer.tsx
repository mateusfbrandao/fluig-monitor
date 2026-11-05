import DatabasePanel from '../container/DatabasePanel';
import DiskPanel from '../container/DiskPanel';
import EnvironmentAvailabilityPanel from '../container/EnvironmentAvailabilityPanel';
import EnvironmentLicensesPanel from '../container/EnvironmentLicensesPanel';
import EnvironmentPerformanceGraph from '../container/EnvironmentPerformanceGraph';
import EnvironmentServerInfo from '../container/EnvironmentServerInfo';
import EnvironmentServicesPanel from '../container/EnvironmentServicesPanel';
import MemoryPanel from '../container/MemoryPanel';
import DefaultMotionDiv from '../base/DefaultMotionDiv';

/**
 * The environment summary view container component. Acts as a Bento Grid container layout for the main components.
 * @since 0.1.0
 */
export default function EnvironmentSummary() {
  return (
    <DefaultMotionDiv id="environment-summary-container">
      <section id="server-data">
        <div className="summary-header-section">
          <div className="summary-kpi-row">
            <EnvironmentAvailabilityPanel />
            <div className="summary-resource-panels">
              <DiskPanel />
              <MemoryPanel />
              <DatabasePanel />
            </div>
          </div>
        </div>
        <EnvironmentPerformanceGraph />
      </section>

      <section id="server-info">
        <EnvironmentServerInfo />
        <EnvironmentLicensesPanel />
        <EnvironmentServicesPanel />
      </section>
    </DefaultMotionDiv>
  );
}
