const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* storage: browser-only demo. Backend replaces all of this. */
const mem={};
const S={get(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d},set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){delete mem[k];try{localStorage.removeItem(k)}catch(e){}}};
const me=()=>{const e=S.get("dg_s",null);return e?S.get("dg_u",[]).find(u=>u.email===e)||null:null};
async function hash(p){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return btoa(p)}}


/* ---------- NJ-06 TOWNS (source: Wikipedia / NJ Redistricting Commission, 38 municipalities) ---------- */
const MX="Carteret,Edison,Highland Park,Metuchen,New Brunswick,Old Bridge,Perth Amboy,Piscataway,Sayreville,South Amboy,South Plainfield,Woodbridge".split(",");
const MO="Aberdeen,Allenhurst,Asbury Park,Atlantic Highlands,Bradley Beach,Deal,Fair Haven,Hazlet,Highlands,Interlaken,Keansburg,Keyport,Little Silver,Loch Arbour,Long Branch,Matawan,Middletown,Monmouth Beach,Neptune City,Neptune Township,Oceanport,Red Bank,Rumson,Sea Bright,Union Beach,West Long Branch".split(",");
const CTY={};MX.forEach(t=>CTY[t]="middlesex");MO.forEach(t=>CTY[t]="monmouth");
const opt=a=>a.map(t=>`<option>${t}</option>`).join("");
$("town").innerHTML=`<optgroup label="Middlesex County">${opt(MX)}</optgroup><optgroup label="Monmouth County">${opt(MO)}</optgroup>`;
$("town").value="Edison";$("towns").innerHTML=opt(MX.concat(MO));


