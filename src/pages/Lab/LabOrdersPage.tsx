import React from 'react';
import { Card } from 'antd';
import LabOrders from './LabOrders';

const LabOrdersPage: React.FC = () => (
  <div>
    <div className="page-header"><h2>Lab Orders</h2></div>
    <Card><LabOrders /></Card>
  </div>
);

export default LabOrdersPage;
