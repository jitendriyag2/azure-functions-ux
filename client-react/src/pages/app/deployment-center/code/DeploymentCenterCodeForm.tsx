import React, { useState, useContext } from 'react';
import { Formik, FormikProps, FormikActions } from 'formik';
import {
  DeploymentCenterFormData,
  DeploymentCenterCodeFormProps,
  DeploymentCenterCodeFormData,
  SiteSourceControlRequestBody,
  WorkflowOption,
} from '../DeploymentCenter.types';
import { KeyCodes } from 'office-ui-fabric-react';
import { commandBarSticky, pivotContent } from '../DeploymentCenter.styles';
import DeploymentCenterCodePivot from './DeploymentCenterCodePivot';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../../../../components/ConfirmDialog/ConfirmDialog';
import { SiteStateContext } from '../../../../SiteState';
import { PortalContext } from '../../../../PortalContext';
import SiteService from '../../../../ApiHelpers/SiteService';
import { getErrorMessage } from '../../../../ApiHelpers/ArmHelper';
import { DeploymentCenterContext } from '../DeploymentCenterContext';
import DeploymentCenterCommandBar from '../DeploymentCenterCommandBar';
import { BuildProvider, ScmType } from '../../../../models/site/config';
import { GitHubActionWorkflowRequestContent, GitHubCommit } from '../../../../models/github';
import DeploymentCenterData from '../DeploymentCenter.data';
import LogService from '../../../../utils/LogService';
import { LogCategories } from '../../../../utils/LogCategories';
import { DeploymentCenterConstants } from '../DeploymentCenterConstants';
import {
  getCodeAppWorkflowInformation,
  isApiSyncError,
  updateGitHubActionSourceControlPropertiesManually,
} from '../utility/GitHubActionUtility';
import { getWorkflowFilePath, getArmToken, getLogId } from '../utility/DeploymentCenterUtility';
import { DeploymentCenterPublishingContext } from '../DeploymentCenterPublishingContext';

