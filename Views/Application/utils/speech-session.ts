let activeSessionId: string | null = null;

export function setActiveSession(id: string | null) {
	activeSessionId = id;
}

export function getActiveSession() {
	return activeSessionId;
}
