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
- La Luna se juega por zonas. Flujo: pantalla de inicio → elegir zona → partida. Zonas (de fácil a difícil, en `science.moon.zones` y `ZONE_WORLD` de `GameScene.ts`):
  - Polo sur (normal): tiene hielo y el Sol pasa bajo.
  - Cráter en sombra (difícil): la base está en el fondo oscuro junto al hielo; los paneles van en el borde iluminado y hay que subir a recoger la energía. Lección: el hielo está en la sombra y la energía en la luz.
  - Ecuador (hardcore, decisión del equipo del 2026-11-15): no tiene hielo y el agua no alcanza a largo plazo. Se deja así a propósito.
  - Cara oculta: descartada por ahora, porque sin mecánica de comunicaciones jugaría igual que el ecuador.
- Stack: Vite + TypeScript + Phaser 3. Escenas de Phaser en `src/ui/scenes/`.
- Vista de la partida: lateral, estilo Terraria. El astronauta se mueve de izquierda a derecha sobre terreno de bloques. Mientras no haya sprites, el jugador es su hitbox (rectángulo).
- Tiempo real. 24 minutos reales = un ciclo lunar completo de día y noche (24 horas locales lunares; 1 minuto real = 1 hora lunar).
- El Sol es una simulación determinista: hora local + latitud → ángulo del Sol → temperatura (y luego energía solar). Ver `src/sim/sun.ts` y `src/sim/temperature.ts`.
- Fases de la partida: 1) llegada (nave y suministros), 2) armar lo esencial (casco como base, paneles solares, oxigenador, extractor de hielo), 3) armar lo necesario (hidroponía, grillos, baño), 4) mantenimiento y mejoras.
- La nave se desarma en titanio y comunicaciones; su casco es la base principal. Suministros: minerales para purificar agua, sustrato y semillas no híbridas (rábano, lechuga romana, pak choi).
- Oxigenador: reducción carbotérmica del regolito (descrita en el BVAD, sección ISRU).
- Agua: extractor de hielo polar + purificación con minerales. LCROSS es la misión que detectó el agua (evidencia), no el nombre de la máquina.
- Comida: hidroponía con luz artificial y cultivo de grillos para proteína. Los desechos humanos se procesan para obtener nitrógeno (nutriente de la hidroponía).
- Radiación: protegen la cerámica del casco de la nave y el traje del astronauta; no se construye blindaje aparte.
- Los paneles solares ya incluyen baterías.
- Un solo astronauta: el jugador.
- Nada es automático. El jugador camina hasta cada sitio y presiona E para hacer la actividad: desarmar la nave, construir, iniciar un proceso o recoger. Nada llega a la base si el jugador no lo recoge.
- Dos tipos de estación (`kind` en `game_balance.buildings` de `params.json`):
  - `collector` (paneles solares): se llena solo mientras hay Sol, hasta su capacidad. Muestra la etiqueta "¡Listo!" desde la mitad (confirmado por el equipo) y el jugador va a recoger la energía.
  - `processor` (oxigenador, extractor de hielo, baño, hidroponía, grillos): el jugador inicia una tanda que gasta insumos, espera unas horas lunares y vuelve a recoger el resultado cuando aparece "¡Listo!".
- Agregar una estación es agregar una fila en `params.json` y un sitio en `src/ui/world/structures.ts`. Los sitios son cajas de colores (placeholders) a los lados de la base. Tecla T acelera el tiempo (×1, ×5, ×20) para pruebas.
- HUD: las barras del astronauta van de 0 a 100. Las reservas de la base se muestran como horas que alcanzan al ritmo de consumo actual (barra llena = 48 h); se ponen ámbar con menos de 12 h y rojas, parpadeando, con menos de 6. Los materiales se muestran como números.
- Lo único automático es el consumo del astronauta (oxígeno, agua, comida) desde las reservas de la base.
- Derrota: el astronauta muere (oxígeno, agua o comida). Victoria: el equipo está buscando las condiciones de los experimentos de laboratorio que Artemis quería hacer en la superficie. Mientras no las traiga, no se implementa (`design.victory` en `params.json` tiene las pistas).
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

**Mapa:** zonas con perfil térmico propio (hoy polo sur, cráter en sombra y ecuador; candidata futura: cara oculta). Cada zona cambia la energía disponible, el costo de calefacción y el riesgo de radiación.

**Eventos:** noche larga, tormenta solar.

