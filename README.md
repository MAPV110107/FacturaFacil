# FacturaFacil con Puente Fiscal Integrado

Este es un proyecto Next.js para FacturaFacil, que ahora incluye el servidor puente para la impresora fiscal.

## Cómo Iniciar (Modo de Desarrollo)

Usa este modo mientras estás codificando y probando. Solo necesitas ejecutar un único comando que iniciará todo (aplicación web y servidor puente) con recarga automática.

```bash
npm run dev
```
La aplicación web estará disponible en `http://localhost:9002`.

---

## Cómo Ejecutar (Modo de Producción)

Usa este modo para la versión "en vivo" de la aplicación. Este proceso requiere dos terminales separadas.

### Terminal 1: Iniciar la Aplicación Web

Primero, debes construir la versión optimizada de la aplicación y luego iniciarla.

1.  **Construir la aplicación:**
    ```bash
    npm run build
    ```
2.  **Iniciar el servidor de producción:**
    ```bash
    npm start
    ```
    La aplicación web estará disponible en `http://localhost:9002`.

### Terminal 2: Iniciar el Servidor Puente

Abre una **nueva terminal** y ejecuta el siguiente comando para iniciar el servicio que se comunica con la impresora fiscal.

```bash
npm run dev:puente
```
Este servidor escuchará en `http://localhost:3000`.

---

## Scripts Disponibles

- **`npm run dev`**: Inicia la aplicación y el servidor puente en modo de desarrollo. **(Recomendado para trabajar)**.
- **`npm run build`**: Construye la aplicación para producción.
- **`npm start`**: Inicia la aplicación en modo de producción (después de usar `npm run build`). **Nota: Este comando NO inicia el servidor puente.**
- **`npm run dev:puente`**: Inicia únicamente el servidor puente para la impresora fiscal.
- **`npm run lint`**: Ejecuta el linter para revisar la calidad del código.
