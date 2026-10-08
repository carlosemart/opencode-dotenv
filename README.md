# opencode-dotenv

> Plugin for OpenCode that loads `.env` files into the app, making local
> environment variables available to your sessions and tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status: work in progress](https://img.shields.io/badge/status-work--in--progress-orange.svg)](#estado-del-proyecto)

> [!WARNING]
> **Estado: en desarrollo.** El andamiaje del repositorio está listo, pero la
> lógica del plugin aún no está implementada. La API y las opciones descritas
> abajo son el diseño previsto y pueden cambiar.

## Características (previstas)

- Carga automática de ficheros `.env` desde el directorio del proyecto.
- Soporte para ficheros por entorno (`.env.local`, `.env.<entorno>`).
- Precedencia configurable: respeta por defecto las variables ya definidas.
- Inyección acotada a OpenCode (comandos de shell y servidores MCP), sin
  filtrar valores de un proyecto a otro.
- Opciones configurables desde `opencode.json`.

## Instalación

Añade el plugin a tu configuración de OpenCode:

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@carlosemart/opencode-dotenv"]
}
```

Con opciones:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@carlosemart/opencode-dotenv",
      "options": {
        "files": [".env", ".env.local"]
      }
    }
  ]
}
```

## Uso

Crea un fichero `.env` en la raíz de tu proyecto:

```dotenv
EXAMPLE_API_KEY=supersecreto
EXAMPLE_BASE_URL=http://localhost:8080
```

OpenCode cargará esas variables y las pondrá a disposición de tus sesiones y
herramientas. Consulta `.env.example` para ver una plantilla de partida.

## Opciones (previstas)

| Opción     | Tipo       | Por defecto          | Descripción                                              |
| ---------- | ---------- | -------------------- | -------------------------------------------------------- |
| `files`    | `string[]` | `[".env"]`           | Ficheros a cargar, en orden. Gana el primero definido.   |
| `directory`| `string`   | directorio proyecto  | Directorio base desde el que resolver los ficheros.      |
| `override` | `boolean`  | `false`              | Si `true`, el `.env` pisa variables ya existentes.       |
| `quiet`    | `boolean`  | `false`              | Silencia los avisos de carga.                            |

## Precedencia

Cuando una misma clave existe en varios sitios, se aplica este orden (de mayor
a menor prioridad):

1. Variables de entorno reales del proceso.
2. Ficheros indicados en `files`, en el orden dado.
3. Fichero `.env` por defecto.

Por defecto el plugin **no sobrescribe** variables ya definidas. Usa
`override: true` para cambiarlo.

## Seguridad

- **Nunca** subas un fichero `.env` real al repositorio: ya está incluido en
  `.gitignore`.
- El plugin no imprime valores de variables en los logs.
- La inyección está acotada al proyecto; evita escribir en el entorno global
  del servicio compartido de OpenCode.

> [!IMPORTANT]
> OpenCode puede ejecutar un servicio de fondo compartido entre proyectos.
> Inyectar variables de forma global (`process.env`) filtraría secretos entre
> proyectos. El diseño de este plugin prioriza un alcance acotado.

## Desarrollo

```bash
git clone https://github.com/carlosemart/opencode-dotenv.git
cd opencode-dotenv
npm install
npm run typecheck
```

Para probarlo en local, apunta OpenCode al directorio del repo:

```jsonc
{
  "plugins": ["./ruta/a/opencode-dotenv"]
}
```

## Estado del proyecto

| Área                       | Estado            |
| -------------------------- | ----------------- |
| Estructura del repositorio | ✅ Lista          |
| Configuración de paquete   | ✅ Lista          |
| Integración continua (CI)  | ✅ Lista          |
| Documentación              | 🚧 En curso       |
| Lógica del plugin          | ⏳ Pendiente      |

## Licencia

[MIT](./LICENSE) © Carlos Espinaco Martínez
