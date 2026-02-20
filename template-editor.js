(function () {
  const STORAGE_KEY = 'imran-template-config-v1';
  const DEV_CREDENTIALS_KEY = 'imran-dev-credentials-v1';
  const PUBLISHED_CONFIG_PATH = 'site-config.json';

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
    }
  };

  let config = deepClone(initialConfig);
  let textMode = false;
  let imageMode = false;

  const isDeveloper = new URLSearchParams(location.search).get('developer') === '1';

  const hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.accept = 'image/*';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  const allTextNodes = Array.from(document.querySelectorAll(editableTextSelectors.join(','))).filter((el) => !el.closest('.template-editor-panel'));
  const allImageNodes = Array.from(document.querySelectorAll(editableImageSelectors.join(','))).filter((el) => !el.closest('.template-editor-panel'));

  allTextNodes.forEach((el, i) => {
    el.dataset.templateTextId = `t${i + 1}`;
    if (!el.dataset.ar && el.textContent.trim()) el.dataset.ar = el.textContent.trim();
  });

  allImageNodes.forEach((el, i) => {
    el.dataset.templateImageId = `i${i + 1}`;
  });

  init();

  async function init() {
    const localConfig = loadLocalConfig();
    const publishedConfig = await loadPublishedConfig();

    config = normalizeConfig({
      texts: { ...(publishedConfig.texts || {}), ...(localConfig.texts || {}) },
      images: { ...(publishedConfig.images || {}), ...(localConfig.images || {}) },
      colors: { ...initialConfig.colors, ...(publishedConfig.colors || {}), ...(localConfig.colors || {}) }
    });

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

  function normalizeConfig(maybeConfig) {
    return {
      texts: maybeConfig.texts || {},
      images: maybeConfig.images || {},
      colors: { ...initialConfig.colors, ...(maybeConfig.colors || {}) }
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

  function applySavedTexts() {
    allTextNodes.forEach((el) => {
      const id = el.dataset.templateTextId;
      const saved = config.texts[id];
      if (!saved) return;
      if (saved.ar) el.dataset.ar = saved.ar;
      if (saved.en) el.dataset.en = saved.en;
      el.textContent = currentLang() === 'en'
        ? (saved.en || el.dataset.en || el.textContent)
        : (saved.ar || el.dataset.ar || el.textContent);
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
    const cleaned = current.replace(new RegExp(`${cssVarName}:\\s*url\\('([^']+)'\\)`), '').trim();
    el.setAttribute('style', `${cleaned} ${cssVarName}:url('${value}');`.trim());
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

  function defaultCredentials() {
    const hostOwner = location.hostname.endsWith('.github.io') ? location.hostname.split('.')[0] : 'mustafa22023';
    const pathRepo = location.pathname.split('/').filter(Boolean)[0] || 'omranelkhaleej';
    return { token: '', owner: hostOwner, repo: pathRepo, branch: 'main' };
  }

  function loadCredentials() {
    try {
      const raw = localStorage.getItem(DEV_CREDENTIALS_KEY);
      if (!raw) return defaultCredentials();
      return { ...defaultCredentials(), ...JSON.parse(raw) };
    } catch (_) {
      return defaultCredentials();
    }
  }

  function saveCredentials(creds) {
    localStorage.setItem(DEV_CREDENTIALS_KEY, JSON.stringify(creds));
  }

  function buildPublishQuickButton() {
    const quickPublish = document.createElement('button');
    quickPublish.type = 'button';
    quickPublish.className = 'template-publish-toggle';
    quickPublish.textContent = 'نشر للجميع';

    quickPublish.addEventListener('click', async () => {
      const creds = askCredentials(loadCredentials());
      if (!creds) return;

      try {
        quickPublish.disabled = true;
        quickPublish.textContent = 'جاري النشر...';
        await publishToGithub({ ...creds, content: config });
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

  function askCredentials(existing) {
    const token = prompt('GitHub Token (PAT):', existing.token || '');
    if (!token) return null;
    const owner = prompt('GitHub Owner:', existing.owner || '');
    if (!owner) return null;
    const repo = prompt('GitHub Repository:', existing.repo || '');
    if (!repo) return null;
    const branch = prompt('Branch:', existing.branch || 'main') || 'main';

    const creds = { token: token.trim(), owner: owner.trim(), repo: repo.trim(), branch: branch.trim() };
    saveCredentials(creds);
    return creds;
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

      <p class="template-editor-note">هذه الادوات تظهر فقط عند فتح الموقع بهذا الرابط: <b>?developer=1</b> . زر النشر للجميع منفصل خارج اللوحة.</p>
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
        saveLocalConfig();
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
            const parsed = normalizeConfig(JSON.parse(String(reader.result || '{}')));
            config = {
              texts: parsed.texts,
              images: parsed.images,
              colors: { ...initialConfig.colors, ...(parsed.colors || {}) }
            };
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
      saveLocalConfig();
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
            saveLocalConfig();
          }
        };
        reader.readAsDataURL(file);
      };
      hiddenFileInput.click();
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
      content: b64EncodeUnicode(JSON.stringify(content, null, 2)),
      branch
    };

    if (sha) payload.sha = sha;

    const putRes = await fetch(api, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!putRes.ok) {
      const errBody = await safeJson(putRes);
      throw new Error(errBody.message || 'فشل رفع ملف الاعدادات');
    }
  }

  function b64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch (_) {
      return {};
    }
  }
})();