/* ---------- DISPOSAL RULES: checked against official sources on Oct 4, 2026 ---------- */
const CHECKED="Oct 4, 2026";
const MXu="https://www.middlesexcountynj.gov/government/departments/department-of-public-safety-and-health/office-of-health-services/solid-waste-management-program/recycling-programs-and-events";
const MXh="https://www.middlesexcountynj.gov/government/departments/department-of-public-safety-and-health/office-of-health-services/solid-waste-management-program/household-hazardous-waste";
const MOh="https://mcrcnj.com/household-hazardous-waste-facility/";
const MOa="https://mcrcnj.com/acceptable-wastes/";
const ED="https://www.edisonnj.org/departments/public_works/garbage_regulations.php";
const batMX={d:"Rechargeable and button-cell batteries: tape each terminal (or bag each battery), then take them to a county Household Hazardous Waste event or a retail / Battery Network drop-off (1-877-2-RECYCLE). Next county event listed: Nov 15, 2026, Middlesex College, 8 am–2 pm, free for county residents. Alkaline (AA/AAA) batteries can go in regular trash.",x:"Never put rechargeable or lithium batteries in curbside bins.",w:"Loose terminals can short-circuit and start fires, and federal rules require them to be protected for transport.",s:"Middlesex County Solid Waste Management",u:MXu,ok:1};
const payMX={d:"Take paint, stains and thinners to a Middlesex County Paint Drop-Off day (weekends, 8 am–12 pm, free, county residents only) or a county HHW event. Check the county schedule before you go. Containers over 10 gallons aren't accepted.",x:"Don't pour paint down drains or put liquid paint in the trash.",w:"Paint and solvents contaminate groundwater and are household hazardous waste.",s:"Middlesex County Solid Waste Management",u:MXu,ok:1};
const tireMX={d:"Middlesex County runs an ongoing tire drop-off for county residents (limit 4 tires per household per month, proof of residency required). Check the county page for the current location and hours. The county HHW events do not take tires.",x:"Don't put tires in trash or leave them curbside.",w:"Tires can't go to the landfill with regular waste and are a common illegal-dumping item.",s:"Middlesex County Solid Waste Management",u:MXu,ok:1};
const town=(what)=>({d:`${what} is handled by your town, not the county. Contact your town's Department of Public Works for bulk pickup or a drop-off center. If the item is still in good shape, donating it is the best option.`,x:"Don't set items out until your town confirms pickup.",w:"Bulk items and appliances are collected through town programs, and county HHW sites don't accept them.",s:"County solid waste programs",u:MXu,ok:0});
const R={
    electronics:{n:"Electronics",c:"#dc2626",k:["tv","television","laptop","computer","monitor","printer","fax","phone"],
        edison:{d:"Drop off at the Edison Recycling Center, 745 New Durham Rd (Mon–Sat, 6:30 am–2 pm). TVs, computers and printers are not eligible for bulk pickup.",x:"Don't put TVs or computers in the trash, and don't bring them to county HHW events.",w:"NJ law requires TVs, computers, monitors and printers to be recycled.",s:"Edison Township DPW",u:"https://edisonnj.org/departments/public_works/electronics_recycling_.php",ok:1},
        middlesex:{d:"Most Middlesex towns run their own electronics program, so ask your town's DPW. If your town has none, NJDEP lists no-charge drop-off sites. County Solid Waste: 732-745-4170.",x:"Don't put TVs or computers in the trash, and don't bring them to county HHW events.",w:"State law requires computers, monitors, TVs, printers and fax machines to be recycled.",s:"Middlesex County Solid Waste Management",u:MXu,ok:1},
        monmouth:{d:"Take to an electronics recycling site listed in the Monmouth County Recycling Guide, or ask your town's DPW. The county landfill and HHW facility do not take electronics.",x:"Don't put TVs or computers in the trash.",w:"The NJ Electronic Waste Management Act bans computers and TVs from disposal with regular waste.",s:"Monmouth County Reclamation Center",u:"https://www.visitmonmouth.com/page.aspx?ID=4391",ok:1}},
    battery:{n:"Batteries",c:"#dc2626",k:["battery","batteries","lithium","e-bike","ebike"],edison:batMX,middlesex:batMX,
        monmouth:{d:"Rechargeable, button-cell and car batteries are accepted free at the Monmouth County HHW Facility on Shafto Road, Tinton Falls (county residents only, proof of residency; call 732-683-8686 for hours). No appointment is required, per the county.",x:"Don't put rechargeable or lithium batteries in trash or curbside recycling.",w:"They can ignite in collection trucks and facilities.",s:"Monmouth County Reclamation Center",u:MOh,ok:1}},
    paint:{n:"Paint / Chemicals",c:"#dc2626",k:["paint","chemical","solvent","stain","varnish","pesticide","antifreeze"],edison:payMX,middlesex:payMX,
        monmouth:{d:"Oil-based, enamel and spray paint, plus solvents, stains and pesticides, go to the Monmouth County HHW Facility (Tinton Falls, free for residents, 5-gallon max container). Latex paint is not hazardous: dry it out, remove the lid, and put it in regular trash.",x:"Don't bring latex paint to HHW (it isn't accepted) and don't pour liquids down drains.",w:"Oil-based paints and chemicals are hazardous waste. Dried latex is safe for trash.",s:"Monmouth County Reclamation Center",u:MOa,ok:1}},
    furniture:{n:"Furniture",c:"#4b5563",k:["couch","sofa","mattress","box spring","chair","table","furniture","dresser"],
        edison:{d:"Edison residents can drop off sofas, chairs, tables and box springs at the Recycling Center, or schedule a township bulk pickup by calling 732-248-7288 (two bulk pickups per year). Wait for your confirmation number before putting anything out. If you're in a private-hauler area, call your hauler.",x:"Don't put bulk items curbside before you get a confirmation number.",w:"Items put out early are not collected by the township, and disposal becomes your responsibility.",s:"Edison Township DPW",u:ED,ok:1},
        middlesex:town("Furniture"),monmouth:town("Furniture")},
    appliances:{n:"Appliances",c:"#4b5563",k:["fridge","refrigerator","freezer","washer","dryer","oven","stove","dishwasher","appliance","microwave"],
        edison:{d:"Edison's Recycling Center accepts appliances and scrap metal from residents, and special pickups are arranged through the DPW at 732-248-7288. Wait for your confirmation number before putting anything out.",x:"Don't leave appliances curbside before you get a confirmation number.",w:"Items put out early are not collected by the township.",s:"Edison Township DPW",u:ED,ok:1},
        middlesex:town("Appliances"),
        monmouth:{d:"Ask your town's DPW about appliance and scrap-metal recycling. The county landfill does not accept large metal appliances, and refrigerators and freezers are turned away at the county HHW facility.",x:"Don't take appliances to the county landfill or HHW facility.",w:"Neither county site is set up to handle appliances.",s:"Monmouth County Reclamation Center",u:MOa,ok:1}},
    tires:{n:"Tires",c:"#0f766e",k:["tire","tires"],edison:tireMX,middlesex:tireMX,
        monmouth:{d:"Tires are not accepted at the county HHW facility. The Monmouth County Reclamation Center takes tires for a fee, and they must be kept separate from other waste. See the center's current tariff sheet for the rate.",x:"Don't mix tires with other waste.",w:"Tires carry a surcharge and must be handled separately.",s:"Monmouth County Reclamation Center",u:"https://mcrcnj.com/wp-content/uploads/2025/03/Tariff-Sheet.pdf",ok:1}},
    plastic:{n:"3D prints / Plastic",c:"#2563eb",k:["3d","pla","petg","filament","ftc","robot","plastic","parts"]},
    yard:{n:"Yard waste",c:"#15803d",k:["leaves","grass","branches","brush","yard","mulch"],
        edison:{d:"Edison collects leaves, grass clippings and branches under separate regulations. Check the DPW's leaf, grass and branch pages or the Recycle Coach app for your schedule.",x:"Don't mix yard waste into regular trash.",w:"It is collected on its own schedule.",s:"Edison Township DPW",u:ED,ok:1}}
};
const GEN={d:"No official rule covers 3D-printed parts. Best options: reuse them, donate them to a robotics team or makerspace, or put small scraps in regular trash. Curbside recycling programs are built for basic items like bottles and cans, so don't count on them.",x:"Don't put printed parts in recycling bins.",w:"Mixed and printed plastics aren't standard recyclables.",s:"General guidance",u:"",ok:0};
const GENY={d:"Yard waste is collected separately from trash, on a schedule set by your town. Check your town's DPW or Recycle Coach calendar.",x:"Don't mix yard waste into regular trash.",w:"Towns collect it separately.",s:"General guidance",u:"",ok:0};
function rule(r,t){return (t==="Edison"&&r.edison)||r[CTY[t]]||(r===R.plastic?GEN:null)||(r===R.yard?GENY:null)||r.middlesex||GEN}
const find=q=>{q=q.toLowerCase().trim();return q&&Object.values(R).find(r=>r.k.some(k=>q.includes(k)))};
let cur=null;
function show(r,label){
    if(!r){cur=null;$("result").innerHTML='<p class="empty">No match yet. Try another word or pick a category.</p>';return}
    const t=$("town").value,x=rule(r,t);cur={label:label||$("q").value||r.n,cat:r.n,town:t};
    $("result").innerHTML=`<span class="tag" style="background:${r.c}">${r.n}</span> <span class="badge ${x.ok?"g":"y"}">${x.ok?"Official source":"Not officially verified"}</span>
 <h3 style="margin-top:8px">What to do</h3><p>${x.d}</p><p><b>Avoid:</b> ${x.x}</p><p><b>Why:</b> ${x.w}</p>
 <small>${x.u?`Source: <a class="link" href="${x.u}" target="_blank" rel="noopener">${x.s}</a>`:x.s} · ${t} (${CTY[t]==="monmouth"?"Monmouth":"Middlesex"} County) · Checked ${CHECKED}</small>
 <p style="margin-top:16px">${me()?'<button class="btn dark" id="savebtn">Save to my history</button>':'<span class="sm">Log in to save this to your history.</span>'}</p>
 <p class="sm">Rules change. Confirm with your town before you go.</p>`;
    const b=$("savebtn");if(b)b.onclick=()=>{const k="dg_h_"+me().email,hh=S.get(k,[]);hh.unshift({...cur,at:new Date().toLocaleString()});S.set(k,hh);b.outerHTML='<span class="ok">Saved to your dashboard.</span>'};
}
const opts=Object.entries(R).map(([k,r])=>`<option value="${k}">${r.n}</option>`).join("");
$("cat").innerHTML='<option value="">Select…</option>'+opts;
$("q").oninput=e=>show(find(e.target.value));
$("town").onchange=()=>cur&&show(find($("q").value)||R[$("cat").value]||find(cur.label));
$("cat").onchange=e=>show(R[e.target.value],"Photo: "+(R[e.target.value]||{}).n);
const clean=(f,cb)=>{const i=new Image();i.onload=()=>{const c=document.createElement("canvas");c.width=i.width;c.height=i.height;c.getContext("2d").drawImage(i,0,0);cb(c.toDataURL("image/jpeg",.85))};i.src=URL.createObjectURL(f)};
$("photo").onchange=e=>{const f=e.target.files[0];if(!f)return;clean(f,u=>$("droptxt").innerHTML=`<img src="${u}" alt="Your item">`);
    const h=find(f.name.replace(/[._-]/g," ")); /* TODO: backend AI model */ $("pick").style.display=h?"none":"block";show(h||null,"Photo: "+(h?h.n:""))};
