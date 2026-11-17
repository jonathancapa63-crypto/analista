# analista
ANALIZAR PARTIDOS

App web (también funciona como Mini App de Telegram) para analizar partidos de fútbol con un robot que aprende.

## Robot automático (pestaña **Hoy**)

- **Partidos del día automáticos**: descarga los partidos de ~37 competiciones (Chile, Sudamérica, Liga MX, MLS, las grandes ligas europeas, copas UEFA/CONMEBOL y selecciones) desde la API pública de ESPN, sin clave.
- **Datos de los equipos automáticos**: para cada equipo toma sus últimos 10 partidos oficiales (todas las competiciones) y calcula solo victorias, invictos, ambos marcan, más de 2.5, marcó/recibió primero, ganaba al descanso, vallas invictas, goles, remates, tiros a puerta, córners, tarjetas, forma de los últimos 5 y un xG estimado a partir de los tiros a puerta. También carga las cuotas 1X2 cuando ESPN las publica.
- **"Robot: analizar todos y recomendar"**: analiza todos los partidos por jugarse y muestra solo las jugadas de **confianza alta (≥70%)** o **media (≥60%)**, ordenadas por probabilidad, con su cuota justa.
- **Aprendizaje automático**: los pronósticos del robot se guardan y, cuando termina cada partido, el resultado y sus estadísticas se registran solos. Con cada resultado el robot reajusta sus ponderaciones, su memoria por equipo y por competición y su **confianza aprendida por mercado**: si en un mercado acierta menos de lo que promete, baja sus probabilidades ahí y deja de recomendar jugadas dudosas.

El registro automático de resultados corre cada vez que abres la app (y cada 10 minutos mientras está abierta).

Las probabilidades son estimaciones estadísticas, no garantías.
