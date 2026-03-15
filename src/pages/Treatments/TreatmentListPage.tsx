import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Space, Tree, message, Modal, Form, Input, InputNumber, Tag, Popconfirm, Empty } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { treatmentsApi } from '../../api/treatments.api';
import { TreatmentTree, Treatment } from '../../types/treatment.types';
import { formatINR } from '../../styles/theme';

const TreatmentListPage: React.FC = () => {
  const [trees, setTrees] = useState<TreatmentTree[]>([]);
  const [selectedTree, setSelectedTree] = useState<(TreatmentTree & { treatments?: Treatment[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null);
  const [treeFormOpen, setTreeFormOpen] = useState(false);
  const [form] = Form.useForm();
  const [treeForm] = Form.useForm();
  const [viewMode, setViewMode] = useState<'cards' | 'tree'>('cards');

  const fetchTrees = async () => {
    setLoading(true);
    const t = await treatmentsApi.listTrees();
    setTrees(t);
    if (t.length > 0 && !selectedTree) {
      const full = await treatmentsApi.getTreeWithTreatments(t[0].id);
      setSelectedTree(full);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrees(); }, []);

  const selectTree = async (treeId: number) => {
    const full = await treatmentsApi.getTreeWithTreatments(treeId);
    setSelectedTree(full);
  };

  const handleImport = async () => {
    const result = await treatmentsApi.importFile();
    if (result) {
      message.success(`Imported ${result.treesCreated} trees, ${result.treatmentsCreated} treatments`);
      fetchTrees();
    }
  };

  const handleSaveTreatment = async () => {
    const values = await form.validateFields();
    const data = {
      ...values,
      estimated_cost_paise: Math.round((values.estimated_cost || 0) * 100),
      tree_id: selectedTree?.id,
    };
    delete data.estimated_cost;

    if (editTreatment) {
      await treatmentsApi.update(editTreatment.id, data);
      message.success('Treatment updated');
    } else {
      await treatmentsApi.create(data);
      message.success('Treatment created');
    }
    setFormOpen(false);
    setEditTreatment(null);
    if (selectedTree) selectTree(selectedTree.id);
  };

  const handleDeleteTreatment = async (id: number) => {
    await treatmentsApi.delete(id);
    message.success('Treatment deleted');
    if (selectedTree) selectTree(selectedTree.id);
  };

  const handleCreateTree = async () => {
    const values = await treeForm.validateFields();
    await treatmentsApi.createTree(values.name, values.description);
    message.success('Category created');
    setTreeFormOpen(false);
    treeForm.resetFields();
    fetchTrees();
  };

  const flattenTreatments = (treatments: Treatment[] = []): Treatment[] => {
    const result: Treatment[] = [];
    const walk = (list: Treatment[]) => {
      for (const t of list) {
        result.push(t);
        if (t.children) walk(t.children);
      }
    };
    walk(treatments);
    return result;
  };

  const buildTreeData = (treatments: Treatment[] = []): any[] => {
    return treatments.map(t => ({
      key: t.id,
      title: (
        <Space>
          <span>{t.name}</span>
          <Tag color="blue">{formatINR(t.estimated_cost_paise)}</Tag>
          <Tag>{t.duration_minutes}min</Tag>
          <Button size="small" icon={<EditOutlined />} onClick={(e) => {
            e.stopPropagation();
            setEditTreatment(t);
            form.setFieldsValue({ ...t, estimated_cost: t.estimated_cost_paise / 100 });
            setFormOpen(true);
          }} />
          <Popconfirm title="Delete?" onConfirm={() => handleDeleteTreatment(t.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      children: t.children ? buildTreeData(t.children) : [],
    }));
  };

  const allTreatments = selectedTree ? flattenTreatments(selectedTree.treatments) : [];

  return (
    <div>
      <div className="page-header">
        <h2>Treatments</h2>
        <Space>
          <Button onClick={() => setViewMode(v => v === 'cards' ? 'tree' : 'cards')}>
            {viewMode === 'cards' ? 'Tree View' : 'Card View'}
          </Button>
          <Button icon={<UploadOutlined />} onClick={handleImport}>Import from File</Button>
          <Button icon={<PlusOutlined />} onClick={() => setTreeFormOpen(true)}>New Category</Button>
          {selectedTree && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditTreatment(null);
              form.resetFields();
              setFormOpen(true);
            }}>Add Treatment</Button>
          )}
        </Space>
      </div>

      {/* Category tabs */}
      <Space style={{ marginBottom: 16 }} wrap>
        {trees.map(t => (
          <Button
            key={t.id}
            type={selectedTree?.id === t.id ? 'primary' : 'default'}
            onClick={() => selectTree(t.id)}
          >
            {t.name}
          </Button>
        ))}
      </Space>

      {!selectedTree && <Empty description="No treatment categories. Import a treatment file or create a category." />}

      {selectedTree && viewMode === 'cards' && (
        <Row gutter={[16, 16]}>
          {allTreatments.map(t => (
            <Col key={t.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                className="treatment-card"
                size="small"
                title={t.name}
                extra={
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => {
                      setEditTreatment(t);
                      form.setFieldsValue({ ...t, estimated_cost: t.estimated_cost_paise / 100 });
                      setFormOpen(true);
                    }} />
                  </Space>
                }
              >
                <div><strong>Cost:</strong> {formatINR(t.estimated_cost_paise)}</div>
                <div><strong>Duration:</strong> {t.duration_minutes} min</div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {selectedTree && viewMode === 'tree' && (
        <Card>
          <Tree
            treeData={buildTreeData(selectedTree.treatments)}
            defaultExpandAll
            showLine
          />
        </Card>
      )}

      {/* Treatment Form */}
      <Modal
        title={editTreatment ? 'Edit Treatment' : 'Add Treatment'}
        open={formOpen}
        onCancel={() => { setFormOpen(false); setEditTreatment(null); }}
        onOk={handleSaveTreatment}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Treatment Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="estimated_cost" label="Estimated Cost (₹)" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="\u20B9" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration_minutes" label="Duration (minutes)">
                <InputNumber min={5} max={480} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Tree Category Form */}
      <Modal
        title="New Treatment Category"
        open={treeFormOpen}
        onCancel={() => setTreeFormOpen(false)}
        onOk={handleCreateTree}
        destroyOnClose
      >
        <Form form={treeForm} layout="vertical">
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Endodontics, Orthodontics" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TreatmentListPage;