$("rphoto").onchange=e=>{const f=e.target.files[0];if(!f)return;clean(f,u=>{$("rtxt").innerHTML=`<img src="${u}" alt="Dumping photo">`;$("priv").style.display="block"})};


/* ---------- ILLEGAL DUMPING REPORTS ---------- */
const DT={bulk:{n:"Furniture / bulk items",c:"#4b5563"},appliances:{n:"Appliances",c:"#4b5563"},tires:{n:"Tires",c:"#0f766e"},construction:{n:"Construction debris",c:"#b45309"},hazard:{n:"Hazardous (paint, chemicals, batteries)",c:"#dc2626",hi:1},electronics:{n:"Electronics",c:"#2563eb"},trash:{n:"Household trash / bags",c:"#4b5563"},other:{n:"Other",c:"#64748b"}};
/* approximate town centers: used for labels and as a fallback if an address can't be geocoded */
const TC={"Carteret":[40.5773,-74.2282],"Edison":[40.5187,-74.4121],"Highland Park":[40.4968,-74.4256],"Metuchen":[40.5432,-74.3632],"New Brunswick":[40.4862,-74.4518],"Old Bridge":[40.4137,-74.3654],"Perth Amboy":[40.5068,-74.2654],"Piscataway":[40.5543,-74.4585],"Sayreville":[40.4593,-74.3607],"South Amboy":[40.4937,-74.2807],"South Plainfield":[40.5793,-74.4113],"Woodbridge":[40.5576,-74.2846],
    "Aberdeen":[40.4150,-74.2220],"Allenhurst":[40.2368,-74.0057],"Asbury Park":[40.2204,-74.0121],"Atlantic Highlands":[40.4084,-74.0343],"Bradley Beach":[40.2015,-74.0121],"Deal":[40.2487,-74.0010],"Fair Haven":[40.3615,-74.0371],"Hazlet":[40.4251,-74.1760],"Highlands":[40.4040,-73.9918],"Interlaken":[40.2237,-74.0121],"Keansburg":[40.4423,-74.1293],"Keyport":[40.4398,-74.1999],"Little Silver":[40.3468,-74.0360],"Loch Arbour":[40.2332,-74.0043],"Long Branch":[40.3043,-73.9924],"Matawan":[40.4143,-74.2282],"Middletown":[40.3946,-74.1171],"Monmouth Beach":[40.3315,-73.9810],"Neptune City":[40.2018,-74.0296],"Neptune Township":[40.2093,-74.0555],"Oceanport":[40.3140,-74.0107],"Red Bank":[40.3471,-74.0643],"Rumson":[40.3748,-74.0046],"Sea Bright":[40.3626,-73.9710],"Union Beach":[40.4482,-74.1707],"West Long Branch":[40.2890,-74.0160]};
