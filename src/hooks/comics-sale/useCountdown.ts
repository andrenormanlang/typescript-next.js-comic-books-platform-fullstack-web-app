import { useEffect, useState } from "react";

/**
 * Milliseconds left until `expiresAt`, ticking every second; null without a
 * deadline. `serverNow` (the server's clock when the deadline was issued)
 * corrects for a wrong local clock, so the countdown matches the server's
 * 30-minute hold.
 */
export function useCountdown(expiresAt: string | null | undefined, serverNow?: string | null): number | null {
	const [offset, setOffset] = useState(0);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const server = serverNow ? Date.parse(serverNow) : NaN;
		setOffset(Number.isFinite(server) ? server - Date.now() : 0);
	}, [serverNow]);

	useEffect(() => {
		if (!expiresAt) return;
		setNow(Date.now());
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [expiresAt]);

	if (!expiresAt) return null;
	const deadline = Date.parse(expiresAt);
	if (!Number.isFinite(deadline)) return null;
	return Math.max(0, deadline - (now + offset));
}

/** 1_754_000 → "29:14". */
export function formatCountdown(ms: number): string {
	const total = Math.ceil(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}