const DeploymentCenterCodeForm: React.FC<DeploymentCenterCodeFormProps> = props => {
  const { t } = useTranslation();
  const [isRefreshConfirmDialogVisible, setIsRefreshConfirmDialogVisible] = useState(false);
  const [isSyncConfirmDialogVisible, setIsSyncConfirmDialogVisible] = useState(false);
  const [isDiscardConfirmDialogVisible, setIsDiscardConfirmDialogVisible] = useState(false);

  const siteStateContext = useContext(SiteStateContext);
  const portalContext = useContext(PortalContext);
  const deploymentCenterContext = useContext(DeploymentCenterContext);
  const deploymentCenterPublishingContext = useContext(DeploymentCenterPublishingContext);
  const deploymentCenterData = new DeploymentCenterData();

  const deployKudu = async (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>) => {
    const payload: SiteSourceControlRequestBody = {
      repoUrl: getRepoUrl(values),
      branch: values.branch || 'master',
      isManualIntegration: isManualIntegration(values),
      isGitHubAction: values.buildProvider === BuildProvider.GitHubAction,
      isMercurial: false,
    };

    if (values.sourceProvider === ScmType.LocalGit) {
      return deploymentCenterData.patchSiteConfig(deploymentCenterContext.resourceId, {
        properties: {
          scmType: 'LocalGit',
        },
      });
    } else {
      const updateSourceControlResponse = await deploymentCenterData.updateSourceControlDetails(deploymentCenterContext.resourceId, {
        properties: payload,
      });

      if (
        !updateSourceControlResponse.metadata.success &&
        payload.isGitHubAction &&
        isApiSyncError(updateSourceControlResponse.metadata.error)
      ) {
        // NOTE(michinoy): If the save operation was being done for GitHub Action, and
        // we are experiencing the GeoRegionalService API error (500), run through the
        // workaround.
        LogService.trackEvent(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeForm', 'deployKudu-apiSyncErrorWorkaround'), {
          resourceId: deploymentCenterContext.resourceId,
        });

        return updateGitHubActionSourceControlPropertiesManually(deploymentCenterData, deploymentCenterContext.resourceId, payload);
      } else {
        if (!updateSourceControlResponse.metadata.success) {
          LogService.error(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeForm', 'deployKudu'), {
            resourceId: deploymentCenterContext.resourceId,
          });
        }

        return updateSourceControlResponse;
      }
    }
  };

  const isManualIntegration = (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>): boolean => {
    switch (values.sourceProvider) {
      case ScmType.GitHub:
      case ScmType.BitbucketGit:
      case ScmType.LocalGit:
        return false;
      case ScmType.OneDrive:
      case ScmType.Dropbox:
      case ScmType.ExternalGit:
        return true;
      default:
        LogService.error(
          LogCategories.deploymentCenter,
          'DeploymentCenterCodeCommandBar',
          `Incorrect Source Provider ${values.sourceProvider}`
        );
        throw Error(`Incorrect Source Provider ${values.sourceProvider}`);
    }
  };

  const getRepoUrl = (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>): string => {
    switch (values.sourceProvider) {
      case ScmType.GitHub:
        return `${DeploymentCenterConstants.githubUri}/${values.org}/${values.repo}`;
      case ScmType.BitbucketGit:
        return `${DeploymentCenterConstants.bitbucketUrl}/${values.org}/${values.repo}`;
      case ScmType.OneDrive:
      case ScmType.Dropbox:
        // TODO: (stpelleg): Pending Implementation of these ScmTypes
        throw Error('Not implemented');
      case ScmType.LocalGit:
        //(note: stpelleg): Local Git does not require a Repo Url
        return '';
      case ScmType.ExternalGit:
        if (values.externalUsername && values.externalPassword) {
          const repoPath = values.repo.toLocaleLowerCase().replace('https://', '');
          return `https://${values.externalUsername}:${values.externalPassword}@${repoPath}`;
        }
        return values.repo;
      default:
        LogService.error(
          LogCategories.deploymentCenter,
          'DeploymentCenterCodeCommandBar',
          `Incorrect Source Provider ${values.sourceProvider}`
        );
        throw Error(`Incorrect Source Provider ${values.sourceProvider}`);
    }
  };

  const deployGithubActions = async (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>) => {
    const repo = `${values.org}/${values.repo}`;
    const branch = values.branch || 'master';

    const workflowInformation = getCodeAppWorkflowInformation(
      values.runtimeStack,
      values.runtimeVersion,
      values.runtimeRecommendedVersion,
      branch,
      siteStateContext.isLinuxApp,
      values.gitHubPublishProfileSecretGuid,
      deploymentCenterContext.siteDescriptor ? deploymentCenterContext.siteDescriptor.site : '',
      deploymentCenterContext.siteDescriptor ? deploymentCenterContext.siteDescriptor.slot : ''
    );

    const commitInfo: GitHubCommit = {
      repoName: repo,
      branchName: branch,
      filePath: getWorkflowFilePath(
        branch,
        deploymentCenterContext.siteDescriptor ? deploymentCenterContext.siteDescriptor.site : '',
        deploymentCenterContext.siteDescriptor ? deploymentCenterContext.siteDescriptor.slot : ''
      ),
      message: t('githubActionWorkflowCommitMessage'),
      contentBase64Encoded: btoa(workflowInformation.content),
      committer: {
        name: 'Azure App Service',
        email: 'donotreply@microsoft.com',
      },
    };

    const workflowConfigurationResponse = await deploymentCenterData.getWorkflowConfiguration(
      values.org,
      values.repo,
      branch,
      commitInfo.filePath,
      deploymentCenterContext.gitHubToken
    );

    // NOTE(michinoy): A failure here means the file does not exist and we do not need to copy over the sha.
    // No need to log anything.
    if (workflowConfigurationResponse.metadata.success) {
      commitInfo.sha = workflowConfigurationResponse.data.sha;
    }

    const requestContent: GitHubActionWorkflowRequestContent = {
      resourceId: deploymentCenterContext.resourceId,
      secretName: workflowInformation.secretName,
      commit: commitInfo,
    };

    return deploymentCenterData.createOrUpdateActionWorkflow(getArmToken(), deploymentCenterContext.gitHubToken, requestContent);
  };

  const deploy = async (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>) => {
    const {
      sourceProvider,
      buildProvider,
      org,
      repo,
      branch,
      workflowOption,
      runtimeStack,
      runtimeVersion,
      runtimeRecommendedVersion,
    } = values;
    LogService.trackEvent(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeDataForm', 'deploy'), {
      sourceProvider,
      buildProvider,
      org,
      repo,
      branch,
      workflowOption,
      runtimeStack,
      runtimeVersion,
      runtimeRecommendedVersion,
    });

    // NOTE(michinoy): Only initiate writing a workflow configuration file if the branch does not already have it OR
    // the user opted to overwrite it.
    if (
      values.buildProvider === BuildProvider.GitHubAction &&
      (values.workflowOption === WorkflowOption.Overwrite || values.workflowOption === WorkflowOption.Add)
    ) {
      const gitHubActionDeployResponse = await deployGithubActions(values);
      if (!gitHubActionDeployResponse.metadata.success) {
        LogService.error(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeDataForm', 'deploy'), {
          error: gitHubActionDeployResponse.metadata.error,
        });

        return gitHubActionDeployResponse;
      }
    }

    return deployKudu(values);
  };

  const saveGithubActionsDeploymentSettings = async (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>) => {
    const notificationId = portalContext.startNotification(t('settingupDeployment'), t('githubActionSavingSettings'));
    const deployResponse = await deploy(values);
    if (deployResponse.metadata.success) {
      portalContext.stopNotification(notificationId, true, t('githubActionSettingsSavedSuccessfully'));
    } else {
      const errorMessage = getErrorMessage(deployResponse.metadata.error);
      errorMessage
        ? portalContext.stopNotification(notificationId, false, t('settingupDeploymentFailWithStatusMessage').format(errorMessage))
        : portalContext.stopNotification(notificationId, false, t('settingupDeploymentFail'));
    }
  };

  const saveAppServiceDeploymentSettings = async (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>) => {
    const notificationId = portalContext.startNotification(t('settingupDeployment'), t('settingupDeployment'));
    const deployResponse = await deploy(values);
    if (deployResponse.metadata.success) {
      portalContext.stopNotification(notificationId, true, t('settingupDeploymentSuccess'));
    } else {
      const errorMessage = getErrorMessage(deployResponse.metadata.error);
      errorMessage
        ? portalContext.stopNotification(notificationId, false, t('settingupDeploymentFailWithStatusMessage').format(errorMessage))
        : portalContext.stopNotification(notificationId, false, t('settingupDeploymentFail'));
    }
  };

  const onSubmit = async (
    values: DeploymentCenterFormData<DeploymentCenterCodeFormData>,
    formikActions: FormikActions<DeploymentCenterFormData<DeploymentCenterCodeFormData>>
  ) => {
    await Promise.all([updateDeploymentConfigurations(values, formikActions), updatePublishingUser(values)]);
    await deploymentCenterContext.refresh();
    formikActions.setSubmitting(false);
  };

  const updateDeploymentConfigurations = async (
    values: DeploymentCenterFormData<DeploymentCenterCodeFormData>,
    formikActions: FormikActions<DeploymentCenterFormData<DeploymentCenterCodeFormData>>
  ) => {
    // Only do the save if build provider is set by the user and the scmtype in the config is set to none.
    // If the scmtype in the config is not none, the user should be doing a disconnect operation first.
    // This check is in place, because the use could set the form props ina dirty state by just modifying the
    // publishing user information.
    if (
      values.buildProvider !== BuildProvider.None &&
      deploymentCenterContext.siteConfig &&
      deploymentCenterContext.siteConfig.properties.scmType === ScmType.None
    ) {
      // NOTE(stpelleg):Reset the form values only if deployment settings need to be updated.
      formikActions.resetForm(values);
      if (values.buildProvider === BuildProvider.GitHubAction) {
        await saveGithubActionsDeploymentSettings(values);
      } else {
        await saveAppServiceDeploymentSettings(values);
      }
    }
  };

  const updatePublishingUser = async (values: DeploymentCenterFormData<DeploymentCenterCodeFormData>) => {
    const currentUser = deploymentCenterPublishingContext.publishingUser;
    if (
      (currentUser && currentUser.properties.publishingUserName !== values.publishingUsername) ||
      (currentUser && values.publishingPassword && currentUser.properties.publishingPassword !== values.publishingPassword)
    ) {
      LogService.trackEvent(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeDataForm', 'updatePublishingUser'), {});

      const notificationId = portalContext.startNotification(t('UpdatingPublishingUser'), t('UpdatingPublishingUser'));
      currentUser.properties.publishingUserName = values.publishingUsername;
      currentUser.properties.publishingPassword = values.publishingPassword;
      const publishingUserResponse = await deploymentCenterData.updatePublishingUser(currentUser);

      if (publishingUserResponse.metadata.success) {
        portalContext.stopNotification(notificationId, true, t('UpdatingPublishingUserSuccess'));
      } else {
        const errorMessage = getErrorMessage(publishingUserResponse.metadata.error);
        errorMessage
          ? portalContext.stopNotification(notificationId, false, t('UpdatingPublishingUserFailWithStatusMessage').format(errorMessage))
          : portalContext.stopNotification(notificationId, false, t('UpdatingPublishingUserFail'));

        LogService.error(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeDataForm', 'updatePublishingUser'), {
          errorMessage,
        });
      }
    }
  };

  const onKeyDown = keyEvent => {
    if ((keyEvent.charCode || keyEvent.keyCode) === KeyCodes.enter) {
      keyEvent.preventDefault();
    }
  };

  const refreshFunction = () => {
    hideRefreshConfirmDialog();
    props.refresh();
  };

  const hideRefreshConfirmDialog = () => {
    setIsRefreshConfirmDialogVisible(false);
  };

  const syncFunction = async () => {
    LogService.trackEvent(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeDataForm', 'syncFunction'), {});

    hideSyncConfirmDialog();
    const siteName = siteStateContext && siteStateContext.site ? siteStateContext.site.name : '';
    const notificationId = portalContext.startNotification(
      t('deploymentCenterCodeSyncRequestSubmitted'),
      t('deploymentCenterCodeSyncRequestSubmittedDesc').format(siteName)
    );
    const syncResponse = await SiteService.syncSourceControls(deploymentCenterContext.resourceId);
    if (syncResponse.metadata.success) {
      portalContext.stopNotification(notificationId, true, t('deploymentCenterCodeSyncSuccess').format(siteName));
    } else {
      const errorMessage = getErrorMessage(syncResponse.metadata.error);
      errorMessage
        ? portalContext.stopNotification(notificationId, false, t('deploymentCenterCodeSyncFailWithStatusMessage').format(errorMessage))
        : portalContext.stopNotification(notificationId, false, t('deploymentCenterCodeSyncFail'));

      LogService.error(LogCategories.deploymentCenter, getLogId('DeploymentCenterCodeDataForm', 'syncFunction'), {
        errorMessage,
      });
    }
  };

  const hideSyncConfirmDialog = () => {
    setIsSyncConfirmDialogVisible(false);
  };

  const hideDiscardConfirmDialog = () => {
    setIsDiscardConfirmDialogVisible(false);
  };

  return (
    <Formik
      initialValues={props.formData}
      onSubmit={onSubmit}
      enableReinitialize={true}
      validateOnBlur={false}
      validateOnChange={false}
      validationSchema={props.formValidationSchema}>
      {(formProps: FormikProps<DeploymentCenterFormData<DeploymentCenterCodeFormData>>) => (
        <form onKeyDown={onKeyDown}>
          <div id="deployment-center-command-bar" className={commandBarSticky}>
            <DeploymentCenterCommandBar
              isDirty={formProps.dirty}
              isLoading={props.isLoading}
              saveFunction={formProps.submitForm}
              showPublishProfilePanel={deploymentCenterPublishingContext.showPublishProfilePanel}
              discardFunction={() => setIsDiscardConfirmDialogVisible(true)}
              refresh={() => setIsRefreshConfirmDialogVisible(true)}
              sync={() => setIsSyncConfirmDialogVisible(true)}
            />
          </div>
          <>
            <ConfirmDialog
              primaryActionButton={{
                title: t('ok'),
                onClick: refreshFunction,
              }}
              defaultActionButton={{
                title: t('cancel'),
                onClick: hideRefreshConfirmDialog,
              }}
              title={t('deploymentCenterRefreshConfirmTitle')}
              content={t('deploymentCenterDataLossMessage')}
              hidden={!isRefreshConfirmDialogVisible}
              onDismiss={hideRefreshConfirmDialog}
            />
            <ConfirmDialog
              primaryActionButton={{
                title: t('cancel'),
                onClick: hideSyncConfirmDialog,
              }}
              defaultActionButton={{
                title: t('ok'),
                onClick: syncFunction,
              }}
              title={t('deploymentCenterSyncConfirmTitle')}
              content={t('deploymentCenterSyncConfirmMessage')}
              hidden={!isSyncConfirmDialogVisible}
              onDismiss={hideSyncConfirmDialog}
            />
            <ConfirmDialog
              primaryActionButton={{
                title: t('ok'),
                onClick: () => {
                  formProps.resetForm();
                  formProps.values.sourceProvider = ScmType.None;
                  formProps.values.buildProvider = BuildProvider.None;
                  hideDiscardConfirmDialog();
                },
              }}
              defaultActionButton={{
                title: t('cancel'),
                onClick: hideDiscardConfirmDialog,
              }}
              title={t('deploymentCenterDiscardConfirmTitle')}
              content={t('deploymentCenterDataLossMessage')}
              hidden={!isDiscardConfirmDialogVisible}
              onDismiss={hideDiscardConfirmDialog}
            />
          </>
          <div className={pivotContent}>
            <DeploymentCenterCodePivot {...props} formProps={formProps} />
          </div>
        </form>
      )}
    </Formik>
  );
};

export default DeploymentCenterCodeForm;
