const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const cards = [...document.querySelectorAll('.product-card')];
const filters = [...document.querySelectorAll('.filter')];
const search = document.querySelector('#product-search');
const empty = document.querySelector('.empty-state');
let activeFilter = 'todos';

function closeMenu() {
  nav.classList.remove('is-open');
  toggle.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menú');
}

toggle.addEventListener('click', () => {
  const open = !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', open);
  toggle.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

function updateHeader() { header.classList.toggle('is-scrolled', scrollY > 18); }
addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filterProducts() {
  const term = normalize(search.value.trim());
  let visible = 0;
  cards.forEach((card) => {
    const show = (activeFilter === 'todos' || card.dataset.category === activeFilter) && (!term || normalize(card.dataset.name).includes(term));
    card.hidden = !show;
    if (show) visible++;
  });
  empty.hidden = visible > 0;
}
function setFilter(category) {
  activeFilter = category;
  filters.forEach((button) => {
    const selected = button.dataset.filter === category;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  filterProducts();
}
filters.forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.filter)));
search.addEventListener('input', filterProducts);
document.querySelectorAll('[data-category-link]').forEach((link) => link.addEventListener('click', () => setFilter(link.dataset.categoryLink)));

const interest = document.querySelector('#interest');
const message = document.querySelector('#message');
document.querySelectorAll('[data-interest]').forEach((button) => button.addEventListener('click', () => {
  const category = button.closest('.product-card').dataset.category;
  interest.value = category === 'uñas' ? 'Productos para uñas' : category === 'maquillaje' ? 'Maquillaje' : 'Cuidado personal';
  message.value = `Me interesa: ${button.dataset.interest}. Quisiera conocer opciones y disponibilidad.`;
  document.querySelector('#contacto').scrollIntoView({ behavior: 'smooth' });
}));

document.querySelector('#contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  form.querySelectorAll('.error').forEach((node) => node.textContent = '');
  let valid = true;
  const nameField = form.elements.namedItem('name');
  const interestField = form.elements.namedItem('interest');
  if (!nameField.value.trim()) { nameField.closest('.field').querySelector('.error').textContent = 'Escribe tu nombre.'; valid = false; }
  if (!interestField.value) { interestField.closest('.field').querySelector('.error').textContent = 'Selecciona una opción.'; valid = false; }
  form.querySelector('.form-status').textContent = valid ? 'Consulta preparada. Falta agregar el número comercial para habilitar el envío por WhatsApp.' : '';
});

if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}
