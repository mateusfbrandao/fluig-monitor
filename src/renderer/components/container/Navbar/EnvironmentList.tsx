import { motion } from 'framer-motion';
import { Environment } from '../../../../common/interfaces/DatabaseModels';
import EnvironmentListItem from './EnvironmentListItem';

type EnvironmentListProps = {
  environmentList: Environment[];
};

function EnvironmentList({ environmentList }: EnvironmentListProps) {
  if (!Array.isArray(environmentList) || environmentList.length === 0) {
    return <></>;
  }

  const sortedList = environmentList.slice().sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {sortedList.map((environment: Environment, idx: number) => {
        return (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: {
                ease: 'easeOut',
                duration: 0.2,
                delay: idx * 0.04,
              },
            }}
            key={environment.id}
          >
            <EnvironmentListItem data={environment} key={environment.id} />
          </motion.div>
        );
      })}
    </>
  );
}

export default EnvironmentList;
