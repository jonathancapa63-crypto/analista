# Auditoría del robot analista · noviembre 2026 (v25)

## Cómo se midió
- **1.168 partidos reales** jugados entre septiembre y noviembre de 2026 en 13 competiciones: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Portugal, Países Bajos, Argentina, Brasil, Chile, Liga MX, MLS y Champions League.
- Para cada partido se armaron los datos **con la información que existía antes del partido**, igual que en la app. Así no hay trampa: el robot nunca ve el resultado que va a pronosticar.
- El robot se evaluó en orden de fecha y aprendiendo cada 40 partidos, como lo hace en la app (`tests/backtest.js`).
- Los valores de fábrica se ajustaron solo con septiembre y octubre (700 partidos). Después se validaron con 468 partidos posteriores.

## Precisión medida (v25)

| | Prometido | Real |
|---|---|---|
| Jugadas recomendadas, confianza media (60–69%) | 67% | 68% |
| Jugadas recomendadas, confianza alta (70–79%) | 76% | 75% |
| Jugadas recomendadas, 80% o más | 81% | 81% |
| **Todas las jugadas recomendadas** | **≈77%** | **74,9% (6.958 de 9.291)** |

Acierto real por tipo de jugada: tarjetas 79%, goles 78%, resultado al descanso 77%, tiros a puerta 77%, córners 76%, goles del 2º tiempo 73%, goles del 1er tiempo 71% y remates 68%.

**Conclusión:** la confianza que muestra el robot es honesta. Cuando dice 75%, acierta alrededor de 75%.

## Errores encontrados y corregidos
1. **Alargue y penales.** ESPN entrega el marcador con el alargue incluido. El robot evaluaba las jugadas con goles de 120 minutos y aprendía mal. Ahora usa el marcador de 90 minutos, sacado de la cronología de goles. Si no hay cronología, no evalúa ese partido. En la forma reciente de los equipos tampoco cuenta los goles ni las estadísticas del alargue.
2. **Partidos suspendidos o cancelados.** Quedaban pendientes para siempre. Ahora el robot los quita del historial.
3. **Pronóstico duplicado.** Un partido guardado por el robot automático podía guardarse otra vez a mano, y entonces se aprendía dos veces. Ahora se reconoce por su número de partido en ESPN.
4. **Error al abrir un análisis desde las recomendaciones.** Una tabla plegable de la sección Robot rompía el formulario. Corregido.
5. **0-0 sin estadísticas.** Se tomaba como un partido con datos completos y sesgaba "marcó primero" y "ganaba al descanso". Corregido.
6. **Error de orden de carga** al iniciar la app (el robot automático aún no estaba listo). Corregido.

## Mejoras del modelo (validadas con partidos que el robot no había visto)
- **Valores de fábrica ajustados:** más peso al xG estimado con tiros a puerta (0,60 → 0,85), ventaja de localía 1,25, forma (puntos) 0,45, historial de resultados 0,12, y un 43% de los goles en el primer tiempo.
- **Dispersión real** de remates (1,9), tiros a puerta (1,4), córners (1,45) y tarjetas (1,1). Antes el robot creía que estas estadísticas variaban menos de lo que realmente varían.
- **Tarjetas:** ahora también cuenta las tarjetas que cada equipo provoca en sus rivales.
- **Probado y descartado:** cruzar lo que genera cada equipo con lo que concede su rival en córners, remates y tiros a puerta. Con muestras de 10 partidos agrega ruido y no mejora.
- **Resultado en noviembre:** el pronóstico 1X2 mejora (logloss de 1,0107 a 1,0015, menor es mejor) y las jugadas recomendadas suben de 74,3% a 74,4–74,8%.

## Límites que conviene conocer
- **Remates** es el mercado más débil (68%). Su confianza aprendida lo corrige solo con el tiempo.
- **Sin información de equipo:** ESPN no entrega xG real, alineaciones ni lesiones. Las cuotas 1X2 de la casa (que el robot sí usa) compensan parte de eso, pero no se pudieron validar con partidos pasados porque ESPN no guarda las cuotas de los partidos terminados.
- **Partido vs. jugada:** el pronóstico 1X2 acierta el favorito alrededor del 50% de las veces. Lo fuerte del robot son las líneas de más/menos, no el ganador.
- **Memoria:** guarda hasta 1.800 pronósticos. Al llenarse, borra los más antiguos.

## Pruebas automáticas
```
node tests/unit.js            # 15 pruebas del motor y de los datos (incluye validar los 1.168 partidos)
node tests/build-dataset.js   # descarga y arma el conjunto de partidos (queda en caché)
node tests/backtest.js        # precisión y calibración, aprendiendo como en la app
node tests/e2e.js             # prueba de punta a punta en el navegador (11 pasos)
```
