import React, { useEffect, useState } from 'react';
import { Select, TreeSelect, Space } from 'antd';
import { treatmentsApi } from '../../api/treatments.api';
import { TreatmentTree, Treatment } from '../../types/treatment.types';

interface TreatmentTreeSelectProps {
  value?: number;
  onChange?: (treatmentId: number | undefined) => void;
  disabled?: boolean;
}

function buildTreeData(treatments: Treatment[]): any[] {
  return treatments.map(t => ({
    value: t.id,
    title: `${t.name} (\u20B9${(t.estimated_cost_paise / 100).toLocaleString('en-IN')})`,
    children: t.children ? buildTreeData(t.children) : [],
  }));
}

const TreatmentTreeSelect: React.FC<TreatmentTreeSelectProps> = ({ value, onChange, disabled }) => {
  const [trees, setTrees] = useState<TreatmentTree[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<number | undefined>();
  const [treeData, setTreeData] = useState<any[]>([]);

  useEffect(() => {
    treatmentsApi.listTrees().then(setTrees);
  }, []);

  // If value is set, find which tree it belongs to
  useEffect(() => {
    if (value && !selectedTreeId) {
      treatmentsApi.getById(value).then((t: any) => {
        if (t) setSelectedTreeId(t.tree_id);
      });
    }
  }, [value]);

  useEffect(() => {
    if (selectedTreeId) {
      treatmentsApi.getTreeWithTreatments(selectedTreeId).then((data: any) => {
        setTreeData(buildTreeData(data.treatments || []));
      });
    } else {
      setTreeData([]);
    }
  }, [selectedTreeId]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        placeholder="Select treatment category"
        value={selectedTreeId}
        onChange={(val) => {
          setSelectedTreeId(val);
          onChange?.(undefined);
        }}
        disabled={disabled}
        allowClear
        style={{ width: '100%' }}
      >
        {trees.map(t => (
          <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
        ))}
      </Select>

      {selectedTreeId && (
        <TreeSelect
          placeholder="Select treatment"
          value={value}
          onChange={onChange}
          treeData={treeData}
          disabled={disabled}
          allowClear
          showSearch
          treeNodeFilterProp="title"
          style={{ width: '100%' }}
        />
      )}
    </Space>
  );
};

export default TreatmentTreeSelect;
