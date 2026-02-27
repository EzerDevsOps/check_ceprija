import fs from 'node:fs/promises';
import path from 'node:path';

export const EMPLOYEES_FILE = path.join(process.cwd(), 'public', 'employees.csv');
export const LOGS_DIR = path.join(process.cwd(), 'attendance_logs');

export interface Employee {
    id: string;
    name: string;
    department: string;
    checkIn: string;   // HH:MM
    checkOut: string;  // HH:MM
    delayMinutes: number;
    photo: string;
}

export interface AttendanceRecord {
    timestamp: string;
    date: string;
    time: string;
    employeeId: string;
    status: string;         // ENTRADA | SALIDA
    name: string;
    department: string;
    hours: string;
    attendanceStatus: string; // PUNTUAL | RETRASO | AUSENCIA | -
}

export async function parseEmployees(): Promise<Employee[]> {
    const content = await fs.readFile(EMPLOYEES_FILE, 'utf-8');
    const lines = content.trim().split('\n').slice(1); // skip header
    return lines
        .filter(l => l.trim())
        .map(line => {
            const parts = line.split(',');
            // id,name,department,check-in,check-out,delay,photo (photo may have URL with commas)
            const [id, name, department, checkIn, checkOut, delayStr, ...photoParts] = parts;
            return {
                id: id?.trim() ?? '',
                name: name?.trim() ?? '',
                department: department?.trim() ?? '',
                checkIn: checkIn?.trim() ?? '09:00',
                checkOut: checkOut?.trim() ?? '18:00',
                delayMinutes: parseInt(delayStr?.trim() ?? '15', 10),
                photo: photoParts.join(',').trim(),
            };
        });
}

export async function parseDailyLog(filePath: string): Promise<AttendanceRecord[]> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').slice(1); // skip header
        return lines
            .filter(l => l.trim())
            .map(line => {
                const parts = line.split(',');
                return {
                    timestamp: parts[0]?.trim() ?? '',
                    date: parts[1]?.trim() ?? '',
                    time: parts[2]?.trim() ?? '',
                    employeeId: parts[3]?.trim() ?? '',
                    status: parts[4]?.trim() ?? '',
                    name: parts[5]?.trim() ?? '',
                    department: parts[6]?.trim() ?? '',
                    hours: parts[7]?.trim() ?? '0',
                    attendanceStatus: parts[8]?.trim() ?? '-',
                };
            });
    } catch {
        return [];
    }
}

/**
 * Given a scheduled check-in time (HH:MM), actual scan timestamp, and delay window in minutes,
 * returns 'PUNTUAL' or 'RETRASO'.
 */
export function computeAttendanceStatus(
    scheduledCheckIn: string, // "09:00"
    scanTimestamp: string,    // ISO string
    delayMinutes: number
): 'PUNTUAL' | 'RETRASO' {
    const scanDate = new Date(scanTimestamp);
    const [h, m] = scheduledCheckIn.split(':').map(Number);

    // Build "scheduled" date using the local date of the scan
    const scheduled = new Date(scanDate);
    scheduled.setHours(h, m, 0, 0);

    const diffMs = scanDate.getTime() - scheduled.getTime();
    const diffMinutes = diffMs / 60000;

    return diffMinutes <= delayMinutes ? 'PUNTUAL' : 'RETRASO';
}

export const DAILY_HEADER = 'timestamp,date,time,employee_id,status,name,department,hours,attendance_status\n';

export function getDailyFilePath(dateStr: string): string {
    return path.join(LOGS_DIR, `attendance_${dateStr}.csv`);
}

export function getTodayDateStr(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
