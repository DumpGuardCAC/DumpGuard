// More Spanish label rules (Carteret, Perth Amboy, Old Bridge, Sayreville, Keyport-style zone labels and so on).
// Machine-drafted and unreviewed, like es_labels.mjs. Street lists are kept verbatim.

const MONTHS = { Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr', May: 'may', Jun: 'jun', Jul: 'jul', Aug: 'ago', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dic' };
const FULL = { January: 'enero', February: 'febrero', March: 'marzo', April: 'abril', May: 'mayo', June: 'junio', July: 'julio', August: 'agosto', September: 'septiembre', October: 'octubre', November: 'noviembre', December: 'diciembre' };
const dates = (s) => s.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MONTHS[m]);
const ABBR = { Jan: 'enero', Feb: 'febrero', Mar: 'marzo', Apr: 'abril', Jun: 'junio', Jul: 'julio', Aug: 'agosto', Sep: 'septiembre', Sept: 'septiembre', Oct: 'octubre', Nov: 'noviembre', Dec: 'diciembre' };
const fullDate = (s) => s.replace(/^(\w+) (\d+)$/, (_, m, d) => `${d} de ${FULL[m] ?? ABBR[m] ?? m}`);
const HOLI = { 'Memorial Day': 'del Día de los Caídos (Memorial Day)', Thanksgiving: 'de Acción de Gracias', Christmas: 'de Navidad' };
const HOLN = { 'MLK Day': 'el Día de Martin Luther King Jr.', 'Presidents Day': 'el Día de los Presidentes', 'Memorial Day': 'el Día de los Caídos (Memorial Day)', 'Labor Day': 'el Día del Trabajo', 'Columbus Day': 'el Día de la Raza (Columbus Day)' };
const ZONES = (s) => s.replace(/^Zones? /, (m) => (m === 'Zone ' ? 'Zona ' : 'Zonas ')).replace(/ and /g, ' y ');
const SBOUND = 'Límites de las calles: use el PDF del mapa de distritos de reciclaje y la búsqueda de direcciones en la página de Obras Públicas del municipio (el mapa es gráfico; el índice de calles está en el mapa)';
const SUMMER = 'solo el día extra de verano. Del 1 de junio a agosto. Los calendarios de 2026 muestran una recogida extra de verano cada semana, desde la primera semana de junio hasta la última de agosto';
const HOLCHG = 'la fecha de recogida puede cambiar si hay un día feriado';
const WHERE = { north: 'al norte', south: 'al sur' };
const SIDE = { west: 'al oeste', east: 'al este' };
const BORDERS = (s) => s
  .replace('bordered by ', 'delimitada por ').replace(/ on the (north|east|south|west)/g, (_, d) => ({ north: ' al norte', east: ' al este', south: ' al sur', west: ' al oeste' })[d])
  .replace('the City of Plainfield', 'la ciudad de Plainfield').replace('the RR tracks', 'las vías del tren').replace(/ and /g, ' y ');
