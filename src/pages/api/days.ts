import type { APIRoute } from 'astro';
import { LOGS_DIR } from '../../lib/csv-utils';
import fs from 'node:fs/promises';

export const GET: APIRoute = async () => {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
        const files = await fs.readdir(LOGS_DIR);

        const days = files
            .filter((f: string) => f.startsWith('attendance_') && f.endsWith('.csv'))
            .map((f: string) => {
                const match = f.match(/attendance_(\d{4}-\d{2}-\d{2})\.csv/);
                return match ? match[1] : null;
            })
            .filter(Boolean)
            .sort()
            .reverse();

        return new Response(JSON.stringify({ days }), { status: 200 });
    } catch (error) {
        console.error('Error listing days:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
