import type { APIRoute } from 'astro';
import path from 'node:path';
import { parseDailyLog, getDailyFilePath, LOGS_DIR } from '../../lib/csv-utils';
import fs from 'node:fs/promises';

export const GET: APIRoute = async ({ url }) => {
    try {
        const date = url.searchParams.get('date');
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), { status: 400 });
        }

        const filePath = getDailyFilePath(date);

        try {
            await fs.access(filePath);
        } catch {
            return new Response(JSON.stringify({ records: [], employees: {} }), { status: 200 });
        }

        const records = await parseDailyLog(filePath);

        if (records.length === 0) {
            return new Response(JSON.stringify({ records: [], employees: {}, date }), { status: 200 });
        }

        // Group by employee
        const employeesMap: Record<string, {
            name: string;
            department: string;
            records: { time: string; status: string; attendanceStatus: string }[];
            totalHours: string;
        }> = {};

        const hoursPerEmployee: Record<string, number> = {};

        for (const rec of records) {
            if (!employeesMap[rec.employeeId]) {
                employeesMap[rec.employeeId] = {
                    name: rec.name,
                    department: rec.department,
                    records: [],
                    totalHours: '0h 0m',
                };
                hoursPerEmployee[rec.employeeId] = 0;
            }

            employeesMap[rec.employeeId].records.push({
                time: rec.time,
                status: rec.status,
                attendanceStatus: rec.attendanceStatus,
            });

            if (rec.status === 'SALIDA' && parseFloat(rec.hours) > 0) {
                hoursPerEmployee[rec.employeeId] += parseFloat(rec.hours);
            }
        }

        // Format total hours
        for (const id of Object.keys(employeesMap)) {
            const totalH = hoursPerEmployee[id] || 0;
            const h = Math.floor(totalH);
            const m = Math.round((totalH - h) * 60);
            employeesMap[id].totalHours = `${h}h ${m}m`;
        }

        return new Response(JSON.stringify({ records, employees: employeesMap, date }), { status: 200 });
    } catch (error) {
        console.error('Error reading attendance:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
