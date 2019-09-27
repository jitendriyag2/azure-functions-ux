import React, { useState, useContext } from 'react';
import { AppKeysModel, AppKeysTypes } from './AppKeys.types';
import {
  ActionButton,
  DetailsListLayoutMode,
  SelectionMode,
  IColumn,
  SearchBox,
  TooltipHost,
  ICommandBarItemProps,
} from 'office-ui-fabric-react';
import { useTranslation } from 'react-i18next';
import { filterBoxStyle, renewTextStyle } from './AppKeys.styles';
import { defaultCellStyle } from '../../../../components/DisplayTableWithEmptyMessage/DisplayTableWithEmptyMessage';
import { emptyKey } from './AppKeys';
import AppKeyAddEdit from './AppKeyAddEdit';
import IconButton from '../../../../components/IconButton/IconButton';
import { AppKeysContext } from './AppKeysDataLoader';
import { Site } from '../../../../models/site/site';
import { ArmObj } from '../../../../models/arm-obj';
import Panel from '../../../../components/Panel/Panel';
import DisplayTableWithCommandBar from '../../../../components/DisplayTableWithCommandBar/DisplayTableWithCommandBar';
import { ThemeContext } from '../../../../ThemeContext';
import ConfirmDialog from '../../../../components/ConfirmDialog/ConfirmDialog';

interface SystemKeysProps {
  resourceId: string;
  site: ArmObj<Site>;
  systemKeys: AppKeysModel[];
  refreshData: () => void;
}

