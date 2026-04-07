import { useEffect, useState } from 'react';
import type { AnimatedPageProps } from '@/types';

export default function AnimatedPage({ children }: AnimatedPageProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.3s ease',
      }}
    >
      {children}
    </div>
  );
}
