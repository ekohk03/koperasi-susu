import { useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
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
  const [form, setForm] = useState({ date: dayjs().format('YYYY-MM-DD'), amount: '', destination: '', notes: '' });

  const save = async () => {
    try {
      await axios.post('/api/shipments', {
        ...form,
        amount: Number(form.amount)
      });
      setOpen(false);
      setForm({ date: dayjs().format('YYYY-MM-DD'), amount: '', destination: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      alert('Pengiriman berhasil ditambahkan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>Pengiriman Susu</Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>Tambah Pengiriman</Button>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {(data ?? []).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell align="right">{row.amount}</TableCell>
                    <TableCell>{row.destination}</TableCell>
                    <TableCell>{row.notes}</TableCell>
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
    </Grid>
  );
}



