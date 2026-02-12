const slider = document.querySelector('[data-slider]');
const slides = Array.from(slider.querySelectorAll('.slide'));
const dotsContainer = slider.querySelector('[data-dots]');
let index = 0;

slides.forEach((_, i) => {
  const btn = document.createElement('button');
  btn.setAttribute('aria-label', `شريحة ${i + 1}`);
  if (i === 0) btn.classList.add('is-active');
  btn.addEventListener('click', () => setSlide(i));
  dotsContainer.appendChild(btn);
});

const dots = Array.from(dotsContainer.querySelectorAll('button'));

function setSlide(next) {
  slides[index].classList.remove('is-active');
  dots[index].classList.remove('is-active');
  index = next;
  slides[index].classList.add('is-active');
  dots[index].classList.add('is-active');
}

setInterval(() => {
  setSlide((index + 1) % slides.length);
}, 6000);

const langButtons = document.querySelectorAll('.lang');
const productNameEnMap = {
  'حديد': 'Rebar Steel',
  'اسمنت اسود': 'Black Cement',
  'طابوق ابيض': 'White Blocks',
  'طابوق اسود': 'Black Blocks',
  'مونه طابوق': 'Block Mortar',
  'شبك حديد': 'Steel Mesh',
  'عتب ابيض': 'White Lintel',
  'شبك سعودي 1.100 جرام': 'Saudi Mesh 1.100 g',
  'شبك سعودي 800 جرام': 'Saudi Mesh 800 g',
  'شبك كويتي 1.100 جرام': 'Kuwaiti Mesh 1.100 g',
  'شبك كويتي 800 جرام': 'Kuwaiti Mesh 800 g',
  'زوايا كاتنك': 'Cutting Angles',
  'فواصل كاتنك': 'Cutting Spacers',
  'نهايه كاتنك': 'Cutting End Caps',
  'زوايا اكسبامت': 'Expamet Angles',
  'فواصل اكسبامت': 'Expamet Spacers',
  'نهايه اكسبامت': 'Expamet End Caps',
  'مسمار نجار خشابي': 'Carpenter Nail',
  'مسمار فوالذ هولندر': 'Dutch Steel Nail',
  'سلبوخ امراتي': 'UAE Aggregate',
  'سيم تربيط': 'Binding Wire',
  'شبك اخضر': 'Green Mesh',
  'عربانه فرنسي': 'French Wheelbarrow',
  'شبل حديد': 'Metal Shovel',
  'هوز ايطالي': 'Italian Hose',
  'مستر المنيوم': 'Aluminum Straightedge',
  'رمل مساح': 'Surveying Sand',
  'وشر مساح': 'Surveying Washer',
  'معجون جوتن': 'Jotun Putty',
  'املشن جي تي سي': 'GTC Emulsion',
  'مجحاف': 'Trowel',
  'سكين امريكي': 'American Putty Knife',
  'فرشه': 'Brush',
  'عازل الخليج': 'Gulf Insulation',
  'عازل سعودي': 'Saudi Insulation',
  'عازل كويتي': 'Kuwaiti Insulation',
  'زفته كاب سيل': 'Cap Seal Bitumen',
  'زفته كاب بريمر': 'Cap Primer Bitumen',
  'سيجما همبل': 'Sigma Hempel',
  'سيجما سعودي': 'Saudi Sigma',
  'سيجما كي بي سي': 'Sigma KPC'
};

document.querySelectorAll('.product h3').forEach((title) => {
  const arName = title.textContent.trim();
  if (!title.dataset.en && productNameEnMap[arName]) {
    title.dataset.en = productNameEnMap[arName];
  }
});

function setLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  langButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === lang);
  });

  document.querySelectorAll('[data-en]').forEach((el) => {
    if (!el.dataset.ar) {
      el.dataset.ar = el.textContent;
    }
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ar;
  });

  document.querySelectorAll('[data-placeholder-en]').forEach((input) => {
    if (!input.dataset.placeholderAr) {
      input.dataset.placeholderAr = input.getAttribute('placeholder') || '';
    }
    input.setAttribute(
      'placeholder',
      lang === 'en' ? input.dataset.placeholderEn : input.dataset.placeholderAr
    );
  });
}

langButtons.forEach((btn) => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

const loginForm = document.querySelector('.login__form');
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}

const whatsappPhone = '96566871081';
document.querySelectorAll('.product button').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    const card = btn.closest('.product');
    const title = card ? card.querySelector('h3')?.textContent?.trim() : '';
    const prefix = document.documentElement.lang === 'en' ? 'I would like to order: ' : 'ارغب بطلب: ';
    const fallback = document.documentElement.lang === 'en' ? 'I want to place an order' : 'ارغب بالطلب';
    const msg = title ? `${prefix}${title}` : fallback;
    const url = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });
});

const themeToggle = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('theme-dark');
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-dark');
    localStorage.setItem('theme', document.body.classList.contains('theme-dark') ? 'dark' : 'light');
  });
}