$("rtown").innerHTML=$("town").innerHTML;
const dopt=Object.entries(DT).map(([k,r])=>`<option value="${k}">${r.n}</option>`).join("");
$("rcat").innerHTML=dopt;$("mfilter").innerHTML='<option value="">All dumping types</option>'+dopt;
let rphoto=null;
function shrink(f,cb){const i=new Image();i.onload=()=>{const s=Math.min(1,480/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.6))};i.src=URL.createObjectURL(f)}
$("rphoto").onchange=e=>{const f=e.target.files[0];if(!f)return;shrink(f,u=>{rphoto=u;$("rtxt").innerHTML=`<img src="${u}" alt="Dumping photo">`;$("priv").style.display="block"})};
async function geocode(q){try{const c=new AbortController();setTimeout(()=>c.abort(),6000);const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q="+encodeURIComponent(q),{signal:c.signal});const j=await r.json();if(j[0])return[+j[0].lat,+j[0].lon]}catch(e){}return null}
const DEMO=[["bulk","Edison","Oak Tree Rd","Couch and two chairs dumped behind the strip mall.",40.5187,-74.4121],["tires","Woodbridge","Route 9 shoulder","About 12 tires dumped on the grass.",40.5576,-74.2846],["appliances","Perth Amboy","State St lot","Refrigerator left in the lot, doors still attached.",40.5068,-74.2654],["hazard","New Brunswick","Easton Ave alley","Several paint cans and a leaking drum.",40.4862,-74.4518],["construction","Long Branch","Broadway","Pile of drywall and lumber left on the curb.",40.3043,-73.9922]];
if(S.get("dg_rp",null)===null)S.set("dg_rp",DEMO.map((d,i)=>({id:"d"+i,code:"DG-DEMO"+(i+1),cat:d[0],town:d[1],addr:d[2],desc:d[3],note:"",lat:d[4],lng:d[5],at:"Demo data",status:i===2?"resolved":"open",by:null,demo:1})));
$("send").onclick=async()=>{const t=$("rtown").value,a=$("rwhere").value.trim(),d=$("rdesc").value.trim(),e=$("rerr");
    if(!a)return e.textContent="Enter the street address or location.";
    if(!d)return e.textContent="Add a short description.";
    e.textContent="";$("send").disabled=true;$("send").textContent="Locating…";
    let ll=await geocode(a+", "+t+", NJ"),approx=false;if(!ll){ll=TC[t];approx=true}
    const rs=S.get("dg_rp",[]),u=me();
    const code="DG-"+Math.random().toString(36).slice(2,7).toUpperCase();rs.unshift({id:"r"+Date.now(),code,cat:$("rcat").value,town:t,addr:a,desc:d,note:$("rnote").value.trim(),photo:rphoto,lat:ll[0],lng:ll[1],approx,at:new Date().toLocaleString(),status:"open",by:u?u.email:null});
    S.set("dg_rp",rs);
    $("sent").textContent="Thank you. Your report was sent to local officials"+(approx?" (mapped to the town, since the exact address couldn't be located)":"")+". Your tracking code is "+code+". Save it to check on the status.";const mn=S.get("dg_mine",[]);mn.unshift(code);S.set("dg_mine",mn);trackMine();$("sent").style.display="block";
    ["rwhere","rdesc","rnote"].forEach(i=>$(i).value="");rphoto=null;$("rtxt").textContent="📷 Take or upload a picture";$("priv").style.display="none";
    $("send").disabled=false;$("send").textContent="Submit report"};


/* ---------- MAP: public (approximate) + government (full details & status) ---------- */
const ST={new:["New","#dc2626"],noticed:["Noticed","#f59e0b"],progress:["In progress","#0284c7"],resolved:["Resolved","#16a34a"]};
const sk=s=>ST[s]?s:"new";const SL=s=>ST[sk(s)][0];
let gmap,glayer,gov=false,sel=null,tl;
const pubc=v=>Math.round(v*100)/100; /* ~1 km precision for the public */
const pos=r=>gov?[r.lat,r.lng]:[pubc(r.lat),pubc(r.lng)];
function tiles(m){let ok=false;const t=L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19,attribution:"© OpenStreetMap contributors © CARTO"}).addTo(m);
    t.on("tileload",()=>{ok=true});t.on("tileerror",()=>{if(!ok)$("mbanner").style.display="block"})}
