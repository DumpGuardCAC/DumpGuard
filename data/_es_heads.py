# Spanish for the 280 unique note heads in data/_es_src.json, keyed by index. Machine-drafted, unreviewed.
# Street lists stay verbatim; entries given as callables receive the English original.
W6 = 'afuera a más tardar a las 6:00 a.m.'
HOL3 = 'No hay recogida de basura ni reciclaje en la acera en Acción de Gracias, Navidad ni Año Nuevo.'
DATES_A = 'Fechas de 2026: 7 y 21 ene; 4 y 18 feb; 4 y 18 mar; 1, 15 y 29 abr; 13 y 27 may; 10 y 24 jun; 8 y 22 jul; 5 y 19 ago; 2, 16 y 30 sep; 14 y 28 oct; 11 y 25 nov; 9 y 23 dic.'
DATES_B = 'Fechas de 2026: 14 y 28 ene; 11 y 25 feb; 11 y 25 mar; 8 y 22 abr; 6 y 20 may; 3 y 17 jun; 1, 15 y 29 jul; 12 y 26 ago; 9 y 23 sep; 7 y 21 oct; 4 y 18 nov; 2, 16 y 30 dic.'
BRUSH = 'ponga las ramas afuera máximo 7 días antes; ramas de 4 pies de largo y 4 pulgadas de diámetro como máximo; hojas en bolsas de papel marrón biodegradables.'
GRASS = 'cubiertos de 32 galones, máximo 30 lb, rotulados "Grass Clippings"; sin bolsas.'
SUM = 'solo el día extra de verano. Del 1 de junio a agosto. Los calendarios de 2026 muestran una recogida extra de verano cada semana, desde la primera semana de junio hasta la última de agosto.'
SBOUND = 'Límites de las calles: use el PDF del mapa de distritos de reciclaje y la búsqueda de direcciones en la página de Obras Públicas del municipio (el mapa es gráfico; el índice de calles está en el mapa).'
SBOUND2 = 'Límites de las calles: PDF del mapa de distritos de reciclaje.'
LONGSTREET = 'Hasta 3 latas o bolsas, máximo 50 lb cada una.'
ZONE_REC = 'recogida semanal de reciclaje; el tipo de material alterna cada semana entre mezclado y papel/cartón según el PDF del contrato de 2026 (el primer ciclo de colores después del 11 de mayo incluye'

def san(letter, rd, kind):
    base = f'Distrito de Saneamiento {letter} / Distrito de Reciclaje {rd}'
    if kind == 0: return base + '.'
    if kind == 1: return base + '. ' + (SBOUND if rd in '123' else SBOUND2)
    return base + '; ' + SUM

