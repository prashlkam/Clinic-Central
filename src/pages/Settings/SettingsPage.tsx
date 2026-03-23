import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Space, Descriptions, Divider, Upload, Row, Col, Modal } from 'antd';
import { SaveOutlined, CloudDownloadOutlined, CloudUploadOutlined, UploadOutlined, ExclamationCircleOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { settingsApi, backupApi } from '../../api/finance.api';
import { treatmentsApi } from '../../api/treatments.api';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      settingsApi.getAll(),
      backupApi.lastInfo(),
    ]).then(([settings, backup]) => {
      form.setFieldsValue(settings);
      setLastBackup(backup);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    await settingsApi.setMultiple(values);
    message.success('Settings saved');
  };

  const handleBackup = async () => {
    const result = await backupApi.create();
    if (result) {
      message.success(`Backup saved to ${result.path}`);
      setLastBackup(new Date().toISOString());
    }
  };

  const handleRestore = async () => {
    const result = await backupApi.restore();
    if (result?.success) {
      message.success(result.message);
    }
  };

  const handleFactoryReset = () => {
    Modal.confirm({
      title: 'Factory Reset',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p><strong>This will permanently erase ALL data</strong> including patients, appointments, invoices, transactions, treatments, and settings.</p>
          <p>This action cannot be undone. It is recommended to create a backup before proceeding.</p>
        </div>
      ),
      okText: 'Erase Everything',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        const result = await backupApi.factoryReset();
        if (result?.success) {
          message.success(result.message);
        }
      },
    });
  };

  const handleImportTreatments = async () => {
    const result = await treatmentsApi.importFile();
    if (result) {
      message.success(`Imported ${result.treesCreated} categories, ${result.treatmentsCreated} treatments`);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Settings</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Clinic Information" loading={loading}>
            <Form form={form} layout="vertical">
              <Form.Item name="clinic_name" label="Clinic Name">
                <Input />
              </Form.Item>
              <Form.Item name="clinic_address" label="Address">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="clinic_phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="clinic_email" label="Email">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="gstin" label="GSTIN">
                    <Input placeholder="e.g. 29AAACR5055K1Z5" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="invoice_prefix" label="Invoice Prefix">
                    <Input placeholder="INV" />
                  </Form.Item>
                </Col>
              </Row>
              <Space>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>Save Settings</Button>
                <Button icon={<UserOutlined />} onClick={() => navigate('/doctor-profile')}>Doctor's Profile</Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card title="Data Management">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button icon={<UploadOutlined />} block onClick={handleImportTreatments}>
                  Import Treatment Definitions
                </Button>
                <p style={{ color: '#888', fontSize: 12 }}>Import treatments from a .txt file with tree structure</p>
              </Space>
            </Card>

            <Card title="Backup & Restore">
              {lastBackup && (
                <p style={{ marginBottom: 16, color: '#666' }}>
                  Last backup: {new Date(lastBackup).toLocaleString('en-IN')}
                </p>
              )}
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button icon={<CloudDownloadOutlined />} block onClick={handleBackup}>
                  Create Backup
                </Button>
                <Button icon={<CloudUploadOutlined />} block danger onClick={handleRestore}>
                  Restore from Backup
                </Button>
                <p style={{ color: '#888', fontSize: 12 }}>
                  Backup saves a copy of your database. Restore will replace all current data.
                </p>
              </Space>
            </Card>

            <Card title="Factory Reset">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button icon={<DeleteOutlined />} block danger type="primary" onClick={handleFactoryReset}>
                  Factory Reset
                </Button>
                <p style={{ color: '#888', fontSize: 12 }}>
                  Erases all data and restores the application to its original state. This cannot be undone.
                </p>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default SettingsPage;
