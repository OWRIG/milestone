import React, { useState, useEffect } from 'react';
import { Select, Slider, Switch, DatePicker, Button } from '@douyinfe/semi-ui';
import { ColorPicker } from '../../../ColorPicker';
import { bitable, FieldType, dashboard } from '@lark-base-open/js-sdk';
import { ConfigPanelProps, STimelineConfig } from '../../types';
import { useTranslation } from 'react-i18next';
import './style.scss';

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onConfigChange, loading = false }) => {
  const { t } = useTranslation();
  const [tableList, setTableList] = useState<any[]>([]);
  const [fieldList, setFieldList] = useState<any[]>([]);
  const [dateFields, setDateFields] = useState<any[]>([]);
  const [textFields, setTextFields] = useState<any[]>([]);
  const [statusFields, setStatusFields] = useState<any[]>([]);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 获取表格列表
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tables = await bitable.base.getTableMetaList();
        setTableList(tables.map(table => ({
          label: table.name,
          value: table.id
        })));
      } catch (error) {
        console.error('获取表格列表失败:', error);
      }
    };
    fetchTables();
  }, []);

  // 获取字段列表
  useEffect(() => {
    const fetchFields = async () => {
      if (!config.tableId) return;
      
      setFieldLoading(true);
      try {
        const table = await bitable.base.getTableById(config.tableId);
        const fieldMetaList = await table.getFieldMetaList();
        
        // 获取日期时间字段
        const dateTimeFields = fieldMetaList.filter(field => 
          field.type === FieldType.DateTime || 
          field.type === FieldType.CreatedTime || 
          field.type === FieldType.ModifiedTime
        );
        
        // 获取文本字段
        const textTypeFields = fieldMetaList.filter(field => 
          field.type === FieldType.Text ||
          field.type === FieldType.SingleSelect ||
          field.type === FieldType.MultiSelect
        );
        
        // 获取状态字段（单选、多选、复选框）
        const statusTypeFields = fieldMetaList.filter(field => 
          field.type === FieldType.SingleSelect ||
          field.type === FieldType.MultiSelect ||
          field.type === FieldType.Checkbox
        );
        
        setDateFields(dateTimeFields.map(field => ({
          label: field.name,
          value: field.id
        })));
        
        setTextFields(textTypeFields.map(field => ({
          label: field.name,
          value: field.id
        })));
        
        setStatusFields(statusTypeFields.map(field => ({
          label: field.name,
          value: field.id
        })));
        
        setFieldList(fieldMetaList.map(field => ({
          label: field.name,
          value: field.id,
          type: field.type
        })));
      } catch (error) {
        console.error('获取字段列表失败:', error);
      } finally {
        setFieldLoading(false);
      }
    };
    fetchFields();
  }, [config.tableId]);

  const handleConfigChange = (key: keyof STimelineConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleTimeRangeChange = (key: string, value: any) => {
    const newTimeRange = { ...config.timeRange, [key]: value };
    
    // 自动计算日期范围
    if (key === 'autoRange') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);
      
      switch (value) {
        case 'year':
          newTimeRange.startDate = new Date(currentYear, 0, 1);
          newTimeRange.endDate = new Date(currentYear, 11, 31);
          break;
        case 'month':
          newTimeRange.startDate = new Date(currentYear, currentMonth, 1);
          newTimeRange.endDate = new Date(currentYear, currentMonth + 1, 0);
          break;
        case 'quarter':
          newTimeRange.startDate = new Date(currentYear, currentQuarter * 3, 1);
          newTimeRange.endDate = new Date(currentYear, (currentQuarter + 1) * 3, 0);
          break;
        case 'custom':
          // 保持当前日期
          break;
      }
    }
    
    handleConfigChange('timeRange', newTimeRange);
  };

  // 保存配置
  const onSaveConfig = async () => {
    if (!config.tableId || !config.dateField || !config.titleField) {
      // 可以添加错误提示
      console.warn('请完成必填配置项');
      return;
    }

    setSaving(true);
    try {
      // 构建数据条件
      const dataConditions = {
        tableId: config.tableId,
        dataRange: { type: 'ALL' as const },
        groups: config.dateField ? [{ fieldId: config.dateField }] : [],
        series: config.titleField ? [{ fieldId: config.titleField, rollup: 'COUNTA' as const }] : 'COUNTA' as const
      };

      await dashboard.saveConfig({
        customConfig: config,
        dataConditions,
      });
      
      console.log('配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-panel">
      {/* 数据源选择 */}
      <div className="config-section">
        <h4>{t('config.data.source')}</h4>
        <div className="config-item">
          <label>{t('table.select')}</label>
          <Select
            value={config.tableId}
            onChange={(value) => handleConfigChange('tableId', value)}
            placeholder={t('table.select.placeholder')}
            style={{ width: '100%' }}
            loading={loading}
          >
            {tableList.map(table => (
              <Select.Option key={table.value} value={table.value}>
                {table.label}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
      
      {/* 字段映射 */}
      <div className="config-section">
        <h4>{t('config.field.mapping')}</h4>
        <div className="config-item">
          <label>{t('field.date')} *</label>
          <Select
            value={config.dateField}
            onChange={(value) => handleConfigChange('dateField', value)}
            placeholder={t('field.date.placeholder')}
            style={{ width: '100%' }}
            loading={fieldLoading}
            disabled={!config.tableId}
          >
            {dateFields.map(field => (
              <Select.Option key={field.value} value={field.value}>
                {field.label}
              </Select.Option>
            ))}
          </Select>
        </div>
        
        <div className="config-item">
          <label>{t('field.title')} *</label>
          <Select
            value={config.titleField}
            onChange={(value) => handleConfigChange('titleField', value)}
            placeholder={t('field.title.placeholder')}
            style={{ width: '100%' }}
            loading={fieldLoading}
            disabled={!config.tableId}
          >
            {textFields.map(field => (
              <Select.Option key={field.value} value={field.value}>
                {field.label}
              </Select.Option>
            ))}
          </Select>
        </div>
        
        <div className="config-item">
          <label>{t('field.description')}</label>
          <Select
            value={config.descField}
            onChange={(value) => handleConfigChange('descField', value)}
            placeholder={t('field.description.placeholder')}
            style={{ width: '100%' }}
            loading={fieldLoading}
            disabled={!config.tableId}
          >
            {textFields.map(field => (
              <Select.Option key={field.value} value={field.value}>
                {field.label}
              </Select.Option>
            ))}
          </Select>
        </div>
        
        <div className="config-item">
          <label>{t('field.status')}</label>
          <Select
            value={config.statusField}
            onChange={(value) => handleConfigChange('statusField', value)}
            placeholder={t('field.status.placeholder')}
            style={{ width: '100%' }}
            loading={fieldLoading}
            disabled={!config.tableId}
          >
            {statusFields.map(field => (
              <Select.Option key={field.value} value={field.value}>
                {field.label}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
      
      {/* 时间范围配置 */}
      <div className="config-section">
        <h4>{t('config.time.range')}</h4>
        <div className="config-item">
          <label>{t('time.range.type')}</label>
          <Select
            value={config.timeRange?.autoRange || 'year'}
            onChange={(value) => handleTimeRangeChange('autoRange', value)}
            style={{ width: '100%' }}
          >
            <Select.Option value="year">{t('time.range.year')}</Select.Option>
            <Select.Option value="month">{t('time.range.month')}</Select.Option>
            <Select.Option value="quarter">{t('time.range.quarter')}</Select.Option>
            <Select.Option value="custom">{t('time.range.custom')}</Select.Option>
          </Select>
        </div>
        
        {config.timeRange?.autoRange === 'custom' && (
          <>
            <div className="config-item">
              <label>{t('time.range.start')}</label>
              <DatePicker
                value={config.timeRange?.startDate}
                onChange={(date) => handleTimeRangeChange('startDate', date)}
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="config-item">
              <label>{t('time.range.end')}</label>
              <DatePicker
                value={config.timeRange?.endDate}
                onChange={(date) => handleTimeRangeChange('endDate', date)}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>
      
      {/* 样式配置 */}
      <div className="config-section">
        <h4>{t('config.style')}</h4>
        <div className="config-item">
          <label>{t('style.node.color')}</label>
          <ColorPicker
            value={config.nodeColor}
            onChange={(value) => handleConfigChange('nodeColor', value)}
          />
        </div>
        
        <div className="config-item">
          <label>{t('style.line.color')}</label>
          <ColorPicker
            value={config.lineColor}
            onChange={(value) => handleConfigChange('lineColor', value)}
          />
        </div>
        
        <div className="config-item">
          <label>{t('style.completed.color')}</label>
          <ColorPicker
            value={config.completedColor}
            onChange={(value) => handleConfigChange('completedColor', value)}
          />
        </div>
      </div>
      
      {/* 布局配置 */}
      <div className="config-section">
        <h4>{t('config.layout')}</h4>
        <div className="config-item">
          <label>{t('layout.curve.tension')}: {config.curveTension.toFixed(1)}</label>
          <Slider
            min={0.1}
            max={1}
            step={0.1}
            value={config.curveTension}
            onChange={(value) => handleConfigChange('curveTension', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item">
          <label>{t('layout.node.size')}: {config.nodeSize}px</label>
          <Slider
            min={8}
            max={32}
            step={2}
            value={config.nodeSize}
            onChange={(value) => handleConfigChange('nodeSize', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item">
          <label>{t('layout.min.spacing')}: {config.minNodeSpacing}px</label>
          <Slider
            min={20}
            max={80}
            step={5}
            value={config.minNodeSpacing}
            onChange={(value) => handleConfigChange('minNodeSpacing', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item switch-item">
          <label>{t('layout.show.description')}</label>
          <Switch
            checked={config.showDescription}
            onChange={(value) => handleConfigChange('showDescription', value)}
          />
        </div>
        
        <div className="config-item switch-item">
          <label>{t('layout.adaptive')}</label>
          <Switch
            checked={config.adaptiveLayout}
            onChange={(value) => handleConfigChange('adaptiveLayout', value)}
          />
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="config-actions">
        <Button
          className="save-button"
          theme="solid"
          onClick={onSaveConfig}
          loading={saving}
          disabled={loading || !config.tableId || !config.dateField || !config.titleField}
          block
        >
          {saving ? t('saving') : t('save.config')}
        </Button>
      </div>
    </div>
  );
};

export default ConfigPanel;