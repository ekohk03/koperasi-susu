import { Add, Visibility, Edit, Delete, Download } from '@mui/icons-material';
import { Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Chip, Divider } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

export default function EmployeesPage() {
	const queryClient = useQueryClient();
	const { data } = useQuery({ queryKey: ['employees'], queryFn: async () => (await axios.get('/api/employees')).data.data });
	const [open, setOpen] = useState(false);
	const [detailOpen, setDetailOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
	const [form, setForm] = useState<any>({ id: 0, name: '', position: '', salary: '', join_date: '', phone: '', address: '' });

	const openCreate = () => { setForm({ id: 0, name: '', position: '', salary: '', join_date: '', phone: '', address: '' }); setOpen(true); };
	const openEdit = (row: any) => { setForm(row); setEditOpen(true); };
	
	const openDetail = async (employee: any) => {
		setSelectedEmployee(employee);
		setDetailOpen(true);
	};

	// Query for employee detail
	const { data: employeeDetail, isLoading: detailLoading, error: detailError } = useQuery({
		queryKey: ['employee-detail', selectedEmployee?.id],
		queryFn: async () => {
			if (!selectedEmployee) return null;
			try {
				console.log('Fetching employee detail for ID:', selectedEmployee.id);
				const response = await axios.get(`/api/employees/${selectedEmployee.id}/detail`);
				console.log('Employee detail response:', response.data);
				return response.data.data;
			} catch (error) {
				console.error('Error fetching employee detail:', error);
				throw error;
			}
		},
		enabled: !!selectedEmployee && detailOpen,
		retry: 1,
		refetchOnWindowFocus: false
	});

	const save = async () => {
		try {
			console.log('Saving employee data:', form);
			const payload = { 
				...form, 
				salary: Number(form.salary),
				join_date: form.join_date ? new Date(form.join_date).toISOString().split('T')[0] : null
			};
			console.log('Payload:', payload);
			
			if (form.id) {
				console.log('Updating employee with ID:', form.id);
				await axios.put(`/api/employees/${form.id}`, payload);
				console.log('Employee updated successfully');
				alert('Berhasil mengedit karyawan!');
			} else {
				console.log('Creating new employee');
				await axios.post('/api/employees', payload);
				console.log('Employee created successfully');
				alert('Berhasil menambahkan karyawan!');
			}
			
			setOpen(false);
			setEditOpen(false);
			queryClient.invalidateQueries({ queryKey: ['employees'] });
			queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
		} catch (error) {
			console.error('Error saving employee:', error);
			alert('Error: ' + (error.response?.data?.message || error.message || 'Gagal menyimpan data karyawan'));
		}
	};

	const remove = async (id: number) => {
		if (!confirm('Hapus karyawan ini?')) return;
		try {
			await axios.delete(`/api/employees/${id}`);
			alert('Berhasil menghapus karyawan!');
			queryClient.invalidateQueries({ queryKey: ['employees'] });
		} catch (err: any) {
			console.error('Delete error:', err);
			alert('Gagal menghapus: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const handleDownloadEmployee = async () => {
		if (!selectedEmployee) return;
		
		try {
			// Test route first
			console.log('Testing export route...');
			const testResponse = await axios.get(`/api/attendances/test-export?employee_id=${selectedEmployee.id}`);
			console.log('Test response:', testResponse.data);
			
			// If test works, try actual export
			const response = await axios.get(`/api/attendances/export/excel?employee_id=${selectedEmployee.id}`, {
				responseType: 'blob'
			});
			
			// Create blob link to download
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `absensi-${selectedEmployee.name}-${new Date().toISOString().split('T')[0]}.xlsx`);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Download error:', error);
			alert('Gagal mengunduh file: ' + (error.response?.data?.message || error.message || 'Unknown error'));
		}
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant="h5" fontWeight={700}>Karyawan</Typography>
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
									<TableCell>Posisi</TableCell>
									<TableCell>Gaji</TableCell>
									<TableCell>Gabung</TableCell>
									<TableCell>Telepon</TableCell>
									<TableCell>Alamat</TableCell>
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
										<TableCell>{row.position}</TableCell>
										<TableCell>Rp {Number(row.salary).toLocaleString()}</TableCell>
										<TableCell>{new Date(row.join_date).toLocaleDateString('id-ID')}</TableCell>
										<TableCell>{row.phone}</TableCell>
										<TableCell>{row.address}</TableCell>
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

			{/* Create Dialog */}
			<Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>Tambah Karyawan</DialogTitle>
				<DialogContent>
					<TextField label="Nama" fullWidth margin="normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
					<TextField label="Posisi" fullWidth margin="normal" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
					<TextField label="Gaji" type="number" fullWidth margin="normal" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
					<TextField 
						label="Tanggal Gabung" 
						type="date" 
						InputLabelProps={{ shrink: true }} 
						fullWidth 
						margin="normal" 
						value={form.join_date ? (typeof form.join_date === 'string' ? form.join_date.slice(0,10) : new Date(form.join_date).toISOString().split('T')[0]) : ''} 
						onChange={(e) => setForm({ ...form, join_date: e.target.value })} 
					/>
					<TextField label="Telepon" fullWidth margin="normal" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
					<TextField label="Alamat" fullWidth margin="normal" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Batal</Button>
					<Button variant="contained" onClick={save}>Simpan</Button>
				</DialogActions>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>Edit Karyawan</DialogTitle>
				<DialogContent>
					<TextField label="Nama" fullWidth margin="normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
					<TextField label="Posisi" fullWidth margin="normal" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
					<TextField label="Gaji" type="number" fullWidth margin="normal" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
					<TextField 
						label="Tanggal Gabung" 
						type="date" 
						InputLabelProps={{ shrink: true }} 
						fullWidth 
						margin="normal" 
						value={form.join_date ? (typeof form.join_date === 'string' ? form.join_date.slice(0,10) : new Date(form.join_date).toISOString().split('T')[0]) : ''} 
						onChange={(e) => setForm({ ...form, join_date: e.target.value })} 
					/>
					<TextField label="Telepon" fullWidth margin="normal" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
					<TextField label="Alamat" fullWidth margin="normal" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditOpen(false)}>Batal</Button>
					<Button variant="contained" onClick={save}>Simpan</Button>
				</DialogActions>
			</Dialog>

			{/* Detail Dialog */}
			<Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
				<DialogTitle>
					Detail Karyawan
					{selectedEmployee && (
						<Typography variant="subtitle1" color="text.secondary">
							{selectedEmployee.name}
						</Typography>
					)}
				</DialogTitle>
				<DialogContent>
					{detailLoading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, gap: 2 }}>
							<CircularProgress size={24} />
							<Typography>Memuat data...</Typography>
						</Box>
					) : employeeDetail ? (
						<Box>
							{/* Employee Information */}
							<Card sx={{ mb: 3 }}>
								<CardContent>
									<Typography variant="h6" gutterBottom>Informasi Karyawan</Typography>
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Nama</Typography>
											<Typography variant="body1" fontWeight={500}>{employeeDetail.employee.name}</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Posisi</Typography>
											<Typography variant="body1" fontWeight={500}>{employeeDetail.employee.position}</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Gaji</Typography>
											<Typography variant="body1" fontWeight={500} color="success.main">
												Rp {Number(employeeDetail.employee.salary).toLocaleString()}
											</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Tanggal Gabung</Typography>
											<Typography variant="body1" fontWeight={500}>
												{new Date(employeeDetail.employee.join_date).toLocaleDateString('id-ID')}
											</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2" color="text.secondary">Telepon</Typography>
											<Typography variant="body1" fontWeight={500}>{employeeDetail.employee.phone || '-'}</Typography>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="body2" color="text.secondary">Alamat</Typography>
											<Typography variant="body1" fontWeight={500}>{employeeDetail.employee.address || '-'}</Typography>
										</Grid>
									</Grid>
								</CardContent>
							</Card>

							{/* Summary Statistics */}
							<Card sx={{ mb: 3 }}>
								<CardContent>
									<Typography variant="h6" gutterBottom>Ringkasan Absensi 1 Bulan Terakhir</Typography>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Typography variant="body2" color="text.secondary">Total Hari</Typography>
											<Typography variant="h6" color="primary" fontWeight={700}>
												{employeeDetail.summary.total_days} hari
											</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="body2" color="text.secondary">Hadir</Typography>
											<Typography variant="h6" color="success.main" fontWeight={700}>
												{employeeDetail.summary.present_days} hari
											</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="body2" color="text.secondary">Ijin</Typography>
											<Typography variant="h6" color="warning.main" fontWeight={700}>
												{employeeDetail.summary.absent_days} hari
											</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="body2" color="text.secondary">Libur</Typography>
											<Typography variant="h6" color="info.main" fontWeight={700}>
												{employeeDetail.summary.holiday_days} hari
											</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="body2" color="text.secondary">Sakit</Typography>
											<Typography variant="h6" color="orange" fontWeight={700}>
												{employeeDetail.summary.sick_days} hari
											</Typography>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="body2" color="text.secondary">Tingkat Kehadiran</Typography>
											<Typography variant="h6" color="primary" fontWeight={700}>
												{employeeDetail.summary.attendance_rate.toFixed(1)}%
											</Typography>
										</Grid>
									</Grid>
								</CardContent>
							</Card>

							{/* Attendances Table */}
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>Laporan Absensi 1 Bulan Terakhir</Typography>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Tanggal</TableCell>
												<TableCell>Status</TableCell>
												<TableCell>Catatan</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{employeeDetail.attendances.length > 0 ? (
												employeeDetail.attendances.map((attendance: any) => (
													<TableRow key={attendance.date}>
														<TableCell>{new Date(attendance.date).toLocaleDateString('id-ID')}</TableCell>
														<TableCell>
															<Chip 
																label={attendance.status === 'hadir' ? 'Hadir' : attendance.status === 'ijin' ? 'Ijin' : 'Libur'}
																color={attendance.status === 'hadir' ? 'success' : attendance.status === 'ijin' ? 'warning' : 'info'}
																size="small"
															/>
														</TableCell>
														<TableCell>{attendance.notes || '-'}</TableCell>
													</TableRow>
												))
											) : (
												<TableRow>
													<TableCell colSpan={3} align="center" sx={{ py: 3 }}>
														<Typography color="text.secondary">
															Tidak ada data absensi dalam 1 bulan terakhir
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
						<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
							<Typography color="error" variant="h6">
								Error: {detailError.response?.data?.message || detailError.message || 'Tidak dapat memuat data karyawan'}
							</Typography>
							<Typography color="text.secondary" variant="body2">
								Status: {detailError.response?.status || 'Unknown'}
							</Typography>
							<Button 
								variant="outlined" 
								onClick={() => {
									setDetailOpen(false);
									setTimeout(() => setDetailOpen(true), 100);
								}}
							>
								Coba Lagi
							</Button>
						</Box>
					) : (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<Typography color="text.secondary">Tidak dapat memuat data karyawan</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)}>Tutup</Button>
					{selectedEmployee && (
						<Button
							variant="contained"
							startIcon={<Download />}
							onClick={handleDownloadEmployee}
							color="primary"
							disabled={!selectedEmployee}
						>
							Download
						</Button>
					)}
				</DialogActions>
			</Dialog>
		</Grid>
	);
}







