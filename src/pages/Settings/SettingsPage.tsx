import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Space, Row, Col, Modal, Switch } from 'antd';
import { SaveOutlined, CloudDownloadOutlined, CloudUploadOutlined, UploadOutlined, ExclamationCircleOutlined, DeleteOutlined, UserOutlined, DownloadOutlined, FolderOpenOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { settingsApi, backupApi } from '../../api/finance.api';
import { treatmentsApi } from '../../api/treatments.api';
import { appApi, errorText } from '../../api/clinic.api';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backup, setBackup] = useState<any>(null);
  const [folders, setFolders] = useState<any>(null);

  const refreshBackup = () => backupApi.status().then(setBackup).catch(() => undefined);

  useEffect(() => {
    Promise.all([
      settingsApi.getAll(),
      backupApi.lastInfo(),
    ]).then(([settings, backup]) => {
      form.setFieldsValue(settings);
      setLastBackup(backup);
      setLoading(false);
    });
    refreshBackup();
    appApi.dataFolder().then(setFolders).catch(() => undefined);
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

  // After the database file is swapped, restart the UI so no screen shows stale data.
  const restartUi = (text: string) => {
    Modal.success({
      title: text,
      content: 'The application will now reload.',
      onOk: () => { window.location.hash = '#/'; window.location.reload(); },
    });
  };

  const handleRestore = () => {
    Modal.confirm({
      title: 'Restore from a backup?',
      icon: <ExclamationCircleOutlined />,
      content: 'All current data will be replaced by the contents of the backup file you choose. A safety copy of the current data is kept in the automatic backup folder first.',
      okText: 'Choose backup file…',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await backupApi.restore();
          if (result?.success) restartUi(result.message);
        } catch (err) {
          Modal.error({ title: 'Restore failed', content: `${errorText(err)}\n\nYour current data has not been replaced.` });
        }
      },
    });
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
        try {
          const result = await backupApi.factoryReset();
          if (result?.success) restartUi(result.message);
        } catch (err) {
          Modal.error({ title: 'Factory reset failed', content: errorText(err) });
        }
      },
    });
  };

  const handleImportTreatments = async () => {
    try {
      const result = await treatmentsApi.importFile();
      if (result) {
        message.success(`Added ${result.treesCreated} categories and ${result.treatmentsCreated} treatments` +
          (result.skipped ? ` (${result.skipped} already present)` : ''));
      }
    } catch (err) {
      Modal.error({ title: 'Could not import the treatment file', content: errorText(err) });
    }
  };

  const handleExportTreatments = async () => {
    try {
      const result = await treatmentsApi.exportFile();
      if (result) message.success(`Treatment list saved to ${result.path}`);
    } catch (err) {
      message.error(errorText(err, 'Export failed'));
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
                  Import Treatment List (JSON)
                </Button>
                <Button icon={<DownloadOutlined />} block onClick={handleExportTreatments}>
                  Export Treatment List (JSON)
                </Button>
                <p style={{ color: '#888', fontSize: 12 }}>
                  Treatments are exchanged as a JSON file (categories → treatments → children, with cost in ₹ and duration in minutes).
                  Export the current list to see the format. Older .txt lists can still be imported.
                </p>
                <Button icon={<BookOutlined />} block onClick={() => navigate('/libraries')}>
                  Drug library, templates, labs & memberships
                </Button>
              </Space>
            </Card>

            <Card title="Backup & Restore">
              <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
                <div>Last manual backup: {lastBackup ? new Date(lastBackup).toLocaleString('en-IN') : 'never'}</div>
                <div>Last automatic backup: {backup?.lastAuto ? new Date(backup.lastAuto).toLocaleString('en-IN') : 'not yet'}</div>
              </div>
              <Space style={{ marginBottom: 8 }}>
                <Switch checked={backup?.autoEnabled ?? true} onChange={async (on) => { await settingsApi.set('auto_backup_enabled', on ? '1' : '0'); refreshBackup(); }} />
                <span>Automatic daily backup when the app starts (keeps the last 14)</span>
              </Space>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, wordBreak: 'break-all' }}>
                Folder: {backup?.autoDir}
              </div>
              <Button size="small" icon={<FolderOpenOutlined />} style={{ marginBottom: 16 }}
                onClick={async () => { const r = await backupApi.chooseAutoDir(); if (r) { message.success('Automatic backup folder changed'); refreshBackup(); } }}>
                Change folder (e.g. a USB drive)
              </Button>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button icon={<CloudDownloadOutlined />} block onClick={handleBackup}>
                  Create Backup
                </Button>
                <Button icon={<CloudUploadOutlined />} block danger onClick={handleRestore}>
                  Restore from Backup
                </Button>
                <p style={{ color: '#888', fontSize: 12 }}>
                  A manual backup saves the database and the patient files (X-rays, photos). Automatic backups save the database only.
                  Restore replaces all current data.
                </p>
              </Space>
            </Card>

            <Card title="Where your data lives">
              <p style={{ fontSize: 13 }}>Everything is stored on this computer only. Nothing is sent over the internet.</p>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: 8 }}>{folders?.userData}</div>
              <Button size="small" icon={<FolderOpenOutlined />} onClick={() => appApi.openDataFolder()}>Open data folder</Button>
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
