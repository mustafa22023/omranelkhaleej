(function () {
  const STORAGE_KEY = 'imran-template-config-v1';
  const editableTextSelectors = [
    '.logo__title',
    '.logo__subtitle',
    '.nav__links a',
    '.mobile-nav a',
    '.slide h1',
    '.slide p',
    '.slide .btn',
    '.section__head h2',
    '.section__all',
    '.grid--cards h3',
    '.product h3',
    '.product button',
    '.contact__card h3',
    '.contact__card p',
    '.contact__card .btn',
    '.login__hint',
    '.about',
    '.footer h3',
    '.footer h4',
    '.footer p',
    '.footer li a',
    '.footer__bottom'
  ];

  const editableImageSelectors = [
    '.logo img',
    '.slide',
    '.card__img',
    '.section-banner img',
    '.product__img'
  ];

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
    }
  };

  let config = loadConfig();
  let textMode = false;
  let imageMode = false;
  const hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.accept = 'image/*';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  const allTextNodes = Array.from(
    document.querySelectorAll(editableTextSelectors.join(','))
  ).filter((el) => !el.closest('.template-editor-panel'));

  const allImageNodes = Array.from(
    document.querySelectorAll(editableImageSelectors.join(','))
  ).filter((el) => !el.closest('.template-editor-panel'));

  allTextNodes.forEach((el, i) => {
    el.dataset.templateTextId = `t${i + 1}`;
    if (!el.dataset.ar && el.textContent.trim()) {
      el.dataset.ar = el.textContent.trim();
    }
  });

  allImageNodes.forEach((el, i) => {
    el.dataset.templateImageId = `i${i + 1}`;
  });

  applySavedTexts();
  applySavedImages();
  applySavedColors();
  buildEditorUI();

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(initialConfig));
      const parsed = JSON.parse(raw);
      return {
        texts: parsed.texts || {},
        images: parsed.images || {},
        colors: { ...initialConfig.colors, ...(parsed.colors || {}) }
      };
    } catch (_) {
      return JSON.parse(JSON.stringify(initialConfig));
    }
  }

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function currentLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'ar';
  }

  function applySavedTexts() {
    allTextNodes.forEach((el) => {
      const id = el.dataset.templateTextId;
      const saved = config.texts[id];
      if (!saved) return;
      if (saved.ar) el.dataset.ar = saved.ar;
      if (saved.en) el.dataset.en = saved.en;
      el.textContent = currentLang() === 'en' ? (saved.en || el.dataset.en || el.textContent) : (saved.ar || el.dataset.ar || el.textContent);
    });
  }

  function getStyleUrl(el, cssVarName) {
    const style = el.getAttribute('style') || '';
    const rgx = new RegExp(`${cssVarName}:\\s*url\\('([^']+)'\\)`);
    const found = style.match(rgx);
    return found ? found[1] : '';
  }

  function setStyleUrl(el, cssVarName, value) {
    const current = el.getAttribute('style') || '';
    const next = current.replace(new RegExp(`${cssVarName}:\\s*url\\('([^']+)'\\)`), '').trim();
    el.setAttribute('style', `${next} ${cssVarName}:url('${value}');`.trim());
  }

  function getImageSource(el) {
    if (el.matches('img')) return el.getAttribute('src') || '';
    if (el.matches('.slide')) return getStyleUrl(el, '--bg');
    return getStyleUrl(el, '--img');
  }

  function setImageSource(el, src) {
    if (el.matches('img')) {
      el.setAttribute('src', src);
      return;
    }
    if (el.matches('.slide')) {
      setStyleUrl(el, '--bg', src);
      return;
    }
    setStyleUrl(el, '--img', src);
  }

  function applySavedImages() {
    allImageNodes.forEach((el) => {
      const id = el.dataset.templateImageId;
      const saved = config.images[id];
      if (saved) {
        setImageSource(el, saved);
      }
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

  function buildEditorUI() {
    const toggle = document.createElement('button');
    toggle.className = 'template-editor-toggle';
    toggle.type = 'button';
    toggle.textContent = 'تعديل القالب';

    const panel = document.createElement('aside');
    panel.className = 'template-editor-panel';
    panel.innerHTML = `
      <div class="template-editor-head">
        <h3>لوحة تعديل القالب</h3>
        <button class="template-editor-close" type="button">اغلاق</button>
      </div>
      <div class="template-editor-actions">
        <button type="button" data-action="text-mode">تعديل النصوص</button>
        <button type="button" data-action="image-mode">تبديل الصور</button>
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
      <p class="template-editor-note">تعديل النصوص: فعّل الزر ثم اضغط على اي نص داخل الموقع وعدل مباشرة.\nتبديل الصور: فعّل الزر ثم اضغط على الصورة نفسها واختر صورة من جهازك.</p>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('.template-editor-close');
    const textModeBtn = panel.querySelector('[data-action="text-mode"]');
    const imageModeBtn = panel.querySelector('[data-action="image-mode"]');

    toggle.addEventListener('click', () => panel.classList.toggle('is-open'));
    closeBtn.addEventListener('click', () => panel.classList.remove('is-open'));

    panel.querySelectorAll('input[data-color-key]').forEach((input) => {
      const key = input.dataset.colorKey;
      input.value = config.colors[key] || initialConfig.colors[key];
      input.addEventListener('input', () => {
        config.colors[key] = input.value;
        applySavedColors();
        saveConfig();
      });
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
            const parsed = JSON.parse(String(reader.result || '{}'));
            config = {
              texts: parsed.texts || {},
              images: parsed.images || {},
              colors: { ...initialConfig.colors, ...(parsed.colors || {}) }
            };
            saveConfig();
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

      allTextNodes.forEach((el) => {
        el.setAttribute('contenteditable', textMode ? 'true' : 'false');
        if (!textMode) el.blur();
      });
    });

    imageModeBtn.addEventListener('click', () => {
      imageMode = !imageMode;
      document.body.classList.toggle('template-image-edit', imageMode);
      imageModeBtn.textContent = imageMode ? 'ايقاف تبديل الصور' : 'تبديل الصور';
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
      saveConfig();
    }, true);

    document.addEventListener('click', (event) => {
      if (!imageMode) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
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
            saveConfig();
          }
        };
        reader.readAsDataURL(file);
      };
      hiddenFileInput.click();
    }, true);

    document.addEventListener('langchange', applySavedTexts);
  }
})();
