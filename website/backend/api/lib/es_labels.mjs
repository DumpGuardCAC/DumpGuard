

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

const EXTRA = [
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

const WORDS = [
  [/^Garbage (Monday|Tuesday|Wednesday|Thursday|Friday): municipal garbage district collected on (\w+)$/, (d) => `Basura ${DAYS[d[1]]}: distrito municipal con recogida los ${DAYS[d[1]]}`],
  [/^I do not know my garbage day$/, () => 'No sé mi día de basura'],
  [/^I do not know my street zone$/, () => 'No sé mi zona de calle'],
  [/^Private hauler: condos, townhouses, apartments and private garbage districts$/, () => 'Recolector privado: condominios, casas adosadas, apartamentos y distritos privados de basura'],
  [/^City-wide, by appointment$/, () => 'En toda la ciudad, con cita'],
  [/^Township-wide, by appointment$/, () => 'En todo el municipio, con cita'],
  [/^City-wide: leaves, Christmas trees$/, () => 'En toda la ciudad: hojas, árboles de Navidad'],
  [/^Brush \(citywide\)$/, () => 'Ramas (toda la ciudad)'],
  [/^Leaves \(citywide\)$/, () => 'Hojas (toda la ciudad)'],
  [/^Grass clippings \(citywide\)$/, () => 'Césped cortado (toda la ciudad)'],
  [/^Leaf collection Apr 1-May 15 and Oct 15-Dec 31; quarterly yard waste the weeks of Mar 31, Jun 30, Sep 30, Dec 31 \(dates as printed on the city page\)\.$/, () => 'Recogida de hojas del 1 de abril al 15 de mayo y del 15 de octubre al 31 de diciembre; desechos de jardín trimestrales las semanas del 31 de marzo, 30 de junio, 30 de septiembre y 31 de diciembre (fechas según la página de la ciudad).'],
  [/^(North|South) Zone \((Mo|Tu) and (Th|Fr)\)$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'} (${DAY2[m[2]]} y ${DAY2[m[3]]})`],
  [/^(North|South) Zone ([AB]): (.+) \((\w+)s\)$/, (m) => `Zona ${m[1] === 'North' ? 'Norte' : 'Sur'} ${m[2]}: ${street(m[3])} (${DAYS_PL[m[4]]})`],
  [/^Recycling Section (\d+)(?: \((grass|leaf)\))?$/, (m) => `Sección de reciclaje ${m[1]}${m[2] ? ` (${m[2] === 'grass' ? 'césped' : 'hojas'})` : ''}`],
  [/^RD (\d) Zone (\d+): streets in (.+)$/, (m) => `RD ${m[1]} Zona ${m[2]}: calles en ${m[3]}`],
  [/^Zone (\d+A?) \(every other (Mo|Tu)\)$/, (m) => `Zona ${m[1]} (cada dos ${m[2] === 'Mo' ? 'lunes' : 'martes'})`],
  [/^Zone (\d+A?) \((Mo|Tu) and (Th|Fr)\)$/, (m) => `Zona ${m[1]} (${DAY2[m[2]]} y ${DAY2[m[3]]})`],
  [/^Zone (\d+A?)(?: \((May 1 to Sep 30|Oct 1 to Apr 30)\))?(?:: (.+))?$/, (m) => `Zona ${m[1]}${m[2] ? ` (${m[2] === 'May 1 to Sep 30' ? 'del 1 de mayo al 30 de septiembre' : 'del 1 de octubre al 30 de abril'})` : ''}${m[3] ? `: ${street(m[3])}` : ''}`],
  [/^(Christmas tree pickup)$/, () => 'Recogida de árboles de Navidad'],
  [/^Christmas tree$/, () => 'Árbol de Navidad'],
  [/^Brush$/, () => 'Ramas'],
  [/^Leaves$/, () => 'Hojas'],
];
const DAYS = { Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes' };
const DAYS_PL = { Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes' };
const DAY2 = { Mo: 'lunes', Tu: 'martes', Th: 'jueves', Fr: 'viernes' };

const PLACES = [
  [/^Joline Ave to Monmouth Beach border$/, 'de Joline Ave a la frontera con Monmouth Beach'],
  [/^Joline Ave to Broadway$/, 'de Joline Ave a Broadway'],
  [/^Brighton Ave to Broadway$/, 'de Brighton Ave a Broadway'],
  [/^Brighton Ave to Deal border$/, 'de Brighton Ave a la frontera con Deal'],
  [/^Areas east of, and including, Grand Ave$/, 'Áreas al este de Grand Ave, incluida esta'],
  [/^All areas between Grand Ave and Comstock St \/ Prospect Ave$/, 'Todas las áreas entre Grand Ave y Comstock St / Prospect Ave'],
  [/^All areas west of, and including, Comstock St \/ Prospect Ave$/, 'Todas las áreas al oeste de Comstock St / Prospect Ave, incluidas estas'],
  [/^Cookman Ave and Lake Ave between Grand Ave and Heck St; all east and west streets between and including Ocean Ave and Kingsley St$/, 'Cookman Ave y Lake Ave entre Grand Ave y Heck St; todas las calles este y oeste entre Ocean Ave y Kingsley St, incluidas estas'],
  [/^All of Main Street; Central Business District bounded by Main St, Summerfield Ave, Lake Ave and Grand Ave$/, 'Toda Main Street; el distrito comercial central delimitado por Main St, Summerfield Ave, Lake Ave y Grand Ave'],
];
const MES = { Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr', May: 'may', Jun: 'jun', Jul: 'jul', Aug: 'ago', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dic' };
function street(s) {
  for (const [re, es] of PLACES) if (re.test(s)) return es;
  if (s === 'locate street in Green Booklet 2026 alphabetical list') return 'busque su calle en la lista alfabética del Folleto Verde 2026';
  const d = /^2026 dates: (.*)$/.exec(s);
  if (d) return 'fechas de 2026: ' + d[1].replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, (m) => MES[m]);
  return s;
}

const REASONS = [
  [/^Christmas Day$/, 'Navidad'], [/^Columbus Day$/, 'Día de la Raza (Columbus Day)'], [/^Day after Thanksgiving$/, 'Día después de Acción de Gracias'],
  [/^Election Day$/, 'Día de las elecciones'], [/^Good Friday( week)?$/, (m) => `Viernes Santo${m[1] ? ' (semana)' : ''}`],
  [/^Independence Day \(observed\)( week)?$/, (m) => `Día de la Independencia (observado)${m[1] ? ' (semana)' : ''}`],
  [/^Juneteenth$/, 'Juneteenth'], [/^Labor Day$/, 'Día del Trabajo'], [/^Lincoln's Birthday$/, 'Cumpleaños de Lincoln'],
  [/^Martin Luther King Jr\. Day$/, 'Día de Martin Luther King Jr.'], [/^Memorial Day$/, 'Día de los Caídos (Memorial Day)'],
  [/^New Year's Day$/, 'Año Nuevo'], [/^Presidents' Day$/, 'Día de los Presidentes'], [/^Thanksgiving Day$/, 'Acción de Gracias'], [/^Veterans Day$/, 'Día de los Veteranos'],
  [/^(Columbus Day|Labor Day|Martin Luther King Jr\. Day|Memorial Day|Presidents' Day) \(Monday's pickup moved a day\)$/, (m) => `${toEs(m[1])} (la recogida del lunes se movió un día)`],
  [/^Labor Day\. The city calendar prints Sept 12 here .*$/, 'Día del Trabajo. El calendario de la ciudad imprime el 12 de septiembre aquí (error de imprenta, es sábado); llame al 732-745-5059 para confirmar el día de reposición'],
  [/^Thanksgiving week has only one garbage pick-up; confirm with Public Works 732-248-7288$/, 'La semana de Acción de Gracias tiene una sola recogida de basura; confirme con Obras Públicas 732-248-7288'],
];

export function toEs(text) {
  if (!text) return text;
  for (const [re, f] of [...WORDS, ...REASONS, ...EXTRA]) {
    const m = re.exec(text);
    if (m) return typeof f === 'function' ? f(m) : f;
  }
  return text;
}
export const translated = (text) => toEs(text) !== text;
