import { useState } from 'react';
import { Button, Checkbox, Dropdown, Space, Typography, Badge } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import type { CheckboxDropdownProps } from '@/types';

const { Text } = Typography;

export default function CheckboxDropdown({ options, value, onChange, placeholder, disabled }: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false);

  const menu = {
    items: options.map((opt) => ({
      key: opt.value,
      label: (
        <Checkbox
          checked={value.includes(opt.value)}
          onChange={(e) => {
            e.stopPropagation();
            if (value.includes(opt.value)) {
              onChange(value.filter((v) => v !== opt.value));
            } else {
              onChange([...value, opt.value]);
            }
          }}
        >
          {opt.label}
        </Checkbox>
      ),
    })),
  };

  return (
    <Dropdown
      menu={menu}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      <Button
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 32,
          borderColor: value.length > 0 ? '#FE2C55' : undefined,
        }}
        disabled={disabled}
      >
        <Space>
          <Text style={{ color: value.length > 0 ? '#FE2C55' : '#bfbfbf', fontSize: 13 }}>
            {placeholder}
          </Text>
          {value.length > 0 && <Badge count={value.length} size="small" color="#FE2C55" />}
        </Space>
        <DownOutlined style={{ fontSize: 10 }} />
      </Button>
    </Dropdown>
  );
}
