"""Spanish text for rule notes, schedule notes and facility notes. MACHINE-DRAFTED, NOT HUMAN REVIEWED.
Keyed by the exact English string. apply_spanish.py fills items_db.json and towns.json and fails if a string is missing.
The product owner chose to serve these without a human review pass."""

WB = "Woodbridge Recycling Center, 225 Smith St, Keasbey (Mon-Sat 8 a.m.-2 p.m.)"
WB_ES = "Woodbridge Recycling Center, 225 Smith St, Keasbey (lun-sáb 8 a. m.-2 p. m.)"
MON_HHW = "Take to the Monmouth County Household Hazardous Waste facility, 3211 Shafto Rd, Tinton Falls NJ 07753. Open Tue/Wed/Fri 11-4 and Sat 8-4. No appointment. Monmouth County residents only, bring ID. Confirm at 732-683-8686."
MON_HHW_ES = "Llévelo a la instalación de desechos domésticos peligrosos del condado de Monmouth, 3211 Shafto Rd, Tinton Falls NJ 07753. Abierta mar/mié/vie 11-4 y sáb 8-4. No necesita cita. Solo residentes del condado de Monmouth; lleve identificación. Confirme al 732-683-8686."
MID_HHW = "Take to a Middlesex County Household Hazardous Waste Drop-Off Days event (free, county residents only, 8 a.m.-2 p.m.; 2026 dates Mar 15, May 16, Jun 28, Sep 19, Nov 15)."
MID_HHW_ES = "Llévelo a un evento de recolección de desechos domésticos peligrosos del condado de Middlesex (gratis, solo residentes del condado, 8 a. m.-2 p. m.; fechas de 2026: 15 de marzo, 16 de mayo, 28 de junio, 19 de septiembre, 15 de noviembre)."
WH = "Edison Recycling Center, 745 New Durham Rd"

