export function formatRupiah(value: number | string | undefined | null) {
	if (value == null) return '-';
	const num = typeof value === 'string' ? Number(value) : value;
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
}

export function formatNumber(value: number | string | undefined | null) {
	if (value == null) return '-';
	const num = typeof value === 'string' ? Number(value) : value;
	return new Intl.NumberFormat('id-ID').format(num || 0);
}

export function formatVolume(value: number | string | undefined | null) {
	if (value == null) return '-';
	const num = typeof value === 'string' ? Number(value) : value;
	return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(num || 0);
}

export function formatDate(date: string | Date) {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('id-ID');
}

export async function downloadExcel(url: string, token?: string) {
	const res = await fetch(url, {
		headers: token ? { Authorization: `Bearer ${token}` } : undefined
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || 'Gagal mengunduh file');
	}
	const blob = await res.blob();
	let filename = 'export.xlsx';
	const disposition = res.headers.get('content-disposition');
	if (disposition) {
		const match = /filename\*?=([^;]+)/i.exec(disposition);
		if (match) {
			filename = decodeURIComponent(match[1].replace(/UTF-8''/i, '').replace(/"/g, '').trim());
		}
	}
	if (!filename.toLowerCase().endsWith('.xlsx')) filename += '.xlsx';
	const link = document.createElement('a');
	const href = URL.createObjectURL(blob);
	link.href = href;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(href);
}
