import { Add, Delete, Download, Edit } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert, Chip, IconButton } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { formatNumber, formatRupiah, downloadExcel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

export default function CollectionsPage() {
	const [filters, setFilters] = useState({ start_date: '', end_date: '' });
	const { token } = useAuth();
	const queryClient = useQueryClient();
	const { data, refetch } = useQuery({
		queryKey: ['collections', filters],
		queryFn: async () => (await axios.get('/api/collections', { params: filters })).data.data
	});

	// Ubah fungsi export agar seragam dengan pengeluaran
	const doExport = () => downloadExcel('/api/collections/export/excel', token || undefined);

	// Dialog tambah koleksi
	const [open, setOpen] = useState(false);
	const [collectors, setCollectors] = useState<any[]>([]);
	const [form, setForm] = useState<any>({ collector_id: '', morning_amount: '', afternoon_amount: '', date: dayjs().format('YYYY-MM-DD'), price_per_liter: '' });

	// Dialog edit koleksi
	const [editOpen, setEditOpen] = useState(false);
	const [editForm, setEditForm] = useState<any>({ id: '', collector_id: '', morning_amount: '', afternoon_amount: '', date: '', price_per_liter: '' });
	const [editingCollection, setEditingCollection] = useState<any>(null);

	// Dialog hapus per bulan
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteForm, setDeleteForm] = useState<any>({ year: dayjs().year(), month: dayjs().month() + 1 });
	const [availableMonths, setAvailableMonths] = useState<any[]>([]);
	const [selectedMonthData, setSelectedMonthData] = useState<any>(null);

	const loadCollectors = async () => {
		try {
			const res = await axios.get('/api/collectors');
			setCollectors(res.data?.data ?? []);
		} catch (error: any) {
			console.error('Gagal memuat daftar pengepul:', error?.response?.data || error?.message || error);
			setCollectors([]);
		}
	};

	useEffect(() => {
		loadCollectors();
		// Load available months for bulk delete
		axios.get('/api/collections/stats/available-months')
			.then(res => setAvailableMonths(res.data.data))
			.catch(err => {
				console.error('Gagal memuat daftar bulan:', err?.response?.data || err?.message || err);
				setAvailableMonths([]);
			});
	}, []);

	const openCreate = async () => {
		setForm({ collector_id: '', morning_amount: '', afternoon_amount: '', date: dayjs().format('YYYY-MM-DD'), price_per_liter: '' });
		if (!collectors.length) {
			await loadCollectors();
		}
		setOpen(true);
	};


	const save = async () => {
		try {
			await axios.post('/api/collections', {
				collector_id: Number(form.collector_id),
				morning_amount: Number(form.morning_amount || 0),
				afternoon_amount: Number(form.afternoon_amount || 0),
				date: form.date,
				price_per_liter: Number(form.price_per_liter || 0)
			});
			alert('Berhasil menambahkan koleksi susu!');
			setOpen(false);
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		} catch (err: any) {
			console.error('Save error:', err);
			alert('Gagal menyimpan: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const openEdit = async (collection: any) => {
		setEditingCollection(collection);
		setEditForm({
			id: collection.id,
			collector_id: collection.collector_id,
			morning_amount: collection.morning_amount,
			afternoon_amount: collection.afternoon_amount,
			date: collection.date,
			price_per_liter: collection.price_per_liter
		});
		if (!collectors.length) {
			await loadCollectors();
		}
		setEditOpen(true);
	};

	const saveEdit = async () => {
		try {
			await axios.put(`/api/collections/${editForm.id}`, {
				collector_id: Number(editForm.collector_id),
				morning_amount: Number(editForm.morning_amount || 0),
				afternoon_amount: Number(editForm.afternoon_amount || 0),
				date: editForm.date,
				price_per_liter: Number(editForm.price_per_liter)
			});
			alert('Berhasil mengupdate koleksi susu!');
			setEditOpen(false);
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		} catch (err: any) {
			console.error('Update error:', err);
			alert('Gagal mengupdate: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const deleteCollection = async (id: number) => {
		if (!confirm('Anda yakin ingin menghapus data koleksi susu ini?')) {
			return;
		}

		try {
			await axios.delete(`/api/collections/${id}`);
			alert('Berhasil menghapus koleksi susu!');
			queryClient.invalidateQueries({ queryKey: ['collections'] });
		} catch (err: any) {
			console.error('Delete error:', err);
			alert('Gagal menghapus: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const openDeleteDialog = () => {
		setDeleteForm({ year: dayjs().year(), month: dayjs().month() + 1 });
		setSelectedMonthData(null);
		setDeleteDialogOpen(true);
	};

	const handleMonthChange = () => {
		const monthData = availableMonths.find(m => m.year === deleteForm.year && m.month === deleteForm.month);
		setSelectedMonthData(monthData || null);
	};

	const deleteByMonth = async () => {
		if (!selectedMonthData) return;
		
		if (!confirm(`Anda yakin ingin menghapus ${selectedMonthData.record_count} data koleksi susu untuk bulan ${deleteForm.month}/${deleteForm.year}?\n\nTotal: ${selectedMonthData.record_count} record\nTotal Liter: ${selectedMonthData.total_liters?.toLocaleString()} L\nTotal Pendapatan: Rp ${selectedMonthData.total_income?.toLocaleString()}\n\nTindakan ini tidak dapat dibatalkan!`)) {
			return;
		}

		try {
			await axios.delete('/api/collections/bulk/delete-by-month', {
				data: { year: deleteForm.year, month: deleteForm.month }
			});
			
			setDeleteDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ['collections'] });
			
			// Refresh available months
			const res = await axios.get('/api/collections/stats/available-months');
			setAvailableMonths(res.data.data);
			
			alert('Data berhasil dihapus!');
		} catch (error: any) {
			alert('Error: ' + (error.response?.data?.message || error.message || 'Gagal menghapus data'));
		}
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
					<Typography variant="h5" fontWeight={700}>Koleksi Susu</Typography>
					<Box sx={{ display: 'flex', gap: 1 }}>
						<TextField type="date" label="Mulai" InputLabelProps={{ shrink: true }} size="small" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
						<TextField type="date" label="Selesai" InputLabelProps={{ shrink: true }} size="small" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
						<Button variant="outlined" startIcon={<Download />} onClick={doExport}>Download</Button>
						<Button variant="contained" startIcon={<Add />} onClick={openCreate}>Tambah</Button>
						<Button variant="outlined" color="error" startIcon={<Delete />} onClick={openDeleteDialog}>Hapus Per Bulan</Button>
					</Box>
				</Box>
			</Grid>
			<Grid item xs={12}>
				<Card>
					<CardContent>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Tanggal</TableCell>
									<TableCell>Pengepul</TableCell>
									<TableCell align="right">Pagi (L)</TableCell>
									<TableCell align="right">Sore (L)</TableCell>
									<TableCell align="right">Total (L)</TableCell>
									<TableCell align="right">Harga/L</TableCell>
									<TableCell align="right">Pendapatan</TableCell>
									<TableCell align="center">Aksi</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{(data ?? []).map((row: any) => (
									<TableRow key={row.id} hover>
										<TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
										<TableCell>{row.collector_name}</TableCell>
										<TableCell align="right">{formatNumber(row.morning_amount)}</TableCell>
										<TableCell align="right">{formatNumber(row.afternoon_amount)}</TableCell>
										<TableCell align="right">{formatNumber(row.total_amount)}</TableCell>
										<TableCell align="right">{formatRupiah(row.price_per_liter)}</TableCell>
										<TableCell align="right">{formatRupiah(row.total_income)}</TableCell>
										<TableCell align="center">
											<IconButton size="small" onClick={() => openEdit(row)} color="primary">
												<Edit />
											</IconButton>
											<IconButton size="small" onClick={() => deleteCollection(row.id)} color="error">
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
				<DialogTitle>Tambah Koleksi Susu</DialogTitle>
				<DialogContent>
					<Select fullWidth value={form.collector_id} onChange={(e) => setForm({ ...form, collector_id: e.target.value })} sx={{ mt: 2 }} displayEmpty>
						<MenuItem value="" disabled>Pilih Pengepul</MenuItem>
						{collectors.map((c) => (
							<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
						))}
					</Select>
					<TextField label="Tanggal" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
					<TextField label="Jumlah Pagi (L)" type="number" fullWidth margin="normal" value={form.morning_amount} onChange={(e) => setForm({ ...form, morning_amount: e.target.value })} />
					<TextField label="Jumlah Sore (L)" type="number" fullWidth margin="normal" value={form.afternoon_amount} onChange={(e) => setForm({ ...form, afternoon_amount: e.target.value })} />
					<TextField label="Harga per Liter (Rp)" type="number" fullWidth margin="normal" value={form.price_per_liter} onChange={(e) => setForm({ ...form, price_per_liter: e.target.value })} />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Batal</Button>
					<Button variant="contained" onClick={save} disabled={(Number(form.morning_amount || 0) <= 0) && (Number(form.afternoon_amount || 0) <= 0)}>Simpan</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog Edit Koleksi */}
			<Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>Edit Koleksi Susu</DialogTitle>
				<DialogContent>
					<Alert severity="info" sx={{ mb: 2 }}>
						<strong>Info:</strong> Anda hanya dapat mengedit data yang sama (pagi atau sore) sesuai dengan data sebelumnya.
					</Alert>
					<Select fullWidth value={editForm.collector_id} onChange={(e) => setEditForm({ ...editForm, collector_id: e.target.value })} sx={{ mt: 2 }} displayEmpty>
						<MenuItem value="" disabled>Pilih Pengepul</MenuItem>
						{collectors.map((c) => (
							<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
						))}
					</Select>
					<TextField label="Tanggal" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
					<TextField 
						label="Jumlah Pagi (L)" 
						type="number" 
						fullWidth 
						margin="normal" 
						value={editForm.morning_amount} 
						onChange={(e) => setEditForm({ ...editForm, morning_amount: e.target.value })}
						disabled={editingCollection?.morning_amount === 0}
						helperText={editingCollection?.morning_amount === 0 ? "Data pagi tidak tersedia untuk record ini" : ""}
					/>
					<TextField 
						label="Jumlah Sore (L)" 
						type="number" 
						fullWidth 
						margin="normal" 
						value={editForm.afternoon_amount} 
						onChange={(e) => setEditForm({ ...editForm, afternoon_amount: e.target.value })}
						disabled={editingCollection?.afternoon_amount === 0}
						helperText={editingCollection?.afternoon_amount === 0 ? "Data sore tidak tersedia untuk record ini" : ""}
					/>
					<TextField 
						label="Harga per Liter" 
						type="number" 
						fullWidth 
						margin="normal" 
						value={editForm.price_per_liter} 
						onChange={(e) => setEditForm({ ...editForm, price_per_liter: e.target.value })}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditOpen(false)}>Batal</Button>
					<Button 
						variant="contained" 
						onClick={saveEdit} 
						disabled={(Number(editForm.morning_amount || 0) <= 0) && (Number(editForm.afternoon_amount || 0) <= 0)}
					>
						Simpan
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog Hapus Per Bulan */}
			<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>Hapus Data Koleksi Susu Per Bulan</DialogTitle>
				<DialogContent>
					<Alert severity="warning" sx={{ mb: 2 }}>
						<strong>Peringatan!</strong> Tindakan ini akan menghapus semua data koleksi susu untuk bulan yang dipilih. 
						Tindakan ini tidak dapat dibatalkan!
					</Alert>
					
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<TextField
								label="Tahun"
								type="number"
								fullWidth
								margin="normal"
								value={deleteForm.year}
								onChange={(e) => {
									setDeleteForm({ ...deleteForm, year: parseInt(e.target.value) });
									setTimeout(handleMonthChange, 100);
								}}
								inputProps={{ min: 2020, max: 2030 }}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								label="Bulan"
								type="number"
								fullWidth
								margin="normal"
								value={deleteForm.month}
								onChange={(e) => {
									setDeleteForm({ ...deleteForm, month: parseInt(e.target.value) });
									setTimeout(handleMonthChange, 100);
								}}
								inputProps={{ min: 1, max: 12 }}
							/>
						</Grid>
					</Grid>

					{selectedMonthData && (
						<Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
							<Typography variant="h6" gutterBottom>
								Data untuk {deleteForm.month}/{deleteForm.year}
							</Typography>
							<Grid container spacing={2}>
								<Grid item xs={4}>
									<Typography variant="body2" color="text.secondary">Total Record</Typography>
									<Typography variant="h6" color="primary">
										{selectedMonthData.record_count}
									</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="body2" color="text.secondary">Total Liter</Typography>
									<Typography variant="h6" color="success.main">
										{selectedMonthData.total_liters?.toLocaleString()} L
									</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="body2" color="text.secondary">Total Pendapatan</Typography>
									<Typography variant="h6" color="error.main">
										Rp {selectedMonthData.total_income?.toLocaleString()}
									</Typography>
								</Grid>
							</Grid>
						</Box>
					)}

					{!selectedMonthData && deleteForm.year && deleteForm.month && (
						<Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
							<Typography color="text.secondary">
								Tidak ada data untuk bulan {deleteForm.month}/{deleteForm.year}
							</Typography>
						</Box>
					)}

					<Box sx={{ mt: 2 }}>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Bulan yang tersedia:
						</Typography>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{availableMonths.slice(0, 10).map((month: any) => (
								<Chip
									key={`${month.year}-${month.month}`}
									label={`${month.month}/${month.year} (${month.record_count})`}
									variant="outlined"
									size="small"
									onClick={() => {
										setDeleteForm({ year: month.year, month: month.month });
										setSelectedMonthData(month);
									}}
									color={month.year === deleteForm.year && month.month === deleteForm.month ? 'primary' : 'default'}
								/>
							))}
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
					<Button 
						variant="contained" 
						color="error" 
						onClick={deleteByMonth}
						disabled={!selectedMonthData}
					>
						Hapus Data
					</Button>
				</DialogActions>
			</Dialog>
		</Grid>
	);
}
