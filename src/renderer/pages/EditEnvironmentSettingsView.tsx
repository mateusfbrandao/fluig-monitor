/* eslint-disable prefer-destructuring */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import log from 'electron-log';
import { ipcRenderer } from 'electron';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheck,
  FiClock,
  FiKey,
  FiRefreshCw,
  FiServer,
  FiTrash2,
  FiWifi,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
  deleteEnvironment,
  getEnvironmentById,
  updateEnvironment,
} from '../ipc/environmentsIpcHandler';
import { useNotifications } from '../contexts/NotificationsContext';
import { useEnvironmentList } from '../contexts/EnvironmentListContext';
import { EnvironmentWithRelatedData } from '../../common/interfaces/EnvironmentControllerInterface';
import EnvironmentFormValidator from '../classes/EnvironmentFormValidator';
import AuthKeysDecoder from '../../common/classes/AuthKeysDecoder';
import AuthKeysEncoder from '../../common/classes/AuthKeysEncoder';
import DefaultMotionDiv from '../components/base/DefaultMotionDiv';

function EditEnvironmentSettingsView(): JSX.Element {
  const { environmentId } = useParams();

  const [environmentData, setEnvironmentData] = useState(
    {} as EnvironmentWithRelatedData
  );

  const [name, setName] = useState('');
  const [domainUrl, setDomainUrl] = useState('');
  const [kind, setKind] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [tokenSecret, setTokenSecret] = useState('');
  const [scrapeFrequency, setScrapeFrequency] = useState('');
  const [pingFrequency, setPingFrequency] = useState('');
  const [useKeysEncryption, setUseKeysEncryption] = useState(true);

  const [testMessage, setTestMessage] = useState(<></>);
  const [validationMessage, setValidationMessage] = useState(<></>);
  const [confirmBtnClicked, setConfirmBtnClicked] = useState(false);
  const [actionButtonsDisabled, setActionButtonsDisabled] = useState(false);
  const [buttonIsLoading, setButtonIsLoading] = useState(false);

  const { createShortNotification } = useNotifications();
  const { updateEnvironmentList } = useEnvironmentList();

  const { t } = useTranslation();

  useEffect(() => {
    async function getEnvironmentData() {
      const environmentDataById = await getEnvironmentById(
        Number(environmentId),
        true
      );

      if (environmentDataById) {
        setEnvironmentData(environmentDataById);
      }
    }

    if (typeof environmentId !== 'undefined') {
      getEnvironmentData();
    }
  }, [environmentId]);

  useEffect(() => {
    if (
      environmentData.id &&
      environmentData.oAuthKeysId &&
      environmentData.updateScheduleId
    ) {
      const oAuthKeys = new AuthKeysDecoder(
        environmentData.oAuthKeysId
      ).decode();

      if (environmentData.oAuthKeysId.hash.indexOf('forge:') < 0) {
        setUseKeysEncryption(false);
      }

      setName(environmentData.name);
      setDomainUrl(environmentData.baseUrl);
      setKind(environmentData.kind);
      if (oAuthKeys) {
        setConsumerKey(oAuthKeys.consumerKey);
        setConsumerSecret(oAuthKeys.consumerSecret);
        setAccessToken(oAuthKeys.accessToken);
        setTokenSecret(oAuthKeys.tokenSecret);
      } else {
        setConsumerKey('');
        setConsumerSecret('');
        setAccessToken('');
        setTokenSecret('');
        log.warn(
          'Could not decode environment auth keys, form will use empty values.'
        );
      }

      setScrapeFrequency(environmentData.updateScheduleId.scrapeFrequency);
      setPingFrequency(environmentData.updateScheduleId.pingFrequency);
    }
  }, [environmentData]);

  /**
   * Dispatches the oAuth validator function caller
   */
  async function validateOauthPermission() {
    if (
      domainUrl !== '' &&
      (consumerKey !== '' ||
        consumerSecret !== '' ||
        accessToken !== '' ||
        tokenSecret !== '')
    ) {
      setTestMessage(
        <span className="info-blip">
          <FiRefreshCw className="rotating" />
          {t('views.EditEnvironmentView.connecting')}
        </span>
      );

      const results =
        (await ipcRenderer.invoke(
          'validateOauthPermission',
          {
            consumerKey,
            consumerSecret,
            accessToken,
            tokenSecret,
          },
          domainUrl
        )) || [];

      if (
        Array.isArray(results) &&
        results.length > 0 &&
        results.every((i: { httpStatus: number }) => i.httpStatus === 200)
      ) {
        setTestMessage(
          <span className="info-blip has-success">
            <FiCheck /> {t('views.EditEnvironmentView.connectionOk')}
          </span>
        );
      } else if (
        Array.isArray(results) &&
        results.some(
          (i: { httpStatus: number }) =>
            i.httpStatus === 403 || i.httpStatus === 401
        )
      ) {
        setTestMessage(
          <span className="info-blip has-warning">
            <FiAlertCircle />
            {t('views.EditEnvironmentView.insufficientPermissions')}
            {` (${
              results.filter(
                (i: { httpStatus: number }) => i.httpStatus === 200
              ).length
            }/${results.length})`}
          </span>
        );
      } else {
        setTestMessage(
          <span className="info-blip has-error">
            <FiAlertTriangle />{' '}
            {t('views.CreateEnvironmentView.connectionUnavailable')}
          </span>
        );
      }
    } else {
      setTestMessage(
        <span className="info-blip has-warning">
          <FiAlertCircle />
          {t('views.EditEnvironmentView.authFieldsValidation')}
        </span>
      );
    }
  }

  async function handleUpdateData(event: FormEvent) {
    log.info('EditEnvironmentSettingsView: Handling form submit');
    event.preventDefault();
    setActionButtonsDisabled(true);
    setButtonIsLoading(true);

    const formData = {
      id: environmentData.id,
      name,
      baseUrl: domainUrl,
      kind: kind ?? '',
      auth: {
        consumerKey,
        consumerSecret,
        accessToken,
        tokenSecret,
      },
      updateSchedule: {
        scrapeFrequency,
        pingFrequency,
      },
    };

    const envFormValidator = new EnvironmentFormValidator().validate(formData);

    const { isValid, lastMessage } = envFormValidator;
    let encryptedPayload = null;

    if (!isValid) {
      createShortNotification({
        id: Date.now(),
        type: 'error',
        message: t(`classes.EnvironmentFormValidator.${lastMessage}`),
      });

      return;
    }

    const permissionsResults =
      (await ipcRenderer.invoke(
        'validateOauthPermission',
        {
          consumerKey,
          consumerSecret,
          accessToken,
          tokenSecret,
        },
        domainUrl
      )) || [];

    const isAllPermissionsOk =
      Array.isArray(permissionsResults) &&
      (permissionsResults.length === 0 ||
        permissionsResults.every(
          (i: { httpStatus: number }) => i.httpStatus === 200
        ));

    if (isAllPermissionsOk) {
      log.info(
        'EditEnvironmentSettingsView: Form data is valid, updating environment'
      );

      let release = await ipcRenderer.invoke(
        'getEnvironmentRelease',
        {
          consumerKey,
          consumerSecret,
          accessToken,
          tokenSecret,
        },
        domainUrl
      );

      if (release && release.content) {
        const verMatch = release.content.match(/\d+(\.\d+)+(-[^\s]+)?/);
        release = verMatch
          ? verMatch[0]
          : release.content.split(' - ')[1] || release.content;
      } else {
        release = 'unknown';
      }

      log.info(`Updated environment release to ${release}`);

      const authKeys = {
        environmentId: formData.id,
        payload: '',
        hash: '',
      };

      if (useKeysEncryption) {
        log.info('Using encryption');
        encryptedPayload = new AuthKeysEncoder(formData.auth).encode();
        if (encryptedPayload) {
          authKeys.payload = encryptedPayload.encrypted;
          authKeys.hash = `forge:${encryptedPayload.key}:${encryptedPayload.iv}`;
        } else {
          log.warn('Could not encrypt oAuth keys');
          createShortNotification({
            id: Date.now(),
            type: 'error',
            message: t('views.EditEnvironmentView.unableToEncrypt'),
          });
          setButtonIsLoading(false);
          setActionButtonsDisabled(false);
          return;
        }
      } else {
        authKeys.payload = JSON.stringify(formData.auth);
        authKeys.hash = 'json';
      }

      if (useKeysEncryption && encryptedPayload !== null) {
        log.info(
          `Updating environment token for environment ${environmentData.id}`
        );

        await ipcRenderer.invoke(
          'setStoreValue',
          `envToken_${environmentData.id}`,
          encryptedPayload.iv
        );
      }

      const result = await updateEnvironment(
        {
          id: formData.id,
          baseUrl: formData.baseUrl,
          kind: formData.kind,
          name: formData.name,
          release,
        },
        {
          environmentId: formData.id,
          pingFrequency: formData.updateSchedule.pingFrequency,
          scrapeFrequency: formData.updateSchedule.scrapeFrequency,
        },
        authKeys
      );

      if (!result) {
        createShortNotification({
          id: Date.now(),
          type: 'error',
          message: t('views.EditEnvironmentView.updateError'),
        });

        return;
      }

      createShortNotification({
        id: Date.now(),
        type: 'success',
        message: t('views.EditEnvironmentView.updatedSuccessfully'),
      });

      updateEnvironmentList();
      setValidationMessage(<Navigate to="/" />);
    } else if (
      Array.isArray(permissionsResults) &&
      permissionsResults.some(
        (i: { httpStatus: number }) =>
          i.httpStatus === 403 || i.httpStatus === 401
      )
    ) {
      createShortNotification({
        id: Date.now(),
        type: 'warning',
        message: t('views.EditEnvironmentView.insufficientPermissions'),
      });
      setActionButtonsDisabled(false);
      setButtonIsLoading(false);
    } else {
      createShortNotification({
        id: Date.now(),
        type: 'error',
        message: 'Erro ao validar permissões.',
      });
      setActionButtonsDisabled(false);
      setButtonIsLoading(false);
    }
  }

  async function confirmDelete() {
    if (!confirmBtnClicked) {
      const timeout = 5000;
      setConfirmBtnClicked(true);
      createShortNotification(
        {
          id: Date.now(),
          type: 'warning',
          message: t('views.EditEnvironmentView.clickAgain'),
        },
        timeout
      );
      setTimeout(() => setConfirmBtnClicked(false), timeout);
    } else {
      setActionButtonsDisabled(true);
      await deleteEnvironment(Number(environmentId));
      createShortNotification({
        id: Date.now(),
        type: 'success',
        message: t('views.EditEnvironmentView.deletedSuccessfully'),
      });
      setValidationMessage(<Navigate to="/" />);
    }
  }

  return (
    <DefaultMotionDiv id="environment-edit-form-container">
      <header className="env-form-header">
        <h2>{t('views.EditEnvironmentView.form.title')}</h2>
        <p className="env-form-subtitle">
          {t('views.EditEnvironmentView.form.subtitle')}
        </p>
      </header>

      <form
        className="env-settings-form"
        action="#"
        onSubmit={handleUpdateData}
      >
        <section className="env-form-plate">
          <h3 className="icon-title">
            <span className="icon-dot neutral-variant">
              <FiServer aria-hidden="true" />
            </span>
            {t('views.EditEnvironmentView.form.environmentDataSection')}
          </h3>

          <div className="form-group">
            <label htmlFor="environmentName">
              {t('views.EditEnvironmentView.form.environmentName.label')}
            </label>
            <input
              type="text"
              name="environmentName"
              id="environmentName"
              placeholder={t(
                'views.EditEnvironmentView.form.environmentName.placeholder'
              )}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="domainUrl">
                {t('views.EditEnvironmentView.form.domainUrl.label')}
              </label>
              <input
                type="text"
                name="domainUrl"
                id="domainUrl"
                placeholder={t(
                  'views.EditEnvironmentView.form.domainUrl.placeholder'
                )}
                value={domainUrl}
                onChange={(event) => {
                  setDomainUrl(event.target.value);
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="environmentKind">
                {t('views.EditEnvironmentView.form.environmentKind.label')}
              </label>
              <select
                name="environmentKind"
                id="environmentKind"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value);
                }}
              >
                <option value="PROD">
                  {t(
                    'views.EditEnvironmentView.form.environmentKind.options.prod'
                  )}
                </option>
                <option value="HML">
                  {t(
                    'views.EditEnvironmentView.form.environmentKind.options.hml'
                  )}
                </option>
                <option value="DEV">
                  {t(
                    'views.EditEnvironmentView.form.environmentKind.options.dev'
                  )}
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="env-form-plate">
          <h3 className="icon-title">
            <span className="icon-dot neutral-variant">
              <FiKey aria-hidden="true" />
            </span>
            {t('views.EditEnvironmentView.form.environmentAuthSection')}
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="consumerKey">
                {t('views.EditEnvironmentView.form.consumerKey.label')}
              </label>
              <input
                type="password"
                name="consumerKey"
                id="consumerKey"
                placeholder={t(
                  'views.EditEnvironmentView.form.consumerKey.placeholder'
                )}
                value={consumerKey}
                onChange={(event) => {
                  setConsumerKey(event.target.value);
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="consumerSecret">
                {t('views.EditEnvironmentView.form.consumerSecret.label')}
              </label>
              <input
                type="password"
                name="consumerSecret"
                id="consumerSecret"
                placeholder={t(
                  'views.EditEnvironmentView.form.consumerSecret.placeholder'
                )}
                value={consumerSecret}
                onChange={(event) => {
                  setConsumerSecret(event.target.value);
                }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="accessToken">
                {t('views.EditEnvironmentView.form.accessToken.label')}
              </label>
              <input
                type="password"
                name="accessToken"
                id="accessToken"
                placeholder={t(
                  'views.EditEnvironmentView.form.accessToken.placeholder'
                )}
                value={accessToken}
                onChange={(event) => {
                  setAccessToken(event.target.value);
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tokenSecret">
                {t('views.EditEnvironmentView.form.tokenSecret.label')}
              </label>
              <input
                type="password"
                name="tokenSecret"
                id="tokenSecret"
                placeholder={t(
                  'views.EditEnvironmentView.form.tokenSecret.placeholder'
                )}
                value={tokenSecret}
                onChange={(event) => {
                  setTokenSecret(event.target.value);
                }}
              />
            </div>
          </div>

          <div className="form-group inline">
            <input
              type="checkbox"
              name="useKeysEncryption"
              id="useKeysEncryption"
              checked={useKeysEncryption}
              onChange={(event) => {
                setUseKeysEncryption(event.target.checked);
              }}
            />
            <label htmlFor="useKeysEncryption">
              {t('views.EditEnvironmentView.form.useEncryption')}
            </label>
          </div>

          <div className="env-form-test-row">
            <button
              type="button"
              className="env-form-action-btn"
              onClick={validateOauthPermission}
            >
              <FiWifi aria-hidden="true" />
              <span>{t('views.EditEnvironmentView.form.testConnection')}</span>
            </button>
            {testMessage}
          </div>
        </section>

        <section className="env-form-plate">
          <h3 className="icon-title">
            <span className="icon-dot neutral-variant">
              <FiClock aria-hidden="true" />
            </span>
            {t('views.EditEnvironmentView.form.scheduleSection')}
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pingUpdateFrequency">
                {t('views.CreateEnvironmentView.form.serverVerification.title')}
              </label>
              <select
                name="pingUpdateFrequency"
                id="pingUpdateFrequency"
                value={pingFrequency}
                onChange={(event) => {
                  setPingFrequency(event.target.value);
                }}
              >
                <option value="15s">
                  {t(
                    'views.CreateEnvironmentView.form.serverVerification.options.15s'
                  )}
                </option>
                <option value="30s">
                  {t(
                    'views.CreateEnvironmentView.form.serverVerification.options.30s'
                  )}
                </option>
                <option value="1m">
                  {t(
                    'views.CreateEnvironmentView.form.serverVerification.options.1m'
                  )}
                </option>
                <option value="2m">
                  {t(
                    'views.CreateEnvironmentView.form.serverVerification.options.2m'
                  )}
                </option>
              </select>
              <small className="help-block">
                {t(
                  'views.CreateEnvironmentView.form.serverVerification.helper'
                )}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="scrapeUpdateFrequency">
                {t('views.CreateEnvironmentView.form.dataCollection.title')}
              </label>
              <select
                name="scrapeUpdateFrequency"
                id="scrapeUpdateFrequency"
                value={scrapeFrequency}
                onChange={(event) => {
                  setScrapeFrequency(event.target.value);
                }}
              >
                <option value="15m">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.15m'
                  )}
                </option>
                <option value="30m">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.30m'
                  )}
                </option>
                <option value="1h">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.1h'
                  )}
                </option>
                <option value="2h">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.2h'
                  )}
                </option>
                <option value="3h">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.3h'
                  )}
                </option>
                <option value="6h">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.6h'
                  )}
                </option>
                <option value="12h">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.12h'
                  )}
                </option>
                <option value="24h">
                  {t(
                    'views.CreateEnvironmentView.form.dataCollection.options.24h'
                  )}
                </option>
              </select>
              <small className="help-block">
                {t('views.CreateEnvironmentView.form.dataCollection.helper')}
              </small>
            </div>
          </div>
        </section>

        <section className="env-form-actions">
          <button
            className="env-form-action-btn is-primary"
            type="submit"
            disabled={actionButtonsDisabled}
          >
            {buttonIsLoading ? (
              <FiRefreshCw className="rotating" aria-hidden="true" />
            ) : (
              <FiCheck aria-hidden="true" />
            )}
            <span>{t('views.EditEnvironmentView.form.buttonSave')}</span>
          </button>
          <button
            className="env-form-action-btn is-danger"
            type="button"
            onClick={confirmDelete}
            disabled={actionButtonsDisabled}
          >
            <FiTrash2 aria-hidden="true" />
            <span>{t('views.EditEnvironmentView.form.buttonDelete')}</span>
          </button>
          {validationMessage}
        </section>
      </form>
    </DefaultMotionDiv>
  );
}

export default EditEnvironmentSettingsView;