ES = {
0: 'TODOS LOS RECICLABLES: botellas, latas, vidrio, plástico, cartón corrugado, periódico y papel mixto. En la acera antes de las 7:00 AM. El cartón debe estar aplastado. Botellas/latas/vidrio/plástico en un recipiente de hasta 42 galones; periódico y papel mixto atados por separado.',
1: 'Las cuatro zonas de recogida; flujo único en el bote azul de 95 galones del municipio; sáquelo a la acera el martes por la tarde.',
2: 'Todos los hogares al norte de Church Street y al oeste de Main Street; toda Main Street hasta Church Street.',
3: 'Todos los hogares al sur de Church Street; toda Church Street; todos los hogares al este de Main Street.',
4: 'Todas las calles; suelto en recipientes rígidos, sin bolsas de plástico; no hay recogida en Acción de Gracias, Navidad ni Año Nuevo (la siguiente recogida es el próximo día regular).',
5: 'Todas las zonas, todo el año; bote gris oscuro del municipio; en la acera a las 6:00 a.m. (de preferencia la noche anterior). Del 15 de mayo al 15 de septiembre también hay viernes (vea las filas de fechas de viernes de 2026).',
6: 'Todas las zonas.',
7: 'Todas las zonas; basura del viernes en temporada cálida (del 15 de mayo al 15 de septiembre).',
8: 'Área 1; inicio de la semana de recogida de hojas (2026).',
9: 'Área 2; inicio de la semana de recogida de hojas (2026).',
10: 'Área 3; inicio de la semana de recogida de hojas (2026).',
11: 'Área 4; inicio de la semana de recogida de hojas (2026).',
12: 'Artículos voluminosos en todo el municipio; 4.º lunes (no de octubre a diciembre); en la acera antes de las 7:00 AM.',
13: 'Basura regular en todo el municipio. En los feriados, la recogida se hace al día siguiente.',
14: 'Flujo único en la acera en todo el municipio.',
15: 'En todo el municipio.',
16: 'En todo el municipio; recogida en la acera de flujo único del programa MCIA.',
17: 'En todo el municipio; basura en bolsas dentro de botes con tapa de hasta 40 galones, máximo 50 lb llenos.',
18: 'En todo el municipio; sáquela a la acera después de las 7:00 p.m. de la noche anterior; no hay recogida el Día de Acción de Gracias.',
19: 'En todo el municipio; sáquela la noche anterior (la recogida puede empezar desde las 4:00 a.m.).',
20: 'En todo el municipio; reciclables sueltos en el bote (sin bolsas de plástico); plásticos n.º 1 y n.º 2, vidrio, latas, cartón, papel.',
21: 'Ramas o troncos para triturar: hasta 6 pulgadas de diámetro, 4 a 8 pies de largo, con los extremos gruesos en la misma dirección en la acera.',
22: 'Ramas y desechos de jardín; fecha de inicio para todo el municipio (la recogida puede continuar varios días); en la acera a las 5:00 a.m.; no se recoge césped.',
23: 'Recogida de ramas según el calendario de recogida residencial (la página de Obras Públicas indica del 12 de diciembre al 3 de diciembre). Ramas/troncos de 6 pulgadas de diámetro como máximo según la ordenanza citada en la página de Obras Públicas.',
24: 'Ramas, troncos y hojas: lun-jue; sin ramas de más de 4 pies; una pila por hogar a 1 pie de la acera. Césped cortado y tierra: mar-jue en recipientes de hasta 40 libras; deben estar en recipientes.',
25: 'Recogida de artículos voluminosos; todas las zonas; Suburban Disposal (segundos lunes de 2026).',
26: 'Día de artículos voluminosos; en la acera a las 12:00 p.m.; puede sacarlos hasta tres días antes; sin concreto ni escombros de construcción; Freón $20.',
27: 'Distrito comercial y todas las áreas no automatizadas (reciclaje de flujo único los miércoles del calendario, con días de recogida de metal previa llamada).',
28: 'Distrito comercial (dos veces por semana).',
29: 'Distrito comercial, Lado Norte y Área del Triángulo. La fecha de recogida puede cambiar si hay un día feriado.',
30: 'En toda la ciudad.',
31: 'Mezclado y papel/cartón; sáquelo el martes por la tarde para la recogida del miércoles por la mañana desde las 5:30 a.m.',
32: 'Compactador abierto (Kenneth Avenue); 7:00 a.m.-3:00 p.m.; solo desechos voluminosos; 2 visitas gratis al año con cupón.',
33: 'En la acera; Bingham Avenue y al oeste.',
34: 'En la acera; Bingham Avenue y al oeste; 2.º y 4.º miércoles del mes.',
35: 'En la acera; al este de Bingham Avenue.',
36: 'En la acera; al este de Bingham Avenue; 1.º y 3.er miércoles del mes.',
37: 'Latas de pintura secas (con menos de 1 pulgada de pintura) con la basura doméstica en el patio trasero.',
38: 'Recogida con entrada al predio; en todo el municipio.',
39: 'Recogida con entrada al predio; en todo el municipio; 2.º y 4.º miércoles del mes.',
40: 'Al este de Broad Street.',
41: 'Al este de Broad Street; artículos voluminosos el 2.º jueves; máximo 2 artículos.',
42: 'Reciclaje de electrónicos en la acera a las 6:30 a.m.: computadoras, monitores, faxes, equipo de computación, televisores, teléfonos.',
43: 'Excepción: Central Park y calles aledañas (Stone Ct, Aimy Ct, Rachele Ct) se recogen los lunes aunque estén en el Distrito 3.',
44: 'Excepción: la sección The Arbors, Sonoma Court y Lakeridge West se recogen los martes aunque estén en el Distrito 4.',
45: 'Distrito de reciclaje de los viernes; la asignación de calles está en el PDF de distritos de reciclaje de la página de recogida en la acera.',
46: 'Distrito de basura 1.',
47: 'Distrito de basura 2.',
48: 'Día Verde: electrónicos y trituración de documentos; en todo el municipio.',
49: 'Basura doméstica, recogida en el patio trasero; límite de 3 recipientes de 30 galones.',
50: 'Recogida de hojas; abril, mayo, junio, octubre, noviembre; deben estar en bolsas; no mezcle las hojas con césped cortado.',
51: lambda s: 'Programa del condado MCIA (no zonas de saneamiento): ' + s.split('sanitation zones): ',1)[1],
52: lambda s: s,
53: lambda s: s.split(' Note:')[0] + ' Nota: el jueves 1 de enero de 2026 se pasó al sábado 3 de enero según la página del municipio; la fecha ancla es el primer jueves regular, 2026-01-15 (+14 del ciclo anterior).',
54: 'MCIA: Sayreville proper, Tangletown, Winding River, Towne Lake.',
55: 'Recogida de metal: llame al Ayuntamiento al 732-291-1444 x3105 antes del jueves a las 4:00 p.m.; los electrodomésticos requieren una etiqueta de $15 del Ayuntamiento.',
56: 'Lado Norte (arriba de las vías del tren de Conrail).',
57: 'Lado Norte; Área del Triángulo.',
58: 'Zona Norte; recogida desde las 6:00 a.m.; no hay recogida en Año Nuevo, Día de la Independencia, Día de las Elecciones, Acción de Gracias ni Navidad.',
59: 'Zona Norte; recogida desde las 6:00 a.m.; vea la lista oficial de calles.',
60: 'Del 3 de noviembre al 12 de diciembre (hojas sueltas en la acera). No mezcle ramas con hojas ni saque ramas durante el período de hojas; el bambú no se recoge.',
61: 'Basura de Ocean Grove, Zona B; recogida manual; botes de máximo 45 galones y 50 lb con el contenido.',
62: 'Basura de Ocean Grove, Zona C; recogida manual; botes de máximo 45 galones y 50 lb con el contenido.',
63: 'Reciclaje residencial de Ocean Grove. Zona C de OG: lado sur de Main Ave hasta Inskip Ave; Zona B de OG: lado norte de Main Ave hasta Lake Ave.',
64: 'Recogida de hojas de octubre a enero: rastrille las hojas hasta la acera; sin ramas, ramitas ni escombros mezclados.',
65: 'Sáquela a la acera después de las 7:00 p.m. de la noche anterior; no hay recogida el Día de Acción de Gracias.',
66: 'Recogida en el patio trasero; recipientes de máximo 30 galones / 50 lb; recogida desde las 5:30 a.m.',
75: 'Artículos voluminosos regulares por zona: primer viernes (zona 1), segundo viernes (zona 2), tercer viernes (zona 3), cuarto viernes (zona 4) en marzo, junio, septiembre y diciembre; recogidas adicionales con permiso de artículos voluminosos o con Freón el 2.º y 4.º lunes del mes (permiso de $50 en el Ayuntamiento).',
100: lambda s: 'Zona de Saneamiento I: ' + s.split(': ',1)[1],
101: lambda s: 'Zona de Saneamiento II: ' + s.split(': ',1)[1].replace('(La Mer leaf collection restricted to that area)', '(la recogida de hojas de La Mer se limita a esa área)'),
102: lambda s: 'Zona de Saneamiento III: ' + s.split(': ',1)[1],
103: 'Secc. 1, 2, 3, 10. MARTES, delimitada por la ciudad de Plainfield al norte; South Avenue, Center Street, Marsh Avenue y West 4th Street al este; North Randolphville Road y las vías del tren al sur; West 7th Street y New Brunswick Avenue al oeste.',
104: 'Secc. 4, 5, 6, 7. LUNES, delimitada por North Randolphville Road al norte; Overbrook Avenue al este; River Road al sur; William Street y Baekland Avenue al oeste.',
105: 'Secc. 8, 9. MIÉRCOLES, delimitada por Stelton Road y New Durham Road al norte; Hoes Lane y Centennial Avenue al este; River Road al sur; Brotherhood Road y Ethel Road al oeste.',
106: 'Recogida de hojas de otoño de la Sección A (bolsas de papel).',
107: lambda s: 'Sección A: ' + s.split(': ',1)[1].replace('Up to 3 cans/bags, max 50 lb each. No pickup Friday Dec 25, 2026.', LONGSTREET + ' No hay recogida el viernes 25 de diciembre de 2026.'),
108: 'Sección A; artículos voluminosos (muebles, colchones, sofás, otros plásticos); límite de 3 artículos. Las fechas de 2026 empiezan el 7 de enero.',
109: 'Sección A; latas/botellas, cartón atado y periódico; sin bolsas de plástico.',
110: 'Recogida de hojas de otoño de la Sección B (bolsas de papel).',
111: lambda s: 'Sección B: ' + s.split(': ',1)[1].replace('Up to 3 cans/bags, max 50 lb each. No pickup Thu Jan 1 or Thu Nov 26, 2026.', LONGSTREET + ' No hay recogida el jueves 1 de enero ni el jueves 26 de noviembre de 2026.'),
112: 'Sección B; artículos voluminosos (muebles, colchones, sofás, otros plásticos); límite de 3 artículos. Las fechas de 2026 empiezan el 14 de enero.',
113: 'Sección B; latas/botellas, cartón atado y periódico; sin bolsas de plástico.',
114: 'Sección I (Cliffwood Beach, Cliffwood, River Gardens, Oakshades, Freneau, Heritage Estates); cada dos miércoles según el Calendario Comunitario de 2026.',
115: 'Primer día de recogida de la Sección I (Cliffwood Beach, Cliffwood, River Gardens, Oakshades, Freneau, Heritage Estates). El primer día de la semana se dedujo de los avisos oficiales de 2026 del Centro de Información de Tormentas de Invierno, que citan el lunes como primera recogida cancelada con reposición el jueves; el segundo día, jueves, figura en la página de Basura/Reciclaje.',
116: 'Segundo día de recogida / día de artículos voluminosos de la Sección I (página de Basura/Reciclaje).',
117: 'Sección I; límite de dos artículos por recogida; vigente desde el 1 de enero de 2018 (sigue en la página actual de Basura/Reciclaje).',
118: 'Sección II (Strathmore, High School Area, Woodbrook Drive, Randall Way, Storyland, Santa Fe, Heather Glenn); cada dos miércoles según el Calendario Comunitario de 2026.',
119: 'Primer día de recogida de la Sección II (Strathmore, High School Area, Woodbrook Drive, Randall Way, Storyland, Santa Fe, Heather Glenn). El primer día de la semana viene del aviso del Centro de Información de Tormentas de Invierno que canceló la primera recogida del martes 2026-02-24.',
120: 'Segundo día de recogida / día de artículos voluminosos de la Sección II (página de Basura/Reciclaje).',
121: 'Sección II; límite de dos artículos por recogida; vigente desde el 1 de enero de 2018 (sigue en la página actual de Basura/Reciclaje).',
122: 'Recogida en la acera de hojas y ramas de las Secciones 1 y 2.',
123: 'Recogida en la acera de hojas y ramas de las Secciones 3 y 4.',
124: 'Flujo único (botellas, latas, plástico, periódico, cartón, papel mixto); sin bolsas de plástico; sin baterías ni aerosoles.',
125: 'Lado Sur (debajo de las vías del tren de Conrail).',
126: 'Lado Sur.',
127: 'Lado Sur. La fecha de recogida puede cambiar si hay un día feriado.',
128: 'Zona Sur; recogida desde las 6:00 a.m.; no hay recogida en Año Nuevo, Día de la Independencia, Día de las Elecciones, Acción de Gracias ni Navidad.',
129: 'Zona Sur; recogida desde las 6:00 a.m.; vea la lista oficial de calles.',
130: lambda s: 'Calles del mapa de recogida de basura de la ciudad en PDF (p. ej., ' + s.split('(e.g., ')[1].replace('waterfront area streets, and other Friday-list streets', 'calles de la zona costera y otras calles de la lista del viernes').replace(', and other Friday-list streets', ' y otras calles de la lista del viernes'),
131: lambda s: 'Calles del mapa de recogida de basura de la ciudad en PDF (p. ej., ' + s.split('(e.g., ')[1].replace(', and other Thursday-list streets', ' y otras calles de la lista del jueves'),
132: lambda s: 'Calles del mapa de recogida de basura de la ciudad en PDF (p. ej., ' + s.split('(e.g., ')[1].replace('Bordentown Avenue even 300-500 block', 'Bordentown Avenue, números pares, cuadras 300-500').replace(', and other Tuesday-list streets', ' y otras calles de la lista del martes'),
133: lambda s: 'Calles del mapa de recogida de basura de la ciudad en PDF (p. ej., ' + s.split('(e.g., ')[1].replace('Bordentown Avenue odd', 'Bordentown Avenue, números impares').replace('Broadway 200 block', 'Broadway, cuadra 200').replace(', and other Monday-list streets', ' y otras calles de la lista del lunes'),
134: 'Distrito de reciclaje de los jueves; la asignación de calles está en el PDF de distritos de reciclaje de la página de recogida en la acera.',
135: 'Reciclaje mezclado en la acera en todo el municipio.',
136: 'Recogida de ramas y troncos; abril, mayo, junio, octubre, noviembre; atados, máximo 3 pulgadas de diámetro y 4 pies de largo.',
137: 'Recogida de desechos vegetales: ramas, recortes de setos, ramitas y ramas pequeñas en botes, bolsas o atados; no se acepta césped cortado.',
138: 'Día de recogida de artículos voluminosos de la villa.',
139: 'Distrito 1; confirme su distrito en gis.oldbridge.com (WHAT WARD AM I IN?).',
140: 'Distrito 2; confirme su distrito en gis.oldbridge.com.',
141: 'Distrito 5; confirme su distrito en gis.oldbridge.com.',
142: 'Distrito 6; confirme su distrito en gis.oldbridge.com.',
143: 'Distritos 3 y 4; confirme su distrito en gis.oldbridge.com.',
144: 'Al oeste de Broad Street.',
145: 'Al oeste de Broad Street; artículos voluminosos el 3.er viernes; máximo 2 artículos.',
147: 'Zona 1 - al este de Union Ave. hasta el límite oriental del municipio.',
148: 'Zona 1 y el lado norte de la Zona 3; se requieren etiquetas para artículos voluminosos; máximo 5 artículos.',
151: 'Zona 1, basura voluminosa/pesada; sáquela el lunes de la semana programada.',
152: 'Zona 1, desechos sólidos no reciclables.',
153: 'Zona 1.',
154: 'Zona 1. ' + DATES_A + ' ' + HOL3,
155: 'Zona 1. ' + HOL3,
157: 'Zona 1: al este de Union Avenue. ' + DATES_B + ' Afuera a las 6:30 a.m.',
158: 'Zona 1: lado este de Riverdale.',
159: 'Zona 1; busque su calle en la lista alfabética del Folleto Verde 2026.',
161: 'Zona 2 - al oeste de Union Ave. hasta el límite occidental del municipio.',
162: 'Zona 2 y el lado sur de la Zona 3; se requieren etiquetas para artículos voluminosos; máximo 5 artículos.',
165: 'Zona 2, basura voluminosa/pesada; sáquela el lunes de la semana programada.',
166: 'Zona 2, desechos sólidos no reciclables.',
167: 'Zona 2.',
168: 'Zona 2. ' + DATES_B + ' ' + HOL3,
169: 'Zona 2. ' + HOL3,
171: 'Zona 2: al oeste de Union Avenue. ' + DATES_A + ' Afuera a las 6:30 a.m.',
172: 'Zona 2: lado oeste de Riverdale.',
173: 'Zona 2; busque su calle en la lista alfabética del Folleto Verde 2026.',
177: 'Zona 3, basura voluminosa/pesada; sáquela el lunes de la semana programada.',
178: 'Zona 3, desechos sólidos no reciclables.',
179: 'Zona 3.',
181: 'Zona 3; busque su calle en la lista alfabética del Folleto Verde 2026.',
184: 'Zona 4, desechos sólidos no reciclables.',
186: 'Zona 4; busque su calle en la lista alfabética del Folleto Verde 2026.',
188: 'Zona 5; busque su calle en la lista alfabética del Folleto Verde 2026.',
190: 'Zona 6; busque su calle en la lista alfabética del Folleto Verde 2026.',
192: 'Zona 7; busque su calle en la lista alfabética del Folleto Verde 2026.',
194: 'Zona 8; busque su calle en la lista alfabética del Folleto Verde 2026.',
195: 'Basura de la Zona A; en la acera a las 6:00 a.m.; use el contenedor azul automatizado que entrega el municipio.',
196: 'Basura de la Zona B; en la acera a las 6:00 a.m.; use el contenedor azul automatizado que entrega el municipio.',
197: 'Basura de la Zona C; en la acera a las 6:00 a.m.; use el contenedor azul automatizado que entrega el municipio.',
198: 'Basura de la Zona D; en la acera a las 6:00 a.m.; use el contenedor azul automatizado que entrega el municipio.',
199: 'Zona NE: al norte de Main Street, al este del ferrocarril de Pennsylvania.',
200: 'Zona NE; flujo único en carrito azul automatizado.',
201: 'Zona NO: al norte de Main Street, al oeste del ferrocarril de Pennsylvania.',
202: 'Zona NO; flujo único en carrito azul automatizado.',
203: 'Zona SE: al sur de Main Street, al este del ferrocarril de Pennsylvania.',
204: 'Zona SE; flujo único en carrito azul automatizado.',
205: 'Zona SO: al sur de Main Street, al oeste del ferrocarril de Pennsylvania.',
206: 'Zona SO; flujo único en carrito azul automatizado.',
207: 'Línea blanca (metal) de las Zonas 1 y 2; en la acera a las 7:00 a.m. el día programado; o llévela al centro de reciclaje.',
208: 'Zonas 1 y 2. ' + DATES_A,
209: 'Zonas 1 y 2; ramas de mayo a septiembre (bote de 32 galones gris/neutro).',
210: 'Zonas 1 y 3.',
211: 'Zonas 1 y 3: 1.º y 3.er miércoles de cada mes; no hay reciclaje residencial el quinto miércoles del mes.',
212: 'Zonas 1 y 4.',
213: 'Zonas 1 y 4; artículos voluminosos el 2.º sábado; deben estar afuera a las 6:00 a.m.',
214: 'Zonas 1 y 4; deben estar afuera a las 6:00 a.m.',
215: 'Zonas 2 y 3.',
216: 'Zonas 2 y 3; artículos voluminosos el 1.er sábado; deben estar afuera a las 6:00 a.m.',
217: 'Zonas 2 y 3; deben estar afuera a las 6:00 a.m.',
218: 'Zonas 2 y 4.',
219: 'Zonas 2 y 4: 2.º y 4.º miércoles de cada mes; no hay reciclaje residencial el quinto miércoles del mes.',
220: 'Línea blanca (metal) de las Zonas 3 y 4; en la acera a las 7:00 a.m. el día programado; o llévela al centro de reciclaje.',
221: 'Zonas 3 y 4. ' + DATES_B,
222: 'Zonas 3 y 4; ramas de mayo a septiembre (bote de 32 galones gris/neutro).',
223: 'Línea blanca (metal) de las Zonas 5 y 6; en la acera a las 7:00 a.m. el día programado; o llévela al centro de reciclaje.',
224: 'Línea blanca (metal) de las Zonas 7 y 8; en la acera a las 7:00 a.m. el día programado; o llévela al centro de reciclaje.',
225: 'Recogida continua de ramas en la acera de enero a octubre. Ramas de máximo 4 pies de largo y 12 pulgadas de diámetro; sin césped cortado; el bambú no se recoge. ' + HOL3,
226: 'Con cita, mediante el formulario de solicitud ciudadana; Obras Públicas asigna la fecha de recogida; Obras Públicas 732-222-8221.',
227: 'Con cita; 1.º y 3.er miércoles de enero a octubre; máximo 2 recogidas por año (5 yardas cúbicas cada una); llame a Obras Públicas al 732-842-8941.',
228: 'Con cita; 2 recogidas voluminosas gratis al año en la acera para propietarios; llame a Obras Públicas al 908-755-2187; no hay recogida de voluminosos durante las 8 semanas de recogida de bolsas de hojas de otoño; pila máxima de 3 pies de ancho x 3 de alto x 8 de largo; no incluye apartamentos ni complejos de condominios/casas adosadas.',
229: 'Con cita; de enero a la primera semana de octubre; 2 recogidas voluminosas y 1 de ramas por hogar al año para propietarios con la Tarjeta de Servicio de Piscataway; llame a Obras Públicas al 732-562-2390 para programar; no es para negocios ni viviendas multifamiliares.',
230: 'Con cita; miércoles de abril, mayo, junio, septiembre y octubre; máximo dos recogidas por hogar al año; Obras Públicas 732-514-1277.',
231: 'Con cita; Zonas 1 a 4; dos recogidas voluminosas gratis al año en la acera; las citas empiezan el 23 de febrero de 2026; las recogidas empiezan el 3 de marzo de 2026 (martes); el programa se pausa de la semana de Acción de Gracias al 1 de marzo; no incluye condominios, casas adosadas ni parques de casas rodantes; llame a Obras Públicas al 732-217-8654.',
232: 'Con cita; Zonas 5 a 8; dos recogidas voluminosas gratis al año en la acera; el primer día de recogida de 2026 es el jueves 5 de marzo; el programa se pausa de la semana de Acción de Gracias al 1 de marzo; no incluye condominios, casas adosadas ni parques de casas rodantes; llame a Obras Públicas al 732-217-8654.',
233: 'Con cita; electrodomésticos, electrónicos y metales en la acera; llame al 732-264-1133; hay que quitar las puertas de los refrigeradores.',
234: 'Con cita; llame al 732-632-8519; límite de 3 artículos.',
235: 'Con cita; la inscripción cierra el martes a las 2:30 PM; cuatro recogidas por hogar al año; sáquelos a la acera el día antes de la recogida; Obras Públicas 732-229-5513.',
236: 'Computadoras, electrónicos y metal en la acera con cita; mínimo 4 etiquetas de artículos voluminosos por artículo; llame al Ayuntamiento al 732-776-2999 ext. 1010.',
237: 'Reciclaje de electrónicos y metal en la acera: llame al 732-739-5136 antes de sacarlos; permiso para aire acondicionado/refrigeración del Secretario Municipal.',
238: 'Recogida de electrónicos con cita; máximo 3 artículos; Obras Públicas 732-222-8221.',
239: 'Metales el 4.º lunes de cada mes; llame al Ayuntamiento al 732-531-7405 para la cita; cargo de $15 por artículos con freón.',
240: 'Artículos voluminosos mensuales a partir del día 15 (el lunes siguiente si el 15 cae en sábado o domingo); regístrese llamando al 848-288-1815 con su dirección antes de las 4:30 p.m. del día 14; póngalos cerca del lugar habitual de la basura el día antes de la recogida.',
241: 'Regístrese antes de las 3:00 p.m. de domingo a jueves durante su semana de reciclaje para una recogida en 48 horas; una solicitud de voluminosos por hogar por semana de reciclaje; hasta 4 artículos, máximo 75 lb cada uno y menos de 6 pies; contratista IWS.',
242: 'Recogida de electrodomésticos residenciales: cargo de $25 por electrodoméstico; cita, formulario y pago en el Ayuntamiento (732-842-0099 ext. 119).',
243: 'La página oficial de recogida en la acera del municipio publica solo el reciclaje (cada dos semanas, por distrito de reciclaje de jueves o viernes); no se publica un horario semanal municipal de basura doméstica. Coordinador de Reciclaje 908-755-2187. Para voluminosos, llame a Obras Públicas al 908-755-2187.',
244: 'Ramas por zona los viernes de abril, octubre y diciembre (la zona 4 también tiene ramas adicionales en junio según el calendario de 2026); hojas en octubre, noviembre y diciembre.',
245: 'Ramas recogidas después del primer lunes de cada mes, de abril a noviembre.',
246: 'Artículos voluminosos en la segunda recogida de basura de la semana (jueves para la Zona 1, viernes para la Zona 2); máximo 3 artículos; muebles y alfombras; sin electrodomésticos, electrónicos ni material de construcción. ' + HOL3,
247: 'Metal voluminoso (lavadoras, secadoras, metal diverso) en todo el municipio durante la 4.ª semana de cada mes; Obras Públicas 732-571-5967.',
248: 'Botellas, latas y envases de plástico mezclados: 1.º, 3.er y 5.º miércoles del mes, en la acera a las 7:00 a.m. (boletín de la villa de enero de 2025; confirme con la Villa).',
249: 'Los días de reciclaje en la acera solo se consultan con la dirección en Recycle Coach; las páginas de recogida del municipio no publican un día fijo de reciclaje ni un PDF de zonas.',
250: 'Los electrónicos se entregan solo en el patio de Obras Públicas (no en la acera); televisores, computadoras, impresoras, teléfonos, microondas, aires acondicionados y artículos similares en el contenedor verde designado. ' + HOL3,
251: lambda s: 'La basura doméstica la recogen empresas privadas que los residentes deben contratar. Empresas que dan servicio en Piscataway: ' + s.split('Companies that service Piscataway: ')[1],
252: 'Recogida de hojas en la acera solo en abril, octubre, noviembre y diciembre; sin zonas.',
253: 'Un artículo voluminoso por hogar en el día de recogida de basura; se permiten muebles; se excluyen materiales de construcción; los artículos más grandes pueden tener que cortarse o desarmarse; Obras Públicas 732-787-0215 Ext. 451.',
254: 'Tenga en cuenta que la basura es privada en Old Bridge. Los residentes pueden contratar la empresa de basura que prefieran.',
255: 'El municipio ofrece recogida de basura en la acera en carritos negros del municipio, pero no publica un día fijo ni una lista de zonas; los residentes deben ingresar su dirección en la aplicación Recycle Coach para encontrar su zona. No hay recogida de basura en Año Nuevo, Acción de Gracias ni Navidad; se recoge el siguiente día programado.',
256: 'Los residentes del municipio contratan la basura doméstica con empresas privadas; el municipio no publica días de recogida de basura en la acera. Una encuesta municipal de desechos de 2021 y un anuncio de voluminosos de 2022 describen un servicio de basura contratado de forma privada (página de recogida de artículos voluminosos).',
257: 'Hasta 3 artículos voluminosos en la segunda recogida de basura de la semana (jueves para la Zona 1, viernes para la Zona 2); los colchones y somieres deben ir en plástico; las alfombras cortadas, enrolladas y atadas, máximo 30 lb cada una.',
258: 'Zona 1, ramas/hojas; 2.ª semana completa del mes (ramas de abril a octubre, hojas de noviembre a diciembre).',
259: 'Zona 2, ramas/hojas; 2.ª semana completa del mes (ramas de abril a octubre, hojas de noviembre a diciembre).',
260: 'Zona 3, ramas/hojas; 2.ª semana completa del mes (ramas de abril a octubre, hojas de noviembre a diciembre).',
261: 'Zona 4, ramas/hojas; 2.ª semana completa del mes (ramas de abril a octubre, hojas de noviembre a diciembre).',
262: 'Zona 5, ramas/hojas; 2.ª semana completa del mes (ramas de abril a octubre, hojas de noviembre a diciembre).',
263: 'Recogida de hojas en la acera del 2 de noviembre al 27 de diciembre. Solo hojas; no mezcle ramas y hojas. ' + HOL3,
264: 'El municipio no ofrece recogida de hojas ni ramas; los desechos de jardín no deben ponerse en la calle.',
265: 'Ramas atadas y desechos de jardín en bolsas de papel biodegradables en todo el municipio (marcas verdes del calendario en el PDF del contrato de 2026). El panel lateral indica por separado las fechas de la barredora de calles (no son ramas). Las fechas exactas de ramas no se publican como lista en el PDF.',
266: 'Ramas y hojas en la acera solo dentro de los 5 días antes de una recogida programada; vea el Calendario de Hojas y Ramas de 2026 en la página de Obras Públicas.',
267: 'Recogida de árboles de Navidad en la acera durante enero.',
268: 'Árboles de Navidad en la acera del 1 de enero a la segunda semana de febrero.',
269: 'Ramas en la acera en primavera y hojas en otoño; el calendario de hojas del otoño de 2026 aún no estaba publicado en la página de recogida al momento de la investigación.',
270: 'Césped y hojas en los días de basura de la zona según el calendario de 2026; ramas en los días programados del calendario. Hojas en bolsas de papel biodegradables. Ramas de máximo 4 pulgadas de diámetro, en atados de 4 pies. No ponga desechos de jardín en bolsas de plástico.',
271: 'Recogida de hojas en noviembre y diciembre; hojas de primavera en marzo y mayo; árboles de Navidad y ramas en los meses de invierno según la División de Saneamiento; no se publica un día de la semana fijo para las rutas de hojas.',
272: 'Recogida de hojas sueltas o en bolsas biodegradables del 1 de abril al 31 de mayo y del 15 de septiembre al 1 de diciembre (posible extensión según el sitio web del municipio); no a menos de 10 pies de las bocas de drenaje.',
273: 'Reciclaje de hojas en noviembre y diciembre; ponga las bolsas o botes de hojas en la acera el domingo por la tarde; al menos una vez por semana en cada calle durante la temporada. Los restos pequeños de césped van con la basura regular. Ramas y troncos en el día de basura regular según la página de ramas.',
274: 'Hojas y ramas en la acera en los meses indicados en el calendario de recogida de hojas y ramas; el calendario no estaba publicado en la página de Obras Públicas del municipio al momento de la investigación; no embolse las hojas.',
275: 'Las hojas pueden ponerse sueltas en la acera de septiembre a diciembre; el resto del tiempo, en recipientes. No se recoge césped cortado. Ramas atadas en haces de máximo 4 pies / 50 lb o en recipientes.',
276: 'Sueltas en la acera a las 6:00 a.m. del primer día de la semana de la zona; máximo 4 pies de largo; sin césped en recipientes en la acera.',
277: 'Recogida de hojas sueltas; pilas de máximo 4 pies desde la acera; sin bolsas ni recipientes.',
278: 'De mediados de octubre a mediados de diciembre, recogida de bolsas de hojas en la acera; hojas en bolsas de papel biodegradables; las ramas, hojas y césped también se aceptan en el sitio de desechos de jardín con calcomanía; llame a Obras Públicas al 908-755-2187.',
279: 'Pila separada de las ramas; recogida cualquier día de lunes a viernes de la semana programada.',
}

