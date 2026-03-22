import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, Spin, message, Modal, Form, InputNumber, Select, DatePicker, Alert } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, DollarOutlined, WalletOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesApi, transactionsApi } from '../../api/finance.api';
import { Invoice } from '../../types/finance.types';
import { formatINR } from '../../styles/theme';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = {
  draft: 'default', sent: 'blue', partial: 'orange', paid: 'green', cancelled: 'red',
};

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [advanceForm] = Form.useForm();
  const [payForm] = Form.useForm();

  const fetchInvoice = () => {
    if (!id) return;
    invoicesApi.getById(parseInt(id)).then(inv => {
      setInvoice(inv);
      setLoading(false);
    });
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const recordPayment = async () => {
    const values = await payForm.validateFields();
    const result = await transactionsApi.create({
      type: 'income',
      patient_id: invoice!.patient_id,
      invoice_id: invoice!.id,
      amount_paise: Math.round(values.amount * 100),
      payment_method: values.payment_method,
      transaction_date: values.date.format('YYYY-MM-DD'),
      reference_number: values.reference,
      category: 'Treatment Payment',
    });
    if (result.advance_created > 0) {
      message.success(`Payment recorded. ${formatINR(result.advance_created)} added to advance balance.`);
    } else {
      message.success('Payment recorded');
    }
    setPaymentOpen(false);
    fetchInvoice();
  };

  const applyAdvance = async () => {
    try {
      const values = await advanceForm.validateFields();
      await transactionsApi.applyAdvanceToInvoice({
        patient_id: invoice!.patient_id,
        invoice_id: invoice!.id,
        amount_paise: Math.round(values.amount * 100),
        transaction_date: dayjs().format('YYYY-MM-DD'),
      });
      message.success('Advance applied to invoice');
      setAdvanceModalOpen(false);
      fetchInvoice();
    } catch (err: any) {
      message.error(err?.message || 'Failed to apply advance');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!invoice) return <div>Invoice not found</div>;

  const itemColumns = [
    { title: 'Description', dataIndex: 'description' },
    { title: 'Qty', dataIndex: 'quantity', width: 60 },
    { title: 'Unit Price', dataIndex: 'unit_price_paise', width: 120, render: (v: number) => formatINR(v) },
    { title: 'Total', dataIndex: 'total_paise', width: 120, render: (v: number) => formatINR(v) },
  ];

  const paymentColumns = [
    { title: 'Date', dataIndex: 'transaction_date', render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
    { title: 'Amount', dataIndex: 'amount_paise', render: (v: number) => formatINR(v) },
    { title: 'Method', dataIndex: 'payment_method' },
    { title: 'Reference', dataIndex: 'reference_number' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>Back</Button>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <>
            <Button type="primary" icon={<DollarOutlined />} onClick={() => {
              payForm.resetFields();
              payForm.setFieldsValue({ payment_method: 'cash', date: dayjs(), amount: (invoice.balance_paise || 0) / 100 });
              setPaymentOpen(true);
            }}>Record Payment</Button>
            <Button icon={<WalletOutlined />} onClick={async () => {
              try {
                const bal = await transactionsApi.getPatientAdvanceBalance(invoice.patient_id);
                setAdvanceBalance(bal);
                advanceForm.resetFields();
                advanceForm.setFieldsValue({ amount: Math.min(bal, invoice.balance_paise || 0) / 100 });
                setAdvanceModalOpen(true);
              } catch (err: any) {
                message.error(err?.message || 'Failed to fetch advance balance');
              }
            }}>Apply Advance</Button>
          </>
        )}
      </Space>

      <Card>
        <Descriptions title={`Invoice ${invoice.invoice_number}`} bordered size="small" column={2}>
          <Descriptions.Item label="Patient">{invoice.patient_name}</Descriptions.Item>
          <Descriptions.Item label="Date">{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={statusColors[invoice.status]}>{invoice.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Total">{formatINR(invoice.total_paise)}</Descriptions.Item>
          <Descriptions.Item label="Paid">{formatINR(invoice.paid_paise || 0)}</Descriptions.Item>
          <Descriptions.Item label="Balance">
            <span style={{ color: (invoice.balance_paise || 0) > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
              {formatINR(invoice.balance_paise || 0)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <h4 style={{ marginTop: 24, marginBottom: 8 }}>Items</h4>
        <Table columns={itemColumns} dataSource={invoice.items} rowKey="id" pagination={false} size="small"
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3} align="right"><strong>Subtotal</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><strong>{formatINR(invoice.subtotal_paise)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
              {invoice.discount_paise > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">Discount</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>-{formatINR(invoice.discount_paise)}</Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              {invoice.tax_paise > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">Tax</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>{formatINR(invoice.tax_paise)}</Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3} align="right"><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><strong>{formatINR(invoice.total_paise)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {(invoice.payments || []).length > 0 && (
          <>
            <h4 style={{ marginTop: 24, marginBottom: 8 }}>Payments</h4>
            <Table columns={paymentColumns} dataSource={invoice.payments} rowKey="id" pagination={false} size="small" />
          </>
        )}
      </Card>

      <Modal title="Record Payment" open={paymentOpen} onCancel={() => setPaymentOpen(false)} onOk={recordPayment} destroyOnClose>
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="\u20B9" />
          </Form.Item>
          <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}>
            <Select options={[
              { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
            ]} />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="reference" label="Reference Number">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Apply Advance" open={advanceModalOpen} onCancel={() => setAdvanceModalOpen(false)} onOk={applyAdvance} destroyOnClose
        okButtonProps={{ disabled: advanceBalance <= 0 }}>
        {advanceBalance > 0 ? (
          <Form form={advanceForm} layout="vertical">
            <Alert
              type="info"
              message={`Patient has ${formatINR(advanceBalance)} available as advance balance`}
              style={{ marginBottom: 16 }}
            />
            <Form.Item name="amount" label="Amount to Apply (₹)" rules={[{ required: true }]}>
              <InputNumber min={0.01} max={Math.min(advanceBalance, invoice?.balance_paise || 0) / 100} precision={2} style={{ width: '100%' }} prefix="₹" />
            </Form.Item>
          </Form>
        ) : (
          <Alert type="warning" message="This patient has no advance balance available." />
        )}
      </Modal>
    </div>
  );
};

export default InvoiceDetailPage;
