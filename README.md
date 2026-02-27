# Sistema de Asistencia CEPRIJA

Este es un mini sistema de control de asistencia construido con **Astro.js** y **TailwindCSS**. utiliza archivos CSV como base de datos ligera.

## Características

- **Escaneo de Códigos**: Compatible con lectores de códigos de barra (emulación de teclado).
- **Registro en CSV**: Todas las entradas se guardan en `attendance.csv`.
- **Interfaz Institucional**: Diseño basado en colores académicos (Azul y Dorado).

## Instalación

1.  Instalar dependencias:
    ```bash
    npm install
    ```

## Ejecución

1.  Iniciar el servidor de desarrollo:
    ```bash
    npm run dev
    ```
2.  Abrir `http://localhost:4321` en el navegador.

## Uso

1.  Asegúrate de que el navegador esté enfocado.
2.  Escanea el código de barras del empleado.
3.  El sistema mostrará la foto y datos del empleado, y registrará la asistencia con fecha y hora.

## Datos de Prueba (Empleados)

El archivo `public/employees.csv` contiene los siguientes IDs para pruebas:
- `EMP001` - Juan Perez
- `EMP002` - Maria Lopez
- `EMP003` - Carlos Ruiz
- `EMP004` - Ana Garcia

En la lista de empleados agregue el campo check-in, check-out, delay, en el orden es hora de entrada, hora de salida y tiempo de retardo, si el empleado checa en los 15 minutos despues de la hora de entrada, se registra un delay en esa entrada, si pasa de los 15 minutos o no registra entrada durante el dia se registra como absence en ese dia.
Generar un documento de resumen mensual con los siguientes datos
id, name, attendances, delays, absences
este documento debe generarse por mes,  y se debe visualizar en la pagina de report en la parte inferior de los registros por dia, con un selector por cada mes