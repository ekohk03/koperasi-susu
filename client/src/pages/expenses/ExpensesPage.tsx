import { Add, Download, PhotoCamera, Visibility } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, IconButton } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useRef } from 'react';
import { formatDate, formatRupiah, downloadExcel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const BASE_URL = 'http://localhost:5000';

export default function ExpensesPage() {
	const queryClient = useQueryClient();
	const { token } = useAuth();
	const { data } = useQuery({ queryKey: ['expenses'], queryFn: async () => (await axios.get('/api/expenses')).data.data });
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<any>({ id: 0, category: '', amount: '', date: '', description: '' });
	const fileRef = useRef<HTMLInputElement>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [detail, setDetail] = useState<any|null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (ev) => setPreview(ev.target?.result as string);
			reader.readAsDataURL(file);
		} else {
			setPreview(null);
		}
	};

	const openCreate = () => {
		setForm({ id: 0, category: '', amount: '', date: '', description: '' });
		setPreview(null);
		setOpen(true);
	};
	const openEdit = (row: any) => {
		setForm(row);
		setPreview(row.proof_image ? `${BASE_URL}/uploads/${row.proof_image}` : null);
		setOpen(true);
	};
	const openDetail = (row: any) => {
		setDetail(row);
	};

	const save = async () => {
		console.log('save called');
		console.log('form:', form);
		try {
			const formData = new FormData();
			formData.append('category', form.category);
			formData.append('amount', form.amount);
			formData.append('date', form.date);
			formData.append('description', form.description);
			if (fileRef.current && fileRef.current.files && fileRef.current.files[0]) {
				formData.append('proof_image', fileRef.current.files[0]);
			}
			// Log FormData content
			for (let pair of formData.entries()) {
				console.log(pair[0]+ ':', pair[1]);
			}
			if (form.id) {
				await axios.put(`/api/expenses/${form.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
			} else {
				await axios.post('/api/expenses', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
			}
			setOpen(false);
			queryClient.invalidateQueries({ queryKey: ['expenses'] });
			alert('Berhasil disimpan!');
		} catch (err: any) {
			console.error('Save error:', err);
			if (err.response && err.response.status === 400 && err.response.data && err.response.data.errors) {
				const msg = err.response.data.errors.map((e: any) => e.msg).join('\n');
				alert('Gagal menyimpan:\n' + msg);
			} else {
				alert('Gagal menyimpan: ' + (err?.message || 'Unknown error'));
			}
		}
	};

	const remove = async (id: number) => {
		if (!confirm('Hapus pengeluaran ini?')) return;
		await axios.delete(`/api/expenses/${id}`);
		queryClient.invalidateQueries({ queryKey: ['expenses'] });
	};

	const doExport = () => downloadExcel('/api/expenses/export/excel', token || undefined);

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant="h5" fontWeight={700}>Pengeluaran</Typography>
					<Box sx={{ display: 'flex', gap: 1 }}>
						<Button variant="outlined" startIcon={<Download />} onClick={doExport}>Export</Button>
						<Button variant="contained" startIcon={<Add />} onClick={openCreate}>Tambah</Button>
					</Box>
				</Box>
			</Grid>
			<Grid item xs={12}>
				<Card>
					<CardContent>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Kategori</TableCell>
									<TableCell>Jumlah</TableCell>
									<TableCell>Tanggal</TableCell>
									<TableCell>Keterangan</TableCell>
									<TableCell>Bukti</TableCell>
									<TableCell align="right">Aksi</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{(data ?? []).map((row: any) => (
									<TableRow key={row.id} hover>
										<TableCell>{row.category}</TableCell>
										<TableCell>{formatRupiah(row.amount)}</TableCell>
										<TableCell>{formatDate(row.date)}</TableCell>
										<TableCell>{row.description}</TableCell>
										<TableCell>
											{row.proof_image ? (
												<a href={`${BASE_URL}/uploads/${row.proof_image}`} target="_blank" rel="noopener noreferrer">
													<img src={`${BASE_URL}/uploads/${row.proof_image}`} alt="Bukti" style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, border: '1px solid #eee' }} />
												</a>
											) : '-'}
										</TableCell>
										<TableCell align="right">
											<IconButton size="small" onClick={() => openDetail(row)}><Visibility /></IconButton>
											<Button size="small" onClick={() => openEdit(row)}>Edit</Button>
											<Button size="small" color="error" onClick={() => remove(row.id)}>Hapus</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</Grid>

			<Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>{form.id ? 'Edit' : 'Tambah'} Pengeluaran</DialogTitle>
				<DialogContent>
					<TextField label="Kategori" fullWidth margin="normal" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
					<TextField label="Jumlah" type="number" fullWidth margin="normal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
					<TextField label="Tanggal" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.date?.slice(0,10) || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
					<TextField label="Keterangan" fullWidth margin="normal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
					<input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
					<Button variant="outlined" startIcon={<PhotoCamera />} onClick={() => fileRef.current?.click()} sx={{ mt: 2 }}>
						Pilih Foto
					</Button>
					{preview && (
						<Box sx={{ mt: 2, mb: 1 }}>
							<img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #eee' }} />
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Batal</Button>
					<Button variant="contained" onClick={save}>Simpan</Button>
				</DialogActions>
			</Dialog>
			{/* Dialog detail pengeluaran */}
			<Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
				<DialogTitle>Detail Pengeluaran</DialogTitle>
				<DialogContent>
					{detail && (
						<Card sx={{ mb: 2, p: 2 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Kategori</Typography>
									<Typography variant="body1" fontWeight={500}>{detail.category}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Jumlah</Typography>
									<Typography variant="body1" fontWeight={500}>{formatRupiah(detail.amount)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Tanggal</Typography>
									<Typography variant="body1" fontWeight={500}>{formatDate(detail.date)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Keterangan</Typography>
									<Typography variant="body1" fontWeight={500}>{detail.description || '-'}</Typography>
								</Grid>
								{detail.proof_image && (
									<Grid item xs={12}>
										<Typography variant="body2" color="text.secondary">Bukti</Typography>
										<Box sx={{ mt: 1 }}>
											<img src={`${BASE_URL}/uploads/${detail.proof_image}`} alt="Bukti" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #eee' }} />
										</Box>
									</Grid>
								)}
							</Grid>
						</Card>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetail(null)}>Tutup</Button>
				</DialogActions>
			</Dialog>
		</Grid>
	);
}