$("gtoggle").onclick=()=>{if(gov){gov=false;S.set("dg_gov",false);sel=null;mapView()}else{$("lock").style.display="block";$("gcode").focus()}};
$("gunlock").onclick=()=>{if($("gcode").value.trim()==="GOV2026"){S.set("dg_gov",true);$("gcode").value="";$("gerr").textContent="";$("lock").style.display="none";mapView()}else $("gerr").textContent="Incorrect code."};
function drawMap(){if(!glayer)return[];glayer.clearLayers();
    const f=$("mfilter").value,st=$("mstat").value,tw=$("mtown").value,rs=S.get("dg_rp",[]).filter(r=>(!f||r.cat===f)&&(!st||sk(r.status)===st)&&(!tw||r.town===tw));const pts=[];
    rs.forEach(r=>{const dt=DT[r.cat]||DT.other,s=sk(r.status),hi=dt.hi&&s!=="resolved",c=pos(r);pts.push(c);
        L.circleMarker(c,{radius:hi?15:11,color:hi?"#7f1d1d":"#fff",weight:hi?4:3,fillColor:ST[s][1],fillOpacity:.95,dashArray:gov&&r.approx?"4 3":null}).addTo(glayer).bindTooltip(dt.n).on("click",()=>pick(r.id))});
    $("mcount").textContent=rs.length+" report"+(rs.length===1?"":"s");
    $("glist").innerHTML=rs.map(r=>{const dt=DT[r.cat]||DT.other,s=sk(r.status);return`<div class="li" data-pick="${r.id}"><span class="dot" style="background:${dt.c}"></span><div><b>${esc(dt.n)}</b><small>${gov?esc(r.addr)+", ":""}${esc(r.town)} · ${esc(r.at)}</small></div><span class="badge" style="background:${ST[s][1]}">${ST[s][0]}</span></div>`}).join("")||'<p class="empty" style="margin-top:20px">No reports match.</p>';
    return pts}
