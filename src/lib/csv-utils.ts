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
): 'PUNTUAL' | 'RETRASO' | 'AUSENCIA' {
    const scanDate = new Date(scanTimestamp);

    // Obtenemos la hora del escaneo en la zona de México (formato de 24 horas)
    const mxTimeStr = scanDate.toLocaleTimeString('en-GB', { timeZone: 'America/Mexico_City', hour12: false });
    const [scanH, scanM] = mxTimeStr.split(':').map(Number);
    const [schH, schM] = scheduledCheckIn.split(':').map(Number);

    const scanTotalMinutes = scanH * 60 + scanM;
    const schTotalMinutes = schH * 60 + schM;

    const diffMinutes = scanTotalMinutes - schTotalMinutes;

    // Lógica de estados:
    if (diffMinutes <= delayMinutes) {
        return 'PUNTUAL';
    } else if (diffMinutes > delayMinutes && diffMinutes <= 30) {
        // Se registra como retraso, pero sigue siendo una "entrada" válida en el flujo
        return 'RETRASO';
    } else {
        // Más de 30 minutos se considera falta/ausencia
        return 'AUSENCIA';
    }
}

export const DAILY_HEADER = 'timestamp,date,time,employee_id,status,name,department,hours,attendance_status\n';

export function getDailyFilePath(dateStr: string): string {
    return path.join(LOGS_DIR, `attendance_${dateStr}.csv`);
}

export function getTodayDateStr(): string {
    const now = new Date();
    // Utilizamos fr-CA porque su formato estándar es YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(now);
}
