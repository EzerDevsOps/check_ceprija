import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEmployees, parseDailyLog, LOGS_DIR } from '../../lib/csv-utils';

const MONTHLY_DIR = path.join(process.cwd(), 'monthly_reports');
const MONTHLY_HEADER = 'employee_id,name,department,attendances,delays,absences\n';

/**
 * GET /api/monthly?month=YYYY-MM
 *
 * Scans all daily CSVs for the given month, computes delays and absences
 * per employee, writes/updates the monthly CSV file, and returns JSON.
 *
 * Logic:
 *   - For each day that has a daily CSV:
 *     - If employee has NO ENTRADA → AUSENCIA for that day
 *     - If first ENTRADA has attendanceStatus = RETRASO → RETRASO for that day
 *     - Otherwise → counts as normal/PUNTUAL
 *   - Results are persisted to `monthly_reports/monthly_YYYY-MM.csv`
 */
export const GET: APIRoute = async ({ url }) => {
    try {
        const month = url.searchParams.get('month'); // YYYY-MM
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return new Response(JSON.stringify({ error: 'Formato de mes inválido. Use YYYY-MM' }), { status: 400 });
        }

        // Ensure directories exist
        await fs.mkdir(LOGS_DIR, { recursive: true });
        await fs.mkdir(MONTHLY_DIR, { recursive: true });

        // Get all employees
        const employees = await parseEmployees();

        // Find all daily files for this month
        const allFiles = await fs.readdir(LOGS_DIR);
        const monthFiles = allFiles
            .filter(f => f.startsWith(`attendance_${month}-`) && f.endsWith('.csv'))
            .sort();

        if (monthFiles.length === 0) {
            return new Response(JSON.stringify({ month, report: [], daysAnalyzed: 0 }), { status: 200 });
        }

        // Initialize counters
        const stats: Record<string, { name: string; department: string; attendances: number; delays: number; absences: number }> = {};
        for (const emp of employees) {
            stats[emp.id] = { name: emp.name, department: emp.department, attendances: 0, delays: 0, absences: 0 };
        }

        // Process each daily file
        for (const file of monthFiles) {
            const records = await parseDailyLog(path.join(LOGS_DIR, file));

            // Get first ENTRADA per employee for this day
            const dayEntradas: Record<string, string> = {};
            for (const rec of records) {
                if (rec.status === 'ENTRADA' && !dayEntradas[rec.employeeId]) {
                    dayEntradas[rec.employeeId] = rec.attendanceStatus;
                }
            }

            // Evaluate each employee
            for (const emp of employees) {
                if (!stats[emp.id]) continue;
                if (dayEntradas[emp.id] === undefined || dayEntradas[emp.id] === 'AUSENCIA') {
                    stats[emp.id].absences++;
                } else if (dayEntradas[emp.id] === 'RETRASO') {
                    stats[emp.id].delays++;
                } else {
                    // PUNTUAL
                    stats[emp.id].attendances++;
                }
            }
        }

        // Build report array
        const report = Object.entries(stats).map(([id, s]) => ({
            id,
            name: s.name,
            department: s.department,
            attendances: s.attendances,
            delays: s.delays,
            absences: s.absences,
        }));

        // Write/update monthly CSV file
        const monthlyFilePath = path.join(MONTHLY_DIR, `monthly_${month}.csv`);
        let csvContent = MONTHLY_HEADER;
        for (const r of report) {
            csvContent += `${r.id},${r.name},${r.department},${r.attendances},${r.delays},${r.absences}\n`;
        }
        await fs.writeFile(monthlyFilePath, csvContent);

        return new Response(JSON.stringify({ month, report, daysAnalyzed: monthFiles.length }), { status: 200 });
    } catch (error) {
        console.error('Monthly report error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
