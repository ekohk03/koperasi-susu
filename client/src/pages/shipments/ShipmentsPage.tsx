import { useState } from 'react';
import { Add, Edit, Delete } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, IconButton } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';

export default function ShipmentsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => (await axios.get('/api/shipments')).data.data
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ id: '', date: dayjs().format('YYYY-MM-DD'), amount: '', destination: '', notes: '' });

  const openCreate = () => {
    setForm({ id: '', date: dayjs().format('YYYY-MM-DD'), amount: '', destination: '', notes: '' });
    setOpen(true);
  };

  const openEdit = (row: any) => {
    // Ensure date is in YYYY-MM-DD format for date input
    const formattedDate = row.date ? new Date(row.date).toISOString().split('T')[0] : '';
    setForm({
      id: row.id,
      date: formattedDate,
      amount: row.amount.toString(),
      destination: row.destination,
      notes: row.notes || ''
    });
    setEditOpen(true);
  };

  const save = async () => {
    try {
      await axios.post('/api/shipments', {
        ...form,
        amount: Number(form.amount)
      });
      setOpen(false);
      setForm({ id: '', date: dayjs().format('YYYY-MM-DD'), amount: '', destination: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      alert('Pengiriman berhasil ditambahkan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  const saveEdit = async () => {
    try {
      await axios.put(`/api/shipments/${form.id}`, {
        date: form.date,
        amount: Number(form.amount),
        destination: form.destination,
        notes: form.notes
      });
      setEditOpen(false);
      setForm({ id: '', date: dayjs().format('YYYY-MM-DD'), amount: '', destination: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      alert('Pengiriman berhasil diupdate!');
    } catch (err: any) {
      console.error('Update error:', err);
      if (err.response && err.response.status === 400 && err.response.data && err.response.data.errors) {
        const msg = err.response.data.errors.map((e: any) => e.msg).join('\n');
        alert('Gagal mengupdate:\n' + msg);
      } else {
        alert('Gagal mengupdate: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
      }
    }
  };

  const deleteShipment = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data pengiriman ini?')) {
      return;
    }

    try {
      await axios.delete(`/api/shipments/${id}`);
      alert('Berhasil menghapus pengiriman!');
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    } catch (err: any) {
      alert('Gagal menghapus: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>Pengiriman Susu</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Tambah</Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tanggal</TableCell>
                  <TableCell align="right">Jumlah (L)</TableCell>
                  <TableCell>Tujuan</TableCell>
                  <TableCell>Catatan</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data ?? []).map((row: any) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell align="right">{row.amount}</TableCell>
                    <TableCell>{row.destination}</TableCell>
                    <TableCell>{row.notes}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEdit(row)} color="primary">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteShipment(row.id)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tambah Pengiriman Susu</DialogTitle>
        <DialogContent>
          <TextField
            label="Tanggal"
            type="date"
            fullWidth
            margin="normal"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Jumlah Susu (Liter)"
            type="number"
            fullWidth
            margin="normal"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />
          <TextField
            label="Alamat / Tujuan"
            fullWidth
            margin="normal"
            value={form.destination}
            onChange={e => setForm({ ...form, destination: e.target.value })}
          />
          <TextField
            label="Catatan"
            fullWidth
            margin="normal"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Batal</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={
              !form.date ||
              !form.amount ||
              Number(form.amount) <= 0 ||
              !form.destination
            }
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Edit Pengiriman */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Pengiriman Susu</DialogTitle>
        <DialogContent>
          <TextField
            label="Tanggal"
            type="date"
            fullWidth
            margin="normal"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Jumlah Susu (Liter)"
            type="number"
            fullWidth
            margin="normal"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />
          <TextField
            label="Alamat / Tujuan"
            fullWidth
            margin="normal"
            value={form.destination}
            onChange={e => setForm({ ...form, destination: e.target.value })}
          />
          <TextField
            label="Catatan"
            fullWidth
            margin="normal"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Batal</Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={
              !form.date ||
              !form.amount ||
              Number(form.amount) <= 0 ||
              !form.destination
            }
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}



