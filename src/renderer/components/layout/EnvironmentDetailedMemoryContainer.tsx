/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Box from '../base/Box';
import Stat from '../base/Stat';
import DefaultMotionDiv from '../base/DefaultMotionDiv';
import { getDetailedMemoryById } from '../../ipc/environmentsIpcHandler';
import {
  DetailedMemoryHistory,
  EnvironmentWithDetailedMemoryHistory,
} from '../../../common/interfaces/EnvironmentControllerInterface';
import SpinnerLoader from '../base/Loaders/Spinner';
import formatBytes from '../../../common/utils/formatBytes';
import GraphTooltip from '../base/GraphTooltip';
import { formatDateTimeLocale } from '../../utils/formatDate';

interface NormalizedMemoryData {
  timestamp: Date;
  systemServerMemorySize: number;
  systemServerMemoryFree: number;
  systemServerMemoryUsed: number;
}

function EnvironmentDetailedMemoryContainer() {
  const environmentId = window.location.hash.split('/')[2];
  const [environmentData, setEnvironmentData] =
    useState<EnvironmentWithDetailedMemoryHistory | null>(null);
  const [lastMemoryData, setLastMemoryData] =
    useState<DetailedMemoryHistory | null>(null);
  const [normalizedMemoryData, setNormalizedMemoryData] = useState<
    NormalizedMemoryData[]
  >([]);

  const { t } = useTranslation();

  useEffect(() => {
    async function getData() {
      const environmentDataResult = await getDetailedMemoryById(
        Number(environmentId)
      );
      setEnvironmentData(environmentDataResult);

      if (
        environmentDataResult &&
        Array.isArray(environmentDataResult.statisticHistory)
      ) {
        setLastMemoryData(environmentDataResult.statisticHistory[0]);

        const dataNormalized = environmentDataResult.statisticHistory.map(
          (element) => ({
            timestamp: element.httpResponse.timestamp,
            systemServerMemorySize: Number(element.systemServerMemorySize),
            systemServerMemoryFree: Number(element.systemServerMemoryFree),
            systemServerMemoryUsed:
              Number(element.systemServerMemorySize) -
              Number(element.systemServerMemoryFree),
          })
        );

        setNormalizedMemoryData(dataNormalized);
      }
    }

    if (environmentId) {
      getData();
    }
  }, []);

  if (!environmentData || !lastMemoryData) {
    return <SpinnerLoader />;
  }

  const heapStats = [
    {
      prefix: t('components.EnvironmentDetailedMemoryContainer.heapUsed'),
      heading: formatBytes(Number(lastMemoryData.memoryHeap)),
      description: t(
        'components.EnvironmentDetailedMemoryContainer.heapUsedDesc'
      ),
    },
    {
      prefix: t('components.EnvironmentDetailedMemoryContainer.nonHeap'),
      heading: formatBytes(Number(lastMemoryData.nonMemoryHeap)),
      description: t(
        'components.EnvironmentDetailedMemoryContainer.nonHeapDesc'
      ),
    },
    {
      prefix: t('components.EnvironmentDetailedMemoryContainer.heapMax'),
      heading: formatBytes(Number(lastMemoryData.systemHeapMaxSize)),
      description: t(
        'components.EnvironmentDetailedMemoryContainer.heapMaxDesc'
      ),
    },
    {
      prefix: t('components.EnvironmentDetailedMemoryContainer.heapTotal'),
      heading: formatBytes(Number(lastMemoryData.systemHeapSize)),
      description: t(
        'components.EnvironmentDetailedMemoryContainer.heapTotalDesc'
      ),
    },
  ];

  return (
    <DefaultMotionDiv id="environment-detailed-memory">
      <h3>
        {t(
          'components.EnvironmentDetailedMemoryContainer.memoryConsumptionTitle'
        )}
      </h3>
      <Box>
        <div className="detailed-memory-grid">
          <div className="detailed-memory-stat">
            <Stat
              heading={formatBytes(
                Number(lastMemoryData.systemServerMemorySize) -
                  Number(lastMemoryData.systemServerMemoryFree)
              )}
              prefix={t(
                'components.EnvironmentDetailedMemoryContainer.memoryConsumptionUsed'
              )}
              suffix={formatBytes(
                Number(lastMemoryData.systemServerMemorySize)
              )}
            />
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={
                Array.isArray(normalizedMemoryData)
                  ? normalizedMemoryData.slice().reverse()
                  : []
              }
            >
              <CartesianGrid strokeDasharray="3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(el) => `    ${formatDateTimeLocale(el)}      `}
                interval="preserveEnd"
              />
              <YAxis
                allowDecimals={false}
                dataKey="systemServerMemorySize"
                type="number"
                domain={[
                  0,
                  (dataMax: number) => Math.ceil(dataMax / 250) * 250,
                ]}
                tickFormatter={(el) => formatBytes(el)}
              />
              <Tooltip
                content={(content) => {
                  return <GraphTooltip content={content} unit="bytes" />;
                }}
              />
              <Area
                type="monotone"
                dataKey="systemServerMemoryUsed"
                dot={false}
                stroke="var(--purple)"
                strokeWidth={2}
                fill="var(--light-purple)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Box>

      <h3 className="detailed-memory-section-title">
        {t(
          'components.EnvironmentDetailedMemoryContainer.memoryStatisticsTitle'
        )}
      </h3>
      <div className="detailed-memory-stats-grid">
        {heapStats.map((item) => (
          <Box key={item.prefix}>
            <Stat
              prefix={item.prefix}
              heading={item.heading}
              description={item.description}
            />
          </Box>
        ))}
      </div>
    </DefaultMotionDiv>
  );
}

export default EnvironmentDetailedMemoryContainer;