def zone_extra(i, s):
    # Zone 1-8 families whose structure is regular
    return None

def head_es(i, s):
    if i in ES:
        v = ES[i]
        return v(s) if callable(v) else v
    # families built from patterns
    if 67 <= i <= 74:
        sub = s.split('sub-zone ')[1].split(';')[0]
        return f'Subzona de reciclaje {sub}; asigne según el PDF del índice de calles de 2026.'
    if 76 <= i <= 99:
        m = __import__('re').match(r'Sanitation District (\w) / Recycling District (\d)(.*)$', s)
        L, rd, rest = m.groups()
        kind = 0 if rest == '.' else (2 if rest.startswith('; summer') else 1)
        return san(L, rd, kind)
    if i in (149, 163, 175, 183, 187, 189, 191, 193):
        z = s.split(' ')[1]
        return f'Zona {z}, ramas y hojas; ' + BRUSH
    if i in (150, 164, 176):
        z = s.split(' ')[1]
        day = {'1': 'lunes', '2': 'martes', '3': 'miércoles'}[z]
        return f'Zona {z}, césped cortado; {day} del 4 de mayo al 30 de septiembre; recipientes ' + GRASS
    if i in (156, 170, 180, 185):
        z = s.split(' ')[1]
        tail = ''
        if i in (156, 170): tail = ' (Ruta 34 Sur).'
        if i in (156, 170):
            date = '2026-05-14'
        else:
            date = '2026-05-13'
        if i == 185:
            return f'Zona 4. Día semanal de reciclaje; el tipo de material alterna cada semana entre mezclado y papel/cartón según el PDF del contrato de 2026 (el primer ciclo de colores después del 11 de mayo incluye {date}). (Ruta 34 Norte). Mismo índice de calles que la basura (Área 4).'
        if i == 180:
            rest = s.split('2026-05-13). ',1)[1] if '2026-05-13). ' in s else ''
            rest = rest.replace('& 4 (Route 34 North). streets (Area 3):', 'y 4 (Ruta 34 Norte). Calles (Área 3):')
            return f'Zona 3. Día semanal de reciclaje; el tipo de material alterna cada semana entre mezclado y papel/cartón según el PDF del contrato de 2026 (el primer ciclo de colores después del 11 de mayo incluye {date}). ' + rest
        return f'Zona {z}. Día semanal de reciclaje; el tipo de material alterna cada semana entre mezclado y papel/cartón según el PDF del contrato de 2026 (el primer ciclo de colores después del 11 de mayo incluye {date}).' + tail
    if i in (146, 160, 174, 182):
        import re
        m = re.match(r'Zone (\d) \(Route 34 (South|North)\)\. Streets \((Area \d)(?: index from borough 2026 contract map)?\): (.*?)(?: Effective May 11, 2026\.)?$', s)
        z, rt, area, lst = m.groups()
        rt = 'Sur' if rt == 'South' else 'Norte'
        idx = ' (índice de calles del mapa del contrato de 2026 del municipio)' if i == 182 else ''
        eff = ' Vigente desde el 11 de mayo de 2026.' if s.endswith('Effective May 11, 2026.') else ''
        ar = area.replace('Area', 'Área')
        return f'Zona {z} (Ruta 34 {rt}). Calles ({ar}{idx}): {lst}{"" if lst.endswith(".") else "."}{eff}'
    return None
