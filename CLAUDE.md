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
  - Luz (decisión del equipo, 2026-11-15): en el polo sur y en el borde del cráter los paneles tienen Sol todo el tiempo, salvo un eclipse polar de 4 días por misión (empieza el día 14, valor de juego). El ecuador sigue con 12 h de luz y 12 de noche por ciclo. Ver `src/sim/environment.ts`.
  - Cráter en sombra (difícil): la base está en el fondo oscuro junto al hielo; los paneles van en el borde iluminado y hay que subir a recoger la energía. Lección: el hielo está en la sombra y la energía en la luz.
  - Ecuador (hardcore, decisión del equipo del 2026-11-15): no tiene hielo y el agua no alcanza a largo plazo. Se deja así a propósito.
  - Cara oculta: descartada por ahora, porque sin mecánica de comunicaciones jugaría igual que el ecuador.
- Stack: Vite + TypeScript + Phaser 3. Escenas de Phaser en `src/ui/scenes/`.
- Vista de la partida: lateral, estilo Terraria. El astronauta se mueve de izquierda a derecha sobre terreno de bloques.
- Arte (2026-11-15):
  - Pixel art en `assets/sprites/`. Los PNG actuales son placeholders generados por `tools/make_sprites.py`.
  - Para poner el arte final se reemplaza el PNG por uno del mismo tamaño, sin tocar código. Nombres y tamaños en `src/ui/assets.ts`.
  - El arte se dibuja a la mitad y se muestra al doble, sin suavizado (`pixelArt: true`). El astronauta es una hoja de 6 cuadros de 16×24: quieto, caminar ×2, salto y trabajar ×2. Su hitbox sigue siendo un rectángulo invisible.
  - Las estaciones sin construir se ven como un plano azul translúcido y las averiadas con tinte rojo.
- Fuente: Pixelify Sans Bold (Google Fonts, licencia OFL), cargada en `index.html`. `main.ts` espera a que cargue antes de arrancar Phaser.
- Tiempo real. 24 minutos reales = un ciclo lunar completo de día y noche (24 horas locales lunares; 1 minuto real = 1 hora lunar).
- El Sol es una simulación determinista: hora local + latitud → ángulo del Sol → temperatura (y luego energía solar). Ver `src/sim/sun.ts` y `src/sim/temperature.ts`.
- Fases de la partida: 1) llegada (nave y suministros), 2) armar lo esencial (casco como base, paneles solares, oxigenador, extractor de hielo), 3) armar lo necesario (hidroponía, grillos, baño), 4) mantenimiento y mejoras.
- La nave se desarma en titanio y comunicaciones; su casco es la base principal. Suministros: minerales para purificar agua, sustrato y semillas no híbridas (rábano, lechuga romana, pak choi).
- Reabastecimiento (decisión del equipo, 2026-11-15): cada 20 días aterriza en la pista (a la izquierda de la base) una nave de suministros con minerales, sustrato y semillas. Es más pequeña que la de llegada porque no lleva a nadie. El jugador va y la desarma con E, y de ella saca titanio. Las cantidades son valores de juego (`game_balance.resupply`). Ver `src/sim/resupply.ts`.
- Oxigenador: reducción carbotérmica del regolito (descrita en el BVAD, sección ISRU).
- Agua: extractor de hielo polar + purificación con minerales. LCROSS es la misión que detectó el agua (evidencia), no el nombre de la máquina.
- Comida: hidroponía con luz artificial y cultivo de grillos para proteína. Los desechos humanos se procesan para obtener nitrógeno (nutriente de la hidroponía).
  - La tanda de hidroponía dura 14 días, unas 11,4 horas lunares (BVAD: ciclo de la lechuga con trasplante desde semillero).
  - Lo que rinde la tanda sigue siendo valor de juego: falta decidir el área de cultivo.
- Radiación: protegen la cerámica del casco de la nave y el traje del astronauta; no se construye blindaje aparte.
  - Afuera, el astronauta recibe la dosis medida por Chang'E 4 (1369 µSv/día, unos 41 mSv en 30 días).
  - Dentro del casco recibe la mitad. Ese 0,5 es un valor de juego sin fuente.
  - La barra va contra el límite de carrera de 600 mSv, que no se alcanza en una misión: lo peligroso son las tormentas solares (evento pendiente).
