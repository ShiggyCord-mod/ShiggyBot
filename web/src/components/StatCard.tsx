import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card sx={{ transition: 'transform 200ms cubic-bezier(0,0,0.2,1), border-color 200ms' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primaryContainer',
            color: 'onPrimaryContainer',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
