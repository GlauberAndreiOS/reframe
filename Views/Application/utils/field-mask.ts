export const unmaskDigits = (value: string): string => value.replace(/\D/g, '');

export const maskZipCode = (value: string): string => {
	const digits = unmaskDigits(value).slice(0, 8);
	if (digits.length <= 5) return digits;
	return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const unmaskZipCode = (value: string): string => unmaskDigits(value).slice(0, 8);

export const maskPhone = (value: string): string => {
	const digits = unmaskDigits(value).slice(0, 11);

	if (digits.length <= 2) return digits;
	if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const unmaskPhone = (value: string): string => unmaskDigits(value).slice(0, 11);
