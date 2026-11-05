import DatabasePropsPanel from '../container/DatabasePropsPanel';
import DatabaseStorageGraph from '../container/DatabaseStorageGraph';
import DatabaseNetworkGraph from '../container/DatabaseNetworkGraph';
import DatabaseConnectionPoolPanel from '../container/DatabaseConnectionPoolPanel';
import DefaultMotionDiv from '../base/DefaultMotionDiv';

/**
 * Environment database info container. Has a 5 x 1 grid template.
 * @since 0.5
 */
export default function EnvironmentDatabaseContainer() {
  return (
    <DefaultMotionDiv id="environment-database-container">
      <div className="database-view-grid">
        <div className="database-view-main">
          <DatabaseConnectionPoolPanel />
          <DatabaseStorageGraph />
          <div className="database-network-split">
            <DatabaseNetworkGraph mode="INBOUND" />
            <DatabaseNetworkGraph mode="OUTBOUND" />
          </div>
          <DatabaseNetworkGraph mode="MIXED" />
        </div>
        <DatabasePropsPanel />
      </div>
    </DefaultMotionDiv>
  );
}