**Bucle:** el jugador decide qué construir y producir, el motor avanza el tiempo, los recursos suben o bajan, y la tripulación sufre las consecuencias.

**Victoria y derrota:** la victoria saldrá de los experimentos de laboratorio de Artemis (el equipo los está buscando).

**Prueba de concepto de temperatura:** la forma del modelo es física simple (la parte iluminada depende del ángulo del Sol y la latitud; la noche tiene un piso que baja hacia los polos). Las constantes son nuestras y no están calibradas. Se reemplazan con datos de Diviner cuando se verifiquen.

## Estado de los datos

Verificado por una persona: nada todavía.

Con fuente, pendientes de revisión (`sourced` en `params.json`):
- Temperatura de la superficie: Williams et al. 2017, Icarus 283 (Diviner), https://doi.org/10.1016/j.icarus.2016.08.012. Fórmula de día y temperaturas del ecuador por hora local. La interpolación entre puntos y el escalado del piso nocturno por latitud son supuestos nuestros.
- Duración del ciclo lunar: 29,53 días terrestres (NASA Moon Fact Sheet, periodo sinódico), https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
- Consumo por persona y día terrestre (oxígeno 0,895 kg, agua potable 3,217 kg, comida seca 0,8 kg): BVAD Rev2 2022, Tabla 3-31, https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf

- Oxigenador carbotérmico: 10 t de O2 al año, 2,7 t de masa, 11,8 kW (BVAD Rev2, Tabla 4-85, fila "Lunar: Oxygen from Regolith", Kleinhenz et al. 2020). Cálculo nuestro: unos 10,3 kWh por kg de O2. El juego todavía no lo usa, porque su energía no está en kWh.
- Límite de radiación: 250 mGy-Eq en 30 días para los órganos formadores de sangre (NASA HIDH Rev1, Tabla 6.8-4, pág. 529). En la superficie, la Luna tapa la mitad del cielo, pero los rayos cósmicos generan neutrones en el suelo (HIDH 6.8.2.3). La dosis del astronauta todavía no se simula.
- Plantas en regolito: Paul, Elardo y Ferl 2022, Communications Biology 5:382, https://doi.org/10.1038/s42003-022-03334-8. Dato cualitativo: germinan en 48–60 h pero crecen más lento y con estrés, y el regolito maduro (Apolo 11) es el peor. Por eso la nave trae sustrato; queda como idea una mejora "cultivo en regolito" en la fase 4.

Lista de referencias del equipo: "Referencias Finales.pdf" (grillos, HIDH/BVAD, Diviner, regolito y plantas, LCROSS, paneles solares).

Sin fuente (valores de prueba en `game_balance`):
- Costos, tandas y tiempos de todas las estaciones.
- Recursos iniciales.
- Velocidad de las barras de la tripulación.
- Temperatura del fondo del cráter (40 K; candidata: Paige et al. 2010, Science 330, https://doi.org/10.1126/science.1187726, pendiente de leer).

Faltan fuentes para la producción de los paneles (con ella la energía pasaría a kWh y se podría usar la cifra del oxigenador), la iluminación del polo sur, la dosis en la superficie y el rendimiento de cultivos y grillos.

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
src/sim/               lógica pura: step (avance), sun y temperature, processes (estaciones en el tiempo), crew (consumo y barras), actions (desarmar nave, construir, operar, fases), terrain
src/scenarios/         moon.ts arma la configuración desde params.json; params.ts elige value o playtest_value
src/ui/                tema, widgets, HUD con barras (statBar.ts; incluye el aviso de qué hace E donde estás) y escenas (Menu, ZoneSelect, Game)
src/ui/world/          mundo lateral: jugador, terreno, cielo, estaciones y sus etiquetas, constantes de física (valores de juego)
CLAUDE.md              este archivo
```

Comandos: `npm install`, `npm run dev` (desarrollo), `npm run build` (revisa tipos y genera `dist/`). Atajo de desarrollo: abrir con `?zone=south_pole`, `?zone=shadowed_crater` o `?zone=equator` salta los menús.

## Hitos

1. Núcleo de simulación con valores de prueba y una interfaz de texto o barras simples.
2. Zonas, ciclo día/noche y eventos.
3. Astronauta animado dentro de la base (vista lateral) con sprites gratuitos.
4. Reemplazar `playtest_value` por datos verificados, ajustar el balance, preparar la presentación.
