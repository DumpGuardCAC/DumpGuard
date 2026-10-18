# One row per item: id | English | Spanish | aliases (comma separated) | material | rule | prep codes | flags
# material: RP rigid_plastic, SP soft_plastic_foam, CP cardboard_paper, ME metal, GL glass, EH ewaste_hazard, OT other
# rule: R recycling, T trash, S special_dropoff
# prep codes: E empty, R rinse, F flatten, N no bag, C caps off, D let dry, X remove battery
# flags: v = varies by town (confirm locally), h = hazard (needs safe handling)
# Every row is a DRAFT from NJ-wide norms. Nothing here is verified against a county guide.

ROWS = """
plastic-water-bottle|Plastic water bottle|Botella de agua de plástico|water bottle,pet bottle,bottled water|RP|R|EN|
plastic-soda-bottle|Plastic soda bottle|Botella de refresco de plástico|soda bottle,pop bottle,coke bottle,2 liter|RP|R|EN|
plastic-juice-bottle|Plastic juice bottle|Botella de jugo de plástico|juice bottle,sports drink bottle,gatorade bottle|RP|R|EN|
milk-jug|Plastic milk jug|Envase de leche de plástico|milk jug,milk bottle,gallon jug|RP|R|ERN|
detergent-bottle|Laundry detergent bottle|Botella de detergente|detergent jug,laundry soap bottle,fabric softener bottle|RP|R|ERN|
shampoo-bottle|Shampoo or conditioner bottle|Botella de champú o acondicionador|shampoo,conditioner,body wash bottle,lotion bottle|RP|R|ER|
mouthwash-bottle|Mouthwash bottle|Botella de enjuague bucal|mouthwash,listerine bottle|RP|R|ER|
cooking-oil-bottle|Cooking oil bottle|Botella de aceite de cocina|vegetable oil bottle,olive oil plastic bottle|RP|R|ER|
condiment-squeeze-bottle|Ketchup or condiment squeeze bottle|Botella exprimible de salsa|ketchup bottle,mustard bottle,syrup bottle|RP|R|ER|v
peanut-butter-jar-plastic|Plastic peanut butter jar|Frasco de mantequilla de maní de plástico|peanut butter jar,plastic jar,mayonnaise jar|RP|R|ER|
yogurt-tub|Yogurt or margarine tub|Envase de yogur o margarina|yogurt cup,margarine tub,butter tub,sour cream tub|RP|R|ER|v
deli-container|Deli or takeout tub with lid|Envase de delicatessen con tapa|deli tub,soup container,hummus tub|RP|R|ER|v
berry-clamshell|Clear fruit clamshell|Envase transparente de fruta|berry container,tomato container,salad clamshell|RP|R|ER|v
plastic-takeout-container|Plastic takeout container|Envase de plástico para llevar|takeout box,to-go container,meal prep container|RP|T|E|v
plastic-cup|Plastic cup|Vaso de plástico|solo cup,party cup,drinking cup|RP|T||
plastic-cutlery|Plastic forks, knives and spoons|Cubiertos de plástico|plastic fork,plastic spoon,plastic utensils|RP|T||
plastic-plate|Plastic plate|Plato de plástico|disposable plate,picnic plate|RP|T||
plastic-bucket|Plastic bucket or pail|Cubeta de plástico|bucket,pail,paint bucket plastic|RP|T||
laundry-basket|Plastic laundry basket|Cesto de ropa de plástico|hamper,laundry basket|RP|S||
plastic-toy|Plastic toy|Juguete de plástico|toy,action figure,kids toy|RP|T||
plastic-hanger|Plastic clothes hanger|Gancho de ropa de plástico|hanger,coat hanger plastic|RP|T||
plastic-flower-pot|Plastic plant pot|Maceta de plástico|flower pot,nursery pot,planter|RP|T||v
pill-bottle|Pill or vitamin bottle|Frasco de pastillas o vitaminas|prescription bottle,vitamin bottle,medicine bottle|RP|R|ECX|v
plastic-straw|Plastic straw|Popote de plástico|straw,drinking straw|RP|T||
five-gallon-jug|Large water jug (over one gallon)|Garrafón de agua|5 gallon jug,water cooler jug|RP|S||v
bleach-bottle|Bleach or cleaner bottle|Botella de cloro o limpiador|bleach jug,cleaner bottle,spray cleaner|RP|R|ER|v
spray-bottle|Trigger spray bottle|Botella con atomizador|spray bottle,windex bottle|RP|R|ER|v
kcup-pod|K-cup coffee pod|Cápsula de café|k-cup,coffee pod,keurig pod|RP|T||
plastic-bottle-cap|Plastic bottle cap|Tapa de botella de plástico|bottle cap,jug lid|RP|R|C|v
plastic-lid|Plastic lid or tub cover|Tapa de plástico|container lid,cup lid,coffee lid|RP|T||v
disposable-razor|Disposable razor|Rastrillo desechable|razor,shaver|RP|T||
toothbrush|Toothbrush|Cepillo de dientes|toothbrush,electric toothbrush head|RP|T||
plastic-storage-container|Plastic food storage container|Recipiente de plástico para alimentos|tupperware,storage bin,rubbermaid|RP|T||
cd-dvd-case|CD or DVD case|Estuche de CD o DVD|jewel case,dvd case|RP|T||
cd-dvd-disc|CD or DVD disc|Disco CD o DVD|compact disc,dvd,blu-ray|RP|T||
baby-bottle|Baby bottle|Biberón|baby bottle,sippy cup|RP|T||
garden-hose|Garden hose|Manguera de jardín|hose,water hose|RP|S||
plastic-chair|Plastic lawn chair|Silla de plástico|patio chair,resin chair|RP|S||
vinyl-record|Vinyl record|Disco de vinilo|record,lp|RP|T||
plastic-shopping-bag|Plastic shopping bag|Bolsa de plástico|grocery bag,carrier bag,shopping bag|SP|T||
bread-bag|Bread bag|Bolsa de pan|bread bag,tortilla bag|SP|T||
produce-bag|Produce bag|Bolsa para frutas y verduras|produce bag,thin bag|SP|T||
zip-bag|Zip-top sandwich bag|Bolsa con cierre|ziploc,sandwich bag,freezer bag|SP|T||
plastic-wrap|Plastic cling wrap|Plástico adherente|saran wrap,cling film|SP|T||
bubble-wrap|Bubble wrap|Plástico de burbujas|bubble wrap,air pillow|SP|T||
chip-bag|Chip or snack bag|Bolsa de papitas o botanas|chip bag,snack wrapper,crisps bag|SP|T||
candy-wrapper|Candy wrapper|Envoltura de dulces|candy wrapper,granola bar wrapper|SP|T||
styrofoam-cup|Foam cup|Vaso de espuma|styrofoam cup,foam coffee cup|SP|T||
styrofoam-takeout|Foam takeout container|Envase de espuma para llevar|styrofoam box,clamshell foam,to-go foam|SP|T||
packing-peanuts|Packing peanuts|Cacahuates de empaque|peanuts,foam peanuts|SP|T||
foam-block|Foam packaging block|Bloque de espuma de embalaje|styrofoam block,foam insert,appliance foam|SP|T||
foam-meat-tray|Foam meat tray|Bandeja de espuma|meat tray,produce tray foam|SP|T||
foam-egg-carton|Foam egg carton|Cartón de huevos de espuma|styrofoam egg carton|SP|T||
squeeze-pouch|Food squeeze pouch|Bolsa exprimible de alimento|baby food pouch,applesauce pouch|SP|T||
pet-food-bag|Pet food bag|Bolsa de alimento para mascotas|dog food bag,cat food bag|SP|T||
shrink-wrap|Shrink wrap or stretch film|Película retráctil|stretch wrap,pallet wrap|SP|T||
balloon|Balloon|Globo|mylar balloon,latex balloon|SP|T||
six-pack-rings|Six-pack rings|Anillos de paquete de seis|can rings,soda rings|SP|T||
plastic-mailer|Plastic mailer or padded envelope|Sobre de plástico acolchado|poly mailer,bubble mailer,amazon bag|SP|T||
frozen-food-bag|Frozen food bag|Bolsa de comida congelada|frozen vegetable bag|SP|T||
toothpaste-tube|Toothpaste tube|Tubo de pasta dental|toothpaste,tube|SP|T||
foam-plate|Foam plate|Plato de espuma|styrofoam plate|SP|T||
packing-tape|Tape or tape roll|Cinta adhesiva|scotch tape,duct tape,masking tape|SP|T||
trash-bag|Garbage bag|Bolsa de basura|trash bag,bin liner|SP|T||
disposable-gloves|Disposable gloves|Guantes desechables|latex gloves,nitrile gloves|SP|T||
face-mask|Disposable face mask|Mascarilla desechable|surgical mask,covid mask|SP|T||
diaper|Diaper|Pañal|baby diaper,pull-up,adult brief|SP|T||
wet-wipes|Wet wipes|Toallitas húmedas|baby wipes,cleaning wipes,flushable wipes|SP|T||
sponge|Kitchen sponge|Esponja de cocina|sponge,scrub pad|SP|T||
rubber-band|Rubber band|Liga de goma|rubber band,elastic band|SP|T||
corrugated-box|Cardboard box|Caja de cartón|corrugated,shipping box,moving box,amazon box|CP|R|FN|
cereal-box|Cereal or food box|Caja de cereal|cereal box,cracker box,pasta box|CP|R|F|
shoebox|Shoe box|Caja de zapatos|shoebox,gift box|CP|R|F|
newspaper|Newspaper|Periódico|newspaper,paper|CP|R|N|
magazine|Magazine or catalog|Revista o catálogo|magazine,catalog,flyer|CP|R|N|
office-paper|Office paper|Papel de oficina|printer paper,copy paper,notebook paper|CP|R|N|
junk-mail|Junk mail|Correo basura|mail,flyers,advertising mail|CP|R|N|
paper-envelope|Paper envelope|Sobre de papel|envelope,window envelope|CP|R|N|
paper-bag|Paper grocery bag|Bolsa de papel|brown bag,kraft bag|CP|R|F|
phone-book|Phone book|Directorio telefónico|phonebook,yellow pages|CP|R|N|
paperback-book|Paperback book|Libro de bolsillo|paperback,softcover book|CP|R|v|
hardcover-book|Hardcover book|Libro de tapa dura|hardcover,textbook|CP|S||v
paper-egg-carton|Paper egg carton|Cartón de huevos de papel|egg carton,egg box|CP|R||
paper-towel-tube|Paper towel or toilet paper tube|Tubo de papel higiénico|toilet paper roll,cardboard tube|CP|R||
pizza-box-clean|Clean pizza box (no food)|Caja de pizza limpia|pizza box,pizza carton|CP|R|F|v
pizza-box-greasy|Greasy pizza box|Caja de pizza grasosa|dirty pizza box,oily box|CP|T||v
paper-cup|Paper coffee cup|Vaso de papel para café|coffee cup,starbucks cup,hot cup|CP|T||v
paper-plate|Paper plate|Plato de papel|paper plate,party plate|CP|T||
paper-napkin|Used paper napkin|Servilleta de papel usada|napkin,serviette|CP|T||
paper-towel|Used paper towel|Toalla de papel usada|kitchen roll,paper towel|CP|T||
tissue|Tissue|Pañuelo desechable|kleenex,facial tissue|CP|T||
shredded-paper|Shredded paper|Papel triturado|shredder paper,confetti paper|CP|T||v
receipt|Thermal receipt|Recibo térmico|receipt,till slip|CP|T||
wrapping-paper|Plain wrapping paper|Papel de regalo liso|gift wrap,wrapping paper|CP|R||v
glitter-wrapping-paper|Glitter or foil wrapping paper|Papel de regalo con brillo|foil gift wrap,metallic paper|CP|T||
juice-box|Juice box or aseptic carton|Caja de jugo|tetra pak,juice carton,soup carton|CP|R|ER|v
milk-carton|Milk or cream carton|Cartón de leche|gable top carton,half gallon carton|CP|R|ER|v
cardboard-tube|Mailing tube|Tubo de envío|mailing tube,poster tube|CP|R||
file-folder|File folder|Carpeta de archivo|manila folder,hanging folder|CP|R||
sticky-notes|Sticky notes|Notas adhesivas|post-it,sticky note|CP|T||
drink-carrier|Cardboard drink carrier|Portavasos de cartón|cup holder,coffee tray|CP|R||
wax-paper|Wax paper|Papel encerado|waxed paper|CP|T||
parchment-paper|Parchment paper|Papel pergamino|baking paper|CP|T||
frozen-food-box|Frozen food box|Caja de comida congelada|frozen dinner box,ice cream carton|CP|T|F|v
laminated-paper|Laminated paper|Papel laminado|laminated sheet,plasticized paper|CP|T||
photo-print|Photographs|Fotografías|photo,picture print|CP|T||
calendar|Calendar|Calendario|wall calendar,planner|CP|R||v
greeting-card|Plain greeting card|Tarjeta de felicitación|birthday card,christmas card|CP|R||v
glitter-card|Glitter or musical card|Tarjeta con brillo o música|musical card,glitter card|CP|T||
paper-takeout-box|Paper takeout box|Caja de papel para llevar|chinese takeout box,paper food box|CP|R|E|v
cupcake-liner|Cupcake liner|Capacillo para pastelitos|muffin liner|CP|T||
tissue-box|Empty tissue box|Caja de pañuelos vacía|kleenex box|CP|R|F|
paper-tag|Gift tag or label sheet|Etiquetas de papel|sticker sheet,labels|CP|T||
cardboard-greasy|Food-soiled cardboard|Cartón sucio de comida|stained cardboard,wet cardboard|CP|T||
cardboard-pallet-wood|Wood pallet|Tarima de madera|pallet,skid|CP|S||
aluminum-can|Aluminum can|Lata de aluminio|soda can,beer can,beverage can|ME|R|E|
steel-can|Steel or tin can|Lata de acero|tin can,food can,soup can,bean can|ME|R|ER|
pet-food-can|Pet food can|Lata de comida para mascotas|cat food can,dog food can|ME|R|ER|
aerosol-empty|Empty aerosol can|Aerosol vacío|spray can,hairspray can,cooking spray|ME|R|E|vh
aerosol-partial|Aerosol can with contents|Aerosol con contenido|paint spray,spray paint,partly full aerosol|ME|S|h|h
aluminum-foil|Clean aluminum foil|Papel de aluminio limpio|tin foil,foil sheet|ME|R||v
foil-pan|Aluminum foil pan|Bandeja de aluminio|tin pan,disposable bakeware|ME|R|ER|v
metal-bottle-cap|Metal bottle cap|Tapa metálica de botella|bottle cap,crown cap|ME|R||v
metal-jar-lid|Metal jar lid|Tapa metálica de frasco|jar lid,screw lid|ME|R||v
empty-paint-can|Empty paint can|Lata de pintura vacía|paint tin,paint can dry|ME|R|D|v
wire-hanger|Wire hanger|Gancho de alambre|coat hanger metal,dry cleaner hanger|ME|S||v
metal-cutlery|Metal silverware|Cubiertos metálicos|forks,knives,spoons|ME|S||
cookware|Pots and pans|Ollas y sartenes|frying pan,saucepan,cookware|ME|S||
scrap-metal|Scrap metal|Chatarra metálica|metal scrap,pipe,rebar|ME|S||
nails-screws|Nails and screws|Clavos y tornillos|hardware,fasteners|ME|S||
bicycle|Bicycle|Bicicleta|bike,tricycle|ME|S||
propane-cylinder|Propane tank|Tanque de propano|bbq tank,propane bottle,camping fuel|EH|S|h|h
fire-extinguisher|Fire extinguisher|Extintor|extinguisher|EH|S|h|h
metal-lawn-furniture|Metal lawn furniture|Muebles metálicos de jardín|patio table,metal chair|ME|S||
glass-bottle|Glass bottle|Botella de vidrio|beer bottle,wine bottle,soda bottle glass|GL|R|ER|
glass-jar|Glass jar|Frasco de vidrio|pickle jar,jam jar,sauce jar|GL|R|ERC|
wine-bottle|Wine or liquor bottle|Botella de vino o licor|wine bottle,whiskey bottle,vodka bottle|GL|R|ER|
beer-bottle|Beer bottle|Botella de cerveza|beer,brown bottle,green bottle|GL|R|ER|
baby-food-jar|Baby food jar|Frasco de comida para bebé|baby jar,small jar|GL|R|ER|
perfume-bottle|Perfume bottle|Frasco de perfume|cologne bottle,fragrance bottle|GL|T||v
glass-candle-jar|Glass candle jar|Vela en vaso de vidrio|candle jar,yankee candle|GL|T||v
broken-glass|Broken glass|Vidrio roto|shards,smashed glass|GL|T|N|h
drinking-glass|Drinking glass|Vaso de vidrio|tumbler,wine glass,cup glass|GL|T||
window-glass|Window glass|Vidrio de ventana|pane,windowpane|GL|T||
mirror|Mirror|Espejo|mirror glass,vanity mirror|GL|T||
pyrex|Pyrex or baking glass|Pyrex o vidrio de horno|baking dish,glass bakeware|GL|T||
ceramic-mug|Ceramic mug or dish|Taza o plato de cerámica|mug,plate,bowl,china|GL|T||
flower-vase|Vase|Florero|glass vase,ceramic vase|GL|T||
incandescent-bulb|Incandescent light bulb|Foco incandescente|light bulb,halogen bulb,old bulb|GL|T|N|
led-bulb|LED light bulb|Foco LED|led lamp,led light|EH|S||v
cfl-bulb|CFL light bulb|Foco fluorescente compacto|cfl,compact fluorescent,energy saver bulb|EH|S|h|vh
fluorescent-tube|Fluorescent tube|Tubo fluorescente|tube light,shop light tube|EH|S|h|h
alkaline-battery|Alkaline battery (AA, AAA, C, D, 9V)|Pila alcalina|aa battery,aaa battery,9 volt,d cell|EH|T||v
rechargeable-battery|Rechargeable battery|Batería recargable|nimh,li-ion,battery pack|EH|S|h|h
button-battery|Button or coin battery|Pila de botón|watch battery,coin cell,hearing aid battery|EH|S|h|h
car-battery|Car battery|Batería de automóvil|auto battery,lead acid|EH|S|h|h
lithium-battery|Loose lithium battery|Batería de litio suelta|lithium ion,cr2032,18650|EH|S|h|h
power-bank|Power bank|Batería portátil|portable charger,battery bank|EH|S|h|h
vape|E-cigarette or vape|Cigarrillo electrónico|vape,juul,e-cig|EH|S|X|h
cell-phone|Cell phone|Teléfono celular|smartphone,iphone,android|EH|S|X|h
laptop|Laptop|Computadora portátil|notebook,macbook,chromebook|EH|S|X|h
tablet|Tablet|Tableta|ipad,kindle fire|EH|S|X|h
desktop-computer|Desktop computer|Computadora de escritorio|pc,tower,cpu|EH|S||h
computer-monitor|Computer monitor|Monitor|display,lcd screen|EH|S||h
television|Television|Televisión|tv,flat screen,crt|EH|S||h
printer|Printer|Impresora|inkjet,laser printer,scanner|EH|S||h
keyboard-mouse|Keyboard or mouse|Teclado o ratón|computer mouse,keyboard|EH|S||h
game-console|Game console|Consola de videojuegos|xbox,playstation,nintendo|EH|S|X|h
e-reader|E-reader|Lector electrónico|kindle,nook|EH|S|X|h
smartwatch|Smartwatch or fitness tracker|Reloj inteligente|fitbit,apple watch|EH|S|X|h
headphones|Headphones or earbuds|Audífonos|earbuds,airpods,headset|EH|S|X|h
speaker|Speaker|Bocina|bluetooth speaker,stereo,boombox|EH|S|X|h
camera|Digital camera|Cámara digital|camera,gopro,camcorder|EH|S|X|h
router-modem|Router or modem|Enrutador o módem|wifi router,cable box|EH|S||h
hard-drive|Hard drive or USB drive|Disco duro o memoria USB|hdd,ssd,flash drive,thumb drive|EH|S||h
cables-cords|Cables and charging cords|Cables y cargadores|usb cable,charger,power cord,extension cord|EH|S||h
remote-control|Remote control|Control remoto|tv remote,clicker|EH|S|X|h
flashlight|Flashlight|Linterna|torch,led flashlight|EH|S|X|h
hair-dryer|Hair dryer or small appliance|Secadora de cabello|blow dryer,curling iron,straightener|EH|S||h
toaster|Toaster or kitchen appliance|Tostador|blender,coffee maker,mixer,air fryer|EH|S||h
vacuum|Vacuum cleaner|Aspiradora|hoover,robot vacuum|EH|S|X|h
microwave|Microwave oven|Horno de microondas|microwave|EH|S||h
fan|Fan or space heater|Ventilador o calentador|box fan,heater|EH|S||h
holiday-lights|String lights|Luces navideñas|christmas lights,fairy lights|EH|S||h
dvd-player|DVD or media player|Reproductor de DVD|blu-ray player,vcr,stereo receiver|EH|S||h
smoke-detector|Smoke or CO detector|Detector de humo|smoke alarm,carbon monoxide alarm|EH|S|X|vh
thermostat-mercury|Mercury thermostat|Termostato con mercurio|old thermostat,mercury switch|EH|S|h|h
mercury-thermometer|Mercury thermometer|Termómetro de mercurio|glass thermometer|EH|S|h|h
refrigerator|Refrigerator or freezer|Refrigerador o congelador|fridge,freezer|EH|S||h
air-conditioner|Air conditioner or dehumidifier|Aire acondicionado|ac unit,window unit,dehumidifier|EH|S||h
washer-dryer|Washer, dryer or stove|Lavadora, secadora o estufa|washing machine,dryer,oven,dishwasher|ME|S||
ink-cartridge|Ink cartridge|Cartucho de tinta|printer ink,inkjet cartridge|EH|S||v
toner-cartridge|Toner cartridge|Cartucho de tóner|laser toner|EH|S||v
latex-paint-wet|Latex paint (liquid)|Pintura de látex líquida|wet paint,house paint|EH|S|D|vh
latex-paint-dry|Latex paint (fully dried)|Pintura de látex seca|dried paint,hardened paint|EH|T|D|v
oil-paint|Oil-based paint or stain|Pintura al aceite|oil paint,stain,varnish,paint thinner|EH|S|h|h
motor-oil|Motor oil|Aceite de motor|engine oil,used oil,car oil|EH|S|h|h
antifreeze|Antifreeze|Anticongelante|coolant,radiator fluid|EH|S|h|h
gasoline|Gasoline or fuel|Gasolina o combustible|gas,diesel,kerosene,lighter fluid|EH|S|h|h
pesticide|Pesticide or herbicide|Pesticida o herbicida|bug spray,weed killer,roundup,insecticide|EH|S|h|h
pool-chemicals|Pool chemicals|Químicos para alberca|chlorine,pool shock,muriatic acid|EH|S|h|h
household-cleaner|Household chemicals|Productos químicos del hogar|drain cleaner,oven cleaner,ammonia,toilet bowl cleaner|EH|S|h|h
solvents|Solvents and thinners|Solventes y diluyentes|acetone,turpentine,mineral spirits|EH|S|h|h
fertilizer|Fertilizer|Fertilizante|lawn fertilizer,plant food|EH|S|h|h
medications|Expired medications|Medicamentos vencidos|pills,prescriptions,drugs,tablets|EH|S|h|vh
sharps|Needles and syringes|Agujas y jeringas|sharps,lancets,insulin pen|EH|S|h|h
cooking-oil-used|Used cooking oil|Aceite de cocina usado|frying oil,grease,fat|OT|S||v
food-scraps|Food scraps|Restos de comida|leftovers,fruit peels,vegetable scraps|OT|T||v
coffee-grounds|Coffee grounds and filters|Posos de café|coffee grounds,tea bags,filter|OT|T||v
eggshells|Eggshells|Cascarones de huevo|egg shell|OT|T||v
pizza-crust|Cooked food and meat bones|Comida cocinada y huesos|bones,meat scraps,fish|OT|T||
leaves|Leaves|Hojas|fall leaves,leaf bags|OT|S||v
grass-clippings|Grass clippings|Recortes de césped|lawn clippings,mowing|OT|S||v
tree-branches|Branches and brush|Ramas y arbustos|tree limbs,brush,prunings|OT|S||v
christmas-tree|Christmas tree|Árbol de Navidad|xmas tree,pine tree|OT|S||v
clothing|Clothing in good condition|Ropa en buen estado|shirt,pants,jacket,coat|OT|S||v
worn-clothing|Worn or torn clothing|Ropa desgastada|rags,damaged clothes|OT|S||v
shoes|Shoes|Zapatos|sneakers,boots,sandals|OT|S||v
bedding-towels|Bedding and towels|Ropa de cama y toallas|sheets,blanket,towel,pillow|OT|S||v
mattress|Mattress or box spring|Colchón|bed,box spring|OT|S||
furniture|Furniture|Muebles|couch,chair,table,desk,dresser|OT|S||
carpet|Carpet or rug|Alfombra|rug,carpeting,underlay|OT|S||
lumber|Lumber and scrap wood|Madera|boards,plywood,two by four|OT|S||
drywall|Drywall or construction debris|Tablaroca o escombros|sheetrock,plaster,concrete,tile|OT|S||
tires|Tires|Llantas|car tire,tyre|OT|S||
car-parts|Car parts|Piezas de automóvil|auto parts,bumper,brake pads|OT|S||
pet-waste|Pet waste|Desechos de mascotas|dog poop,cat litter,animal waste|OT|T|N|
cat-litter|Cat litter|Arena para gatos|kitty litter|OT|T|N|
cigarette-butts|Cigarette butts|Colillas de cigarro|cigarette,ashes|OT|T||
yard-toys-big|Large plastic outdoor toy|Juguete grande de plástico|slide,playhouse,swing set|OT|S||
holiday-decor|Holiday decorations|Decoraciones navideñas|ornaments,artificial tree,wreath|OT|T||
books-donate|Books in good condition|Libros en buen estado|used books,donate books|OT|S||v
toys-donate|Toys in good condition|Juguetes en buen estado|used toys,donate toys|OT|S||v
household-goods-donate|Reusable household goods|Artículos del hogar reutilizables|kitchenware,decor,donation|OT|S||v
ceramic-tile|Ceramic tile or bricks|Azulejos o ladrillos|tile,brick,concrete block|OT|S||
cement-bag|Cement or grout|Cemento o lechada|portland cement,grout,spackle,joint compound|OT|T||v
asbestos|Asbestos material|Material con asbesto|asbestos tile,insulation old|OT|S|h|h
oxygen-tank|Oxygen tank|Tanque de oxígeno|medical oxygen,oxygen cylinder|EH|S|h|h
used-oil-filter|Used oil filter|Filtro de aceite usado|oil filter,car oil filter|EH|S||v
eyeglasses|Eyeglasses|Anteojos|glasses,spectacles,reading glasses|OT|S||v
""".strip().splitlines()