const DAYU = { MONDAYS: 'LUNES', TUESDAYS: 'MARTES', WEDNESDAY: 'MIÉRCOLES' };
const DAYL = { Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes' };
const OUT = 'deben estar afuera a las 6:00 a.m.';
const ZB = 'en la acera a las 6:00 a.m.; use el contenedor azul automatizado que entrega el municipio';

export const EXTRA = [
  [/^Sanitation District (\w) \/ Recycling District (\d): Street boundaries: use .*$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}: ${SBOUND}`],
  [/^Sanitation District (\w) \/ Recycling District (\d): Street boundaries: Recycling District Map PDF$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}: límites de las calles: PDF del mapa de distritos de reciclaje`],
  [/^Sanitation District (\w) \/ Recycling District (\d): summer extra day only\..*$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}: ${SUMMER}`],
  [/^Sanitation District (\w) \/ Recycling District (\d)$/, (m) => `Distrito de Saneamiento ${m[1]} / Distrito de Reciclaje ${m[2]}`],
  [/^Sanitation District (\w): (MLK Day|Presidents Day|Memorial Day|Labor Day|Columbus Day) Monday sanitation moved to Tuesday on 2026 calendar$/, (m) => `Distrito de Saneamiento ${m[1]}: por ${HOLN[m[2]]}, el saneamiento del lunes pasa al martes en el calendario de 2026`],
  [/^North Side: Triangle Area$/, () => 'Lado Norte: Área del Triángulo'],
  [/^South Side$/, () => 'Lado Sur'],
  [/^North Side \(above the Conrail train tracks\)$/, () => 'Lado Norte (arriba de las vías del tren de Conrail)'],
  [/^South Side \(below the Conrail train tracks\)$/, () => 'Lado Sur (debajo de las vías del tren de Conrail)'],
  [/^Business District \(twice weekly\)$/, () => 'Distrito comercial (dos veces por semana)'],
  [/^Business District, North Side and Triangle Area: Collection date subject to change in the event of a holiday$/, () => `Distrito comercial, Lado Norte y Área del Triángulo: ${HOLCHG}`],
  [/^South Side: Collection date subject to change in the event of a holiday$/, () => `Lado Sur: ${HOLCHG}`],
  [/^Zone (NW|SW|SE|NE): (north|south) of Main Street, (west|east) of Pennsylvania Railroad$/, (m) => `Zona ${m[1].replace('W', 'O')}: ${WHERE[m[2]]} de Main Street, ${SIDE[m[3]]} del ferrocarril de Pennsylvania`],
  [/^Zone (NW|SW|SE|NE): single-stream in blue automated cart$/, (m) => `Zona ${m[1].replace('W', 'O')}: flujo único en carrito azul automatizado`],
  [/^Business District & All Non-Automated Areas \(single-stream recycling on calendar Wednesdays with metal collection days by call-ahead\)$/, () => 'Distrito comercial y todas las áreas no automatizadas (reciclaje de flujo único los miércoles del calendario, con días de recogida de metal previa llamada)'],
  [/^Wards? ([\d and]+): confirm ward at gis\.oldbridge\.com(?: \(WHAT WARD AM I IN\?\))?$/, (m) => `Distrito${m[1].includes('and') ? 's' : ''} ${m[1].replace(' and ', ' y ')}: confirme su distrito en gis.oldbridge.com`],
  [/^Ward (\d): (Memorial Day|Thanksgiving|Christmas) recycling moved to Saturday (\w+ \d+) \(.*\)$/, (m) => `Distrito ${m[1]}: el reciclaje ${HOLI[m[2]]} pasó al sábado ${fullDate(m[3])}`],
  [/^Exception: Central Park and surrounding streets \(Stone Ct, Aimy Ct, Rachele Ct\): Memorial Day recycling moved to Saturday May 30 .*$/, () => 'Excepción: Central Park y calles aledañas (Stone Ct, Aimy Ct, Rachele Ct): el reciclaje del Día de los Caídos (Memorial Day) pasó al sábado 30 de mayo'],
  [/^Exception: Central Park and surrounding streets \(Stone Ct, Aimy Ct, Rachele Ct\) c: .*$/, () => 'Excepción: Central Park y calles aledañas (Stone Ct, Aimy Ct, Rachele Ct): se recogen los lunes aunque estén en el Distrito 3'],
  [/^Exception: The Arbors section, Sonoma Court, and Lakeridge West collected Tuesday: .*$/, () => 'Excepción: la sección The Arbors, Sonoma Court y Lakeridge West se recogen los martes aunque estén en el Distrito 4'],
  [/^Sec ([\d, ]+): (MONDAYS|TUESDAYS|WEDNESDAY) (.*)$/, (m) => `Secc. ${m[1]}: ${DAYU[m[2]]}, ${BORDERS(m[3])}`],
  [/^Monday sections \(Sec 4, 5, 6, 7\): Memorial Day recycling moved to Saturday May 30 .*$/, () => 'Secciones de lunes (Secc. 4, 5, 6, 7): el reciclaje del Día de los Caídos (Memorial Day) pasó al sábado 30 de mayo'],
  [/^Sanitation Zone (I+): (.*)$/, (m) => `Zona de Saneamiento ${m[1]}: ${m[2]}`],
  [/^MCIA county program \(not sanitation zones\): (.*)$/, (m) => `Programa del condado MCIA (no son zonas de saneamiento): ${m[1]}`],
  [/^MCIA Thursday: January 1 2026 Thursday recycling moved to Saturday January 3 \(borough 2026 bi-weekly page\)$/, () => 'MCIA jueves: el reciclaje del jueves 1 de enero de 2026 pasó al sábado 3 de enero (página quincenal de 2026 del municipio)'],
  [/^MCIA: (.*)$/, (m) => `Programa MCIA: ${m[1]}`],
  [/^Zone (\d) grass clippings$/, (m) => `Zona ${m[1]}, césped cortado`],
  [/^Zone (\d) heavy\/bulk trash$/, (m) => `Zona ${m[1]}, basura voluminosa/pesada`],
  [/^Zone (\d) non-recyclable solid waste$/, (m) => `Zona ${m[1]}, desechos sólidos no reciclables`],
  [/^Zone (\d) brush and leaf$/, (m) => `Zona ${m[1]}, ramas y hojas`],
  [/^Streets listed on city trash collection map PDF \(e\.g\., (.*?),? and other (\w+)-list streets\)$/, (m) => `Calles del mapa de recogida de basura de la ciudad en PDF (p. ej., ${m[1]} y otras calles de la lista del ${DAYL[m[2]]})`],
  [/^(Thursday|Friday) recycling district: street assignment via Recycling Districts PDF linked from Curbside page$/, (m) => `Distrito de reciclaje de los ${DAYL[m[1]]}${m[1] === 'Friday' ? '' : ''}: la asignación de calles está en el PDF de distritos de reciclaje de la página de recogida en la acera`],
  [/^Thursday recycling district: Thanksgiving makeup 2026-11-28 .*$/, () => 'Distrito de reciclaje de los jueves: reposición de Acción de Gracias el 2026-11-28 (nota de la página de recogida en la acera: "No Collection on Thanksgiving Day" / "will be on 11/28/26")'],
  [/^Friday recycling district: Christmas makeup 2026-12-26 .*$/, () => 'Distrito de reciclaje de los viernes: reposición de Navidad el 2026-12-26 (nota de la página de recogida en la acera: "No Collection on Christmas Day" / "will beon 12/26/26")'],
  [/^Compactor open \(Kenneth Avenue\)$/, () => 'Compactador abierto (Kenneth Avenue)'],
  [/^Section (I+) first collection day \((.*?)\): First weekday .*$/, (m) => `Sección ${m[1]}, primer día de recogida (${m[2]}): primer día deducido de los avisos oficiales de 2026 del Centro de Información de Tormentas de Invierno`],
  [/^Section (I+) second collection day \/ bulk day \(Trash\/Recycling page\)$/, (m) => `Sección ${m[1]}, segundo día de recogida / día de artículos voluminosos (página de Basura/Reciclaje)`],
  [/^Section (I+): limit two items per pick-up; effective January 1, 2018 \(still on current Trash\/Recycling page\)$/, (m) => `Sección ${m[1]}: límite de dos artículos por recogida; vigente desde el 1 de enero de 2018 (sigue en la página actual de Basura/Reciclaje)`],
  [/^Section (I+) \((.*)\): biweekly Wednesday per 2026 Community Calendar$/, (m) => `Sección ${m[1]} (${m[2]}): cada dos miércoles según el Calendario Comunitario de 2026`],
  [/^Bulk trash day$/, () => 'Día de artículos voluminosos'],
  [/^Bulk pickup$/, () => 'Recogida de artículos voluminosos'],
  [/^Brush and yard waste$/, () => 'Ramas y desechos de jardín'],
  [/^All zones$/, () => 'Todas las zonas'],
  [/^Borough-wide bulk$/, () => 'Artículos voluminosos en todo el municipio'],
  [/^Village bulk collection day$/, () => 'Día de recogida de artículos voluminosos de la villa'],
  [/^(Zones? [\d and]+|Zone 1 and north side of Zone 3|Zone 2 and south side of Zone 3)$/, (m) => ZONES(m[1]).replace('north side of Zone 3', 'el lado norte de la Zona 3').replace('south side of Zone 3', 'el lado sur de la Zona 3')],
  [/^(Zones? [\d and]+): must be out by 6:00 a\.m\.?$/, (m) => `${ZONES(m[1])}: ${OUT}`],
  [/^(Zones [\d and]+) white metal$/, (m) => `Línea blanca (metal) de ${ZONES(m[1]).toLowerCase().replace('zonas', 'las Zonas')}`],
  [/^(Zones [\d and]+): 1st and 3rd Wednesday of each month; no residential recycling on the fifth Wednesday of a month$/, (m) => `${ZONES(m[1])}: 1.º y 3.er miércoles de cada mes; no hay reciclaje residencial el quinto miércoles del mes`],
  [/^(Zones [\d and]+): 2nd and 4th Wednesday of each month; no residential recycling on the fifth Wednesday of a month$/, (m) => `${ZONES(m[1])}: 2.º y 4.º miércoles de cada mes; no hay reciclaje residencial el quinto miércoles del mes`],
  [/^(Zones [\d and]+): 2026 dates: (.*)$/, (m) => `${ZONES(m[1])}: fechas de 2026: ${dates(m[2])}`],
  [/^All households south of Church Street: entire Church Street; all households east of Main Street$/, () => 'Todos los hogares al sur de Church Street: toda Church Street; todos los hogares al este de Main Street'],
  [/^All households north of Church Street and west of Main Street: entire Main Street up to Church Street$/, () => 'Todos los hogares al norte de Church Street y al oeste de Main Street: toda Main Street hasta Church Street'],
  [/^Sections (\d) and (\d) leaf and branch curbside$/, (m) => `Recogida en la acera de hojas y ramas de las Secciones ${m[1]} y ${m[2]}`],
  [/^Zone (\d) \(Route 34 (South|North)\): Streets \((Area \d)(?: index from borough 2026 contract map)?\): (.*?)(?:\.? Effective May (\d+)(?:, 2026)?\.?)?$/, (m) => `Zona ${m[1]} (Ruta 34 ${m[2] === 'South' ? 'Sur' : 'Norte'}): Calles (${m[3].replace('Area', 'Área')}): ${m[4]}${m[5] ? `. Vigente desde el ${m[5]} de mayo de 2026` : ''}`],
  [/^Area (\d)$/, (m) => `Área ${m[1]}`],
  [/^Zone 1 - East of Union Ave: to Borough's Eastern Border$/, () => 'Zona 1 - al este de Union Ave hasta el límite oriental del municipio'],
  [/^Zone 2 - West of Union Ave: to Borough's Western Border$/, () => 'Zona 2 - al oeste de Union Ave hasta el límite occidental del municipio'],
  [/^Zone ([ABCD]) garbage: curbside by 6:00 a\.m\.; use township-issued blue automated container$/, (m) => `Basura de la Zona ${m[1]}: ${ZB.replace('municipio', 'municipio')}`],
  [/^Ocean Grove Zone ([BC]) garbage: manual collection; cans max 45 gallons, 50 lbs\. with contents$/, (m) => `Basura de Ocean Grove, Zona ${m[1]}: recogida manual; botes de máximo 45 galones y 50 lb con el contenido`],
  [/^Recycling sub-zone (\w\d): assign by 2026 Street Index PDF$/, (m) => `Subzona de reciclaje ${m[1]}: asigne según el PDF del índice de calles de 2026`],
  [/^Ocean Grove residential recycling: OG Zone C: south side of Main Ave to Inskip Ave; OG Zone B: north side of Main Ave to Lake Ave$/, () => 'Reciclaje residencial de Ocean Grove: Zona C de OG: lado sur de Main Ave hasta Inskip Ave; Zona B de OG: lado norte de Main Ave hasta Lake Ave'],
  [/^Garbage District (\d)$/, (m) => `Distrito de basura ${m[1]}`],
  [/^(East|West) of Broad Street$/, (m) => `Al ${m[1] === 'East' ? 'este' : 'oeste'} de Broad Street`],
  [/^Curbside: east of Bingham Avenue(?:; (1st and 3rd) Wednesday of month)?$/, (m) => `En la acera: al este de Bingham Avenue${m[1] ? '; 1.º y 3.er miércoles del mes' : ''}`],
  [/^Curbside: Bingham Avenue and west(?:; (2nd and 4th) Wednesday of month)?$/, (m) => `En la acera: Bingham Avenue y al oeste${m[1] ? '; 2.º y 4.º miércoles del mes' : ''}`],
  [/^Drive-in collection: borough-wide(?:; (2nd and 4th) Wednesday of month)?$/, (m) => `Recogida con entrada al predio: en todo el municipio${m[1] ? '; 2.º y 4.º miércoles del mes' : ''}`],
  [/^Green Day electronics\/document shredding$/, () => 'Día Verde: electrónicos y trituración de documentos'],
  [/^Leaf pick-up$/, () => 'Recogida de hojas'],
  [/^Tree and branch pick-up$/, () => 'Recogida de ramas y troncos'],
  [/^Section ([AB]): (.*?), (?:[^,]*?)$/, null],
  [/^Section ([AB]): no trash (Friday December 25|Thursday January 1|Thursday November 26) 2026 \(2026 calendar\)$/, (m) => `Sección ${m[1]}: no hay recogida de basura el ${({ 'Friday December 25': 'viernes 25 de diciembre', 'Thursday January 1': 'jueves 1 de enero', 'Thursday November 26': 'jueves 26 de noviembre' })[m[2]]} de 2026 (calendario de 2026)`],
  [/^Section ([AB]): cans\/bottles, bundled cardboard and newspaper; no plastic bags$/, (m) => `Sección ${m[1]}: latas/botellas, cartón atado y periódico; sin bolsas de plástico`],
  [/^Section ([AB]): bulk \(furniture, mattresses, couches, other plastics\); limit 3 items\. 2026 dates start Jan (\d+)$/, (m) => `Sección ${m[1]}: artículos voluminosos (muebles, colchones, sofás, otros plásticos); límite de 3 artículos. Las fechas de 2026 empiezan el ${m[2]} de enero`],
  [/^Section ([AB]) fall leaf collection \(paper bags\)$/, (m) => `Recogida de hojas de otoño de la Sección ${m[1]} (bolsas de papel)`],
  [/^Section ([AB]): (.+)$/, (m) => `Sección ${m[1]}: ${m[2]}`],
  [/^(North|South) Zone: collection from 6:00 a\.m\.; see official street listing$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'}: recogida desde las 6:00 a.m.; vea la lista oficial de calles`],
  [/^(North|South) Zone: collection from 6:00 a\.m\.; no collection New Year's Day, Independence Day, Election Day, Thanksgiving, Christmas$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'}: recogida desde las 6:00 a.m.; no hay recogida en Año Nuevo, Día de la Independencia, Día de las Elecciones, Acción de Gracias ni Navidad`],
].filter(([, f]) => f);