- Los paneles solares ya incluyen baterías.
- Un solo astronauta: el jugador.
- Nada es automático. El jugador camina hasta cada sitio y presiona E para hacer la actividad: desarmar la nave, construir, iniciar un proceso o recoger. Nada llega a la base si el jugador no lo recoge.
- Dos tipos de estación (`kind` en `game_balance.buildings` de `params.json`):
  - `collector` (paneles solares): se llena solo mientras hay Sol, hasta su capacidad. Muestra la etiqueta "¡Listo!" desde la mitad (confirmado por el equipo) y el jugador va a recoger la energía.
  - `processor` (oxigenador, extractor de hielo, baño, hidroponía, grillos): el jugador inicia una tanda que gasta insumos, espera unas horas lunares y vuelve a recoger el resultado cuando aparece "¡Listo!".
- Agregar una estación es agregar una fila en `params.json` y un sitio en `src/ui/world/structures.ts`. Los sitios son cajas de colores (placeholders) a los lados de la base. Tecla T acelera el tiempo (×1, ×5, ×20) para pruebas.
- HUD: las barras del astronauta van de 0 a 100. Las reservas de la base se muestran como horas que alcanzan al ritmo de consumo actual (barra llena = 48 h); se ponen ámbar con menos de 12 h y rojas, parpadeando, con menos de 6. Los materiales se muestran como números.
- Lo único automático es el consumo del astronauta (oxígeno, agua, comida) desde las reservas de la base.
- Trabajo con duración (decisión del equipo, 2026-11-15):
  - Cada tarea deja al astronauta quieto un tiempo, con una barra de progreso encima; moverse la cancela. El efecto llega al terminar. Lógica en `src/sim/work.ts`.
  - Duraciones en horas terrestres (`game_balance.work_hours`), con 1 h terrestre ≈ 2 s de juego:
    - Construir: 8 h, una caminata (EVA), cuyo máximo es 8 h según Burke 2022.
    - Desarmar la nave: 16 h. Desarmar la de suministros: 8 h.
    - Laboratorio y refugio: 16 h.
    - Iniciar o recoger una tanda: 1 h (BVAD: hasta 80 min al día para atender experimentos).
    - Mantenimiento: 2 h. Reparar: 3 h (HIDH 9.3.5: una reparación debe tomar 3 h o menos).
  - Los que no salen directo de la fuente son mock.
- Eventos (probabilidades del equipo, 2026-11-15; reglas en `game_balance.events`; lógica en `src/sim/events.ts` y `src/sim/failures.ts`; azar con semilla en el estado, `src/sim/random.ts`):
  - Fallas: 10 % por semana por estación, +10 % por cada semana sin mantenimiento (tecla R). Una estación averiada no funciona hasta repararla (E).
  - Error humano: 1 % al iniciar una tanda, más si las barras del astronauta bajan de 50 %. Se pierden los insumos.
  - Lesión: 2 % al terminar un trabajo. Lesionado: camina a la mitad y trabaja al doble de tiempo por 2 horas lunares (mock).
  - Tormenta solar: 1 % por día. Control de Misión la avisa 3 días antes por el comunicador (decisión del equipo). En el pico: en el refugio excavado sobrevive siempre, en el casco 30 %, afuera muere. Salir durante el pico es morir. El refugio es opcional y se construye a la izquierda de la pista.
  - Meteorito: 4 % por año (regla del juego). El mensaje muestra el dato real: 2024 YR4 tiene un 4,3 % de chocar con la Luna el 22 de diciembre de 2032, un evento único.
- Derrota: el astronauta muere (oxígeno, agua o comida).
- Victoria (decisión del equipo, 2026-11-15):
  - La misión dura 30 días terrestres, la misión nominal del Surface Habitat de Artemis. Con 29,53 días por ciclo, el día 30 llega a los ~24 min de juego. El HUD muestra "Día N de 30".
  - El día 30, si todo está en buen estado, se puede construir el laboratorio de investigación (sitio a la derecha de la base), y construirlo gana la partida.
  - "Buen estado" significa: todas las estaciones de las fases 2 y 3 construidas, las barras del astronauta en 60 % o más y reservas para 12 h o más. Son valores de prueba en `game_balance.victory`.
  - Solo hay un laboratorio, y se construye al final. Lógica en `src/sim/victory.ts`.
