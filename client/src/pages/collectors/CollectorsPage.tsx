import { Add, Visibility, Download, Edit, Delete } from '@mui/icons-material';
import { Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Chip, Divider } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { downloadExcel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

export default function CollectorsPage() {
	const queryClient = useQueryClient();
	const { data } = useQuery({ queryKey: ['collectors'], queryFn: async () => (await axios.get('/api/collectors')).data.data });
	const [open, setOpen] = useState(false);
	const [detailOpen, setDetailOpen] = useState(false);
	const [selectedCollector, setSelectedCollector] = useState<any>(null);
	const [form, setForm] = useState({ id: 0, name: '', address: '', phone: '' });
	const { token } = useAuth();

	// Query for collector detail
	const { data: collectorDetail, isLoading: detailLoading, error: detailError } = useQuery({
		queryKey: ['collector-detail', selectedCollector?.id],
		queryFn: async () => {
			if (!selectedCollector) return null;
			try {
				const response = await axios.get(`/api/collectors/${selectedCollector.id}`);
				return response.data.data;
			} catch (error) {
				throw error;
			}
		},
		enabled: !!selectedCollector && detailOpen,
		retry: 1
	});

	const openCreate = () => { setForm({ id: 0, name: '', address: '', phone: '' }); setOpen(true); };
	const openEdit = (row: any) => { setForm(row); setOpen(true); };
	
	const openDetail = async (collector: any) => {
		setSelectedCollector(collector);
		setDetailOpen(true);
	};

	const save = async () => {
		try {
			if (form.id) {
				await axios.put(`/api/collectors/${form.id}`, form);
				alert('Berhasil mengedit pengepul!');
			} else {
				await axios.post('/api/collectors', form);
				alert('Berhasil menambahkan pengepul!');
			}
			setOpen(false);
			queryClient.invalidateQueries({ queryKey: ['collectors'] });
		} catch (err: any) {
			console.error('Save error:', err);
			alert('Gagal menyimpan: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const remove = async (id: number) => {
		if (!confirm('Hapus pengepul ini?')) return;
		try {
			await axios.delete(`/api/collectors/${id}`);
			alert('Berhasil menghapus pengepul!');
			queryClient.invalidateQueries({ queryKey: ['collectors'] });
		} catch (err: any) {
			console.error('Delete error:', err);
			alert('Gagal menghapus: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const handleDownloadCollector = () => {
		if (!selectedCollector) return;
		downloadExcel(`/api/collections/export/excel?collector_id=${selectedCollector.id}`, token);
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant="h5" fontWeight={700}>Pengepul Susu</Typography>
					<Button variant="contained" startIcon={<Add />} onClick={openCreate}>Tambah</Button>
				</Box>
			</Grid>
			<Grid item xs={12}>
				<Card>
					<CardContent>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Nama</TableCell>
									<TableCell>Alamat</TableCell>
									<TableCell>Telepon</TableCell>
									<TableCell align="center">Aksi</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{(data ?? []).map((row: any) => (
									<TableRow 
										key={row.id} 
										hover 
										onClick={() => openDetail(row)}
										sx={{ cursor: 'pointer' }}
									>
										<TableCell>{row.name}</TableCell>
										<TableCell>{row.address}</TableCell>
										<TableCell>{row.phone}</TableCell>
										<TableCell align="center">
											<IconButton 
												size="small" 
												onClick={(e) => { e.stopPropagation(); openDetail(row); }}
												color="success"
											>
												<Visibility />
											</IconButton>
											<IconButton 
												size="small" 
												onClick={(e) => { e.stopPropagation(); openEdit(row); }}
												color="primary"
											>
												<Edit />
											</IconButton>
											<IconButton 
												size="small" 
												onClick={(e) => { e.stopPropagation(); remove(row.id); }}
												color="error"
											>
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
				<DialogTitle>{form.id ? 'Edit' : 'Tambah'} Pengepul</DialogTitle>
				<DialogContent>
					<TextField label="Nama" fullWidth margin="normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
					<TextField label="Alamat" fullWidth margin="normal" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
					<TextField label="Telepon" fullWidth margin="normal" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Batal</Button>
					<Button variant="contained" onClick={save}>Simpan</Button>
				</DialogActions>
			</Dialog>

			{/* Detail Dialog */}
			<Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
				<DialogTitle>
					Detail Pengepul Susu
					{selectedCollector && (
						<Typography variant="subtitle1" color="text.secondary">
							{selectedCollector.name}
						</Typography>
					)}
				</DialogTitle>
				<DialogContent>
					{detailLoading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 2 }}>
							<CircularProgress size={24} />
							<Typography>Memuat data...</Typography>
						</Box>
					) : collectorDetail ? (
						<Box>
							{/* Collector Information */}
							<Card sx={{ mb: 3 }}>
								<CardContent>
									<Typography variant="h6" gutterBottom>Informasi Pengepul</Typography>
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Nama</Typography>
											<Typography variant="body1" fontWeight={500}>{collectorDetail.name}</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Telepon</Typography>
											<Typography variant="body1" fontWeight={500}>{collectorDetail.phone || '-'}</Typography>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="body2" color="text.secondary">Alamat</Typography>
											<Typography variant="body1" fontWeight={500}>{collectorDetail.address || '-'}</Typography>
										</Grid>
									</Grid>
								</CardContent>
							</Card>

							{/* Summary Statistics */}
							{collectorDetail.summary && (
								<Card sx={{ mb: 3 }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Ringkasan 10 Hari Terakhir</Typography>
										<Grid container spacing={2}>
											<Grid item xs={6} sm={3}>
												<Typography variant="body2" color="text.secondary">Total Susu</Typography>
												<Typography variant="h6" color="primary" fontWeight={700}>
													{collectorDetail.summary.total_amount?.toFixed(2) ?? '0.00'} L
												</Typography>
											</Grid>
											<Grid item xs={6} sm={3}>
												<Typography variant="body2" color="text.secondary">Total Pendapatan</Typography>
												<Typography variant="h6" color="success.main" fontWeight={700}>
													Rp {collectorDetail.summary.total_income?.toLocaleString() ?? '0'}
												</Typography>
											</Grid>
											<Grid item xs={6} sm={3}>
												<Typography variant="body2" color="text.secondary">Rata-rata/Hari</Typography>
												<Typography variant="h6" color="info.main" fontWeight={700}>
													{collectorDetail.summary.average_amount?.toFixed(2) ?? '0.00'} L
												</Typography>
											</Grid>
											<Grid item xs={6} sm={3}>
												<Typography variant="body2" color="text.secondary">Hari Aktif</Typography>
												<Typography variant="h6" color="warning.main" fontWeight={700}>
													{collectorDetail.summary.days_count ?? 0} hari
												</Typography>
											</Grid>
										</Grid>
									</CardContent>
								</Card>
							)}

							{/* Collections Table */}
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>Laporan 10 Hari Terakhir</Typography>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Tanggal</TableCell>
												<TableCell align="right">Pagi (L)</TableCell>
												<TableCell align="right">Sore (L)</TableCell>
												<TableCell align="right">Total (L)</TableCell>
												<TableCell align="right">Harga/L</TableCell>
												<TableCell align="right">Pendapatan</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{Array.isArray(collectorDetail.collections) && collectorDetail.collections.length > 0 ? (
												collectorDetail.collections.map((collection: any) => (
													<TableRow key={collection.date}>
														<TableCell>{new Date(collection.date).toLocaleDateString('id-ID')}</TableCell>
														<TableCell align="right">{collection.morning_amount}</TableCell>
														<TableCell align="right">{collection.afternoon_amount}</TableCell>
														<TableCell align="right" fontWeight={600}>{collection.total_amount}</TableCell>
														<TableCell align="right">Rp {collection.price_per_liter}</TableCell>
														<TableCell align="right" fontWeight={600} color="success.main">
															Rp {parseFloat(collection.total_income).toLocaleString()}
														</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={6} align="center" sx={{ py: 3 }}>
														<Typography color="text.secondary">
															Tidak ada data penjualan dalam 10 hari terakhir
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Box>
					) : detailError ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<Typography color="error">
								{detailError.response?.data?.message || detailError.message || 'Tidak dapat memuat data pengepul'}
							</Typography>
						</Box>
					) : (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<Typography color="text.secondary">Tidak dapat memuat data pengepul</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)}>Tutup</Button>
					<Button
						variant="contained"
						startIcon={<Download />}
						onClick={handleDownloadCollector}
						color="primary"
						disabled={!selectedCollector}
					>
						Download
					</Button>
				</DialogActions>
			</Dialog>
		</Grid>
	);
}







