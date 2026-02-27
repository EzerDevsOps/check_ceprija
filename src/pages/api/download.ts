import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

const LOGS_DIR = path.join(process.cwd(), 'attendance_logs');

export const GET: APIRoute = async ({ url }) => {
  try {
    const date = url.searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response('Invalid date', { status: 400 });
    }

    const filePath = path.join(LOGS_DIR, `attendance_${date}.csv`);

    try {
      await fs.access(filePath);
    } catch {
      return new Response('File not found', { status: 404 });
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="asistencia_${date}.csv"`,
      }
    });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
