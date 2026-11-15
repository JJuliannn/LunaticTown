# Simulador de misión: NASA Space Apps Challenge, reto 03

Este archivo es el contexto del proyecto. Léelo completo antes de escribir código.

## Qué construimos

Reto 03, nivel intermedio. Texto del reto: crear un juego o aplicación didáctica donde los estudiantes gestionan una base lunar o marciana, equilibrando recursos críticos como energía, soporte vital, alimentos y protección contra la radiación, para aprender cómo las decisiones de diseño definen el éxito o el fracaso de una misión.

Plazo: hackathon de 2 días. Equipo hispanohablante. La interfaz del juego va en español; el código y los identificadores, en inglés.

## Reglas para Claude Code

1. **No inventes datos científicos.** Todo número del mundo real vive en `data/params.json` con su `status`. Solo se marca `verified` cuando tiene `source_url` y el equipo lo confirmó. Un dato `sourced` salió de una fuente que dio el equipo pero falta que una persona lo revise contra el documento; el juego ya lo usa y la interfaz lo marca con asterisco.
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
- Tiempo real. 24 minutos reales = un ciclo lunar completo de día y noche (24 horas locales lunares; 1 minuto real = 1 hora lunar).
- El Sol es una simulación determinista: hora local + latitud → ángulo del Sol → temperatura (y luego energía solar). Ver `src/sim/sun.ts` y `src/sim/temperature.ts`.
- El ecuador es la zona difícil: no tiene hielo, el agua se trae y se recicla.
- Fases de la partida: 1) llegada (nave y suministros), 2) armar lo esencial (casco como base, paneles solares, oxigenador, extractor de hielo), 3) armar lo necesario (hidroponía, grillos, baño), 4) mantenimiento y mejoras.
- La nave se desarma en titanio y comunicaciones; su casco es la base principal. Suministros: minerales para purificar agua, sustrato y semillas no híbridas (rábano, lechuga romana, pak choi).
- Oxigenador: reducción carbotérmica del regolito (descrita en el BVAD, sección ISRU).
- Agua: extractor de hielo polar + purificación con minerales. LCROSS es la misión que detectó el agua (evidencia), no el nombre de la máquina.
- Comida: hidroponía con luz artificial y cultivo de grillos para proteína. Los desechos humanos se procesan para obtener nitrógeno (nutriente de la hidroponía).
- Radiación: protegen la cerámica del casco de la nave y el traje del astronauta; no se construye blindaje aparte.
- Los paneles solares ya incluyen baterías.
- Motor de procesos: cada máquina es una fila de datos en `game_balance.buildings` de `params.json` (costo, consumo y producción por hora lunar). Un solo motor (`src/sim/processes.ts`) las corre todas; agregar una máquina es agregar una fila.
- Construcción: tecla E abre el menú, los números eligen. Las máquinas aparecen como cajas de colores junto a la base (placeholders). Tecla T acelera el tiempo (×1, ×5, ×20) para pruebas.
- Derrota: muere toda la tripulación (oxígeno, agua o comida). La victoria sigue sin definir.
- La temperatura se modela por zona y hora local, no como promedio.
- El oxígeno se maneja con dos fuentes: tanques de reserva (finitos, seguridad) y producción (recurso a gestionar).
- Ciclo cerrado de nutrientes: nitrógeno, bacterias, plantas, oxígeno.
- Barras de salud por astronauta.
- Se apoya en cosas ya existentes en vez de empezar de cero.
- Orden de trabajo: concepto completo primero, base de datos al final para complementarlo.

## Decisiones abiertas

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

Verificado por una persona: nada todavía.

Con fuente, pendientes de revisión (`sourced` en `params.json`):
- Temperatura de la superficie: Williams et al. 2017, Icarus 283 (Diviner), https://doi.org/10.1016/j.icarus.2016.08.012. Fórmula de día y temperaturas del ecuador por hora local. La interpolación entre puntos y el escalado del piso nocturno por latitud son supuestos nuestros.
- Duración del ciclo lunar: 29,53 días terrestres (NASA Moon Fact Sheet, periodo sinódico), https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
- Consumo por persona y día terrestre (oxígeno 0,895 kg, agua potable 3,217 kg, comida seca 0,8 kg): BVAD Rev2 2022, Tabla 3-31, https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf

Lista de referencias del equipo: "Referencias Finales.pdf" (grillos, HIDH/BVAD, Diviner, regolito y plantas, LCROSS, paneles solares).

Sin fuente (valores de prueba en `game_balance`): costos, producción y consumo de todas las máquinas, recursos iniciales, velocidad de las barras de la tripulación. Faltan fuentes para: producción y potencia del oxigenador, iluminación del polo sur, radiación, rendimiento de cultivos y grillos.

Solo se confirmó que estos conjuntos existen en el archivo de la NASA (PDS):
- LRO: Diviner (temperaturas), LOLA (topografía), LEND (neutrones, indicador de hidrógeno), CRaTER (radiación). https://pds-geosciences.wustl.edu/missions/lro/
- Lunar Orbital Data Explorer para buscar y descargar: https://ode.rsl.wustl.edu/lunar

No usar sin fuente: cualquier cifra que se haya dicho en conversaciones (temperaturas, consumo de oxígeno por persona, duración del día lunar). Eran estimaciones de memoria.

Los recursos del reto (Planetary Computer, Meteomatics) tienen datos de la Tierra; sirven solo como análogos.

## Estructura

```
data/params.json       parámetros con estado de verificación (zonas en science.moon.zones)
assets/                archivos estáticos (logo.png, sprites, sonidos); Vite los sirve desde la raíz: assets/logo.png -> logo.png
src/main.ts            arranque de Phaser
src/sim/               lógica pura: step (avance), sun y temperature, processes (máquinas), crew (consumo y barras), actions (desarmar nave, construir, fases), terrain
src/scenarios/         moon.ts arma la configuración desde params.json; params.ts elige value o playtest_value
src/ui/                tema, widgets, HUD, menú de construcción y escenas (Menu, ZoneSelect, Game)
src/ui/world/          mundo lateral: jugador, terreno, constantes de física (valores de juego)
CLAUDE.md              este archivo
```

Comandos: `npm install`, `npm run dev` (desarrollo), `npm run build` (revisa tipos y genera `dist/`). Atajo de desarrollo: abrir con `?zone=south_pole` o `?zone=equator` salta los menús.

## Hitos

1. Núcleo de simulación con valores de prueba y una interfaz de texto o barras simples.
2. Zonas, ciclo día/noche y eventos.
3. Astronauta animado dentro de la base (vista lateral) con sprites gratuitos.
4. Reemplazar `playtest_value` por datos verificados, ajustar el balance, preparar la presentación.