NOTES = {
"Plastic bottles, jars, jugs and tubs of one gallon or less go in the curbside bin.":
"Las botellas, frascos, garrafas y tarros de plástico de un galón o menos van en el contenedor de la acera.",
"Curbside plastics: labeled #1 and #2 bottles and #5 containers (margarine tubs, yogurt cups). Pourable, one gallon or less.":
"Plásticos de la acera: botellas con la etiqueta #1 y #2 y envases #5 (tarros de margarina, vasos de yogur). Que se puedan verter, de un galón o menos.",
"Plastic cups and utensils do not go in the recycling bin.":
"Los vasos y cubiertos de plástico no van en el contenedor de reciclaje.",
f"Take to the {WB}, or call the township for a free curbside pick-up.":
f"Llévelo al {WB_ES}, o llame al municipio para pedir una recogida gratis en la acera.",
"Plastic bags and film do not go in the recycling bin. Put them in the regular garbage.":
"Las bolsas y películas de plástico no van en el contenedor de reciclaje. Póngalas en la basura normal.",
"Plastic bags go in the garbage, never in the recycling container.":
"Las bolsas de plástico van en la basura, nunca en el contenedor de reciclaje.",
"Plastic bags go in the regular garbage.":
"Las bolsas de plástico van en la basura normal.",
"Never put plastic bags in the recycling. Reuse them, or take them to a store bag drop-off; otherwise they go in the garbage.":
"Nunca ponga bolsas de plástico en el reciclaje. Reutilícelas o llévelas a un punto de recogida de bolsas en una tienda; si no, van en la basura.",
f"Never put in the blue recycling cart. Drop clean, dry film at a NexTrex bin: Woodbridge Town Hall, Community Center, Senior Centers or the {WB}.":
f"Nunca lo ponga en el carrito azul de reciclaje. Deje la película limpia y seca en un contenedor NexTrex: el Ayuntamiento de Woodbridge, el Centro Comunitario, los Centros para Mayores o el {WB_ES}.",
"Plastic wrap and bags are not accepted in recycling.":
"El plástico de envolver y las bolsas no se aceptan en el reciclaje.",
"Styrofoam and foam do not go in the recycling bin.":
"El Styrofoam y la espuma no van en el contenedor de reciclaje.",
"Styrofoam is not accepted in recycling.":
"El Styrofoam no se acepta en el reciclaje.",
f"Take to the {WB}. Check the township Styrofoam Recycling Program page for what is accepted.":
f"Llévelo al {WB_ES}. Consulte la página del programa de reciclaje de Styrofoam del municipio para ver qué se acepta.",
"Accepted in the curbside bin. Do not bag recyclables.":
"Se acepta en el contenedor de la acera. No ponga los reciclables en bolsas.",
"Curbside: break boxes down to fit in the blue recycling cart, or bring them to the Recycling Center in Keasbey.":
"En la acera: desarme las cajas para que quepan en el carrito azul de reciclaje, o llévelas al Centro de Reciclaje en Keasbey.",
f"Take to the {WB}.":
f"Llévelo al {WB_ES}.",
"Paper egg cartons are accepted. Plastic and foam cartons are not.":
"Se aceptan las cajas de huevos de papel. Las de plástico y espuma no.",
"Greasy or food-soiled paper and cardboard does not go in the bin.":
"El papel y el cartón con grasa o restos de comida no van en el contenedor.",
"Food-soiled cardboard such as pizza boxes is not accepted in recycling.":
"El cartón con restos de comida, como las cajas de pizza, no se acepta en el reciclaje.",
"Used tissues and napkins are not accepted in recycling.":
"Los pañuelos y servilletas usados no se aceptan en el reciclaje.",
"Shredded paper does not go in the bin. Put it in the trash or compost it.":
"El papel triturado no va en el contenedor. Póngalo en la basura o hágalo compost.",
"Home-shredded paper is trash. It is recyclable only at a Middlesex County paper shredding event.":
"El papel triturado en casa es basura. Solo se recicla en un evento de trituración de papel del condado de Middlesex.",
"Shredded paper is not accepted in recycling.":
"El papel triturado no se acepta en el reciclaje.",
"Milk and juice cartons are not accepted in recycling.":
"Los cartones de leche y jugo no se aceptan en el reciclaje.",
"Frozen food boxes generally should not be recycled because of the waxy coating.":
"En general, las cajas de comida congelada no se deben reciclar por su capa de cera.",
"Food-soiled or waxed cardboard is not accepted in recycling.":
"El cartón con restos de comida o encerado no se acepta en el reciclaje.",
f"{MID_HHW} Keep it in its original container, none over 10 gallons.":
f"{MID_HHW_ES} Déjelo en su envase original; ninguno de más de 10 galones.",
f"{MON_HHW} Spray paint is accepted.":
f"{MON_HHW_ES} Se acepta la pintura en aerosol.",
"Aluminum foil is not accepted in recycling.":
"El papel de aluminio no se acepta en el reciclaje.",
"Aluminum foil plates and pans are not accepted in recycling.":
"Los platos y bandejas de papel de aluminio no se aceptan en el reciclaje.",
"Coat hangers go in the regular garbage.":
"Los ganchos de ropa van en la basura normal.",
MON_HHW: MON_HHW_ES,
"Broken glass is not accepted in recycling.":
"El vidrio roto no se acepta en el reciclaje.",
"Dishware, drinking glasses and mirrors do not go in the recycling bin.":
"La vajilla, los vasos de vidrio y los espejos no van en el contenedor de reciclaje.",
"Drinking glasses are not accepted in recycling.":
"Los vasos de vidrio no se aceptan en el reciclaje.",
"Window glass goes in the regular garbage.":
"El vidrio de ventana va en la basura normal.",
"Mirrors go in the regular garbage.":
"Los espejos van en la basura normal.",
"Glass cookware and bakeware go in the regular garbage.":
"Los utensilios de cocina y de horno de vidrio van en la basura normal.",
"Ceramics, dishes and pottery are not accepted in recycling.":
"La cerámica, los platos y la alfarería no se aceptan en el reciclaje.",
"Light bulbs go in the regular garbage.":
"Las bombillas van en la basura normal.",
"LED bulbs go in the regular trash.":
"Las bombillas LED van en la basura normal.",
"Not accepted at county HHW. Take CFLs to a retailer that recycles them, such as Lowes or Home Depot.":
"No se aceptan en la instalación del condado. Lleve las bombillas CFL a una tienda que las recicle, como Lowes o Home Depot.",
"Alkaline batteries (AA, AAA, C, D, 9V) go in the regular trash.":
"Las pilas alcalinas (AA, AAA, C, D, 9V) van en la basura normal.",
"Single-use alkaline batteries may go in household trash.":
"Las pilas alcalinas de un solo uso pueden ir en la basura doméstica.",
f"Never put in trash or curbside recycling. Take to a Middlesex County Household Hazardous Waste Drop-Off Days event (free, county residents only, 8 a.m.-2 p.m.; 2026 dates Mar 15, May 16, Jun 28, Sep 19, Nov 15). Bag each battery or tape its terminals.":
f"Nunca la ponga en la basura ni en el reciclaje de la acera. Llévela a un evento de recolección de desechos domésticos peligrosos del condado de Middlesex (gratis, solo residentes del condado, 8 a. m.-2 p. m.; fechas de 2026: 15 de marzo, 16 de mayo, 28 de junio, 19 de septiembre, 15 de noviembre). Ponga cada pila en una bolsa o cubra sus terminales con cinta.",
"Not collected curbside. Free drop-off at the Monmouth County Reclamation Center, 3211 Shafto Rd, Tinton Falls. Call 732-683-8686.":
"No se recoge en la acera. Entrega gratis en el Centro de Recuperación del condado de Monmouth, 3211 Shafto Rd, Tinton Falls. Llame al 732-683-8686.",
"Not accepted at the Edison Recycling Center. Use the county household hazardous waste, tire or battery programs.":
"No se acepta en el Centro de Reciclaje de Edison. Use los programas del condado de desechos peligrosos, llantas o baterías.",
f"{MON_HHW} Bag each battery or tape its terminals first.":
f"{MON_HHW_ES} Ponga cada pila en una bolsa o cubra sus terminales con cinta antes.",
"Not accepted at county HHW. Use your town's electronics drop-off or a manufacturer or retailer program.":
"No se acepta en la instalación del condado. Use el punto de entrega de electrónicos de su pueblo o un programa del fabricante o de una tienda.",
f"Take to the {WH}, Mon-Sat 6:30 am-2 pm. Proof of residency required.":
"Llévelo al Centro de Reciclaje de Edison, 745 New Durham Rd, lun-sáb 6:30 a. m.-2 p. m. Se requiere comprobante de residencia.",
"Take to the Edison Recycling Center, 745 New Durham Rd, Mon-Sat 6:30 am-2 pm. Proof of residency required.":
"Llévelo al Centro de Reciclaje de Edison, 745 New Durham Rd, lun-sáb 6:30 a. m.-2 p. m. Se requiere comprobante de residencia.",
"City residents: drop off the second Saturday of each month, 8 am-12 pm, at 400 Jersey Ave.":
"Residentes de la ciudad: entréguelo el segundo sábado de cada mes, de 8 a. m. a 12 p. m., en 400 Jersey Ave.",
"Not collected at the curb. Take to the Voluntary Recycling Drop Off Center, 378 Atlantic Ave. Mon-Fri 7:30-3, Sat 9-1.":
"No se recoge en la acera. Llévelo al Centro Voluntario de Entrega de Reciclaje, 378 Atlantic Ave. Lun-vie 7:30-3, sáb 9-1.",
"New Jersey law bans putting this in the trash. Drop it off for free at a manufacturer-plan collection site (many towns and retailers run one); some sites have limits, so call first.":
"La ley de Nueva Jersey prohíbe ponerlo en la basura. Entréguelo gratis en un punto de recolección del plan de un fabricante (muchos pueblos y tiendas tienen uno); algunos sitios tienen límites, así que llame antes.",
f"Required e-waste. Take to the {WB}, or call the township for a free curbside pick-up.":
f"Desecho electrónico obligatorio. Llévelo al {WB_ES}, o llame al municipio para pedir una recogida gratis en la acera.",
"Not collected curbside. Take to the Asbury Park Recycling Center, 9 Main St (Springwood Ave entrance). Mon-Fri 4-8 pm, Sat-Sun 10 am-2 pm.":
"No se recoge en la acera. Llévelo al Centro de Reciclaje de Asbury Park, 9 Main St (entrada por Springwood Ave). Lun-vie 4-8 p. m., sáb-dom 10 a. m.-2 p. m.",
f"Take to the {WB}. Curbside pick-up is available for a fee.":
f"Llévelo al {WB_ES}. La recogida en la acera está disponible por una tarifa.",
"Latex paint is NOT accepted at Monmouth HHW. Dry it out completely, then put the open can in the trash.":
"La pintura de látex NO se acepta en la instalación de Monmouth. Déjela secar por completo y luego ponga la lata abierta en la basura.",
"County residents: second Saturday of each month, 8 am-12 pm, at 400 Jersey Ave. Label all paint.":
"Residentes del condado: el segundo sábado de cada mes, de 8 a. m. a 12 p. m., en 400 Jersey Ave. Etiquete toda la pintura.",
"Dried-out latex paint can goes in the regular trash with the lid off.":
"La lata de pintura de látex seca va en la basura normal sin la tapa.",
"Dried-out latex paint can goes in the regular trash.":
"La lata de pintura de látex seca va en la basura normal.",
"Up to 30 quarts a year per resident at DPW Central Garage, 400 Jersey Ave, Mon-Fri 8-3. Call 732-745-5059.":
"Hasta 30 cuartos de galón al año por residente en el garaje central de Obras Públicas, 400 Jersey Ave, lun-vie 8-3. Llame al 732-745-5059.",
f"{MON_HHW} Gasoline only in a certified gas can.":
f"{MON_HHW_ES} La gasolina solo en un bidón certificado.",
"Do not pour in the sink. Let it solidify, seal it and put it in household trash.":
"No lo vierta en el fregadero. Déjelo solidificar, séllelo y póngalo en la basura doméstica.",
f"Take to the {WB}. Cool it, pour it into a sturdy capped container, do not mix it with other liquids.":
f"Llévelo al {WB_ES}. Déjelo enfriar, viértalo en un recipiente resistente con tapa y no lo mezcle con otros líquidos.",
f"Take to the {WB}, or use the free curbside leaf-bag pick-up dates on your calendar.":
f"Llévelo al {WB_ES}, o use las fechas gratis de recogida de bolsas de hojas en la acera que aparecen en su calendario.",
f"Take to the {WB} or a local clothing drop box.":
f"Llévelo al {WB_ES} o a un contenedor local de donación de ropa.",
"Not accepted at Middlesex County hazardous waste days. The county has a separate tire drop-off program; ask your town too.":
"No se acepta en los días de desechos peligrosos del condado de Middlesex. El condado tiene un programa aparte de entrega de llantas; pregunte también a su pueblo.",
"Take to a Middlesex County Tire Recycling Center (East Brunswick, Metuchen, Plainsboro, Woodbridge). Call 732-745-4170.":
"Llévelas a un centro de reciclaje de llantas del condado de Middlesex (East Brunswick, Metuchen, Plainsboro, Woodbridge). Llame al 732-745-4170.",
f"Take to the {WB}. Limit 4 tires a month.":
f"Llévelas al {WB_ES}. Límite de 4 llantas al mes.",
}

