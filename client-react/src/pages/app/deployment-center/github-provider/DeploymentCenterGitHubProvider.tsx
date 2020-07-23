import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import DeploymentCenterGitHubSettings from './DeploymentCenterGitHubSettings';
import { DeploymentCenterGitHubProviderProps } from '../DeploymentCenter.types';
import { DeploymentCenterContext } from '../DeploymentCenterContext';

const DeploymentCenterGitHubProvider: React.FC<DeploymentCenterGitHubProviderProps> = props => {
  const { t } = useTranslation();
  const deploymentCenterContext = useContext(DeploymentCenterContext);

  return (
    <>
      {deploymentCenterContext.isContainerApplication ? (
        <h3>{t('deploymentCenterContainerGitHubActionsTitle')}</h3>
      ) : (
        <h3>{t('deploymentCenterCodeGitHubTitle')}</h3>
      )}
      <DeploymentCenterGitHubSettings {...props} />
    </>
  );
};

export default DeploymentCenterGitHubProvider;
