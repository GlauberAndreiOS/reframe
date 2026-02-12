export const BIOLOGICAL_SEX_LABELS: Record<string, string> = {
	'0': 'Mulher',
	'1': 'Homem',
	'2': 'Intersexo',
	'3': 'Prefiro nao informar',
};

export const BIOLOGICAL_SEX_OPTIONS = [
	{value: '0', label: 'Mulher'},
	{value: '1', label: 'Homem'},
	{value: '2', label: 'Intersexo'},
	{value: '3', label: 'Prefiro nao informar'},
] as const;

export const formatDateToMask = (value?: string | null): string => {
	if (!value) return '';
	const datePart = value.slice(0, 10);
	const [year, month, day] = datePart.split('-');
	if (!year || !month || !day) return '';
	return `${day}/${month}/${year}`;
};

export const toIsoDate = (maskedDate: string): string | null => {
	if (!maskedDate) return null;
	const parts = maskedDate.split('/');
	if (parts.length !== 3) return null;
	const [day, month, year] = parts;
	if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
	return `${year}-${month}-${day}`;
};
