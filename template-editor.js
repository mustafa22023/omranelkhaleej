(function () {
  const STORAGE_KEY = 'imran-template-config-v2';
  const PUBLISH_SETTINGS_KEY = 'imran-publish-settings-v2';
  const PUBLISHED_CONFIG_PATH = 'site-config.json';
  const isDeveloper = new URLSearchParams(location.search).get('developer') === '1';

  const editableTextSelectors = [
    '.logo__title', '.logo__subtitle', '.nav__links a', '.mobile-nav a', '.slide h1', '.slide p', '.slide .btn',
    '.section__head h2', '.section__all', '.grid--cards h3', '.product h3', '.product button',
    '.contact__card h3', '.contact__card p', '.contact__card .btn', '.login__hint', '.about',
    '.footer h3', '.footer h4', '.footer p', '.footer li a', '.footer__bottom'
  ];

  const editableImageSelectors = ['.logo img', '.slide', '.card__img', '.section-banner img', '.product__img'];

  const initialConfig = {
    texts: {},
    images: {},
    colors: {
      lightBg: '#d8f0ef',
      brand: '#1e66f5',
      brandMid: '#2f8bff',
      brandDark: '#0f4ecf',
      darkBg: '#072c54',
      darkCard: '#0b355f'
    },
    structure: {
      addedSections: [],
      addedProducts: [],
      removedSections: [],
      removedProducts: []
    }
  };

  let config = deepClone(initialConfig);
  let textMode = false;
  let imageMode = false;
  let deleteMode = false;
  let clearImageMode = false;

  const hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.accept = 'image/*';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  init();

  async function init() {
    const localConfig = loadLocalConfig();
    const publishedConfig = await loadPublishedConfig();

    config = normalizeConfig({
      texts: { ...(publishedConfig.texts || {}), ...(localConfig.texts || {}) },
      images: { ...(publishedConfig.images || {}), ...(localConfig.images || {}) },
      colors: { ...initialConfig.colors, ...(publishedConfig.colors || {}), ...(localConfig.colors || {}) },
      structure: {
        addedSections: uniqById([...(publishedConfig.structure?.addedSections || []), ...(localConfig.structure?.addedSections || [])]),
        addedProducts: uniqById([...(publishedConfig.structure?.addedProducts || []), ...(localConfig.structure?.addedProducts || [])]),
        removedSections: uniq([...(publishedConfig.structure?.removedSections || []), ...(localConfig.structure?.removedSections || [])]),
        removedProducts: uniq([...(publishedConfig.structure?.removedProducts || []), ...(localConfig.structure?.removedProducts || [])])
      }
    });

    assignStableIdsForCurrentDom();
    applyStructureFromConfig();
    assignTemplateIds();
    applySavedTexts();
    applySavedImages();
    applySavedColors();

    if (isDeveloper) {
      buildDeveloperUI();
      buildPublishQuickButton();
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function uniqById(arr) {
    const map = new Map();
    arr.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  }

  function normalizeConfig(maybeConfig) {
    return {
      texts: maybeConfig.texts || {},
      images: maybeConfig.images || {},
      colors: { ...initialConfig.colors, ...(maybeConfig.colors || {}) },
      structure: {
        addedSections: maybeConfig.structure?.addedSections || [],
        addedProducts: maybeConfig.structure?.addedProducts || [],
        removedSections: maybeConfig.structure?.removedSections || [],
        removedProducts: maybeConfig.structure?.removedProducts || []
      }
    };
  }

  function loadLocalConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepClone(initialConfig);
      return normalizeConfig(JSON.parse(raw));
    } catch (_) {
      return deepClone(initialConfig);
    }
  }

  async function loadPublishedConfig() {
    try {
      const res = await fetch(`${PUBLISHED_CONFIG_PATH}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return {};
      return normalizeConfig(await res.json());
    } catch (_) {
      return {};
    }
  }

  function saveLocalConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function currentLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'ar';
  }

  function assignStableIdsForCurrentDom() {
    document.querySelectorAll('section.catalog-section').forEach((section) => {
      if (!section.dataset.templateSectionId) {
        section.dataset.templateSectionId = section.id || `section-${Math.random().toString(36).slice(2, 7)}`;
      }
      const sid = section.dataset.templateSectionId;
      section.querySelectorAll('.product').forEach((product, i) => {
        if (!product.dataset.templateProductId) {
          product.dataset.templateProductId = `${sid}::${i + 1}`;
        }
      });
    });
  }

  function assignTemplateIds() {
    const allTextNodes = Array.from(document.querySelectorAll(editableTextSelectors.join(','))).filter((el) => !el.closest('.template-editor-panel'));
    allTextNodes.forEach((el, i) => {
      el.dataset.templateTextId = `t${i + 1}`;
      if (!el.dataset.ar && el.textContent.trim()) el.dataset.ar = el.textContent.trim();
    });

    const allImageNodes = Array.from(document.querySelectorAll(editableImageSelectors.join(','))).filter((el) => !el.closest('.template-editor-panel'));
    allImageNodes.forEach((el, i) => {
      el.dataset.templateImageId = `i${i + 1}`;
    });
  }

  function applyStructureFromConfig() {
    config.structure.removedSections.forEach((sid) => {
      const section = document.querySelector(`section.catalog-section[data-template-section-id="${sid}"]`) || document.getElementById(sid);
      if (section) section.remove();
      document.querySelectorAll(`#store .grid--cards a.card[href="#${sid}"]`).forEach((card) => card.remove());
      document.querySelectorAll(`footer a[href="#${sid}"]`).forEach((a) => a.closest('li')?.remove());
    });

    config.structure.removedProducts.forEach((pid) => {
      document.querySelectorAll(`.product[data-template-product-id="${pid}"]`).forEach((product) => product.remove());
    });

    config.structure.addedSections.forEach((sectionDef) => {
      if (!sectionDef?.id) return;
      if (!document.getElementById(sectionDef.id)) {
        addSectionToDom(sectionDef);
      }
    });

    config.structure.addedProducts.forEach((productDef) => {
      if (!productDef?.id || !productDef.sectionId) return;
      const exists = document.querySelector(`.product[data-template-product-id="${productDef.id}"]`);
      if (!exists) addProductToDom(productDef);
    });

    assignStableIdsForCurrentDom();
  }

  function addSectionToDom(sectionDef) {
    const section = document.createElement('section');
    section.className = 'section catalog-section';
    section.id = sectionDef.id;
    section.dataset.templateSectionId = sectionDef.id;
    section.innerHTML = `
      <div class="section-banner">
        <img src="${sectionDef.banner || ''}" alt="${escapeHtml(sectionDef.titleAr || '')}" />
      </div>
      <div class="section__head">
        <h2 data-en="${escapeHtml(sectionDef.titleEn || sectionDef.titleAr || '')}">${escapeHtml(sectionDef.titleAr || '')}</h2>
        <a class="section__all" href="#${sectionDef.id}" data-en="View all">عرض الكل</a>
      </div>
      <div class="grid grid--products"></div>
    `;

    const contact = document.getElementById('contact');
    if (contact) {
      contact.parentNode.insertBefore(section, contact);
    } else {
      document.querySelector('main')?.appendChild(section);
    }

    addSectionCardToStore(sectionDef);
  }

  function addSectionCardToStore(sectionDef) {
    const cardsGrid = document.querySelector('#store .grid--cards');
    if (!cardsGrid) return;
    if (cardsGrid.querySelector(`a.card[href="#${sectionDef.id}"]`)) return;

    const card = document.createElement('a');
    card.className = 'card';
    card.href = `#${sectionDef.id}`;
    card.innerHTML = `
      <div class="card__img" style="--img:url('${sectionDef.cardImage || sectionDef.banner || ''}');"></div>
      <h3 data-en="${escapeHtml(sectionDef.titleEn || sectionDef.titleAr || '')}">${escapeHtml(sectionDef.titleAr || '')}</h3>
    `;
    cardsGrid.appendChild(card);
  }

  function addProductToDom(productDef) {
    const section = document.getElementById(productDef.sectionId);
    const grid = section?.querySelector('.grid--products');
    if (!grid) return;

    const product = document.createElement('div');
    product.className = 'product';
    product.dataset.templateProductId = productDef.id;
    product.innerHTML = `
      <div class="product__img" style="--img:url('${productDef.image || ''}');"></div>
      <h3 data-en="${escapeHtml(productDef.nameEn || productDef.nameAr || '')}">${escapeHtml(productDef.nameAr || '')}</h3>
      <button data-en="Contact Us">تواصل معنا</button>
    `;

    grid.appendChild(product);
  }

  function applySavedTexts() {
    document.querySelectorAll('[data-template-text-id]').forEach((el) => {
      const id = el.dataset.templateTextId;
      const saved = config.texts[id];
      if (!saved) return;
      if (saved.ar) el.dataset.ar = saved.ar;
      if (saved.en) el.dataset.en = saved.en;
      el.textContent = currentLang() === 'en' ? (saved.en || el.dataset.en || el.textContent) : (saved.ar || el.dataset.ar || el.textContent);
    });
  }

  function setStyleUrl(el, cssVarName, value) {
    const current = el.getAttribute('style') || '';
    const cleaned = current.replace(new RegExp(`${cssVarName}:\\s*url\\('([^']+)'\\)`), '').trim();
    if (!value) {
      el.setAttribute('style', cleaned);
      return;
    }
    el.setAttribute('style', `${cleaned} ${cssVarName}:url('${value}');`.trim());
  }

  function setImageSource(el, src) {
    if (el.matches('img')) {
      el.setAttribute('src', src || '');
      return;
    }
    if (el.matches('.slide')) {
      setStyleUrl(el, '--bg', src);
      return;
    }
    setStyleUrl(el, '--img', src);
  }

  function applySavedImages() {
    document.querySelectorAll('[data-template-image-id]').forEach((el) => {
      const id = el.dataset.templateImageId;
      const saved = config.images[id];
      if (saved) setImageSource(el, saved);
    });
  }

  function cssColorVars(c) {
    return `
:root {
  --bg: ${c.lightBg};
  --brand: ${c.brand};
  --brand-dark: ${c.brandDark};
  --brand-gradient: linear-gradient(135deg, ${c.brand} 0%, ${c.brandMid} 45%, ${c.brandDark} 100%);
}
body.theme-dark {
  --bg: ${c.darkBg};
  --card: ${c.darkCard};
}
`;
  }

  function applySavedColors() {
    let styleTag = document.getElementById('template-custom-colors');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'template-custom-colors';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = cssColorVars(config.colors);
  }

  function defaultPublishSettings() {
    const owner = location.hostname.endsWith('.github.io') ? location.hostname.split('.')[0] : 'mustafa22023';
    const repo = location.pathname.split('/').filter(Boolean)[0] || 'omranelkhaleej';
    return { token: '', owner, repo, branch: 'main' };
  }

  function loadPublishSettings() {
    try {
      const raw = localStorage.getItem(PUBLISH_SETTINGS_KEY);
      if (!raw) return defaultPublishSettings();
      return { ...defaultPublishSettings(), ...JSON.parse(raw) };
    } catch (_) {
      return defaultPublishSettings();
    }
  }

  function savePublishSettings(settings) {
    localStorage.setItem(PUBLISH_SETTINGS_KEY, JSON.stringify(settings));
  }

  function buildPublishQuickButton() {
    const quickPublish = document.createElement('button');
    quickPublish.type = 'button';
    quickPublish.className = 'template-publish-toggle';
    quickPublish.textContent = 'نشر للجميع';

    quickPublish.addEventListener('click', async () => {
      const settings = loadPublishSettings();
      if (!settings.token || !settings.owner || !settings.repo) {
        alert('اكمل بيانات النشر من لوحة المطور أولا.');
        return;
      }

      try {
        quickPublish.disabled = true;
        quickPublish.textContent = 'جاري النشر...';
        await publishToGithub({ ...settings, content: config });
        quickPublish.textContent = 'تم النشر';
        setTimeout(() => {
          quickPublish.textContent = 'نشر للجميع';
          quickPublish.disabled = false;
        }, 1500);
      } catch (err) {
        alert(`فشل النشر: ${err.message}`);
        quickPublish.textContent = 'نشر للجميع';
        quickPublish.disabled = false;
      }
    });

    document.body.appendChild(quickPublish);
  }

  function buildDeveloperUI() {
    const toggle = document.createElement('button');
    toggle.className = 'template-editor-toggle';
    toggle.type = 'button';
    toggle.textContent = 'ادوات المطور';

    const panel = document.createElement('aside');
    panel.className = 'template-editor-panel';
    panel.innerHTML = `
      <div class="template-editor-head">
        <h3>ادوات المطور</h3>
        <button class="template-editor-close" type="button">اغلاق</button>
      </div>

      <div class="template-editor-actions">
        <button type="button" data-action="text-mode">تعديل النصوص</button>
        <button type="button" data-action="image-mode">تبديل الصور</button>
        <button type="button" data-action="delete-mode">وضع الحذف</button>
        <button type="button" data-action="clear-image">حذف صورة</button>
        <button type="button" data-action="export">تصدير الاعدادات</button>
        <button type="button" data-action="import">استيراد الاعدادات</button>
        <button type="button" data-action="reset">استعادة الافتراضي</button>
      </div>

      <h4>الالوان</h4>
      <div class="template-editor-grid">
        <div class="template-editor-field"><label>خلفية فاتحة</label><input type="color" data-color-key="lightBg"></div>
        <div class="template-editor-field"><label>لون اساسي</label><input type="color" data-color-key="brand"></div>
        <div class="template-editor-field"><label>لون التدرج المتوسط</label><input type="color" data-color-key="brandMid"></div>
        <div class="template-editor-field"><label>لون التدرج الغامق</label><input type="color" data-color-key="brandDark"></div>
        <div class="template-editor-field"><label>خلفية الوضع الغامق</label><input type="color" data-color-key="darkBg"></div>
        <div class="template-editor-field"><label>بطاقات الوضع الغامق</label><input type="color" data-color-key="darkCard"></div>
      </div>

      <h4>بيانات النشر</h4>
      <div class="template-editor-grid">
        <div class="template-editor-field"><label>GitHub Token</label><input type="password" data-publish="token" placeholder="ghp_..." /></div>
        <div class="template-editor-field"><label>Owner</label><input type="text" data-publish="owner" /></div>
        <div class="template-editor-field"><label>Repository</label><input type="text" data-publish="repo" /></div>
        <div class="template-editor-field"><label>Branch</label><input type="text" data-publish="branch" placeholder="main" /></div>
        <button type="button" data-action="save-publish">حفظ بيانات النشر</button>
      </div>

      <h4>اضافة قسم</h4>
      <div class="template-editor-grid">
        <div class="template-editor-field"><label>اسم القسم عربي</label><input type="text" data-section="title-ar" /></div>
        <div class="template-editor-field"><label>Section Name English</label><input type="text" data-section="title-en" /></div>
        <div class="template-editor-field"><label>معرف القسم (id)</label><input type="text" data-section="id" placeholder="new-section" /></div>
        <div class="template-editor-field"><label>رابط صورة البنر</label><input type="text" data-section="banner" /></div>
        <div class="template-editor-field"><label>رابط صورة بطاقة القسم</label><input type="text" data-section="card-image" /></div>
        <button type="button" data-action="create-section">انشاء القسم</button>
      </div>

      <h4>اضافة منتج</h4>
      <div class="template-editor-grid">
        <div class="template-editor-field"><label>معرف القسم</label><input type="text" data-product="section-id" placeholder="black-structure" /></div>
        <div class="template-editor-field"><label>اسم المنتج عربي</label><input type="text" data-product="name-ar" /></div>
        <div class="template-editor-field"><label>Product Name English</label><input type="text" data-product="name-en" /></div>
        <div class="template-editor-field"><label>رابط صورة المنتج</label><input type="text" data-product="image" /></div>
        <button type="button" data-action="create-product">انشاء المنتج</button>
      </div>

      <p class="template-editor-note">الادوات تظهر فقط عبر <b>?developer=1</b>.\nوضع الحذف: اضغط على قسم او منتج لحذفه. حذف صورة: اضغط على صورة لمسحها.</p>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('.template-editor-close');
    const textModeBtn = panel.querySelector('[data-action="text-mode"]');
    const imageModeBtn = panel.querySelector('[data-action="image-mode"]');
    const deleteModeBtn = panel.querySelector('[data-action="delete-mode"]');
    const clearImageBtn = panel.querySelector('[data-action="clear-image"]');
    const publishInputs = {
      token: panel.querySelector('[data-publish="token"]'),
      owner: panel.querySelector('[data-publish="owner"]'),
      repo: panel.querySelector('[data-publish="repo"]'),
      branch: panel.querySelector('[data-publish="branch"]')
    };

    const publishSettings = loadPublishSettings();
    publishInputs.token.value = publishSettings.token || '';
    publishInputs.owner.value = publishSettings.owner || '';
    publishInputs.repo.value = publishSettings.repo || '';
    publishInputs.branch.value = publishSettings.branch || 'main';

    toggle.addEventListener('click', () => panel.classList.toggle('is-open'));
    closeBtn.addEventListener('click', () => panel.classList.remove('is-open'));

    panel.querySelectorAll('input[data-color-key]').forEach((input) => {
      const key = input.dataset.colorKey;
      input.value = config.colors[key] || initialConfig.colors[key];
      input.addEventListener('input', () => {
        config.colors[key] = input.value;
        applySavedColors();
        saveLocalConfig();
      });
    });

    panel.querySelector('[data-action="save-publish"]').addEventListener('click', () => {
      const settings = {
        token: publishInputs.token.value.trim(),
        owner: publishInputs.owner.value.trim(),
        repo: publishInputs.repo.value.trim(),
        branch: publishInputs.branch.value.trim() || 'main'
      };
      savePublishSettings(settings);
      alert('تم حفظ بيانات النشر');
    });

    panel.querySelector('[data-action="create-section"]').addEventListener('click', () => {
      const titleAr = panel.querySelector('[data-section="title-ar"]').value.trim();
      if (!titleAr) return;
      const titleEn = panel.querySelector('[data-section="title-en"]').value.trim() || titleAr;
      const typedId = panel.querySelector('[data-section="id"]').value.trim();
      const id = slugify(typedId || titleEn);
      if (!id) return;
      if (document.getElementById(id)) {
        alert('هذا المعرف مستخدم بالفعل');
        return;
      }
      const banner = panel.querySelector('[data-section="banner"]').value.trim();
      const cardImage = panel.querySelector('[data-section="card-image"]').value.trim() || banner;

      const sectionDef = { id, titleAr, titleEn, banner, cardImage };
      config.structure.addedSections = uniqById([...config.structure.addedSections, sectionDef]);
      config.structure.removedSections = config.structure.removedSections.filter((x) => x !== id);
      addSectionToDom(sectionDef);
      assignTemplateIds();
      saveLocalConfig();

      panel.querySelector('[data-section="title-ar"]').value = '';
      panel.querySelector('[data-section="title-en"]').value = '';
      panel.querySelector('[data-section="id"]').value = '';
      panel.querySelector('[data-section="banner"]').value = '';
      panel.querySelector('[data-section="card-image"]').value = '';
    });

    panel.querySelector('[data-action="create-product"]').addEventListener('click', () => {
      const sectionId = panel.querySelector('[data-product="section-id"]').value.trim();
      if (!sectionId || !document.getElementById(sectionId)) {
        alert('القسم غير موجود');
        return;
      }
      const nameAr = panel.querySelector('[data-product="name-ar"]').value.trim();
      if (!nameAr) return;
      const nameEn = panel.querySelector('[data-product="name-en"]').value.trim() || nameAr;
      const image = panel.querySelector('[data-product="image"]').value.trim();
      const id = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const productDef = { id, sectionId, nameAr, nameEn, image };
      config.structure.addedProducts = uniqById([...config.structure.addedProducts, productDef]);
      config.structure.removedProducts = config.structure.removedProducts.filter((x) => x !== id);
      addProductToDom(productDef);
      assignTemplateIds();
      saveLocalConfig();

      panel.querySelector('[data-product="name-ar"]').value = '';
      panel.querySelector('[data-product="name-en"]').value = '';
      panel.querySelector('[data-product="image"]').value = '';
    });

    panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
      if (!window.confirm('سيتم حذف كل التعديلات المحلية. هل تريد المتابعة؟')) return;
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });

    panel.querySelector('[data-action="export"]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-config.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    panel.querySelector('[data-action="import"]').addEventListener('click', () => {
      hiddenFileInput.accept = '.json,application/json';
      hiddenFileInput.onchange = () => {
        const file = hiddenFileInput.files && hiddenFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = normalizeConfig(JSON.parse(String(reader.result || '{}')));
            config = normalizeConfig(parsed);
            saveLocalConfig();
            window.location.reload();
          } catch (_) {
            alert('ملف الاعدادات غير صحيح');
          }
        };
        reader.readAsText(file);
      };
      hiddenFileInput.click();
    });

    textModeBtn.addEventListener('click', () => {
      textMode = !textMode;
      document.body.classList.toggle('template-text-edit', textMode);
      textModeBtn.textContent = textMode ? 'ايقاف تعديل النصوص' : 'تعديل النصوص';
      document.querySelectorAll('[data-template-text-id]').forEach((el) => {
        el.setAttribute('contenteditable', textMode ? 'true' : 'false');
        if (!textMode) el.blur();
      });
    });

    imageModeBtn.addEventListener('click', () => {
      imageMode = !imageMode;
      document.body.classList.toggle('template-image-edit', imageMode);
      imageModeBtn.textContent = imageMode ? 'ايقاف تبديل الصور' : 'تبديل الصور';
    });

    deleteModeBtn.addEventListener('click', () => {
      deleteMode = !deleteMode;
      deleteModeBtn.textContent = deleteMode ? 'ايقاف وضع الحذف' : 'وضع الحذف';
    });

    clearImageBtn.addEventListener('click', () => {
      clearImageMode = !clearImageMode;
      clearImageBtn.textContent = clearImageMode ? 'ايقاف حذف صورة' : 'حذف صورة';
    });

    document.addEventListener('blur', (event) => {
      const el = event.target;
      if (!textMode || !el || !el.matches('[data-template-text-id]')) return;
      const id = el.dataset.templateTextId;
      if (!id) return;

      const value = el.textContent.trim();
      const item = config.texts[id] || {};
      if (currentLang() === 'en') {
        item.en = value;
        el.dataset.en = value;
      } else {
        item.ar = value;
        el.dataset.ar = value;
      }
      config.texts[id] = item;
      saveLocalConfig();
    }, true);

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (deleteMode) {
        const section = target.closest('section.catalog-section');
        const product = target.closest('.product');

        if (product) {
          const pid = product.dataset.templateProductId;
          if (pid) {
            config.structure.addedProducts = config.structure.addedProducts.filter((p) => p.id !== pid);
            config.structure.removedProducts = uniq([...config.structure.removedProducts, pid]);
            product.remove();
            saveLocalConfig();
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }

        if (section && window.confirm('حذف هذا القسم بالكامل؟')) {
          const sid = section.dataset.templateSectionId || section.id;
          if (sid) {
            config.structure.addedSections = config.structure.addedSections.filter((s) => s.id !== sid);
            config.structure.addedProducts = config.structure.addedProducts.filter((p) => p.sectionId !== sid);
            config.structure.removedSections = uniq([...config.structure.removedSections, sid]);
            section.remove();
            document.querySelectorAll(`#store .grid--cards a.card[href="#${sid}"]`).forEach((card) => card.remove());
            document.querySelectorAll(`footer a[href="#${sid}"]`).forEach((a) => a.closest('li')?.remove());
            saveLocalConfig();
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }
      }

      if (clearImageMode) {
        const imageTarget = target.closest('.product__img, .card__img, .section-banner img, .logo img, .slide');
        if (!imageTarget || imageTarget.closest('.template-editor-panel')) return;
        const imgId = imageTarget.dataset.templateImageId;
        if (imgId) delete config.images[imgId];
        setImageSource(imageTarget, '');
        saveLocalConfig();
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (imageMode) {
        const imageTarget = target.closest('.product__img, .card__img, .section-banner img, .logo img, .slide');
        if (!imageTarget || imageTarget.closest('.template-editor-panel')) return;

        event.preventDefault();
        event.stopPropagation();

        hiddenFileInput.accept = 'image/*';
        hiddenFileInput.onchange = () => {
          const file = hiddenFileInput.files && hiddenFileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            setImageSource(imageTarget, result);
            const id = imageTarget.dataset.templateImageId;
            if (id) {
              config.images[id] = result;
              saveLocalConfig();
            }
          };
          reader.readAsDataURL(file);
        };
        hiddenFileInput.click();
      }
    }, true);

    document.addEventListener('langchange', applySavedTexts);
  }

  async function publishToGithub({ token, owner, repo, branch, content }) {
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${PUBLISHED_CONFIG_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };

    let sha = null;
    const getRes = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
    if (getRes.ok) {
      const body = await getRes.json();
      sha = body.sha;
    } else if (getRes.status !== 404) {
      const errBody = await safeJson(getRes);
      throw new Error(errBody.message || 'تعذر قراءة ملف الاعدادات من GitHub');
    }

    const payload = {
      message: 'Update site config from developer tools',
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
      branch
    };
    if (sha) payload.sha = sha;

    const putRes = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(payload) });
    if (!putRes.ok) {
      const errBody = await safeJson(putRes);
      throw new Error(errBody.message || 'فشل رفع ملف الاعدادات');
    }
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch (_) {
      return {};
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
