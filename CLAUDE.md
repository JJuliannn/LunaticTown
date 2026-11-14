# Simulador de misión: NASA Space Apps Challenge, reto 03

Este archivo es el contexto del proyecto. Léelo completo antes de escribir código.

## Qué construimos

Reto 03, nivel intermedio. Texto del reto: crear un juego o aplicación didáctica donde los estudiantes gestionan una base lunar o marciana, equilibrando recursos críticos como energía, soporte vital, alimentos y protección contra la radiación, para aprender cómo las decisiones de diseño definen el éxito o el fracaso de una misión.

Plazo: hackathon de 2 días. Equipo hispanohablante. La interfaz del juego va en español; el código y los identificadores, en inglés.

## Reglas para Claude Code

1. **No inventes datos científicos.** Todo número del mundo real vive en `data/params.json` con su `status`. Solo se marca `verified` cuando tiene `source_url` y el equipo lo confirmó. Hoy no hay ningún dato científico verificado.
2. Mientras un dato no esté verificado, el juego usa su `playtest_value` (unidades de juego, no reales). La interfaz no debe presentar esos valores como datos reales de la NASA.
3. La simulación (`src/sim/`) no conoce el render. Son funciones puras: `step(state, config, dt) -> state`. Así se puede probar y cambiar la interfaz sin romper la lógica.
4. Primero el concepto y los problemas grandes, después los detalles. No pulir gráficos antes de que el bucle de juego funcione.
5. Archivos pequeños y separados por responsabilidad.
6. Si una decisión está en "Decisiones abiertas", pregunta al equipo antes de elegir.

## Decisiones tomadas (consejos de la mentora)

- Solo Luna. Marte quedó descartado (decisión del equipo, 2026-11-14).
- La Luna se juega por zonas. Flujo: pantalla de inicio → elegir zona → partida. Zonas iniciales: polo sur y ecuador; se agregan más después.
- Stack: Vite + TypeScript + Phaser 3. Escenas de Phaser en `src/ui/scenes/`.
- Vista de la partida: lateral, estilo Terraria. El astronauta se mueve de izquierda a derecha sobre terreno de bloques. Mientras no haya sprites, el jugador es su hitbox (rectángulo).
- La temperatura se modela por zona y hora local, no como promedio.
- El oxígeno se maneja con dos fuentes: tanques de reserva (finitos, seguridad) y producción (recurso a gestionar).
- Ciclo cerrado de nutrientes: nitrógeno, bacterias, plantas, oxígeno.
- Barras de salud por astronauta.
- Se apoya en cosas ya existentes en vez de empezar de cero.
- Orden de trabajo: concepto completo primero, base de datos al final para complementarlo.

## Decisiones abiertas

- ¿Por turnos o en tiempo real con aceleración?
- ¿Qué significa exactamente el 30% que mencionó la mentora (espacio de la base, presupuesto, otra cosa)?
- Publicación: dominio gratuito del reto u otro hosting estático.
- Edad del público objetivo (afecta el nivel de detalle).

## Diseño base (conceptual)

**Recursos:** energía, oxígeno (tanques y producción), agua, comida, protección contra radiación, y un gas de relleno (nitrógeno) para la atmósfera de la base.

**Tripulación:** cada astronauta tiene barras de oxígeno, agua, comida, dosis de radiación acumulada y moral/estrés.

**Mapa:** zonas con perfil térmico propio (hoy polo sur y ecuador; candidatas futuras: cráter en sombra, cara oculta). Cada zona cambia la energía disponible, el costo de calefacción y el riesgo de radiación.

**Eventos:** noche larga, tormenta solar.

**Bucle:** el jugador decide qué construir y producir, el motor avanza el tiempo, los recursos suben o bajan, y la tripulación sufre las consecuencias.

**Victoria y derrota:** definir. Idea inicial: sobrevivir N días con la tripulación sana.

**Prueba de concepto de temperatura:** la forma del modelo es física simple (la parte iluminada depende del ángulo del Sol y la latitud; la noche tiene un piso que baja hacia los polos). Las constantes son nuestras y no están calibradas. Se reemplazan con datos de Diviner cuando se verifiquen.

## Estado de los datos

Verificado numéricamente: nada.

Solo se confirmó que estos conjuntos existen en el archivo de la NASA (PDS):
- LRO: Diviner (temperaturas), LOLA (topografía), LEND (neutrones, indicador de hidrógeno), CRaTER (radiación). https://pds-geosciences.wustl.edu/missions/lro/
- Lunar Orbital Data Explorer para buscar y descargar: https://ode.rsl.wustl.edu/lunar

No usar sin fuente: cualquier cifra que se haya dicho en conversaciones (temperaturas, consumo de oxígeno por persona, duración del día lunar). Eran estimaciones de memoria.

Los recursos del reto (Planetary Computer, Meteomatics) tienen datos de la Tierra; sirven solo como análogos.

## Estructura

```
data/params.json       parámetros con estado de verificación (zonas en science.moon.zones)
src/main.ts            arranque de Phaser
src/sim/               lógica pura (tipos, estado inicial, generación de terreno; luego step, eventos, salud)
src/scenarios/         moon.ts arma la configuración desde params.json; params.ts elige value o playtest_value
src/ui/                tema, widgets, HUD y escenas (Menu, ZoneSelect, Game)
src/ui/world/          mundo lateral: jugador, terreno, constantes de física (valores de juego)
CLAUDE.md              este archivo
```

Comandos: `npm install`, `npm run dev` (desarrollo), `npm run build` (revisa tipos y genera `dist/`).

## Hitos

1. Núcleo de simulación con valores de prueba y una interfaz de texto o barras simples.
2. Zonas, ciclo día/noche y eventos.
3. Astronauta animado dentro de la base (vista lateral) con sprites gratuitos.
4. Reemplazar `playtest_value` por datos verificados, ajustar el balance, preparar la presentación.
