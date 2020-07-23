import React, { useContext, useState, useEffect } from 'react';
import { DeploymentCenterFieldProps, DeploymentCenterCodeFormData, WorkflowOption } from '../DeploymentCenter.types';
import DeploymentCenterGitHubDataLoader from '../github-provider/DeploymentCenterGitHubDataLoader';
import { ScmType, BuildProvider } from '../../../../models/site/config';
import { DeploymentCenterContext } from '../DeploymentCenterContext';
import DeploymentCenterGitHubConfiguredView from '../github-provider/DeploymentCenterGitHubConfiguredView';
import DeploymentCenterCodeBuildConfiguredView from './DeploymentCenterCodeBuildConfiguredView';
import DeploymentCenterCodeSourceAndBuild from './DeploymentCenterCodeSourceAndBuild';
import DeploymentCenterGitHubWorkflowConfigSelector from '../github-provider/DeploymentCenterGitHubWorkflowConfigSelector';
import DeploymentCenterGitHubWorkflowConfigPreview from '../github-provider/DeploymentCenterGitHubWorkflowConfigPreview';
import DeploymentCenterCodeBuildRuntimeAndVersion from './DeploymentCenterCodeBuildRuntimeAndVersion';
import CustomBanner from '../../../../components/CustomBanner/CustomBanner';
import { deploymentCenterConsole, panelBanner, deploymentCenterInfoBannerDiv } from '../DeploymentCenter.styles';
import { MessageBarType, Link } from 'office-ui-fabric-react';
import { useTranslation } from 'react-i18next';
import { getWorkflowInformation } from '../utility/GitHubActionUtility';
import { getWorkflowFileName } from '../utility/DeploymentCenterUtility';
import DeploymentCenterCodeSourceKuduConfiguredView from './DeploymentCenterCodeSourceKuduConfiguredView';
import { DeploymentCenterLinks } from '../../../../utils/FwLinks';
import { learnMoreLinkStyle } from '../../../../components/form-controls/formControl.override.styles';

