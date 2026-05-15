/**
 * Short-lived SSE ticket store.
 *
 * Instead of passing Telegram initData in SSE URLs (which leaks into logs,
 * browser history, and proxy access logs), callers first POST to obtain a
 * single-use UUID ticket authenticated via the normal x-telegram-init-data
 * header, then present that ticket in the EventSource URL query string.
 *
 * Tickets are valid for 30 seconds and consumed on first use.
 */

interface Ticket {
  telegramId: string;
  spaceId:    number;
  expiresAt:  number; // Date.now() ms
}

const tickets = new Map<string, Ticket>();

/** Issue a new 30-second single-use ticket. */
export function issueTicket(telegramId: string, spaceId: number): string {
  const id = crypto.randomUUID();
  tickets.set(id, { telegramId, spaceId, expiresAt: Date.now() + 30_000 });
  return id;
}

/** Consume and validate a ticket. Returns telegramId on success or null on failure. */
export function consumeTicket(ticketId: string, spaceId: number): string | null {
  const ticket = tickets.get(ticketId);
  if (!ticket) return null;
  tickets.delete(ticketId); // single-use

  if (ticket.expiresAt < Date.now()) return null;
  if (ticket.spaceId !== spaceId) return null;

  return ticket.telegramId;
}

// Periodically sweep expired tickets to prevent unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [id, ticket] of tickets) {
    if (ticket.expiresAt < now) tickets.delete(id);
  }
}, 60_000);
