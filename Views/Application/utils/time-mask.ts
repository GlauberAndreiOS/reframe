export const maskTime = (value: string): string => {
	let v = value.replace(/\D/g, '');

	if (v.length > 4) v = v.slice(0, 4);

	if (v.length >= 2) {
		const hh = parseInt(v.slice(0, 2), 10);
		if (hh > 23) v = '23' + v.slice(2);
	}

	if (v.length >= 4) {
		const mm = parseInt(v.slice(2, 4), 10);
		if (mm > 59) v = v.slice(0, 2) + '59';
	}

	if (v.length > 2) {
		return `${v.slice(0, 2)}:${v.slice(2)}`;
	}

	return v;
};
