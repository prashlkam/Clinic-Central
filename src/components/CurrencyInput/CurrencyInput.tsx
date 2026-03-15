import React from 'react';
import { InputNumber } from 'antd';

interface CurrencyInputProps {
  value?: number;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, disabled, placeholder }) => {
  return (
    <InputNumber
      style={{ width: '100%' }}
      prefix="\u20B9"
      precision={2}
      min={0}
      value={value !== undefined ? value / 100 : undefined}
      onChange={(val) => onChange?.(val !== null ? Math.round(val * 100) : null)}
      disabled={disabled}
      placeholder={placeholder || '0.00'}
      formatter={(val) => val ? `${val}`.replace(/\B(?=(\d{2})+(\d)(?!\d))/g, ',') : ''}
      parser={(val) => val ? parseFloat(val.replace(/,/g, '')) : 0}
    />
  );
};

export default CurrencyInput;
