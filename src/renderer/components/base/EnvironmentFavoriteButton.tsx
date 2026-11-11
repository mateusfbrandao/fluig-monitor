import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { useEnvironmentList } from '../../contexts/EnvironmentListContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { toggleEnvironmentFavorite } from '../../ipc/environmentsIpcHandler';

interface Props {
  environmentId: number;
  isFavorite: boolean;
}

export default function EnvironmentFavoriteButton({
  environmentId,
  isFavorite,
}: Props) {
  const { createShortNotification } = useNotifications();
  const { updateEnvironmentList } = useEnvironmentList();
  const [favorite, setFavorite] = useState(isFavorite);

  const { t } = useTranslation();

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  async function toggleFavoriteEnvironment(id: number) {
    try {
      const result = await toggleEnvironmentFavorite(id);
      const favorited = Boolean(result?.favorited);
      const exception = result?.exception ?? null;

      if (exception === 'MAX_FAVORITES_EXCEEDED') {
        createShortNotification({
          id: Date.now(),
          message: t('helpMessages.environments.maximumExceeded'),
          type: 'warning',
        });
        return;
      }

      if (exception === 'TOGGLE_FAILED') {
        createShortNotification({
          id: Date.now(),
          message: t(
            'helpMessages.environments.toggleFailed',
            'Não foi possível atualizar o favorito.'
          ),
          type: 'danger',
        });
        return;
      }

      setFavorite(favorited);
      createShortNotification({
        id: Date.now(),
        message: favorited
          ? t('helpMessages.environments.added')
          : t('helpMessages.environments.removed'),
        type: 'success',
      });

      updateEnvironmentList();
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : '';
      createShortNotification({
        id: Date.now(),
        message:
          t(
            'helpMessages.environments.toggleFailed',
            'Não foi possível atualizar o favorito.'
          ) + (detail ? ` (${detail})` : ''),
        type: 'danger',
      });
    }
  }

  return (
    <button
      type="button"
      onClick={() => toggleFavoriteEnvironment(environmentId)}
      className={`favorite-btn${favorite ? ' is-fav' : ''}`}
      title={
        favorite
          ? t(
              'helpMessages.environments.removeFavorite',
              'Remover dos favoritos'
            )
          : t(
              'helpMessages.environments.addFavorite',
              'Adicionar aos favoritos'
            )
      }
      aria-pressed={favorite}
    >
      {favorite ? <AiFillStar /> : <AiOutlineStar />}
    </button>
  );
}