const SystemKeys: React.FC<SystemKeysProps> = props => {
  const writePermission = false;
  const { systemKeys, resourceId, refreshData } = props;
  const [showValues, setShowValues] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewKey, setRenewKey] = useState(emptyKey);
  const [filterValue, setFilterValue] = useState('');
  const [panelItem, setPanelItem] = useState('');
  const [currentKey, setCurrentKey] = useState(emptyKey);
  const [shownValues, setShownValues] = useState<string[]>([]);

  const { t } = useTranslation();
  const appKeysContext = useContext(AppKeysContext);
  const theme = useContext(ThemeContext);

  const flipHideSwitch = () => {
    setShownValues(showValues ? [] : [...new Set(systemKeys.map(h => h.name))]);
    setShowValues(!showValues);
  };

  const onClosePanel = () => {
    setShowPanel(false);
    setPanelItem('');
  };

  const showAddEditPanel = (key?: AppKeysModel) => {
    setShowPanel(true);
    setCurrentKey(key ? key : emptyKey);
    setPanelItem(key ? 'edit' : 'add');
  };

  const toggleFilter = () => {
    setFilterValue('');
    setShowFilter(!showFilter);
  };

  const filterValues = () => {
    return systemKeys.filter(x => {
      if (!filterValue) {
        return true;
      } else {
        return x.name.toLowerCase().includes(filterValue.toLowerCase());
      }
    });
  };

  const createSystemKey = (key: AppKeysModel) => {
    appKeysContext.createKey(resourceId, key.name, key.value, AppKeysTypes.systemKeys);
    refreshData();
  };

  const getColumns = (): IColumn[] => {
    return [
      {
        key: 'name',
        name: t('nameRes'),
        fieldName: 'name',
        minWidth: 210,
        maxWidth: 350,
        isRowHeader: true,
        data: 'string',
        isPadded: true,
        isResizable: true,
        onRender: onRenderColumnItem,
      },
      {
        key: 'value',
        name: t('value'),
        fieldName: 'value',
        minWidth: 210,
        isRowHeader: false,
        data: 'string',
        isPadded: true,
        isResizable: true,
        onRender: onRenderColumnItem,
      },
      {
        key: 'renew',
        name: '',
        fieldName: 'renew',
        minWidth: 100,
        isRowHeader: false,
        data: 'string',
        isPadded: true,
        isResizable: true,
        onRender: onRenderColumnItem,
      },
      {
        key: 'delete',
        name: '',
        fieldName: 'delete',
        minWidth: 100,
        maxWidth: 100,
        isRowHeader: false,
        isResizable: false,
        isCollapsable: false,
        onRender: onRenderColumnItem,
      },
    ];
  };

  const onShowHideButtonClick = (itemKey: string) => {
    const hidden = !shownValues.includes(itemKey) && !showValues;
    const newShownValues = new Set(shownValues);
    if (hidden) {
      newShownValues.add(itemKey);
    } else {
      newShownValues.delete(itemKey);
    }
    setShowValues(newShownValues.size === systemKeys.length);
    setShownValues([...newShownValues]);
  };

  const deleteSystemKey = (itemKey: string) => {
    appKeysContext.deleteKey(resourceId, itemKey, AppKeysTypes.systemKeys);
    refreshData();
  };

  const onRenderColumnItem = (item: AppKeysModel, index: number, column: IColumn) => {
    const itemKey = item.name;
    const hidden = !shownValues.includes(itemKey) && !showValues;

    if (column.key === 'value') {
      return (
        <>
          <ActionButton
            id={`app-keys-host-keys-show-hide-${index}`}
            className={defaultCellStyle}
            onClick={() => onShowHideButtonClick(itemKey)}
            iconProps={{ iconName: hidden ? 'RedEye' : 'Hide' }}>
            {hidden ? (
              <div className={defaultCellStyle}>{t('hiddenValueClickAboveToShow')}</div>
            ) : (
              <div className={defaultCellStyle} id={`app-keys-host-keys-value-${index}`}>
                {item[column.fieldName!]}
              </div>
            )}
          </ActionButton>
        </>
      );
    }
    if (column.key === 'name') {
      return (
        <ActionButton
          className={defaultCellStyle}
          id={`app-settings-application-settings-name-${index}`}
          onClick={() => showAddEditPanel(item)}>
          <span aria-live="assertive" role="region">
            {item[column.fieldName!]}
          </span>
        </ActionButton>
      );
    }
    if (column.key === 'delete') {
      return (
        <TooltipHost
          content={t('delete')}
          id={`app-keys-host-keys-delete-tooltip-${index}`}
          calloutProps={{ gapSpace: 0 }}
          closeDelay={500}>
          <IconButton
            className={defaultCellStyle}
            disabled={false}
            id={`app-settings-application-settings-delete-${index}`}
            iconProps={{ iconName: 'Delete' }}
            ariaLabel={t('delete')}
            onClick={() => deleteSystemKey(itemKey)}
          />
        </TooltipHost>
      );
    }
    if (column.key === 'renew') {
      return (
        <span className={renewTextStyle(theme)} onClick={() => showRenewKeyDialog(item)}>
          {t('renewKeyValue')}
        </span>
      );
    }
    return <div className={defaultCellStyle}>{item[column.fieldName!]}</div>;
  };

  const closeRenewKeyDialog = () => {
    setRenewKey(emptyKey);
    setShowRenewDialog(false);
  };

  const showRenewKeyDialog = (item: AppKeysModel) => {
    setRenewKey(item);
    setShowRenewDialog(true);
  };

  const renewSystemKey = () => {
    if (renewKey.name) {
      createSystemKey({ name: renewKey.name, value: '' });
    }
    closeRenewKeyDialog();
  };

  const getCommandBarItems = (): ICommandBarItemProps[] => {
    return [
      {
        key: 'app-keys-system-keys-add',
        onClick: () => showAddEditPanel(),
        disabled: writePermission,
        iconProps: { iconName: 'Add' },
        name: t('newSystemKey'),
        ariaLabel: t('addSystemKey'),
      },
      {
        key: 'app-keys-system-keys-show-hide',
        onClick: flipHideSwitch,
        iconProps: { iconName: !showValues ? 'RedEye' : 'Hide' },
        name: !showValues ? t('showValues') : t('hideValues'),
      },
      {
        key: 'app-keys-system-keys-show-filter',
        onClick: toggleFilter,
        iconProps: { iconName: 'Filter' },
        name: t('filter'),
      },
    ];
  };

  return (
    <>
      <ConfirmDialog
        primaryActionButton={{
          title: t('functionKeys_renew'),
          onClick: renewSystemKey,
        }}
        defaultActionButton={{
          title: t('cancel'),
          onClick: closeRenewKeyDialog,
        }}
        title={t('renewKeyValue')}
        content={t('renewKeyValueContent').format(renewKey.name)}
        hidden={!showRenewDialog}
        onDismiss={closeRenewKeyDialog}
      />
      <DisplayTableWithCommandBar
        commandBarItems={getCommandBarItems()}
        columns={getColumns()}
        items={filterValues()}
        isHeaderVisible={true}
        layoutMode={DetailsListLayoutMode.justified}
        selectionMode={SelectionMode.none}
        selectionPreservedOnEmptyClick={true}
        emptyMessage={t('emptySystemKeys')}>
        {showFilter && (
          <SearchBox
            id="app-keys-system-keys-search"
            className="ms-slideDownIn20"
            autoFocus
            iconProps={{ iconName: 'Filter' }}
            styles={filterBoxStyle}
            placeholder={t('filterSystemKeys')}
            onChange={newValue => setFilterValue(newValue)}
          />
        )}
      </DisplayTableWithCommandBar>
      <Panel
        isOpen={showPanel && (panelItem === 'add' || panelItem === 'edit')}
        onDismiss={onClosePanel}
        headerText={panelItem === 'edit' ? t('editSystemKey') : t('addSystemKey')}
        closeButtonAriaLabel={t('close')}>
        <AppKeyAddEdit
          resourceId={resourceId}
          createAppKey={createSystemKey}
          closeBlade={onClosePanel}
          appKey={currentKey}
          otherAppKeys={systemKeys}
          panelItem={panelItem}
        />
      </Panel>
    </>
  );
};

export default SystemKeys;