document.addEventListener("click",e=>{const t=e.target.closest("[data-pick]");if(t)pick(t.dataset.pick)});
function pick(id){const r=S.get("dg_rp",[]).find(x=>x.id===id);if(!r)return;sel=id;
    const dt=DT[r.cat]||DT.other,s=sk(r.status),hi=dt.hi&&s!=="resolved";
    if(gmap)gmap.panTo(pos(r));
    const head=`<span class="tag" style="background:${dt.c}">${esc(dt.n)}</span> <span class="badge" style="background:${ST[s][1]}">${ST[s][0]}</span>${hi?' <span class="badge" style="background:#7f1d1d">High priority</span>':""}${r.demo?' <span class="badge y">Demo</span>':""}`;
    if(!gov){$("gpanel").innerHTML=`${head}<h3 style="margin-top:10px">${esc(r.town)}</h3><p class="sm">Approximate area, shown to protect privacy.</p><p><b>Status:</b> ${ST[s][0]}${r.stAt?" · updated "+esc(r.stAt):""}</p><p><b>Reported:</b> ${esc(r.at)}</p><p class="sm">Photos and full details are only visible to local officials. To report new dumping, use the Report tab.</p>`;return}
    $("gpanel").innerHTML=`${head}${r.photo?`<img class="photo" src="${r.photo}" alt="Reported dumping">`:'<p class="sm" style="margin-top:10px">No photo uploaded.</p>'}
 <h3>${esc(r.addr)}, ${esc(r.town)}</h3><p class="sm">${r.approx?"Approximate (town level)":"Located: "+r.lat.toFixed(5)+", "+r.lng.toFixed(5)} · <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}">Directions</a></p>
 <p><b>Description:</b> ${esc(r.desc)}</p>${r.note?`<p><b>Notes:</b> ${esc(r.note)}</p>`:""}<small class="sm">Filed ${esc(r.at)}</small>
 <label>Update status</label><div class="chips" id="pchips">${Object.entries(ST).map(([k,v])=>`<button type="button" class="chip2${k===s?" on":""}" data-st="${k}" style="${k===s?"background:"+v[1]:""}">${v[0]}</button>`).join("")}</div>
 <label for="pgn">Staff note (not public)</label><textarea id="pgn" rows="2">${esc(r.gnote||"")}</textarea>
 <label for="ppm">Message to the reporter (shown when they track the report)</label><textarea id="ppm" rows="2" placeholder="e.g. Crew scheduled for Friday">${esc(r.pmsg||"")}</textarea>
 <p class="ok" id="psaved" style="display:none">Saved.</p><button class="btn dark full" id="psave" style="margin-top:10px">Save update</button>`;
    let ns=s;
    $("pchips").onclick=e=>{const b=e.target.closest("[data-st]");if(!b)return;ns=b.dataset.st;document.querySelectorAll("#pchips .chip2").forEach(x=>{const on=x.dataset.st===ns;x.classList.toggle("on",on);x.style.background=on?ST[ns][1]:""})};
    $("psave").onclick=()=>{const rs=S.get("dg_rp",[]),x=rs.find(q=>q.id===id);x.status=ns;x.gnote=$("pgn").value.trim();x.pmsg=$("ppm").value.trim();x.stAt=new Date().toLocaleDateString();S.set("dg_rp",rs);drawMap();pick(id);$("psaved").style.display="block"}}
