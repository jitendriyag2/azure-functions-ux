import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IDropdownOption, DropdownMenuItemType, Link } from 'office-ui-fabric-react';
import { BuildProvider, ScmType } from '../../../../models/site/config';
import { Field } from 'formik';
import Dropdown from '../../../../components/form-controls/DropDown';
import { additionalTextFieldControl } from '../DeploymentCenter.styles';
import { DeploymentCenterFieldProps, DeploymentCenterCodeFormData, BuildChoiceGroupOption } from '../DeploymentCenter.types';
import { Guid } from '../../../../utils/Guid';
import ReactiveFormControl from '../../../../components/form-controls/ReactiveFormControl';
import DeploymentCenterCodeBuildCallout from './DeploymentCenterCodeBuildCallout';

const DeploymentCenterCodeSourceAndBuild: React.FC<DeploymentCenterFieldProps<DeploymentCenterCodeFormData>> = props => {
  const { formProps } = props;
  const { t } = useTranslation();

  // TODO(DC) check to see if we can replace useState with useRef for any.

  const [selectedBuild, setSelectedBuild] = useState<BuildProvider>(BuildProvider.None);
  const [selectedBuildChoice, setSelectedBuildChoice] = useState<BuildProvider>(BuildProvider.None);
  const [isCalloutVisible, setIsCalloutVisible] = useState(false);

  const toggleIsCalloutVisible = () => {
    setSelectedBuildChoice(selectedBuild);
    setIsCalloutVisible(!isCalloutVisible);
  };

  const sourceOptions: IDropdownOption[] = [
    {
      key: 'continuousDeploymentHeader',
      text: t('deploymentCenterCodeSettingsSourceContinuousDeploymentHeader'),
      itemType: DropdownMenuItemType.Header,
    },
    { key: ScmType.GitHub, text: t('deploymentCenterCodeSettingsSourceGitHub') },
    { key: ScmType.Vso, text: t('deploymentCenterCodeSettingsSourceAzureRepos') },
    { key: ScmType.BitbucketGit, text: t('deploymentCenterCodeSettingsSourceBitbucket') },
    { key: ScmType.LocalGit, text: t('deploymentCenterCodeSettingsSourceLocalGit') },
    { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
    {
      key: 'manualDeploymentHeader',
      text: t('deploymentCenterCodeSettingsSourceManualDeploymentHeader'),
      itemType: DropdownMenuItemType.Header,
    },
    { key: ScmType.OneDrive, text: t('deploymentCenterCodeSettingsSourceOneDrive') },
    { key: ScmType.Dropbox, text: t('deploymentCenterCodeSettingsSourceDropbox') },
    { key: ScmType.ExternalGit, text: t('deploymentCenterCodeSettingsSourceExternal') },
  ];

  const updateSelectedBuild = () => {
    setSelectedBuild(selectedBuildChoice);
    formProps.setFieldValue('buildProvider', selectedBuildChoice);
    if (selectedBuildChoice === BuildProvider.GitHubAction) {
      formProps.setFieldValue(
        'gitHubPublishProfileSecretGuid',
        Guid.newGuid()
          .toLowerCase()
          .replace(/[-]/g, '')
      );
    }
    toggleIsCalloutVisible();
  };

  const updateSelectedBuildChoiceOption = (e: any, option: BuildChoiceGroupOption) => {
    setSelectedBuildChoice(option.buildType);
  };

  useEffect(() => {
    if (formProps.values.sourceProvider !== ScmType.GitHub) {
      setSelectedBuild(BuildProvider.AppServiceBuildService);
      formProps.setFieldValue('buildProvider', BuildProvider.AppServiceBuildService);
    } else {
      setSelectedBuild(BuildProvider.GitHubAction);
      formProps.setFieldValue('buildProvider', BuildProvider.GitHubAction);
      formProps.setFieldValue(
        'gitHubPublishProfileSecretGuid',
        Guid.newGuid()
          .toLowerCase()
          .replace(/[-]/g, '')
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formProps.values.sourceProvider]);

  const isSourceSelected = formProps.values.sourceProvider !== ScmType.None;
  const isGitHubSource = formProps.values.sourceProvider === ScmType.GitHub;
  const isGitHubActionsBuild = formProps.values.buildProvider === BuildProvider.GitHubAction;
  const calloutOkButtonDisabled = selectedBuildChoice === selectedBuild;

  const getBuildProviderDescription = () => {
    return isGitHubActionsBuild ? t('deploymentCenterGitHubActionsBuildDescription') : t('deploymentCenterKuduBuildDescription');
  };

  const getCalloutContent = () => {
    return (
      isCalloutVisible && (
        <DeploymentCenterCodeBuildCallout
          selectedBuildChoice={selectedBuildChoice}
          updateSelectedBuildChoiceOption={updateSelectedBuildChoiceOption}
          calloutOkButtonDisabled={calloutOkButtonDisabled}
          toggleIsCalloutVisible={toggleIsCalloutVisible}
          updateSelectedBuild={updateSelectedBuild}
        />
      )
    );
  };

  return (
    <>
      <Field
        id="deployment-center-code-settings-source-option"
        label={t('deploymentCenterSettingsSourceLabel')}
        placeholder={t('deploymentCenterCodeSettingsSourcePlaceholder')}
        name="sourceProvider"
        component={Dropdown}
        displayInVerticalLayout={true}
        options={sourceOptions}
        required={true}
      />

      {isSourceSelected &&
        (isGitHubSource ? (
          <>
            <ReactiveFormControl id="deployment-center-build-provider-text" pushContentRight={true}>
              <div>
                {getBuildProviderDescription()}
                <Link
                  key="deployment-center-change-build-provider"
                  onClick={toggleIsCalloutVisible}
                  className={additionalTextFieldControl}
                  // TODO(DC) change to BuildProviderText
                  aria-label={t('deploymentCenterChangeBuildText')}>
                  {`${t('deploymentCenterChangeBuildText')}`}
                </Link>
              </div>
            </ReactiveFormControl>
            {getCalloutContent()}
          </>
        ) : (
          <ReactiveFormControl id="deployment-center-build-provider-text" pushContentRight={true}>
            <div>{getBuildProviderDescription()}</div>
          </ReactiveFormControl>
        ))}
    </>
  );
};

export default DeploymentCenterCodeSourceAndBuild;
