import { Add, Download, PhotoCamera, Visibility } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, IconButton } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRef, useState } from 'react';
import { formatDate, formatRupiah, downloadExcel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const BASE_URL = 'http://localhost:5000';

export default function MaintenancesPage() {
	const queryClient = useQueryClient();
	const { token } = useAuth();
	const { data } = useQuery({ queryKey: ['maintenances'], queryFn: async () => (await axios.get('/api/maintenances')).data.data });
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<any>({ id: 0, item_name: '', start_date: '', end_date: '', cost: '', description: '' });
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
		setForm({ id: 0, item_name: '', start_date: '', end_date: '', cost: '', description: '' });
		setPreview(null);
		setOpen(true);
	};
	const openEdit = (row: any) => {
		setForm(row);
		setPreview(row.photo_path ? `${BASE_URL}/uploads/${row.photo_path}` : null);
		setOpen(true);
	};
	const openDetail = (row: any) => {
		setDetail(row);
	};

	const save = async () => {
		const fd = new FormData();
		fd.append('item_name', form.item_name);
		fd.append('start_date', form.start_date);
		fd.append('end_date', form.end_date);
		fd.append('cost', String(form.cost));
		fd.append('description', form.description ?? '');
		if (fileRef.current?.files?.[0]) fd.append('photo', fileRef.current.files[0]);
		if (form.id) await axios.put(`/api/maintenances/${form.id}`, fd);
		else await axios.post('/api/maintenances', fd);
		setOpen(false);
		queryClient.invalidateQueries({ queryKey: ['maintenances'] });
	};

	const remove = async (id: number) => {
		if (!confirm('Hapus pemeliharaan ini?')) return;
		await axios.delete(`/api/maintenances/${id}`);
		queryClient.invalidateQueries({ queryKey: ['maintenances'] });
	};

	const doExport = () => downloadExcel('/api/maintenances/export/excel', token || undefined);

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant="h5" fontWeight={700}>Pemeliharaan</Typography>
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
									<TableCell>Peralatan</TableCell>
									<TableCell>Mulai</TableCell>
									<TableCell>Selesai</TableCell>
									<TableCell>Biaya</TableCell>
									<TableCell>Keterangan</TableCell>
									<TableCell>Bukti</TableCell>
									<TableCell align="right">Aksi</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{(data ?? []).map((row: any) => (
									<TableRow key={row.id} hover>
										<TableCell>{row.item_name}</TableCell>
										<TableCell>{formatDate(row.start_date)}</TableCell>
										<TableCell>{formatDate(row.end_date)}</TableCell>
										<TableCell>{formatRupiah(row.cost)}</TableCell>
										<TableCell>{row.description}</TableCell>
										<TableCell>
											{row.photo_path ? (
												<a href={`${BASE_URL}/uploads/${row.photo_path}`} target="_blank" rel="noopener noreferrer">
													<img src={`${BASE_URL}/uploads/${row.photo_path}`} alt="Foto" style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, border: '1px solid #eee' }} />
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
				<DialogTitle>{form.id ? 'Edit' : 'Tambah'} Pemeliharaan</DialogTitle>
				<DialogContent>
					<TextField label="Peralatan" fullWidth margin="normal" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
					<TextField label="Tanggal Mulai" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.start_date?.slice(0,10) || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
					<TextField label="Tanggal Selesai" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.end_date?.slice(0,10) || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
					<TextField label="Biaya" type="number" fullWidth margin="normal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
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

			{/* Dialog detail pemeliharaan */}
			<Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
				<DialogTitle>Detail Pemeliharaan</DialogTitle>
				<DialogContent>
					{detail && (
						<Card sx={{ mb: 2, p: 2 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Peralatan</Typography>
									<Typography variant="body1" fontWeight={500}>{detail.item_name}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Biaya</Typography>
									<Typography variant="body1" fontWeight={500}>{formatRupiah(detail.cost)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Tanggal Mulai</Typography>
									<Typography variant="body1" fontWeight={500}>{formatDate(detail.start_date)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="text.secondary">Tanggal Selesai</Typography>
									<Typography variant="body1" fontWeight={500}>{formatDate(detail.end_date)}</Typography>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="body2" color="text.secondary">Keterangan</Typography>
									<Typography variant="body1" fontWeight={500}>{detail.description || '-'}</Typography>
								</Grid>
								{detail.photo_path && (
									<Grid item xs={12}>
										<Typography variant="body2" color="text.secondary">Foto</Typography>
										<Box sx={{ mt: 1 }}>
											<img src={`${BASE_URL}/uploads/${detail.photo_path}`} alt="Foto" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #eee' }} />
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