function mapView(){gov=S.get("dg_gov",false);$("gtoggle").textContent=gov?"Exit government view":"🔒 Government sign-in";
    if(typeof L==="undefined"){$("gmap").innerHTML='<p class="empty" style="padding:30px">Map library failed to load. Check your internet connection.</p>';return}
    let first=false;if(!gmap){gmap=L.map("gmap").setView([40.45,-74.2],10);tiles(gmap);glayer=L.layerGroup().addTo(gmap);tl=L.layerGroup(Object.entries(TC).map(([n,c])=>L.circleMarker(c,{radius:3,color:"#94a3b8",weight:1,fillColor:"#cbd5e1",fillOpacity:1,interactive:false}).bindTooltip(n,{permanent:true,direction:"right",offset:[4,0]})));first=true}
    gmap.invalidateSize();const pts=drawMap();if(first&&pts.length)gmap.fitBounds(pts,{padding:[50,50],maxZoom:13});
    if(sel)pick(sel);else $("gpanel").innerHTML='<p class="empty">'+(gov?"Click a pin or a report in the list to see its photo, details and update its status.":"Click a pin or a report in the list to see what was reported and its status.")+'</p>'}
$("tltoggle").onclick=()=>{if(!gmap)return;const on=gmap.hasLayer(tl);on?gmap.removeLayer(tl):tl.addTo(gmap);$("tltoggle").textContent="Town labels: "+(on?"off":"on")};
$("mtown").innerHTML='<option value="">All towns</option>'+$("town").innerHTML;$("mtown").onchange=drawMap;$("mfilter").onchange=drawMap;$("mstat").onchange=drawMap;


const trackCard=r=>{const dt=DT[r.cat]||DT.other,s=sk(r.status);return`<div class="item"><span class="badge" style="background:${ST[s][1]}">${ST[s][0]}</span> <b>${esc(dt.n)}</b> · ${esc(r.town)}<small>${esc(r.code||"")} · filed ${esc(r.at)}${r.stAt?" · updated "+esc(r.stAt):""}</small>${r.pmsg?`<small>Update from officials: ${esc(r.pmsg)}</small>`:""}</div>`};
function trackMine(){const rs=S.get("dg_rp",[]),mine=S.get("dg_mine",[]).map(c=>rs.find(r=>r.code===c)).filter(Boolean);
    $("tmine").innerHTML=mine.length?'<p class="sm" style="margin-top:16px">Reports filed from this device</p>'+mine.map(trackCard).join(""):""}
$("tgo").onclick=()=>{const c=$("tcode").value.trim().toUpperCase(),r=S.get("dg_rp",[]).find(x=>x.code===c);$("tres").innerHTML=r?trackCard(r):'<p class="err">No report found with that code.</p>'};


/* ---------- dashboard ---------- */
function dash(){const u=me();if(!u)return;
    $("dname").textContent=u.email.split("@")[0];
    $("dloc").textContent=[u.city,u.county&&u.county+" County",u.state].filter(Boolean).join(", ");
    const h=S.get("dg_h_"+u.email,[]),rp=S.get("dg_rp",[]).filter(r=>r.by===u.email);
    $("st1").textContent=h.length;$("st2").textContent=rp.length;$("st3").textContent=rp.filter(r=>r.status==="resolved").length;
    $("myrep").innerHTML=rp.length?rp.map(r=>`<div class="item"><span class="badge" style="background:${ST[sk(r.status)][1]}">${SL(r.status)}</span> <b>${esc((DT[r.cat]||{}).n||r.cat)}</b><br>${esc(r.addr)}<small>${esc(r.town||"")} · ${esc(r.at)}${r.code?" · "+esc(r.code):""}</small>${r.pmsg?`<small>Update from officials: ${esc(r.pmsg)}</small>`:""}${r.note?`<small>“${esc(r.note)}”</small>`:""}</div>`).join(""):'<p class="empty">No reports yet.</p>';
    $("hist").innerHTML=h.length?h.map(i=>`<div class="item"><b>${esc(i.label)}</b> → ${esc(i.cat)}<small>${esc(i.town)} · ${esc(i.at)}</small></div>`).join(""):'<p class="empty">Save a result from the Identify page and it will show up here.</p>';
}
$("logout").onclick=()=>{S.del("dg_s");go("home")};


/* ---------- captcha (demo: replace with reCAPTCHA / hCaptcha) ---------- */
const caps={};
function cap(id){const ch="ABCDEFGHJKMNPQRSTUVWXYZ23456789";caps[id]=Array.from({length:5},()=>ch[Math.random()*ch.length|0]).join("");$(id).textContent=caps[id]}

