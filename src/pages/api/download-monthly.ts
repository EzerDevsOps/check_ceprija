import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

const MONTHLY_DIR = path.join(process.cwd(), 'monthly_reports');

export const GET: APIRoute = async ({ url }) => {
    try {
        const month = url.searchParams.get('month');
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return new Response('Formato de mes inválido', { status: 400 });
        }

        const filePath = path.join(MONTHLY_DIR, `monthly_${month}.csv`);

        try {
            await fs.access(filePath);
        } catch {
            return new Response('Archivo no encontrado', { status: 404 });
        }

        const content = await fs.readFile(filePath, 'utf-8');

        return new Response(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="reporte_mensual_${month}.csv"`,
            }
        });
    } catch (error) {
        return new Response('Internal Server Error', { status: 500 });
    }
};