SCHED = {
"Bagged yard waste (brush, shrubs, vines) goes out on your garbage day. Branches bundled, max 60 lb and 4 ft. No grass, no stumps. Christmas trees: January, on garbage day, no bags or ornaments. Leaf collection runs April 1 to May 15 and October 15 to December 31: use biodegradable bags or loose piles, kept 6 inches from the curb. Grass clippings are not collected (compost them or take them to the Monmouth County Reclamation Center, fees apply). Christmas trees: through January 31.":
"Los desechos de jardín en bolsas (ramas pequeñas, arbustos, enredaderas) se sacan el día de la basura. Las ramas atadas en paquetes, máximo 60 lb y 4 pies. Sin césped ni tocones. Árboles de Navidad: en enero, el día de la basura, sin bolsas ni adornos. La recogida de hojas es del 1 de abril al 15 de mayo y del 15 de octubre al 31 de diciembre: use bolsas biodegradables o montones sueltos a 6 pulgadas del borde de la acera. El césped cortado no se recoge (hágalo compost o llévelo al Centro de Recuperación del condado de Monmouth, con tarifa). Árboles de Navidad: hasta el 31 de enero.",
"Household garbage. Set out after 5 p.m. the day before; remove by 6 p.m. on collection day. Canceled on New Year's Day, Thanksgiving and Christmas; the pickup then happens on the next scheduled day.":
"Basura doméstica. Sáquela después de las 5 p. m. del día anterior y retire el recipiente antes de las 6 p. m. del día de recogida. Se cancela el Día de Año Nuevo, Acción de Gracias y Navidad; la recogida pasa al siguiente día programado.",
"Weekly, limit 3 items. No TVs, electronics, white goods or yard waste (see the city's recycling page). Call 732-775-0900 to confirm.":
"Cada semana, límite de 3 artículos. Sin televisores, electrónicos, electrodomésticos grandes ni desechos de jardín (vea la página de reciclaje de la ciudad). Llame al 732-775-0900 para confirmar.",
"Single stream, do not bag. Max 60 lb per container. Set out after 5 p.m. the day before. Canceled on municipal holidays; the pickup then happens on the next scheduled day.":
"Reciclaje mezclado, sin bolsas. Máximo 60 lb por recipiente. Sáquelo después de las 5 p. m. del día anterior. Se cancela en los días feriados municipales; la recogida pasa al siguiente día programado.",
"Single stream curbside, every other week. Set out the evening before. Put cardboard next to the bin, not in it. No plastic bags. Condos and apartments: ask your management office. Holiday weeks: see the dates listed for your section. Find your section on the township guide map or call 732-248-7288.":
"Reciclaje mezclado en la acera, cada dos semanas. Sáquelo la tarde anterior. Ponga el cartón junto al contenedor, no dentro. Sin bolsas de plástico. Condominios y apartamentos: pregunte a la administración. Semanas con feriado: vea las fechas indicadas para su sección. Encuentre su sección en el mapa de la guía del municipio o llame al 732-248-7288.",
"Grass clippings, Apr 6 to Oct 2, municipal garbage areas only. Paper bags or open containers, no plastic bags, max 50 lb. Holiday weeks may shift.":
"Césped cortado, del 6 de abril al 2 de octubre, solo en zonas con recogida municipal de basura. Bolsas de papel o recipientes abiertos, sin bolsas de plástico, máximo 50 lb. En semanas con feriado puede cambiar.",
"Leaves, Oct 19 to Dec 11. Paper bags or open containers, no plastic bags, max 50 lb. Holiday weeks may shift.":
"Hojas, del 19 de octubre al 11 de diciembre. Bolsas de papel o recipientes abiertos, sin bolsas de plástico, máximo 50 lb. En semanas con feriado puede cambiar.",
"Municipal garbage, once a week, in your Township-supplied can. Put it out after 6 p.m. the night before and take the empty can in by the evening of collection day. Bagged household garbage only, no recyclables, leaves or grass. Not sure of your garbage day? It depends on your address: check the Recycle Coach app or call Public Works 732-248-7288. Holiday weeks: see the dates listed.":
"Basura municipal, una vez por semana, en el bote que da el municipio. Sáquelo después de las 6 p. m. de la noche anterior y guarde el bote vacío antes del anochecer del día de recogida. Solo basura doméstica en bolsas, sin reciclables, hojas ni césped. ¿No sabe su día? Depende de su dirección: use la aplicación Recycle Coach o llame a Obras Públicas al 732-248-7288. Semanas con feriado: vea las fechas indicadas.",
"Garbage here is collected by a private hauler, not the Township, and the Township does not schedule bulk or special pick-ups for these areas. Ask your management office or hauler for your days. Recycling and the yard programs still follow your recycling section.":
"En estas zonas la basura la recoge una empresa privada, no el municipio, y el municipio no programa recogidas de objetos grandes ni especiales. Pregunte a su administración o a la empresa por sus días. El reciclaje y los programas de jardín siguen su sección de reciclaje.",
"Garbage day depends on your address and the Township has not published a street list. Use the Recycle Coach app (search your address on edisonnj.gov under Public Works) or call Public Works at 732-248-7288, Monday to Friday 8 a.m. to 4:30 p.m.":
"El día de la basura depende de su dirección y el municipio no ha publicado una lista de calles. Use la aplicación Recycle Coach (busque su dirección en edisonnj.gov, en Obras Públicas) o llame a Obras Públicas al 732-248-7288, de lunes a viernes de 8 a. m. a 4:30 p. m.",
"Garbage and recycling are collected on the same day, every week. There is no make-up day when a holiday is marked NO PICKUP. Check the dates listed. Public Works can cancel collection for weather; watch the city website.":
"La basura y el reciclaje se recogen el mismo día, cada semana. No hay día de reposición cuando un feriado está marcado SIN RECOGIDA. Revise las fechas indicadas. Obras Públicas puede cancelar la recogida por el clima; vea el sitio web de la ciudad.",
"Single stream recycling, every week, on your garbage day. Put cans, bottles and paper loose in a reusable container, never in plastic bags. Cardboard and newspaper can be tied in bundles of 50 lb or less (max 8 bundles of cardboard). Do not put paint or liquids in cardboard boxes.":
"Reciclaje mezclado, cada semana, el día de su basura. Ponga latas, botellas y papel sueltos en un recipiente reutilizable, nunca en bolsas de plástico. El cartón y los periódicos se pueden atar en paquetes de 50 lb o menos (máximo 8 paquetes de cartón). No ponga pintura ni líquidos en cajas de cartón.",
"Bulk pickup for the South Zone: 2nd and 4th Wednesday of each month, no fifth-Wednesday pickup. Put items out after 5 p.m. the day before. Up to 8 items (furniture, appliances with doors removed, carpet, water heaters, metal) plus up to 4 rimless car tires 16 in. or smaller. No construction material. Mattresses and box springs must be sealed in plastic with tape, put out no more than 24 hours ahead. Or take 8 items to the drop-off center on Atlantic Ave with proof of residency.":
"Recogida de objetos grandes de la Zona Sur: segundo y cuarto miércoles de cada mes, sin recogida en un quinto miércoles. Saque los artículos después de las 5 p. m. del día anterior. Hasta 8 artículos (muebles, electrodomésticos sin puertas, alfombras, calentadores de agua, metal) más hasta 4 llantas de auto sin rin de 16 pulgadas o menos. Sin material de construcción. Los colchones y bases deben sellarse en plástico con cinta y sacarse con no más de 24 horas de anticipación. O lleve 8 artículos al centro de entrega en Atlantic Ave con comprobante de residencia.",
"Bulk pickup for the North Zone: 1st and 3rd Wednesday of each month, no fifth-Wednesday pickup. Put items out after 5 p.m. the day before. Up to 8 items (furniture, appliances with doors removed, carpet, water heaters, metal) plus up to 4 rimless car tires 16 in. or smaller. No construction material. Mattresses and box springs must be sealed in plastic with tape, put out no more than 24 hours ahead. Or take 8 items to the drop-off center on Atlantic Ave with proof of residency.":
"Recogida de objetos grandes de la Zona Norte: primer y tercer miércoles de cada mes, sin recogida en un quinto miércoles. Saque los artículos después de las 5 p. m. del día anterior. Hasta 8 artículos (muebles, electrodomésticos sin puertas, alfombras, calentadores de agua, metal) más hasta 4 llantas de auto sin rin de 16 pulgadas o menos. Sin material de construcción. Los colchones y bases deben sellarse en plástico con cinta y sacarse con no más de 24 horas de anticipación. O lleve 8 artículos al centro de entrega en Atlantic Ave con comprobante de residencia.",
"Brush is collected March 15 to June 1 and September 15 to December 31. The rest of the year, call Public Works at 732-571-6520 to arrange a brush pickup. Maximum per collection: 8 ft by 4 ft by 3 ft. Larger amounts need a private dumpster. Landscapers must remove their own brush. Year-round you can bring brush to the Atlantic Ave Recycling Center with ID showing you live in Long Branch.":
"Las ramas se recogen del 15 de marzo al 1 de junio y del 15 de septiembre al 31 de diciembre. El resto del año, llame a Obras Públicas al 732-571-6520 para programar la recogida. Máximo por recogida: 8 pies por 4 pies por 3 pies. Las cantidades mayores necesitan un contenedor privado. Los jardineros deben llevarse sus propias ramas. Todo el año puede llevar ramas al Centro de Reciclaje de Atlantic Ave con una identificación que muestre que vive en Long Branch.",
"November, December, April and May: pile leaves at the edge of the street, no more than 3 ft into the road, not blocking walkways or traffic. All other months: leaves go only in paper bags, 50 lb or less when full, kept separate from brush. Leaves that are not piled or bagged properly are not collected.":
"Noviembre, diciembre, abril y mayo: amontone las hojas en el borde de la calle, a no más de 3 pies hacia la calzada y sin bloquear aceras ni el tráfico. Los demás meses: las hojas van solo en bolsas de papel, de 50 lb o menos llenas, separadas de las ramas. Las hojas que no estén bien amontonadas o embolsadas no se recogen.",
"The City does not pick up grass clippings. Leave them on the lawn, compost them, or take them to the Monmouth County Reclamation Center ($3 per car load). Never leave clippings in the road: they wash into storm drains and cause flooding. Lawn services may not put clippings in the roadway.":
"La ciudad no recoge el césped cortado. Déjelo en el césped, hágalo compost o llévelo al Centro de Recuperación del condado de Monmouth ($3 por carga de auto). Nunca deje el césped en la calle: lo arrastra el agua a los desagües y causa inundaciones. Los servicios de jardinería no pueden dejar césped en la calzada.",
"Trash twice a week. Put trash curbside after 5 p.m. the night before. Up to 3 containers or bags per home per collection day, cans no bigger than 32 gallons, 50 lb max each. Bulk items, extra bags, scrap metal, appliances and brush need an appointment: reserve online at cityofnewbrunswick.org/bulkpickup or call 732-745-5059. No trash on city holidays; see the dates listed. Questions: Public Works 732-745-5105.":
"Basura dos veces por semana. Saque la basura a la acera después de las 5 p. m. de la noche anterior. Hasta 3 recipientes o bolsas por casa por día de recogida, botes de no más de 32 galones y 50 lb cada uno. Objetos grandes, bolsas adicionales, chatarra, electrodomésticos y ramas necesitan cita: reserve en línea en cityofnewbrunswick.org/bulkpickup o llame al 732-745-5059. No hay recogida en los feriados de la ciudad; vea las fechas indicadas. Preguntas: Obras Públicas 732-745-5105.",
"Single stream recycling, every other week. Put it curbside after 5 p.m. the night before, loose in a bin, never in bags (bagged recycling is not collected). Missed pickup: leave it at the curb and call the MCIA at 1-800-488-6242 by noon the next day, or the Recycling Division at 732-745-5059.":
"Reciclaje mezclado, cada dos semanas. Sáquelo a la acera después de las 5 p. m. de la noche anterior, suelto en un contenedor, nunca en bolsas (el reciclaje en bolsas no se recoge). Si no pasaron: déjelo en la acera y llame a la MCIA al 1-800-488-6242 antes del mediodía del día siguiente, o a la División de Reciclaje al 732-745-5059.",
"Furniture, mattresses (fully wrapped in plastic), rugs, scrap metal, appliances and brush are collected by appointment only. Reserve online at cityofnewbrunswick.org/bulkpickup or call 732-745-5059. Up to 6 cans, bags or bulk items per unit per pickup. Brush: bundles under 4 ft and 50 lb, branches up to 5 in. thick, never in bags. No car parts.":
"Muebles, colchones (completamente envueltos en plástico), alfombras, chatarra, electrodomésticos y ramas se recogen solo con cita. Reserve en línea en cityofnewbrunswick.org/bulkpickup o llame al 732-745-5059. Hasta 6 botes, bolsas u objetos grandes por unidad por recogida. Ramas: paquetes de menos de 4 pies y 50 lb, ramas de hasta 5 pulgadas de grosor, nunca en bolsas. Sin piezas de auto.",
"Leaves are collected curbside in spring and fall by leaf zone, in PAPER bags only, never plastic. Pick up 20 free paper bags per property (more cost $5 per bundle of 10, check or money order). The leaf-zone dates are on the city's printed schedule: call the Recycling Division at 732-745-5059 to confirm yours. Real, bare Christmas trees go curbside Tuesday night for pickup every Wednesday in January (dates listed). Artificial trees need a bulk appointment. Brush is by appointment, see the bulk entry.":
"Las hojas se recogen en la acera en primavera y otoño por zona de hojas, solo en bolsas de PAPEL, nunca de plástico. Recoja 20 bolsas de papel gratis por propiedad (más cuestan $5 por paquete de 10, con cheque o giro postal). Las fechas de su zona de hojas están en el calendario impreso de la ciudad: llame a la División de Reciclaje al 732-745-5059 para confirmar la suya. Los árboles de Navidad naturales y sin adornos se sacan a la acera el martes por la noche para la recogida de cada miércoles de enero (fechas indicadas). Los árboles artificiales necesitan cita para objetos grandes. Las ramas son con cita; vea la entrada de objetos grandes.",
"Trash, once a week, in your township cart. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected, nothing beside it. No bulk items unless you scheduled a pickup (732-738-1311 ext. 3600). Holiday weeks: pickups move one day later (see dates). (SWD 2.)":
"Basura, una vez por semana, en el carrito del municipio. Saque el carrito después de las 4 p. m. del día anterior y guárdelo antes de las 9 p. m. del día de recogida. Solo se recoge lo que está dentro del carrito, nada a su lado. Sin objetos grandes a menos que haya programado una recogida (732-738-1311 ext. 3600). Semanas con feriado: la recogida se mueve un día más tarde (vea las fechas). (SWD 2.)",
"Trash, once a week, in your township cart. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected, nothing beside it. No bulk items unless you scheduled a pickup (732-738-1311 ext. 3600). Holiday weeks: pickups move one day later (see dates). (SWD 3.)":
"Basura, una vez por semana, en el carrito del municipio. Saque el carrito después de las 4 p. m. del día anterior y guárdelo antes de las 9 p. m. del día de recogida. Solo se recoge lo que está dentro del carrito, nada a su lado. Sin objetos grandes a menos que haya programado una recogida (732-738-1311 ext. 3600). Semanas con feriado: la recogida se mueve un día más tarde (vea las fechas). (SWD 3.)",
"Trash, once a week, in your township cart. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected, nothing beside it. No bulk items unless you scheduled a pickup (732-738-1311 ext. 3600). Holiday weeks: pickups move one day later (see dates). (SWD 1.)":
"Basura, una vez por semana, en el carrito del municipio. Saque el carrito después de las 4 p. m. del día anterior y guárdelo antes de las 9 p. m. del día de recogida. Solo se recoge lo que está dentro del carrito, nada a su lado. Sin objetos grandes a menos que haya programado una recogida (732-738-1311 ext. 3600). Semanas con feriado: la recogida se mueve un día más tarde (vea las fechas). (SWD 1.)",
"Single stream recycling, once a week, in the blue township cart. Do not bag recyclables. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected. Holiday weeks: pickups move one day later (see dates). Questions: Recycling Office 732-738-1311 ext. 3035. (RD 4.)":
"Reciclaje mezclado, una vez por semana, en el carrito azul del municipio. No ponga los reciclables en bolsas. Saque el carrito después de las 4 p. m. del día anterior y guárdelo antes de las 9 p. m. del día de recogida. Solo se recoge lo que está dentro del carrito. Semanas con feriado: la recogida se mueve un día más tarde (vea las fechas). Preguntas: Oficina de Reciclaje 732-738-1311 ext. 3035. (RD 4.)",
"Single stream recycling, once a week, in the blue township cart. Do not bag recyclables. Put the cart out after 4 p.m. the day before and bring it in by 9 p.m. on collection day. Only items inside the cart are collected. Holiday weeks: pickups move one day later (see dates). Questions: Recycling Office 732-738-1311 ext. 3035. (RD 5.)":
"Reciclaje mezclado, una vez por semana, en el carrito azul del municipio. No ponga los reciclables en bolsas. Saque el carrito después de las 4 p. m. del día anterior y guárdelo antes de las 9 p. m. del día de recogida. Solo se recoge lo que está dentro del carrito. Semanas con feriado: la recogida se mueve un día más tarde (vea las fechas). Preguntas: Oficina de Reciclaje 732-738-1311 ext. 3035. (RD 5.)",
"Bulk pickup (furniture, mattresses, carpeting, garbage cans, refrigerators, freezers, washers, dryers, playsets, ride-on toys) is scheduled by calling Sanitation at 732-738-1311 ext. 3600, Mon-Fri 7:30 a.m.-3:30 p.m. The township page lists no fee or item limit; ask when you call. Or drop items at the Convenience Center (Mon-Sat 8 a.m.-2 p.m., residents only).":
"La recogida de objetos grandes (muebles, colchones, alfombras, botes de basura, refrigeradores, congeladores, lavadoras, secadoras, estructuras de juego, juguetes de montar) se programa llamando a Sanidad al 732-738-1311 ext. 3600, lun-vie 7:30 a. m.-3:30 p. m. La página del municipio no indica tarifa ni límite de artículos; pregunte al llamar. O lleve los artículos al Centro de Conveniencia (lun-sáb 8 a. m.-2 p. m., solo residentes).",
"Free special pick-ups for your street zone: brush in April, bagged leaves Oct to Dec, Christmas trees in January. Brush: branches no longer than 4 ft, bundled and tied. Leaves: biodegradable paper leaf bags only, leaves only. Put material out the night before. Find your zone in the street index of the township calendar. Questions: Sanitation 732-738-1311 ext. 3600.":
"Recogidas especiales gratis para la zona de su calle: ramas en abril, hojas en bolsas de octubre a diciembre, árboles de Navidad en enero. Ramas: no más largas de 4 pies, atadas en paquetes. Hojas: solo bolsas de papel biodegradables para hojas, solo hojas. Saque el material la noche anterior. Encuentre su zona en el índice de calles del calendario del municipio. Preguntas: Sanidad 732-738-1311 ext. 3600.",
"Brush, leaf and Christmas tree days depend on your street. Look your street up in the Street Index of the township 2026 calendar (RD and Zone numbers) or call Sanitation at 732-738-1311 ext. 3600.":
"Los días de ramas, hojas y árboles de Navidad dependen de su calle. Busque su calle en el índice de calles del calendario 2026 del municipio (números de RD y zona) o llame a Sanidad al 732-738-1311 ext. 3600.",
}

