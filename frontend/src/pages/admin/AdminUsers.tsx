import { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, Avatar, Chip, 
  CircularProgress, InputAdornment, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { getAllUsers, deleteAdminUser, type UserManagement } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserManagement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAllUsers();
      // Ensure we only show vendors, or display role.
      setUsers(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteClick = (user: UserManagement) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminUser(userToDelete.id);
      toast.success('User deleted successfully');
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(v => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) ||
      (v.vendor_id || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q)
    );
  });

  const displayedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ maxWidth: 1200, fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
          User Management
        </Typography>
        <Typography variant="body1" color="#6B7280" sx={{ fontSize: '0.88rem' }}>
          View and manage all registered users on the platform.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', mb: 3 }}>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search by name, ONLOK ID, or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: '8px', bgcolor: '#F3F4F6', '& fieldset': { border: 'none' }, fontSize: '0.88rem' }
          }}
        />
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#F9FAFB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>ONLOK ID</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Registration Date</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress sx={{ color: '#5B5FEC' }} />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#6B7280' }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((v) => {
                  const initials = `${v.first_name?.[0] || ''}${v.last_name?.[0] || ''}`.toUpperCase() || 'U';
                  
                  return (
                    <TableRow 
                      key={v.id} 
                      hover
                      sx={{ '&:hover': { bgcolor: '#F9FAFB' }, borderBottom: '1px solid #F3F4F6' }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 38, height: 38, bgcolor: '#374151', color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>
                              {v.first_name} {v.last_name}
                            </Typography>
                            <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
                              {v.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" color="#4B5563" sx={{ fontSize: '0.85rem' }}>
                          {v.vendor_id || 'N/A'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                        {v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>

                      <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                        <Chip 
                          label={v.role ? v.role.charAt(0).toUpperCase() + v.role.slice(1) : 'Unknown'} 
                          size="small"
                          sx={{ 
                            bgcolor: v.role === 'admin' ? '#E0E7FF' : '#F3F4F6', 
                            color: v.role === 'admin' ? '#4338CA' : '#4B5563',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }} 
                        />
                      </TableCell>

                      <TableCell>
                        <Chip 
                          label={v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : 'Unknown'} 
                          size="small"
                          sx={{ 
                            bgcolor: v.status === 'active' ? '#DCFCE7' : v.status === 'suspended' ? '#FEE2E2' : '#FEF3C7', 
                            color: v.status === 'active' ? '#16A34A' : v.status === 'suspended' ? '#DC2626' : '#D97706',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }} 
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlinedIcon />}
                          onClick={() => handleDeleteClick(v)}
                          sx={{ textTransform: 'none', borderRadius: '8px' }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: { borderRadius: '12px', p: 1 }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ fontWeight: 700, color: '#111827' }}>
          Delete User Permanently?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: '#4B5563' }}>
            Are you sure you want to permanently delete the user <strong>{userToDelete?.first_name} {userToDelete?.last_name}</strong> ({userToDelete?.email})? 
            This action cannot be undone and will remove all their associated data from the platform.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={isDeleting}
            sx={{ color: '#6B7280', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained" 
            disabled={isDeleting}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none' }}
            autoFocus
          >
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