const DeploymentCenterCodeSettings: React.FC<DeploymentCenterFieldProps<DeploymentCenterCodeFormData>> = props => {
  const { formProps } = props;
  const { t } = useTranslation();
  const [showPreviewPanelInfoBanner, setShowPreviewPanelInfoBanner] = useState(true);
  const [showProductionSlotInfoBanner, setShowProductionSlotInfoBanner] = useState(true);
  const [githubActionExistingWorkflowContents, setGithubActionExistingWorkflowContents] = useState<string>('');
  const [workflowFilePath, setWorkflowFilePath] = useState<string>('');

  const deploymentCenterContext = useContext(DeploymentCenterContext);

  const isGitHubSource = formProps.values.sourceProvider === ScmType.GitHub;
  const isGitHubActionsBuild = formProps.values.buildProvider === BuildProvider.GitHubAction;
  const isDeploymentConfigured =
    deploymentCenterContext.siteConfig && deploymentCenterContext.siteConfig.properties.scmType !== ScmType.None;
  const isGitHubActionsConfigured =
    deploymentCenterContext.siteConfig && deploymentCenterContext.siteConfig.properties.scmType === ScmType.GitHubAction;
  const isGitHubSourceConfigured =
    deploymentCenterContext.siteConfig &&
    (deploymentCenterContext.siteConfig.properties.scmType === ScmType.GitHubAction ||
      deploymentCenterContext.siteConfig.properties.scmType === ScmType.GitHub);
  const isUsingExistingOrAvailableWorkflowConfig =
    formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig ||
    formProps.values.workflowOption === WorkflowOption.UseAvailableWorkflowConfigs;
  const isProductionSlot = !(deploymentCenterContext.siteDescriptor && deploymentCenterContext.siteDescriptor.slot);

  const closePreviewPanelInfoBanner = () => {
    setShowPreviewPanelInfoBanner(false);
  };

  const closeProductionSlotInfoBanner = () => {
    setShowProductionSlotInfoBanner(false);
  };

  const isPreviewFileButtonEnabled = () => {
    if (
      formProps.values.workflowOption === WorkflowOption.UseAvailableWorkflowConfigs ||
      formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig
    ) {
      return true;
    }
    if (formProps.values.workflowOption === WorkflowOption.Add || formProps.values.workflowOption === WorkflowOption.Overwrite) {
      if (formProps.values.runtimeStack && formProps.values.runtimeVersion) {
        return true;
      }
    }

    return false;
  };

  const createPreviewPanelContent = (customBannerMessage: string, content: string) => {
    return (
      <>
        {showPreviewPanelInfoBanner && (
          <div className={panelBanner}>
            <CustomBanner message={customBannerMessage} type={MessageBarType.info} onDismiss={closePreviewPanelInfoBanner} />
          </div>
        )}
        {content && <pre className={deploymentCenterConsole}>{content}</pre>}
      </>
    );
  };

  const getPreviewPanelContent = () => {
    if (formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig) {
      return createPreviewPanelContent(t('githubActionWorkflowOptionUseExistingMessage'), githubActionExistingWorkflowContents);
    } else if (formProps.values.workflowOption === WorkflowOption.UseAvailableWorkflowConfigs) {
      return createPreviewPanelContent(t('githubActionWorkflowOptionUseExistingMessageWithoutPreview'), '');
    } else if (formProps.values.workflowOption === WorkflowOption.Add || formProps.values.workflowOption === WorkflowOption.Overwrite) {
      const information = getWorkflowInformation(
        formProps.values.runtimeStack,
        formProps.values.runtimeVersion,
        formProps.values.runtimeRecommendedVersion,
        formProps.values.branch,
        deploymentCenterContext.isLinuxApplication,
        formProps.values.gitHubPublishProfileSecretGuid,
        deploymentCenterContext.siteDescriptor ? deploymentCenterContext.siteDescriptor.site : '',
        deploymentCenterContext.siteDescriptor ? deploymentCenterContext.siteDescriptor.slot : ''
      );
      return createPreviewPanelContent(t('githubActionWorkflowOptionOverwriteIfConfigExists'), information.content);
    }
  };

  useEffect(() => {
    if (
      deploymentCenterContext.siteDescriptor &&
      (formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig ||
        formProps.values.workflowOption === WorkflowOption.Add ||
        formProps.values.workflowOption === WorkflowOption.Overwrite)
    ) {
      const workflowFileName = getWorkflowFileName(
        formProps.values.branch,
        deploymentCenterContext.siteDescriptor.site,
        deploymentCenterContext.siteDescriptor.slot
      );
      setWorkflowFilePath(`.github/workflows/${workflowFileName}`);
    } else {
      setWorkflowFilePath('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formProps.values.workflowOption]);

  return (
    <>
      {!isDeploymentConfigured && isProductionSlot && showProductionSlotInfoBanner && (
        <div className={deploymentCenterInfoBannerDiv}>
          <CustomBanner
            message={t('deploymentCenterProdSlotWarning')}
            type={MessageBarType.info}
            onDismiss={closeProductionSlotInfoBanner}
          />
        </div>
      )}
      <p>
        <span id="deployment-center-settings-message">{t('deploymentCenterCodeSettingsDescription')}</span>
        <Link
          id="deployment-center-settings-learnMore"
          href={DeploymentCenterLinks.appServiceDocumentation}
          target="_blank"
          className={learnMoreLinkStyle}
          aria-labelledby="deployment-center-settings-message">
          {` ${t('learnMore')}`}
        </Link>
      </p>
      {isDeploymentConfigured ? (
        <>
          {!isGitHubActionsConfigured && <DeploymentCenterCodeSourceKuduConfiguredView />}
          {isGitHubSourceConfigured && <DeploymentCenterGitHubConfiguredView isGitHubActionsConfigured={isGitHubActionsConfigured} />}
          <DeploymentCenterCodeBuildConfiguredView />
        </>
      ) : (
        <>
          <DeploymentCenterCodeSourceAndBuild formProps={formProps} />
          {isGitHubSource && (
            <>
              <DeploymentCenterGitHubDataLoader formProps={formProps} />
              {isGitHubActionsBuild && (
                <>
                  <DeploymentCenterGitHubWorkflowConfigSelector
                    formProps={formProps}
                    setGithubActionExistingWorkflowContents={setGithubActionExistingWorkflowContents}
                  />
                  {!isUsingExistingOrAvailableWorkflowConfig && <DeploymentCenterCodeBuildRuntimeAndVersion formProps={formProps} />}
                  <DeploymentCenterGitHubWorkflowConfigPreview
                    getPreviewPanelContent={getPreviewPanelContent}
                    setShowInfoBanner={setShowPreviewPanelInfoBanner}
                    isPreviewFileButtonEnabled={isPreviewFileButtonEnabled}
                    workflowFilePath={workflowFilePath}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

export default DeploymentCenterCodeSettings;
