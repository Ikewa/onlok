import { Card, CardContent, Box, Typography, Chip, Avatar } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import type { VendorSearchResult } from '../types';

interface VendorCardProps {
  vendor: VendorSearchResult;
  onClick?: () => void;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  verified: 'success',
  pending: 'warning',
  rejected: 'error',
  suspended: 'default',
};

export default function VendorCard({ vendor, onClick }: VendorCardProps) {
  const fullName = `${vendor.first_name} ${vendor.last_name}`.trim();
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-3px)',
              boxShadow: '0 8px 32px rgba(26,31,232,0.12)',
            }
          : {},
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Avatar
          sx={{
            width: 52,
            height: 52,
            bgcolor: 'primary.main',
            fontWeight: 700,
            fontSize: '1.1rem',
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {fullName}
            </Typography>
            {vendor.status === 'verified' && (
              <VerifiedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" noWrap>
            {vendor.business_name}
          </Typography>
          <Typography variant="caption" color="text.disabled" fontFamily="monospace">
            {vendor.vendor_id}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Chip
            label={vendor.status}
            size="small"
            color={statusColors[vendor.status] ?? 'default'}
            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
          />
          {vendor.badges?.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {vendor.badges.length} badge{vendor.badges.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
