import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Image, Popconfirm, Row, Select, Space, Tag, Tooltip, message } from 'antd';
import { UploadOutlined, DeleteOutlined, FolderOpenOutlined, FileOutlined } from '@ant-design/icons';
import { filesApi, errorText } from '../../../api/clinic.api';

const CATEGORIES = [
  { value: 'xray', label: 'X-ray', color: 'geekblue' },
  { value: 'photo', label: 'Intraoral photo', color: 'green' },
  { value: 'report', label: 'Report', color: 'purple' },
  { value: 'case_sheet', label: 'Case sheet', color: 'gold' },
  { value: 'other', label: 'Other', color: 'default' },
];
const categoryOf = (v: string) => CATEGORIES.find(c => c.value === v) || CATEGORIES[CATEGORIES.length - 1];
const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** X-rays, photos and documents. Files are copied into the app's own data folder on this computer. */
const FilesTab: React.FC<{ patientId: number }> = ({ patientId }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<number, string | null>>({});
  const [category, setCategory] = useState('xray');
  const [filter, setFilter] = useState<string | undefined>();

  const reload = useCallback(async () => {
    try {
      const list: any[] = await filesApi.list(patientId);
      setFiles(list);
      for (const f of list) {
        if (f.mime_type?.startsWith('image/')) {
          filesApi.getPreview(f.id).then((url: string | null) => setPreviews(p => ({ ...p, [f.id]: url }))).catch(() => undefined);
        }
      }
    } catch (err) {
      message.error(errorText(err, 'Could not load files'));
    }
  }, [patientId]);

  useEffect(() => { reload(); }, [reload]);

  const add = async () => {
    try {
      const result = await filesApi.pick(patientId, category);
      if (result) {
        message.success(`${result.added} file${result.added === 1 ? '' : 's'} attached`);
        reload();
      }
    } catch (err) {
      message.error(errorText(err, 'Could not attach files'));
    }
  };

  const shown = filter ? files.filter(f => f.category === filter) : files;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Select allowClear placeholder="Show all types" style={{ width: 180 }} value={filter} onChange={setFilter} options={CATEGORIES} />
        <Space.Compact>
          <Select style={{ width: 160 }} value={category} onChange={setCategory} options={CATEGORIES} />
          <Button type="primary" icon={<UploadOutlined />} onClick={add}>Attach files</Button>
        </Space.Compact>
      </div>
      {shown.length === 0 ? <Empty description="No files attached" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
        <Image.PreviewGroup>
          <Row gutter={[12, 12]}>
            {shown.map(f => (
              <Col key={f.id} xs={12} sm={8} md={6} lg={4}>
                <Card size="small" styles={{ body: { padding: 8 } }}
                  cover={
                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', overflow: 'hidden' }}>
                      {previews[f.id]
                        ? <Image src={previews[f.id]!} alt={f.original_name} height={120} style={{ objectFit: 'contain' }} />
                        : <FileOutlined style={{ fontSize: 40, color: '#94a3b8' }} />}
                    </div>
                  }
                  actions={[
                    <Tooltip title="Open in default viewer" key="open"><FolderOpenOutlined onClick={() => filesApi.open(f.id).catch((e: any) => message.error(errorText(e)))} /></Tooltip>,
                    <Popconfirm key="del" title="Delete this file permanently?" okText="Delete" okButtonProps={{ danger: true }}
                      onConfirm={() => filesApi.delete(f.id).then(reload).catch((e: any) => message.error(errorText(e)))}>
                      <DeleteOutlined style={{ color: '#dc2626' }} />
                    </Popconfirm>,
                  ]}>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.original_name}>{f.original_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Tag color={categoryOf(f.category).color} style={{ margin: 0 }}>{categoryOf(f.category).label}</Tag>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{size(f.size_bytes)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(f.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN')}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </Image.PreviewGroup>
      )}
    </div>
  );
};

export default FilesTab;
