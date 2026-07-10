import { FastifyInstance } from 'fastify';
import { db } from '../db.js';

export default async function calendarRoutes(fastify: FastifyInstance, options: any) {
  const { broadcast } = options;

  // FIX: Fetch events using starts_at
  fastify.get('/', async () => {
    return db.prepare('SELECT * FROM calendar_events ORDER BY starts_at ASC').all();
  });

  // FIX: Create Quest (Now supports the array of dates from your frontend)
  fastify.post('/', async (request) => {
    const { title, location, member_id, color, dates } = request.body as any;
    const stmt = db.prepare('INSERT INTO calendar_events (title, location, member_id, color, starts_at) VALUES (?, ?, ?, ?, ?)');
    
    for (const date of dates) {
      stmt.run(title, location, member_id, color, date);
    }
    
    broadcast('CALENDAR_UPDATED');
    return { success: true };
  });

  // FIX: Individual Delete
  fastify.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    broadcast('CALENDAR_UPDATED');
    return { success: true };
  });

  // Range Delete
  fastify.delete('/range', async (request) => {
    const { start, end } = request.query as { start: string, end: string };
    db.prepare('DELETE FROM calendar_events WHERE starts_at BETWEEN ? AND ?').run(start, end);
    broadcast('CALENDAR_UPDATED');
    return { success: true };
  });
}