FAC = {
"monmouth-hhw":
"Solo residentes del condado de Monmouth. No necesita cita. Límite de 20 galones de líquido o 220 libras de material seco por visita; envases de líquido de 5 galones o menos; los químicos deben estar etiquetados. Permanezca en su vehículo con los materiales en el baúl.",
"long-branch-drop-off":
"Frente al campo de béisbol de Pleasure Bay. Aplane y ate el cartón (máximo 50 lb). Latas, vidrio y botellas de plástico #1/#2 mezclados van sueltos, sin bolsas. Desechos electrónicos obligatorios: televisores, computadoras, monitores, impresoras, faxes, laptops (no se recogen en la acera). Las hojas y ramas de hasta 6 pulgadas de grosor requieren identificación de residente.",
"asbury-park-recycling-center":
"Los electrónicos no se recogen en la acera. Se aceptan: televisores, computadoras, monitores, impresoras, escáneres, copiadoras, equipos de sonido, videograbadoras, reproductores de DVD, celulares, cámaras, cables. No se acepta césped cortado. El teléfono es el de Obras Públicas.",
"edison-recycling-center":
"Solo residentes de Edison, se requiere comprobante de residencia. Sin vehículos comerciales ni remolques alquilados. Acepta hojas, césped, ramas, muebles, colchones envueltos en plástico, artículos de metal, lavadoras, secadoras, microondas, electrónicos, cartón, accesorios. NO acepta pintura ni otros desechos domésticos peligrosos, llantas, baterías de auto, textiles, material de construcción, vidrio, alfombras, puertas ni cercas. El teléfono es el de Obras Públicas (8 a. m.-4:30 p. m. entre semana).",
"new-brunswick-second-saturday":
"Residentes de la ciudad: laptops, computadoras de escritorio, monitores, impresoras, televisores, faxes. Residentes del condado: pintura de látex y al aceite, barniz, laca, diluyente, pintura en aerosol, sellador de entradas de autos, todo etiquetado. Sin latas vacías ni pintura de látex seca (séquela y póngala en la basura). Sin desechos comerciales ni industriales. El teléfono es el del Coordinador de Reciclaje de la ciudad.",
"woodbridge-recycling-center":
"Solo residentes de Woodbridge, se requiere comprobante de residencia; regístrese con el guardia. Acepta todos los reciclables mezclados, papel triturado, Styrofoam, bolsas y película de plástico, aceite de cocina, textiles, cartón y plásticos rígidos voluminosos (sin plásticos con metal, tela o motores). Sin vehículos comerciales, placas comerciales, placas de otros estados, camiones de caja ni vehículos de alquiler. Número principal del municipio: 732-634-4500.",
"woodbridge-convenience-center":
"Mismo sitio que el Centro de Reciclaje. Solo residentes de Woodbridge, se requiere comprobante de residencia. Acepta electrodomésticos, metales mezclados, objetos voluminosos, ramas, hojas, tanques de propano, electrónicos, pintura, llantas y aceite de motor. Los escombros de reparaciones pequeñas del hogar (concreto, asfalto, ladrillo, madera, paneles de yeso) tienen límites mensuales; llame antes. Sin vehículos comerciales, placas de otros estados, camiones de caja ni vehículos de alquiler. Número principal del municipio: 732-634-4500. Los sábados hay mucha gente.",
"middlesex-hhw":
"Gratis, solo residentes del condado de Middlesex, solo material residencial y placas residenciales, sin vehículos comerciales. Sin envases de más de 10 galones. Permanezca en su vehículo con los materiales en el baúl o área de carga. Traiga: adhesivos, aerosoles, anticongelante, líquido de frenos, baterías de auto, limpiadores, destapacaños, extintores, bombillas fluorescentes, gasolina, queroseno, líquido para encendedores, mercurio, aceite de motor y filtros, pintura de látex y al aceite, diluyente de pintura, pesticidas y herbicidas, químicos fotográficos, químicos de piscina, tanques de propano, tintes y barnices, termómetros, termostatos, pilas recargables y de botón (cada una en una bolsa o con los terminales cubiertos con cinta). No traiga: electrodomésticos, muebles, electrónicos, envases vacíos, explosivos, desechos médicos, detectores de humo, llantas. Asbesto: llame para registrarse antes. Las pilas alcalinas pueden ir en la basura normal. Preguntas: solidwaste@co.middlesex.nj.us.",
}
