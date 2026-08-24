(function(){
'use strict';
const STORAGE_KEY='cosmeticosHG.catalog.v1';
const SCHEMA_VERSION=2;
const now='2026-08-23T00:00:00.000Z';
const defaultCategories=[
  {id:'cat-unas',name:'Uñas',active:true,order:1,description:'Color, acabado y creatividad',design:'nails',image:'',color:'',createdAt:now,updatedAt:now},
  {id:'cat-maquillaje',name:'Maquillaje',active:true,order:2,description:'Realza lo que te hace única',design:'makeup',image:'',color:'',createdAt:now,updatedAt:now},
  {id:'cat-cuidado',name:'Cuidado personal',active:true,order:3,description:'Bienestar para todos los días',design:'care',image:'',color:'',createdAt:now,updatedAt:now}
];
const defaultProducts=[
  {id:'prod-esmaltes',name:'Esmaltes esenciales',categoryId:'cat-unas',brand:'Cosméticos HG',shortDescription:'Acabados y tonos para expresar tu estilo.',fullDescription:'Opciones de color para complementar distintos estilos y ocasiones.',price:null,priceOnRequest:true,image:'',visual:'wine',active:true,featured:true,bestSeller:true,isNew:false,availability:'disponible',order:1,createdAt:now,updatedAt:now},
  {id:'prod-labiales',name:'Labiales de impacto',categoryId:'cat-maquillaje',brand:'Cosméticos HG',shortDescription:'Color que acompaña tu ritmo y personalidad.',fullDescription:'Alternativas para realzar los labios y completar tu maquillaje cotidiano.',price:null,priceOnRequest:true,image:'',visual:'rose',active:true,featured:true,bestSeller:false,isNew:true,availability:'disponible',order:2,createdAt:now,updatedAt:now},
  {id:'prod-hidratacion',name:'Ritual de hidratación',categoryId:'cat-cuidado',brand:'Cosméticos HG',shortDescription:'Texturas pensadas para el cuidado cotidiano.',fullDescription:'Productos para sumar hidratación y bienestar a tu rutina diaria.',price:null,priceOnRequest:true,image:'',visual:'cream',active:true,featured:true,bestSeller:false,isNew:false,availability:'disponible',order:3,createdAt:now,updatedAt:now},
  {id:'prod-brillo',name:'Brillo que perdura',categoryId:'cat-unas',brand:'Cosméticos HG',shortDescription:'El toque final para una apariencia impecable.',fullDescription:'Acabados que ayudan a realzar el color y completar tu manicura.',price:null,priceOnRequest:true,image:'',visual:'gold',active:true,featured:false,bestSeller:false,isNew:false,availability:'proximo',order:4,createdAt:now,updatedAt:now}
];
const defaults={schemaVersion:SCHEMA_VERSION,products:defaultProducts,categories:defaultCategories,settings:{currency:'USD'}};
const clone=value=>JSON.parse(JSON.stringify(value));
const cleanName=value=>String(value||'').trim();
const normalize=value=>cleanName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

function migrate(source){
  if(!source||!Array.isArray(source.products)||!Array.isArray(source.categories))return null;
  const stamp=new Date().toISOString(),seenNames=new Set(),seenIds=new Set();
  const categories=[];
  source.categories.forEach((raw,index)=>{
    const name=cleanName(typeof raw==='string'?raw:raw.name);if(!name||seenNames.has(normalize(name)))return;
    let id=typeof raw==='object'&&cleanName(raw.id)?cleanName(raw.id):uid('cat');while(seenIds.has(id))id=uid('cat');
    seenNames.add(normalize(name));seenIds.add(id);
    const original=defaultCategories.find(c=>c.id===id);
    categories.push({id,name,active:raw.active!==false,order:Number(raw.order)||index+1,description:cleanName(raw.description)||original?.description||'Descubre opciones para tu estilo',design:cleanName(raw.design)||original?.design||'neutral',image:cleanName(raw.image),color:cleanName(raw.color),createdAt:raw.createdAt||stamp,updatedAt:raw.updatedAt||stamp});
  });
  const categoryByName=name=>categories.find(c=>normalize(c.name)===normalize(name));
  const products=source.products.map((raw,index)=>{
    let categoryId=cleanName(raw.categoryId);
    if(!categories.some(c=>c.id===categoryId)){
      const legacyName=cleanName(raw.category||raw.categoryName||categoryId);
      let match=categoryByName(legacyName);
      if(!match&&legacyName){match={id:uid('cat'),name:legacyName,active:true,order:categories.length+1,description:'Descubre opciones para tu estilo',design:'neutral',image:'',color:'',createdAt:stamp,updatedAt:stamp};categories.push(match)}
      categoryId=match?.id||'';
    }
    return {...raw,id:cleanName(raw.id)||uid('prod'),name:cleanName(raw.name)||`Producto ${index+1}`,categoryId,brand:cleanName(raw.brand),shortDescription:cleanName(raw.shortDescription||raw.description),fullDescription:cleanName(raw.fullDescription||raw.benefits),price:raw.price===''||raw.price==null?null:Number(raw.price),priceOnRequest:raw.priceOnRequest!==false,image:cleanName(raw.image),visual:cleanName(raw.visual)||'neutral',active:raw.active!==false,featured:!!raw.featured,bestSeller:!!raw.bestSeller,isNew:!!raw.isNew,availability:['disponible','agotado','proximo'].includes(raw.availability)?raw.availability:'disponible',order:Number(raw.order)||index+1,createdAt:raw.createdAt||stamp,updatedAt:raw.updatedAt||stamp};
  });
  return {schemaVersion:SCHEMA_VERSION,categories,products,settings:{...defaults.settings,...(source.settings||{})}};
}
function valid(data){return !!data&&data.schemaVersion===SCHEMA_VERSION&&Array.isArray(data.products)&&Array.isArray(data.categories)&&data.categories.every(c=>c.id&&c.name)&&data.products.every(p=>p.id&&p.name&&typeof p.categoryId==='string')}
function persist(data,notify=true){
  const migrated=migrate(data);if(!valid(migrated))throw new Error('Los datos no cumplen el esquema esperado.');
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated))}catch(error){throw new Error(error.name==='QuotaExceededError'?'No hay espacio suficiente en localStorage. Reduce el tamaño de las imágenes.':'No fue posible guardar los datos.')}
  if(notify)window.dispatchEvent(new CustomEvent('hg:datachange',{detail:clone(migrated)}));return migrated;
}
function load(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const parsed=JSON.parse(raw),migrated=migrate(parsed);if(valid(migrated)){if(parsed.schemaVersion!==SCHEMA_VERSION)localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated}}}catch(_){/* No se elimina la información: solo se usa el catálogo inicial si no puede leerse. */}
  return persist(clone(defaults),false);
}
function getCategories(){return clone(load().categories)}
function getProducts(){return clone(load().products)}
function saveCategories(categories){const data=load();data.categories=clone(categories);return persist(data).categories}
function saveProducts(products){const data=load();data.products=clone(products);return persist(data).products}
window.HGStore={STORAGE_KEY,SCHEMA_VERSION,defaults:clone(defaults),clone,valid,dataIsValid:value=>valid(migrate(value)),migrate,load,save:persist,getCategories,getProducts,saveCategories,saveProducts,uid,reset:()=>persist(clone(defaults))};
})();