- La temperatura se modela por zona y hora local, no como promedio.
- El oxígeno se maneja con dos fuentes: tanques de reserva (finitos, seguridad) y producción (recurso a gestionar).
- Ciclo cerrado de nutrientes: nitrógeno, bacterias, plantas, oxígeno.
- Barras de salud por astronauta.
- Comunicador (decisión del equipo, 2026-11-15): la radio de la nave con Control de Misión en la Tierra, abajo al centro.
  - Da el tutorial paso a paso; cada paso se queda hasta que se cumple. Ver `src/ui/comms/tutorial.ts`.
  - Avisa los eventos importantes (tormenta, fallas, lesión, error humano) y los hitos: cambio de fase, nave de suministros, eclipse, mitad de la misión y laboratorio disponible (`src/ui/comms/milestones.ts`).
  - Los mensajes llegan con un "recibiendo señal" de 2,5 s, por el retraso de radio Tierra-Luna (Kessler 2022). Enter pasa al siguiente.
  - En la simulación, `state.log` marca con `comms: true` lo que va al comunicador; lo demás sale arriba como mensaje corto.
- Menú de pruebas (tecla I): fuerza los eventos generales (1 a 9) y X lo cierra. Los eventos están en `src/sim/debug.ts`; agregar uno es agregar una fila ahí.
- Público: secundaria y universidad (decisión del equipo, 2026-11-15). El lenguaje no se infantiliza: términos técnicos con unidades reales (mSv, kWh, K), explicados en una frase cuando hace falta.
- Se apoya en cosas ya existentes en vez de empezar de cero.
- Orden de trabajo: concepto completo primero, base de datos al final para complementarlo.

## Decisiones abiertas

- Publicación: dominio gratuito del reto u otro hosting estático.
- Área de cultivo de la hidroponía (con ella el rendimiento sale de las tablas del BVAD).

## Diseño base (conceptual)

**Recursos:** energía, oxígeno (tanques y producción), agua, comida, protección contra radiación, y un gas de relleno (nitrógeno) para la atmósfera de la base.

**Tripulación:** cada astronauta tiene barras de oxígeno, agua, comida, dosis de radiación acumulada y moral/estrés.

**Mapa:** zonas con perfil térmico propio (hoy polo sur, cráter en sombra y ecuador; candidata futura: cara oculta). Cada zona cambia la energía disponible, el costo de calefacción y el riesgo de radiación.

**Eventos:** noche larga, tormenta solar.

**Bucle:** el jugador decide qué construir y producir, el motor avanza el tiempo, los recursos suben o bajan, y la tripulación sufre las consecuencias.

**Victoria y derrota:** ver "Decisiones tomadas": se gana construyendo el laboratorio de investigación el día 30 y se pierde si el astronauta muere.

**Prueba de concepto de temperatura:** la forma del modelo es física simple (la parte iluminada depende del ángulo del Sol y la latitud; la noche tiene un piso que baja hacia los polos). Las constantes son nuestras y no están calibradas. Se reemplazan con datos de Diviner cuando se verifiquen.

## Estado de los datos

Verificado por una persona: nada todavía.

Con fuente, pendientes de revisión (`sourced` en `params.json`):
- Temperatura de la superficie: Williams et al. 2017, Icarus 283 (Diviner), https://doi.org/10.1016/j.icarus.2016.08.012. Fórmula de día y temperaturas del ecuador por hora local. La interpolación entre puntos y el escalado del piso nocturno por latitud son supuestos nuestros.
- Duración del ciclo lunar: 29,53 días terrestres (NASA Moon Fact Sheet, periodo sinódico), https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
- Consumo por persona y día terrestre (oxígeno 0,895 kg, agua potable 3,217 kg, comida seca 0,8 kg): BVAD Rev2 2022, Tabla 3-31, https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf

