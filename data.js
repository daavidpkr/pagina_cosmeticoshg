(function(){
'use strict';
const STORAGE_KEY='cosmeticosHG.catalog.v1';
const SCHEMA_VERSION=7;
const MIGRATION_BACKUP_KEY='cosmeticosHG.catalog.backup.v6';
const now='2026-08-23T00:00:00.000Z';
const defaultCategories=[
  {id:'cat-unas',name:'Uñas',slug:'unas',previousSlugs:['cat-unas'],active:true,order:1,description:'Color, acabado y creatividad',design:'nails',image:'',color:'',createdAt:now,updatedAt:now},
  {id:'cat-maquillaje',name:'Maquillaje',slug:'maquillaje',previousSlugs:['cat-maquillaje'],active:true,order:2,description:'Realza lo que te hace única',design:'makeup',image:'',color:'',createdAt:now,updatedAt:now},
  {id:'cat-cuidado',name:'Cuidado personal',slug:'cuidado-personal',previousSlugs:['cat-cuidado'],active:true,order:3,description:'Bienestar para todos los días',design:'care',image:'',color:'',createdAt:now,updatedAt:now}
];
const defaultProducts=[
  {id:'prod-esmaltes',name:'Esmaltes esenciales',slug:'esmaltes-esenciales',previousSlugs:['prod-esmaltes'],categoryId:'cat-unas',brand:'Cosméticos HG',shortDescription:'Acabados y tonos para expresar tu estilo.',fullDescription:'Opciones de color para complementar distintos estilos y ocasiones.',benefits:[],usage:'',presentation:'',variants:[],price:null,priceOnRequest:true,image:'',visual:'wine',active:true,featured:true,bestSeller:true,isNew:false,availability:'disponible',order:1,createdAt:now,updatedAt:now},
  {id:'prod-labiales',name:'Labiales de impacto',slug:'labiales-de-impacto',previousSlugs:['prod-labiales'],categoryId:'cat-maquillaje',brand:'Cosméticos HG',shortDescription:'Color que acompaña tu ritmo y personalidad.',fullDescription:'Alternativas para realzar los labios y completar tu maquillaje cotidiano.',benefits:[],usage:'',presentation:'',variants:[],price:null,priceOnRequest:true,image:'',visual:'rose',active:true,featured:true,bestSeller:false,isNew:true,availability:'disponible',order:2,createdAt:now,updatedAt:now},
  {id:'prod-hidratacion',name:'Ritual de hidratación',slug:'ritual-de-hidratacion',previousSlugs:['prod-hidratacion'],categoryId:'cat-cuidado',brand:'Cosméticos HG',shortDescription:'Texturas pensadas para el cuidado cotidiano.',fullDescription:'Productos para sumar hidratación y bienestar a tu rutina diaria.',benefits:[],usage:'',presentation:'',variants:[],price:null,priceOnRequest:true,image:'',visual:'cream',active:true,featured:true,bestSeller:false,isNew:false,availability:'disponible',order:3,createdAt:now,updatedAt:now},
  {id:'prod-brillo',name:'Brillo que perdura',slug:'brillo-que-perdura',previousSlugs:['prod-brillo'],categoryId:'cat-unas',brand:'Cosméticos HG',shortDescription:'El toque final para una apariencia impecable.',fullDescription:'Acabados que ayudan a realzar el color y completar tu manicura.',benefits:[],usage:'',presentation:'',variants:[],price:null,priceOnRequest:true,image:'',visual:'gold',active:true,featured:false,bestSeller:false,isNew:false,availability:'proximo',order:4,createdAt:now,updatedAt:now}
];
const defaultNeeds=['Uñas frágiles','Hidratación','Duración','Brillo','Cuidado diario','Uso profesional'].map((name,index)=>({id:`need-${index+1}`,name,slug:'',previousSlugs:[],active:true,description:''}));
const defaultDelivery={timezone:'America/Guayaquil',active:true,serviceDays:[],startTime:'',endTime:'',breaks:[],deliveryHours:'',pickupHours:'',closedDates:[],specialDates:[],insideMessage:'Disponible ahora. La confirmación se realiza por WhatsApp.',outsideMessage:'Fuera del horario de atención. Puedes enviar tu consulta y responderemos en el próximo horario disponible.',generalConditions:''};
const defaultSelection={enabled:true,maxProducts:10,requireZone:true,includePrices:true,includeAvailability:true,includeLinks:true,initialMessage:'Hola, deseo consultar los siguientes productos de Cosméticos HG:',finalMessage:'¿Podrían ayudarme a confirmar disponibilidad, precio final y condiciones de entrega?'};
const defaults={schemaVersion:SCHEMA_VERSION,products:defaultProducts,categories:defaultCategories,needs:defaultNeeds,promotions:[],combos:[],deliveryZones:[],delivery:defaultDelivery,selection:defaultSelection,banner:{id:'banner-main',version:1,active:false,title:'',subtitle:'',type:'info',style:'wine',buttonText:'',buttonUrl:'',startDate:'',endDate:'',dismissible:true,pages:[],priority:1,order:1},importHistory:[],settings:{currency:'USD',whatsappNumber:'',whatsappMessage:'Hola, deseo recibir información sobre los productos de Cosméticos HG.',whatsappFloatingEnabled:true,waitlistEnabled:true,waitlistForSoldOut:true,waitlistForComingSoon:true,waitlistMessage:'Hola, me gustaría recibir un aviso cuando el producto vuelva a estar disponible.',promotionMessage:'Hola, deseo consultar esta promoción.',comboMessage:'Hola, deseo consultar este combo.',adviceMessage:'Hola, deseo recibir asesoría.'}};
const clone=value=>JSON.parse(JSON.stringify(value));
const cleanName=value=>String(value||'').trim();
const normalize=value=>cleanName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slugify=value=>normalize(value).replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'elemento';
const uniqueSlug=(value,taken,ignore='')=>{const base=slugify(value);let candidate=base,index=2;while(taken.has(candidate)&&candidate!==ignore)candidate=`${base}-${index++}`;taken.add(candidate);return candidate};
const stringList=value=>Array.isArray(value)?[...new Set(value.map(cleanName).filter(Boolean))]:cleanName(value).split(/\r?\n|,/).map(cleanName).filter(Boolean);
const getInventoryStatus=product=>{if(product.inventoryMode!=='quantity')return ['disponible','pocas','agotado','proximo'].includes(product.availability)?product.availability:'disponible';if(product.comingSoon)return'proximo';const stock=Math.max(0,Number(product.stockQuantity)||0),limit=Math.max(0,Number(product.lowStockThreshold)||0);if(stock===0)return'agotado';return stock<=limit?'pocas':'disponible'};
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

function migrate(source){
  if(!source||!Array.isArray(source.products)||!Array.isArray(source.categories))return null;
  const stamp=new Date().toISOString(),seenNames=new Set(),seenIds=new Set(),categorySlugs=new Set();
  const categories=[];
  source.categories.forEach((raw,index)=>{
    const name=cleanName(typeof raw==='string'?raw:raw.name);if(!name||seenNames.has(normalize(name)))return;
    let id=typeof raw==='object'&&cleanName(raw.id)?cleanName(raw.id):uid('cat');while(seenIds.has(id))id=uid('cat');
    seenNames.add(normalize(name));seenIds.add(id);
    const original=defaultCategories.find(c=>c.id===id),rawSlug=cleanName(raw.slug),slug=uniqueSlug(rawSlug||name,categorySlugs),previousSlugs=stringList(raw.previousSlugs);[id,rawSlug,original?.slug].filter(alias=>alias&&slugify(alias)!==slug).forEach(alias=>previousSlugs.push(slugify(alias)));
    categories.push({id,name,slug,previousSlugs:[...new Set(previousSlugs)],active:raw.active!==false,order:Number(raw.order)||index+1,description:cleanName(raw.description)||original?.description||'Descubre opciones para tu estilo',design:cleanName(raw.design)||original?.design||'neutral',image:cleanName(raw.image),color:cleanName(raw.color),createdAt:raw.createdAt||stamp,updatedAt:raw.updatedAt||stamp});
  });
  const categoryByName=name=>categories.find(c=>normalize(c.name)===normalize(name));
  const productSlugs=new Set(),products=source.products.map((raw,index)=>{
    let categoryId=cleanName(raw.categoryId);
    if(!categories.some(c=>c.id===categoryId)){
      const legacyName=cleanName(raw.category||raw.categoryName||categoryId);
      let match=categoryByName(legacyName);
      if(!match&&legacyName){match={id:uid('cat'),name:legacyName,active:true,order:categories.length+1,description:'Descubre opciones para tu estilo',design:'neutral',image:'',color:'',createdAt:stamp,updatedAt:stamp};categories.push(match)}
      categoryId=match?.id||'';
    }
    const id=cleanName(raw.id)||uid('prod'),name=cleanName(raw.name)||`Producto ${index+1}`,rawSlug=cleanName(raw.slug),slug=uniqueSlug(rawSlug||name,productSlugs),previousSlugs=stringList(raw.previousSlugs),original=defaultProducts.find(p=>p.id===id);[id,rawSlug,original?.slug].filter(alias=>alias&&slugify(alias)!==slug).forEach(alias=>previousSlugs.push(slugify(alias)));
    const faqIds=new Set(),faqs=(Array.isArray(raw.faqs)?raw.faqs:[]).map((faq,faqIndex)=>{let faqId=cleanName(faq.id)||uid('faq');while(faqIds.has(faqId))faqId=uid('faq');faqIds.add(faqId);return{id:faqId,question:cleanName(faq.question),answer:cleanName(faq.answer),active:faq.active!==false,order:Number(faq.order)||faqIndex+1}}).filter(faq=>faq.question&&faq.answer),inventoryMode=raw.inventoryMode==='quantity'?'quantity':'manual';
    const publicationStatus=['draft','published','archived'].includes(raw.publicationStatus)?raw.publicationStatus:(raw.active===false?'draft':'published');
    return {...raw,id,name,slug,previousSlugs:[...new Set(previousSlugs)],categoryId,sku:cleanName(raw.sku||raw.code),needs:stringList(raw.needs),budgetLevel:cleanName(raw.budgetLevel),seo:{title:cleanName(raw.seo?.title),description:cleanName(raw.seo?.description),shareText:cleanName(raw.seo?.shareText)},brand:cleanName(raw.brand),shortDescription:cleanName(raw.shortDescription||raw.description),fullDescription:cleanName(raw.fullDescription||(typeof raw.benefits==='string'?raw.benefits:'')),benefits:stringList(raw.benefits),usage:cleanName(raw.usage||raw.recommendation),presentation:cleanName(raw.presentation||raw.content),variants:stringList(raw.variants||raw.tones),faqs,inventoryMode,stockQuantity:Math.max(0,Math.floor(Number(raw.stockQuantity)||0)),lowStockThreshold:Math.max(0,Math.floor(Number(raw.lowStockThreshold)||0)),comingSoon:!!raw.comingSoon,price:raw.price===''||raw.price==null?null:Number(raw.price),priceOnRequest:raw.priceOnRequest!==false,image:cleanName(raw.image),visual:cleanName(raw.visual)||'neutral',active:raw.active!==false,featured:!!raw.featured,bestSeller:!!raw.bestSeller,isNew:!!raw.isNew,availability:['disponible','pocas','agotado','proximo'].includes(raw.availability)?raw.availability:'disponible',publicationStatus,publishedAt:publicationStatus==='published'?(raw.publishedAt||raw.updatedAt||raw.createdAt||stamp):null,importMeta:raw.importMeta&&typeof raw.importMeta==='object'?raw.importMeta:null,order:Number(raw.order)||index+1,createdAt:raw.createdAt||stamp,updatedAt:raw.updatedAt||stamp};
  });
  const needSlugs=new Set(),needs=(Array.isArray(source.needs)?source.needs:defaultNeeds).map((raw,index)=>{const name=cleanName(raw.name)||`Necesidad ${index+1}`,slug=uniqueSlug(raw.slug||name,needSlugs);return{id:cleanName(raw.id)||uid('need'),name,slug,previousSlugs:stringList(raw.previousSlugs),active:raw.active!==false,description:cleanName(raw.description)}}),promotions=Array.isArray(source.promotions)?source.promotions.map((p,index)=>{const publicationStatus=['draft','published','archived'].includes(p.publicationStatus)?p.publicationStatus:(p.active===false?'draft':'published');return{...p,id:cleanName(p.id)||uid('promo'),name:cleanName(p.name)||`Promoción ${index+1}`,targetType:p.targetType==='combo'?'combo':'product',targetId:cleanName(p.targetId),promoPrice:p.promoPrice==null?null:Number(p.promoPrice),text:cleanName(p.text),startDate:cleanName(p.startDate),endDate:cleanName(p.endDate),active:p.active!==false,showScheduled:!!p.showScheduled,publicationStatus,createdAt:p.createdAt||stamp,updatedAt:p.updatedAt||stamp,publishedAt:publicationStatus==='published'?(p.publishedAt||stamp):null,order:Number(p.order)||index+1}}):[],combos=Array.isArray(source.combos)?source.combos.map((c,index)=>({...c,id:cleanName(c.id)||uid('combo'),name:cleanName(c.name)||`Combo ${index+1}`,slug:slugify(c.slug||c.name||`combo-${index+1}`),previousSlugs:stringList(c.previousSlugs),image:cleanName(c.image),description:cleanName(c.description),productIds:stringList(c.productIds),type:['combo','rutina','recomendacion'].includes(c.type)?c.type:'combo',specialPrice:c.specialPrice==null?null:Number(c.specialPrice),benefits:stringList(c.benefits),usageOrder:stringList(c.usageOrder),needId:cleanName(c.needId),active:c.active!==false,featured:!!c.featured,whatsappText:cleanName(c.whatsappText),seo:{title:cleanName(c.seo?.title),description:cleanName(c.seo?.description)}})):[],banner={...defaults.banner,...(source.banner||{}),order:Number(source.banner?.order)||1};
  const zoneNames=new Set(),zoneSlugs=new Set(),zoneIds=new Set(),deliveryZones=(Array.isArray(source.deliveryZones)?source.deliveryZones:[]).map((z,index)=>{const name=cleanName(z.name);if(!name||zoneNames.has(normalize(name)))return null;zoneNames.add(normalize(name));let id=cleanName(z.id)||uid('zone');while(zoneIds.has(id))id=uid('zone');zoneIds.add(id);const slug=uniqueSlug(z.slug||name,zoneSlugs);return{id,name,slug,sectors:stringList(z.sectors),deliveryType:['entrega','retiro','ambos'].includes(z.deliveryType)?z.deliveryType:'entrega',deliveryCost:z.deliveryCost===''||z.deliveryCost==null?null:Number(z.deliveryCost),minimumPurchase:z.minimumPurchase===''||z.minimumPurchase==null?null:Number(z.minimumPurchase),estimatedTime:cleanName(z.estimatedTime),availableDays:stringList(z.availableDays),conditions:cleanName(z.conditions),active:z.active!==false,order:Number(z.order)||index+1}}).filter(Boolean);
  const delivery={...defaultDelivery,...(source.delivery||{}),serviceDays:stringList(source.delivery?.serviceDays),breaks:Array.isArray(source.delivery?.breaks)?source.delivery.breaks:[],closedDates:stringList(source.delivery?.closedDates),specialDates:Array.isArray(source.delivery?.specialDates)?source.delivery.specialDates:[]};
  const selection={...defaultSelection,...(source.selection||{}),maxProducts:Math.min(10,Math.max(1,Number(source.selection?.maxProducts)||10))};
  return {schemaVersion:SCHEMA_VERSION,categories,products,needs,promotions,combos,deliveryZones,delivery,selection,banner,importHistory:Array.isArray(source.importHistory)?source.importHistory.slice(-20):[],settings:{...defaults.settings,...(source.settings||{})}};
}
function valid(data){return !!data&&data.schemaVersion===SCHEMA_VERSION&&Array.isArray(data.products)&&Array.isArray(data.categories)&&Array.isArray(data.needs)&&Array.isArray(data.promotions)&&Array.isArray(data.combos)&&Array.isArray(data.deliveryZones)&&data.delivery&&data.selection&&data.categories.every(c=>c.id&&c.name&&c.slug)&&data.products.every(p=>p.id&&p.name&&p.slug&&typeof p.categoryId==='string')}
function persist(data,notify=true){
  const migrated=migrate(data);if(!valid(migrated))throw new Error('Los datos no cumplen el esquema esperado.');
  migrated.products.forEach(product=>{if(product.importMeta&&!product.image)product.image=null});
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated))}catch(error){throw new Error(error.name==='QuotaExceededError'?'No hay espacio suficiente en localStorage. Reduce el tamaño de las imágenes.':'No fue posible guardar los datos.')}
  if(notify)window.dispatchEvent(new CustomEvent('hg:datachange',{detail:clone(migrated)}));return migrated;
}
function contextView(data){
  data.products.forEach(product=>{if(product.importMeta&&!product.image)product.image=null});
  if(/^#panelcontrol(?:\/|$)/i.test(location.hash))return data;
  data.products.forEach(product=>{if(product.publicationStatus!=='published')product.active=false});
  data.promotions.forEach(promotion=>{if(promotion.publicationStatus!=='published')promotion.active=false});
  return data;
}
function load(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const parsed=JSON.parse(raw),migrated=migrate(parsed);if(valid(migrated)){if(parsed.schemaVersion!==SCHEMA_VERSION){if(!localStorage.getItem(MIGRATION_BACKUP_KEY))localStorage.setItem(MIGRATION_BACKUP_KEY,raw);localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));}return contextView(migrated)}}}catch(_){/* No se elimina la información: solo se usa el catálogo inicial si no puede leerse. */}
  return contextView(persist(clone(defaults),false));
}
function getCategories(){return clone(load().categories)}
function getProducts(){return clone(load().products)}
function saveCategories(categories){const data=load();data.categories=clone(categories);return persist(data).categories}
function saveProducts(products){const data=load();data.products=clone(products);return persist(data).products}
const findCategory=(value,data=load())=>data.categories.find(c=>c.id===value||c.slug===slugify(value)||c.previousSlugs?.includes(slugify(value)));
const findProduct=(value,data=load())=>data.products.find(p=>p.id===value||p.slug===slugify(value)||p.previousSlugs?.includes(slugify(value)));
const findNeed=(value,data=load())=>data.needs.find(n=>n.id===value||n.slug===slugify(value)||n.previousSlugs?.includes(slugify(value)));
const whatsappUrl=(message,number='')=>{const digits=String(number||'').replace(/\D/g,'');return digits?`https://wa.me/${digits}?text=${encodeURIComponent(message)}`:''};
window.HGStore={STORAGE_KEY,SCHEMA_VERSION,MIGRATION_BACKUP_KEY,defaults:clone(defaults),clone,valid,dataIsValid:value=>valid(migrate(value)),migrate,load,save:persist,getCategories,getProducts,saveCategories,saveProducts,uid,slugify,uniqueSlug,stringList,getInventoryStatus,findCategory,findProduct,findNeed,whatsappUrl,isPublished:item=>item?.publicationStatus==='published'&&item.active!==false,reset:()=>persist(clone(defaults))};
})();
