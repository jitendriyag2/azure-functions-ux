import React, { useState } from 'react';
import { Pivot, PivotItem } from 'office-ui-fabric-react';
import DeploymentCenterFtps from '../DeploymentCenterFtps';
import { useTranslation } from 'react-i18next';
import { DeploymentCenterCodePivotProps, PivotItemKey } from '../DeploymentCenter.types';
import DeploymentCenterCodeLogs from './DeploymentCenterCodeLogs';
import DeploymentCenterCodeSettings from './DeploymentCenterCodeSettings';
import { pivotContent } from '../DeploymentCenter.styles';

const DeploymentCenterCodePivot: React.FC<DeploymentCenterCodePivotProps> = props => {
  const {
    publishingCredentials,
    publishingProfile,
    publishingUser,
    formProps,
    resetApplicationPassword,
    deployments,
    deploymentsError,
    isLoading,
  } = props;
  const { t } = useTranslation();
  const [selectedPivotKey, setSelectedPivotKey] = useState<string>(PivotItemKey.Logs);

  const goToSettingsOnClick = () => {
    setSelectedPivotKey('settings');
  };

  const onLinkClick = (item: PivotItem) => {
    if (item.props.itemKey) {
      setSelectedPivotKey(item.props.itemKey);
    }
  };

  return (
    <div className={pivotContent}>
      <Pivot selectedKey={selectedPivotKey} onLinkClick={onLinkClick}>
        <PivotItem
          itemKey={PivotItemKey.Logs}
          headerText={t('deploymentCenterPivotItemLogsHeaderText')}
          ariaLabel={t('deploymentCenterPivotItemLogsAriaLabel')}>
          <DeploymentCenterCodeLogs
            goToSettings={goToSettingsOnClick}
            deployments={deployments}
            deploymentsError={deploymentsError}
            isLoading={isLoading}
          />
        </PivotItem>

        <PivotItem
          itemKey={PivotItemKey.Settings}
          headerText={t('deploymentCenterPivotItemSettingsHeaderText')}
          ariaLabel={t('deploymentCenterPivotItemSettingsAriaLabel')}>
          <DeploymentCenterCodeSettings formProps={formProps} />
        </PivotItem>

        <PivotItem
          itemKey={PivotItemKey.Ftps}
          headerText={t('deploymentCenterPivotItemFtpsHeaderText')}
          ariaLabel={t('deploymentCenterPivotItemFtpsAriaLabel')}>
          <DeploymentCenterFtps
            formProps={formProps}
            resetApplicationPassword={resetApplicationPassword}
            publishingCredentials={publishingCredentials}
            publishingProfile={publishingProfile}
            publishingUser={publishingUser}
            isLoading={isLoading}
          />
        </PivotItem>
      </Pivot>
    </div>
  );
};

export default DeploymentCenterCodePivot;
