/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiHardDrive,
  FiKey,
  FiServer,
} from 'react-icons/fi';

import Box from '../base/Box';
import DefaultMotionDiv from '../base/DefaultMotionDiv';
import SpinnerLoader from '../base/Loaders/Spinner';
import { getEnvironmentHistoryById } from '../../ipc/environmentsIpcHandler';
import { EnvironmentWithHistory } from '../../../common/interfaces/EnvironmentControllerInterface';
import formatBytes from '../../../common/utils/formatBytes';
import getServiceName from '../../utils/getServiceName';

interface InsightItem {
  id: string;
  severity: 'healthy' | 'warning' | 'critical';
  title: string;
  description: string;
  icon: JSX.Element;
}

const FIVE_GIGABYTES = 5 * 1024 * 1024 * 1024;

function EnvironmentInsightsContainer() {
  const { t } = useTranslation();
  const location = useLocation();
  const environmentId = Number(location.pathname.split('/')[2]);

  const [historyData, setHistoryData] = useState<EnvironmentWithHistory | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!environmentId) return;
      const result = await getEnvironmentHistoryById(environmentId);
      setHistoryData(result);
      setLoading(false);
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadData();
    });

    loadData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
    };
  }, [environmentId]);

  const insights = useMemo<InsightItem[]>(() => {
    if (!historyData) return [];

    const list: InsightItem[] = [];
    const latestStats = historyData.statisticHistory?.[0];
    const latestLicense = historyData.licenseHistory?.[0];
    const latestMonitor = historyData.monitorHistory?.[0];
    const recentPings = historyData.httpResponses || [];

    if (latestStats) {
      const memTotal = Number(latestStats.systemServerMemorySize || 0);
      const memFree = Number(latestStats.systemServerMemoryFree || 0);
      if (memTotal > 0) {
        const memUsedRatio = (memTotal - memFree) / memTotal;
        if (memUsedRatio >= 0.85) {
          list.push({
            id: 'high-memory',
            severity: memUsedRatio >= 0.92 ? 'critical' : 'warning',
            title: t('components.EnvironmentInsights.highMemoryTitle'),
            description: `${t(
              'components.EnvironmentInsights.highMemoryDesc'
            )} (${Math.round(memUsedRatio * 100)}% - ${formatBytes(
              memTotal - memFree
            )} / ${formatBytes(memTotal)})`,
            icon: <FiCpu />,
          });
        }
      }

      const hdTotal = Number(latestStats.systemServerHDSize || 0);
      const hdFree = Number(latestStats.systemServerHDFree || 0);
      if (hdTotal > 0 && hdFree / hdTotal < 0.15) {
        list.push({
          id: 'low-disk',
          severity: hdFree / hdTotal < 0.08 ? 'critical' : 'warning',
          title: t('components.EnvironmentInsights.lowDiskTitle'),
          description: `${t(
            'components.EnvironmentInsights.lowDiskDesc'
          )} (${formatBytes(hdFree)} / ${formatBytes(hdTotal)})`,
          icon: <FiHardDrive />,
        });
      }

      const logAndTmpBytes =
        Number(latestStats.systemLogFolderSize || 0) +
        Number(latestStats.systemTmpFolderSize || 0);
      if (logAndTmpBytes > FIVE_GIGABYTES) {
        list.push({
          id: 'large-logs',
          severity: 'warning',
          title: t('components.EnvironmentInsights.largeLogsTitle'),
          description: `${t(
            'components.EnvironmentInsights.largeLogsDesc'
          )} (${formatBytes(logAndTmpBytes)})`,
          icon: <FiHardDrive />,
        });
      }
    }

    if (latestLicense && latestLicense.totalLicenses > 0) {
      const remainingRatio =
        latestLicense.remainingLicenses / latestLicense.totalLicenses;
      if (remainingRatio <= 0.1 || latestLicense.remainingLicenses <= 2) {
        list.push({
          id: 'low-licenses',
          severity:
            latestLicense.remainingLicenses === 0 ? 'critical' : 'warning',
          title: t('components.EnvironmentInsights.lowLicensesTitle'),
          description: `${t(
            'components.EnvironmentInsights.lowLicensesDesc'
          )} (${latestLicense.remainingLicenses} / ${
            latestLicense.totalLicenses
          })`,
          icon: <FiKey />,
        });
      }
    }

    if (latestMonitor) {
      const failingServices = Object.entries(latestMonitor)
        .filter(
          ([key, val]) =>
            getServiceName(key) !== 'UNKNOWN' && val !== 'OK' && val !== 'NONE'
        )
        .map(([key]) => getServiceName(key));

      if (failingServices.length > 0) {
        list.push({
          id: 'failed-services',
          severity: 'critical',
          title: t('components.EnvironmentInsights.failedServicesTitle'),
          description: `${t(
            'components.EnvironmentInsights.failedServicesDesc'
          )}${failingServices.join(', ')}`,
          icon: <FiServer />,
        });
      }
    }

    const onlinePings = recentPings.filter((p) => p.responseTimeMs > 0);
    if (onlinePings.length >= 5) {
      const avgLatency =
        onlinePings.reduce((acc, cur) => acc + cur.responseTimeMs, 0) /
        onlinePings.length;
      if (avgLatency > 800) {
        list.push({
          id: 'high-latency',
          severity: avgLatency > 1500 ? 'critical' : 'warning',
          title: t('components.EnvironmentInsights.highLatencyTitle'),
          description: `${t(
            'components.EnvironmentInsights.highLatencyDesc'
          )} (~${Math.round(avgLatency)} ms)`,
          icon: <FiAlertTriangle />,
        });
      }
    }

    if (list.length === 0) {
      list.push({
        id: 'all-healthy',
        severity: 'healthy',
        title: t('components.EnvironmentInsights.allHealthyTitle'),
        description: t('components.EnvironmentInsights.allHealthyDesc'),
        icon: <FiCheckCircle />,
      });
    }

    return list;
  }, [historyData, t]);

  if (loading) {
    return <SpinnerLoader />;
  }

  if (!historyData) {
    return (
      <DefaultMotionDiv id="environment-insights-container">
        <h3>{t('components.EnvironmentInsights.title')}</h3>
        <Box>
          <span>{t('components.global.noData')}</span>
        </Box>
      </DefaultMotionDiv>
    );
  }

  return (
    <DefaultMotionDiv id="environment-insights-container">
      <h3>{t('components.EnvironmentInsights.title')}</h3>

      <div className="insights-list">
        {insights.map((item) => (
          <div key={item.id} className={`insight-card ${item.severity}`}>
            <div className="insight-icon">
              {item.severity === 'critical' ? <FiAlertCircle /> : item.icon}
            </div>
            <div className="insight-body">
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </DefaultMotionDiv>
  );
}

export default EnvironmentInsightsContainer;