/* ---------- auth (browser-only demo accounts) ---------- */
const emailOk=v=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
function signedIn(email){S.set("dg_s",email);const u=me();if(u&&CTY[u.city])$("town").value=u.city;go("dash")}
$("lgo").onclick=async()=>{const e=$("lerr"),em=$("le").value.trim().toLowerCase();
    if(!emailOk(em))return e.textContent="Enter a valid email.";
    if(!$("lp").value)return e.textContent="Enter your password.";
    if($("lci").value.trim().toUpperCase()!==caps.lcap){cap("lcap");$("lci").value="";return e.textContent="Captcha didn't match. Try the new code."}
    const u=S.get("dg_u",[]).find(x=>x.email===em);
    if(!u)return e.textContent="No account with that email. Create one below.";
    if(u.pw!==await hash($("lp").value)){cap("lcap");$("lci").value="";return e.textContent="Wrong password."}
    e.textContent="";$("lp").value="";signedIn(em)};
$("fgo").onclick=()=>{$("ferr").textContent="";$("fok").textContent="";
    if(!emailOk($("fe").value))return $("ferr").textContent="Enter a valid email.";
    $("fok").textContent="If an account exists, a reset link is on its way."};
let sentCode=null;
$("scode").onclick=()=>{if(!emailOk($("se").value))return $("serr").textContent="Enter a valid email first.";
    $("serr").textContent="";sentCode=String(100000+Math.random()*900000|0);$("cmsg").textContent="Code sent. (Demo code: "+sentCode+")"};
$("sgo").onclick=async()=>{const e=$("serr"),em=$("se").value.trim().toLowerCase();
    if(!emailOk(em))return e.textContent="Enter a valid email.";
    if(S.get("dg_u",[]).some(x=>x.email===em))return e.textContent="That email already has an account. Log in instead.";
    if(!sentCode||$("sc").value!==sentCode)return e.textContent="Verification code is missing or incorrect.";
    if($("sp").value.length<8)return e.textContent="Password must be at least 8 characters.";
    if($("sp").value!==$("sp2").value)return e.textContent="Passwords don't match.";
    if(!$("sci").value.trim())return e.textContent="Enter your city or town.";
    const us=S.get("dg_u",[]);us.push({email:em,pw:await hash($("sp").value),country:$("sco").value,state:$("sst").value,county:$("sct").value,city:$("sci").value.trim()});
    S.set("dg_u",us);e.textContent="";sentCode=null;signedIn(em)};
$("states").innerHTML="Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Ohio,Oklahoma,Oregon,Pennsylvania,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming".split(",").map(s=>`<option>${s}</option>`).join("");
const nj="Atlantic,Bergen,Burlington,Camden,Cape May,Cumberland,Essex,Gloucester,Hudson,Hunterdon,Mercer,Middlesex,Monmouth,Morris,Ocean,Passaic,Salem,Somerset,Sussex,Union,Warren".split(",");
const cty=()=>{$("counties").innerHTML=$("sst").value==="New Jersey"?opt(nj):""};
$("sst").oninput=cty;cty();
go(location.hash.slice(1)||"home");/* ---------- navigation ---------- */
function go(v){
    if(v==="dash"&&!me())v="login";
    if(!$("v-"+v))v="home";
    document.querySelectorAll(".view").forEach(e=>e.classList.toggle("on",e.id==="v-"+v));
    document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("act",a.dataset.go===v||(v==="dash"&&a.id==="pill")));
    const u=me();$("pill").textContent=u?"Dashboard":"Log in";$("pill").dataset.go=u?"dash":"login";
    history.replaceState(null,"","#"+v);scrollTo(0,0);navStyle();
    if(v==="login")cap("lcap");if(v==="dash")dash();if(v==="report")trackMine();
    if(v==="map")setTimeout(mapView,60);
}
function navStyle(){$("nav").classList.toggle("solid",!$("v-home").classList.contains("on")||scrollY>innerHeight-120)}
document.addEventListener("click",e=>{const t=e.target.closest("[data-go]");if(t){e.preventDefault();go(t.dataset.go)}const c=e.target.closest("[data-cap]");if(c)cap(c.dataset.cap)});
addEventListener("scroll",navStyle);

