import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import {
    parseEmployees,
    parseDailyLog,
    computeAttendanceStatus,
    getDailyFilePath,
    getTodayDateStr,
    LOGS_DIR,
    DAILY_HEADER,
} from '../../lib/csv-utils';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const scannedId = data.code;

        if (!scannedId) {
            return new Response(JSON.stringify({ error: 'No ID provided' }), { status: 400 });
        }

        // 1. Read Employees
        const employees = await parseEmployees();
        const employee = employees.find(e => e.id === scannedId);

        if (!employee) {
            return new Response(JSON.stringify({ error: 'Empleado no encontrado' }), { status: 404 });
        }

        // 2. Ensure logs directory and today's file exist
        await fs.mkdir(LOGS_DIR, { recursive: true });
        const todayStr = getTodayDateStr();
        const todayFile = getDailyFilePath(todayStr);

        let fileContent = '';
        try {
            fileContent = await fs.readFile(todayFile, 'utf-8');
        } catch {
            await fs.writeFile(todayFile, DAILY_HEADER);
        }

        // 3. Determine toggle (ENTRADA / SALIDA) based on last record
        const lines = fileContent.trim().split('\n');
        let lastStatus = 'SALIDA';
        let lastEntradaTimestamp = '';

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.includes(employee.id)) {
                const parts = line.split(',');
                if (parts.length >= 5) {
                    lastStatus = parts[4];
                    if (lastStatus === 'ENTRADA') lastEntradaTimestamp = parts[0];
                    break;
                }
            }
        }

        const newStatus = lastStatus === 'ENTRADA' ? 'SALIDA' : 'ENTRADA';

        // 4. Record
        const now = new Date();
        const timestamp = now.toISOString();
        const date = now.toLocaleDateString('es-MX');
        const time = now.toLocaleTimeString('es-MX');

        // Calculate hours worked for SALIDA
        let hours = '0';
        if (newStatus === 'SALIDA' && lastEntradaTimestamp) {
            const diffMs = now.getTime() - new Date(lastEntradaTimestamp).getTime();
            hours = (diffMs / 3600000).toFixed(2);
        }

        // Calculate attendance status (only meaningful for ENTRADA)
        let attendanceStatus = '-';
        if (newStatus === 'ENTRADA') {
            attendanceStatus = computeAttendanceStatus(employee.checkIn, timestamp, employee.delayMinutes);
        }

        const logEntry = `${timestamp},${date},${time},${employee.id},${newStatus},${employee.name},${employee.department},${hours},${attendanceStatus}\n`;
        await fs.appendFile(todayFile, logEntry);

        return new Response(JSON.stringify({
            success: true,
            employee: { id: employee.id, name: employee.name, department: employee.department, photo: employee.photo },
            status: newStatus,
            attendanceStatus,
            message: `${newStatus === 'ENTRADA' ? 'Bienvenido' : 'Hasta luego'}, ${employee.name}`,
        }), { status: 200 });

    } catch (error) {
        console.error('Check-in error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
