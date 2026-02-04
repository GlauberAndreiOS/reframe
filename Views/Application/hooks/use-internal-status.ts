import * as Network from 'expo-network';
import {useEffect, useState} from 'react';

export function useInternetStatus() {
	const [isConnected, setIsConnected] = useState(true);

	useEffect(() => {
		async function check() {
			const status = await Network.getNetworkStateAsync();
			setIsConnected(status.isConnected ?? false);
		}

		void check();
	}, []);

	return isConnected;
}