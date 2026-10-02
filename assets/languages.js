(() => {
  // Locate this script instead of assuming deployment at the domain root.
  const script = document.querySelector('script[src*="/assets/languages.js"]');
  const base = new URL('../', script.src);
  const path = decodeURI(location.pathname).slice(base.pathname.length);
  const lang = path.startsWith('en/') ? 'en' : path.startsWith('ja/') ? 'ja' : 'zh';
  const page = path.startsWith('qft/') ? 'notes.html' : path.replace(/^(en|ja)\//, '') || 'index.html';
  const knownPage = ['index.html', 'notes.html', 'about.html'].includes(page) ? page : 'index.html';
  const paths = { zh: '', en: 'en/', ja: 'ja/' };
  const labels = {
    zh: ['首页', '讲义', '关于', '切换语言'],
    en: ['Home', 'Notes', 'About', 'Choose language'],
    ja: ['ホーム', '講義ノート', '紹介', '言語を選択']
  };
  document.documentElement.lang = { zh: 'zh-CN', en: 'en', ja: 'ja' }[lang];
  const constructionNote = document.querySelector('.nav-footer-center p');
  if (constructionNote) {
    const notices = {
      zh: ['网站建设中 · AI 使用声明', '本网站的程序由 ChatGPT 编写。'],
      en: ['Under construction · AI use statement', 'The code for this website was written by ChatGPT.'],
      ja: ['サイト構築中 · AI 利用声明', 'このサイトのプログラムは ChatGPT が作成しました。']
    };
    const heading = document.createElement('strong');
    heading.textContent = notices[lang][0];
    constructionNote.replaceChildren(heading, document.createTextNode(`: ${notices[lang][1]}`));
  }
  const brand = document.querySelector('.navbar-brand');
  if (brand) brand.href = new URL(paths[lang] + 'index.html', base).href;
  const nav = document.querySelector('.navbar-nav');
  if (nav) {
    [...nav.querySelectorAll('.nav-link')].slice(0, 3).forEach((link, i) => {
      const name = ['index.html', 'notes.html', 'about.html'][i];
      link.href = new URL(paths[lang] + name, base).href;
      const label = link.querySelector('.menu-text') || link;
      label.textContent = labels[lang][i];
      link.classList.toggle('active', knownPage === name);
      if (knownPage === name) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  const links = [...document.querySelectorAll('.navbar-nav .nav-link')];
  for (const [target, name] of Object.entries({ zh: '中文', en: 'English', ja: '日本語' })) {
    const link = links.find(el => el.textContent.trim() === name);
    if (!link) continue;
    link.href = new URL(paths[target] + knownPage, base).href;
    link.hreflang = target === 'zh' ? 'zh-CN' : target;
    link.classList.add('language-button');
    link.classList.toggle('active', lang === target);
    link.setAttribute('aria-label', `${labels[lang][3]}: ${name}`);
    if (lang === target) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
    if (target === 'ja') link.title = '日本語のコンテンツは準備中です';
  }
})();
