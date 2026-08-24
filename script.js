'use strict';
const header=document.querySelector('.site-header'),toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.main-nav');
const categoryGrid=document.querySelector('.category-grid'),categoryEmpty=document.querySelector('.category-empty');
const productGrid=document.querySelector('.product-grid'),filterWrap=document.querySelector('.filters'),search=document.querySelector('#product-search'),productEmpty=document.querySelector('.empty-state');
let activeFilter='todos';
const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escapeHtml=text=>String(text??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
function closeMenu(){nav.classList.remove('is-open');toggle.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menú')}
toggle.addEventListener('click',()=>{const open=!nav.classList.contains('is-open');nav.classList.toggle('is-open',open);toggle.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú')});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
function updateHeader(){header.classList.toggle('is-scrolled',scrollY>18)}addEventListener('scroll',updateHeader,{passive:true});updateHeader();

function categoryArt(category){
  if(category.image)return `<img class="category-photo" src="${escapeHtml(category.image)}" alt="">`;
  if(category.design==='nails')return '<div class="nail-art" aria-hidden="true"><i></i><i></i><i></i></div>';
  if(category.design==='makeup')return '<div class="makeup-art" aria-hidden="true"><i></i><b></b></div>';
  if(category.design==='care')return '<div class="care-art" aria-hidden="true"><i>HG</i></div>';
  return '<div class="neutral-art" aria-hidden="true"><i>HG</i><span>✦</span></div>';
}
function renderPublicCategories(data=HGStore.load()){
  const seen=new Set();
  const categories=data.categories.filter(category=>category.active&&!seen.has(normalize(category.name))&&seen.add(normalize(category.name))).sort((a,b)=>a.order-b.order);
  categoryGrid.innerHTML=categories.map((category,index)=>`<a class="category-card cat-${escapeHtml(category.design||'neutral')} ${category.image?'has-photo':''}" href="#productos" data-category-id="${escapeHtml(category.id)}" ${category.color?`style="--category-custom:${escapeHtml(category.color)}"`:''}><span class="category-number">${String(index+1).padStart(2,'0')}</span>${categoryArt(category)}<div class="category-copy"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description||'Descubre opciones para tu estilo')}</p><span aria-hidden="true">↗</span></div></a>`).join('');
  categoryEmpty.hidden=categories.length>0;
  return categories;
}
function productVisual(product){if(product.image)return `<img class="product-photo" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`;if(product.visual==='rose')return '<div class="mini-lipstick"><i></i><b>HG</b></div>';if(product.visual==='cream')return '<div class="mini-jar"><i>HG</i></div>';return `<div class="mini-polish ${product.visual==='gold'?'polish-gold':''}"><i></i><b>HG</b></div>`}
function productBadge(product){if(product.bestSeller)return'Más vendido';if(product.isNew)return'Novedad';if(product.featured)return'Destacado';if(product.availability==='agotado')return'Agotado';if(product.availability==='proximo')return'Próximamente';return''}
function renderPublicProducts(data=HGStore.load(),categories=null){
  categories=categories||data.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order);
  if(activeFilter!=='todos'&&!categories.some(c=>c.id===activeFilter))activeFilter='todos';
  filterWrap.innerHTML=`<button class="filter ${activeFilter==='todos'?'is-active':''}" data-filter="todos" aria-pressed="${activeFilter==='todos'}">Todos</button>`+categories.map(c=>`<button class="filter ${activeFilter===c.id?'is-active':''}" data-filter="${escapeHtml(c.id)}" aria-pressed="${activeFilter===c.id}">${escapeHtml(c.name)}</button>`).join('');
  const term=normalize(search.value.trim());
  const products=data.products.filter(p=>p.active&&categories.some(c=>c.id===p.categoryId)&&(activeFilter==='todos'||p.categoryId===activeFilter)&&(!term||normalize(`${p.name} ${p.brand} ${p.shortDescription} ${p.fullDescription}`).includes(term))).sort((a,b)=>a.order-b.order);
  productGrid.innerHTML=products.map(product=>{const category=categories.find(c=>c.id===product.categoryId),tag=productBadge(product),price=product.priceOnRequest||product.price==null?'Consultar':new Intl.NumberFormat('es-EC',{style:'currency',currency:data.settings.currency||'USD'}).format(product.price);return `<article class="product-card" data-id="${escapeHtml(product.id)}"><div class="product-visual visual-${escapeHtml(product.visual||'cream')}">${tag?`<span class="badge">${tag}</span>`:''}${productVisual(product)}</div><div class="product-info"><p>${escapeHtml(category.name)} · ${escapeHtml(product.brand)}</p><h3>${escapeHtml(product.name)}</h3><span>${escapeHtml(product.shortDescription)}</span><small class="product-price">${price}</small><button class="product-link" data-interest="${escapeHtml(product.name)}" data-category="${escapeHtml(category.name)}">Consultar producto <b>→</b></button></div></article>`}).join('');
  productEmpty.textContent=categories.length?'No encontramos coincidencias. Prueba otra palabra o categoría.':'El catálogo estará disponible cuando existan categorías activas.';productEmpty.hidden=products.length>0;
  return products;
}
function refreshStorefront(){const data=HGStore.load(),categories=renderPublicCategories(data);renderPublicProducts(data,categories)}
window.renderPublicCategories=renderPublicCategories;window.renderPublicProducts=renderPublicProducts;window.refreshStorefront=refreshStorefront;
filterWrap.addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(!button)return;activeFilter=button.dataset.filter;renderPublicProducts()});
search.addEventListener('input',()=>renderPublicProducts());
categoryGrid.addEventListener('click',e=>{const card=e.target.closest('[data-category-id]');if(!card)return;activeFilter=card.dataset.categoryId;renderPublicProducts()});
productGrid.addEventListener('click',e=>{const button=e.target.closest('[data-interest]');if(!button)return;const options=[...document.querySelector('#interest').options];document.querySelector('#interest').value=options.find(o=>normalize(o.text).includes(normalize(button.dataset.category)))?.value||'Asesoría general';document.querySelector('#message').value=`Me interesa: ${button.dataset.interest}. Quisiera conocer opciones y disponibilidad.`;document.querySelector('#contacto').scrollIntoView({behavior:'smooth'})});
window.addEventListener('hg:datachange',refreshStorefront);window.addEventListener('storage',e=>{if(e.key===HGStore.STORAGE_KEY)refreshStorefront()});window.addEventListener('hashchange',refreshStorefront);window.addEventListener('popstate',refreshStorefront);refreshStorefront();

document.querySelector('#contact-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;form.querySelectorAll('.error').forEach(node=>node.textContent='');const name=form.elements.namedItem('name'),interest=form.elements.namedItem('interest');let valid=true;if(!name.value.trim()){name.closest('.field').querySelector('.error').textContent='Escribe tu nombre.';valid=false}if(!interest.value){interest.closest('.field').querySelector('.error').textContent='Selecciona una opción.';valid=false}form.querySelector('.form-status').textContent=valid?'Consulta preparada. Falta agregar el número comercial para habilitar el envío por WhatsApp.':''});
if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver'in window)){document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'))}else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.1});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}
