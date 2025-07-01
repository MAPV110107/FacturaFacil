# FacturaFacil con Puente Fiscal Integrado

Este es un proyecto Next.js para FacturaFacil, que ahora incluye el servidor puente para la impresora fiscal.

## Cómo Iniciar (Desarrollo)

Para poner en marcha tanto la aplicación web como el servidor puente para la impresora, solo necesitas ejecutar un único comando en tu terminal:

```bash
npm run dev
```

Este comando iniciará todo lo que necesitas para empezar a trabajar. La aplicación web estará disponible en `http://localhost:9002`.

## Scripts Disponibles

- **`npm run dev`**: Inicia la aplicación y el servidor puente en modo de desarrollo.
- **`npm run build`**: Construye la aplicación para producción.
- **`npm start`**: Inicia la aplicación en modo de producción (después de usar `npm run build`). Nota: Este comando **no** inicia el servidor puente.
- **`npm run lint`**: Ejecuta el linter para revisar la calidad del código.
