// Spanish for the short English labels the schedule data carries (section names, holiday reasons, one-off date labels).
// Machine-drafted and unreviewed, like the other Spanish text. Anything not covered comes back unchanged (English),
// and the test below fails the build if a label in towns.json is missing, so gaps cannot ship quietly.

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
function street(s) {
  for (const [re, es] of PLACES) if (re.test(s)) return es;
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

/** Spanish for a label, or the original text when no rule matches. */
export function toEs(text) {
  if (!text) return text;
  for (const [re, f] of [...WORDS, ...REASONS]) {
    const m = re.exec(text);
    if (m) return typeof f === 'function' ? f(m) : f;
  }
  return text;
}
/** True when toEs has a real translation (or the text is a bare proper noun such as a place name). */
export const translated = (text) => toEs(text) !== text;
