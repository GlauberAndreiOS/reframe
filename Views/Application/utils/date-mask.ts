export const maskDate = (value: string): string => {
	let v = value.replace(/\D/g, '');

	if (v.length > 8) v = v.slice(0, 8);

	if (v.length <= 2) return v;
	if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;

	return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
};