- Oxigenador carbotérmico: 10 t de O2 al año, 2,7 t de masa, 11,8 kW (BVAD Rev2, Tabla 4-85, fila "Lunar: Oxygen from Regolith", Kleinhenz et al. 2020). Cálculo nuestro: unos 10,3 kWh por kg de O2. El juego todavía no lo usa, porque su energía no está en kWh.
- Dosis en la superficie: 1369 µSv/día (Zhang et al. 2020, Science Advances, Chang'E 4), https://doi.org/10.1126/sciadv.aaz1334.
  - Es 2,6 veces la de la ISS y se midió en mínimo solar.
  - Los neutrones aportan el 23 % de la dosis.
- Límites de radiación:
  - 600 mSv en toda la carrera (Kessler et al. 2022, https://ntrs.nasa.gov/citations/20220000245).
  - 250 mGy-Eq en 30 días para los órganos formadores de sangre (NASA HIDH Rev1, Tabla 6.8-4, pág. 529).
- Cultivos (BVAD Rev2, Tablas 4-89 a 4-91): rábano 25 días, lechuga 28 (unos 14 con trasplante), fotoperiodo de 16 h, y productividad, O2 y agua por m² y día. El pak choi no está en las tablas.
- Plantas en regolito: Paul, Elardo y Ferl 2022, Communications Biology 5:382, https://doi.org/10.1038/s42003-022-03334-8. Dato cualitativo: germinan en 48–60 h pero crecen más lento y con estrés, y el regolito maduro (Apolo 11) es el peor. Por eso la nave trae sustrato; queda como idea una mejora "cultivo en regolito" en la fase 4.

- Hábitat de Artemis:
  - Burke, Howard y Kessler 2022, "Internal Layout of a Lunar Surface Habitat" (AIAA ASCEND), https://ntrs.nasa.gov/citations/20220013669: misión de 30 días, 4 laboratorios con sus masas.
  - Kessler et al. 2022, "Artemis Deep Space Habitation" (IEEE Aerospace), https://ntrs.nasa.gov/citations/20220000245: iluminación del polo sur (~200 días de luz y ~4 de oscuridad; ecuador 14/14), eclipses de más de 100 h, polvo que degrada paneles y sellos, límite de carrera de 600 mSv.

Lista de referencias del equipo: "Referencias Finales.pdf" (grillos, HIDH/BVAD, Diviner, regolito y plantas, LCROSS, paneles solares).

Sin fuente (valores de prueba en `game_balance`):
- Costos, tandas y tiempos de todas las estaciones.
- Recursos iniciales.
- Velocidad de las barras de la tripulación.
- Temperatura del fondo del cráter (40 K; candidata: Paige et al. 2010, Science 330, https://doi.org/10.1126/science.1187726, pendiente de leer).
- Protección del casco contra la radiación (0,5) y día de inicio del eclipse polar (14).
- Cantidades de la nave de suministros.

Faltan fuentes para:
- La producción de los paneles. Con ella la energía pasaría a kWh y se podría usar la cifra del oxigenador.
- El blindaje del casco.
- El rendimiento de los grillos.

Solo se confirmó que estos conjuntos existen en el archivo de la NASA (PDS):
- LRO: Diviner (temperaturas), LOLA (topografía), LEND (neutrones, indicador de hidrógeno), CRaTER (radiación). https://pds-geosciences.wustl.edu/missions/lro/
- Lunar Orbital Data Explorer para buscar y descargar: https://ode.rsl.wustl.edu/lunar

No usar sin fuente: cualquier cifra que se haya dicho en conversaciones (temperaturas, consumo de oxígeno por persona, duración del día lunar). Eran estimaciones de memoria.

Los recursos del reto (Planetary Computer, Meteomatics) tienen datos de la Tierra; sirven solo como análogos.

## Estructura

```
data/params.json       parámetros con estado de verificación (zonas en science.moon.zones)
assets/                archivos estáticos (logo.png, sprites/, sonidos); Vite los sirve desde la raíz: assets/logo.png -> logo.png
tools/make_sprites.py  genera los sprites placeholder (python tools/make_sprites.py)
src/main.ts            arranque de Phaser
src/sim/               lógica pura: step (avance), sun y temperature, processes (estaciones en el tiempo), crew (consumo y barras), actions (desarmar nave, construir, operar, fases), victory (día de misión y laboratorio), environment (luz de los paneles, eclipse polar, radiación), resupply (naves de suministros), work (tareas con duración), events y failures (eventos al azar), shelter (refugio), random (azar con semilla), time (conversiones de tiempo), terrain (incluye cráter)
src/scenarios/         moon.ts arma la configuración desde params.json; params.ts elige value o playtest_value
src/ui/comms/          comunicador con la Tierra: panel, tutorial e hitos
src/ui/                tema, widgets, menú de pruebas (debugMenu.ts), HUD con barras (statBar.ts; incluye el aviso de qué hace E donde estás) y escenas (Menu, ZoneSelect, Game)
src/ui/world/          mundo lateral: jugador, terreno, cielo, estaciones y sus etiquetas, refugio (shelterSite), barra de trabajo (workIndicator), constantes de física (valores de juego)
CLAUDE.md              este archivo
```

Comandos: `npm install`, `npm run dev` (desarrollo), `npm run build` (revisa tipos y genera `dist/`). Atajo de desarrollo: abrir con `?zone=south_pole`, `?zone=shadowed_crater` o `?zone=equator` salta los menús.

## Hitos

1. Núcleo de simulación con valores de prueba y una interfaz de texto o barras simples.
2. Zonas, ciclo día/noche y eventos.
3. Astronauta animado dentro de la base (vista lateral) con sprites gratuitos.
4. Reemplazar `playtest_value` por datos verificados, ajustar el balance, preparar la presentación.
