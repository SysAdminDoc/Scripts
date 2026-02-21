// ==UserScript==
// @name        GitHub Combined Enhancer
// @namespace   http://tampermonkey.net/
// @version     1.2
// @match       https://github.com/*
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @run-at      document-start
// ==/UserScript==

"use strict";

/* Wide GitHub – full-width layout + cap README images + hide file icons */
(function() {
  const css = `
body:not(.wgh-disabled) .application-main .container-xl { max-width: none !important; }
body:not(.wgh-disabled) .application-main .container-lg { max-width: none !important; margin-left: 0 !important; }
body:not(.wgh-disabled) .react-repos-overview-margin { margin-right: 0 !important; }
body:not(.wgh-disabled) #js-repo-pjax-container div[style^="--sticky-pane-height:"] > div[class^="Box-sc-"]:first-child { max-width: none !important; }
body:not(.wgh-disabled) .application-main .col-11 { width: 100% !important; }
body:not(.wgh-disabled) #js-repo-pjax-container .js-issue-row .text-right { max-width: 303px !important; }
body:not(.wgh-disabled) .application-main div[style^="--sticky-pane-height:"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] > div[class^="Box-sc-"]:nth-child(2) > div[class^="Box-sc-"] { max-width: none !important; }
body:not(.wgh-disabled) #js-repo-pjax-container div[data-target="react-app.reactRoot"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] { max-width: none !important; }
body:not(.wgh-disabled) .application-main div[data-target="react-app.reactRoot"] div[class^="prc-PageLayout-Content-"] > div[class^="Box-sc-"] { max-width: none !important; }
body:not(.wgh-disabled) .application-main div[data-target="react-app.reactRoot"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] > div[class^="Box-sc-"] { max-width: none !important; }
body:not(.wgh-disabled) .application-main div[data-target="react-app.reactRoot"] div[class^="IssueCreatePage-module__createPaneContainer-"] { max-width: none !important; }
body:not(.wgh-disabled) .markdown-body img { max-width: 400px !important; height: auto !important; }
.qinwuyuan-file-icon { display: none !important; }
`;
  const s = document.createElement('style');
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);
})();

/* GitHub File List Beautifier */
(function() {
  let customColors = GM_getValue('fileTypesColors', {});
  const addIcon = true;
  if (!Object.keys(customColors).length) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://raw.githubusercontent.com/ChinaGodMan/UserScripts/main/github-file-list-beautifier-plus/colors.json',
      onload(response) {
        try {
          customColors = JSON.parse(response.responseText);
          GM_setValue('fileTypesColors', customColors);
          requestAnimationFrame(start);
        } catch {}
      }
    });
  } else requestAnimationFrame(start);

  const sheet = document.documentElement.appendChild(Object.assign(document.createElement('style'), { textContent: '' })).sheet;
  const filetypes = {};
  const IMG_CLS = 'wOxxOm-image-icon';
  const rxImages = /^(png|jpe?g|bmp|gif|cur|ico|svg)$/i;

  function start() {
    beautify();
    new MutationObserver(beautify).observe(document, { subtree: true, childList: true });
  }

  function beautify() {
    document.querySelectorAll('.react-directory-truncate, .js-navigation-open').forEach(el => {
      if (el._gbfled) return;
      el._gbfled = true;
      const a = el.tagName === 'A' ? el : el.querySelector('a');
      if (!a || !a.href) return;
      const icon = el.closest('.js-navigation-item, td').querySelector('svg');
      if (icon.classList.contains('octicon-file-directory-fill') || icon.classList.contains('icon-directory')) {
        a.setAttribute('file-type', ':folder');
        return;
      }
      let fn = a.href.split('/').pop().toLowerCase();
      let ext = (fn.match(/\.(\w+)$|$/)[1] || fn).toLowerCase();
      if (customColors[fn]) ext = fn;
      a.setAttribute('file-type', ext);
      const cfg = (customColors[fn] && customColors[fn].icon) || (customColors[ext] && customColors[ext].icon) || null;
      if (!filetypes[ext]) addFileTypeStyle(ext);
      if (cfg && addIcon) {
        let url = cfg.startsWith('https://') || cfg.startsWith('data:')
                  ? cfg
                  : `https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/${cfg}.svg`;
        const img = document.createElement('img');
        img.className = 'qinwuyuan-file-icon';
        img.src = url;
        img.alt = ext;
        icon.replaceWith(img);
      } else if (rxImages.test(ext)) {
        const m = a.href.match(/github\.com\/(.+?\/)blob\/(.*)$/);
        if (m) {
          const img = document.createElement('img');
          img.className = IMG_CLS;
          img.src = `https://raw.githubusercontent.com/${m[1]}${m[2]}`;
          icon.replaceWith(img);
        }
      }
    });
  }

  function addFileTypeStyle(type) {
    filetypes[type] = true;
    requestAnimationFrame(() => {
      const h = hash(type) % 360;
      const S = (hash(type) * 1299721) % 50 + 50 | 0;
      const Hq = h / 60;
      const redFix = Hq < 1 ? 1 - Hq : Hq > 4 ? (Hq - 4) / 2 : 0;
      const blueFix = (Hq < 3 || Hq > 5 ? 0 : Hq < 4 ? Hq - 3 : 5 - Hq) * 3;
      const L = hash(type) * 179426453 % (hash(type)%2?50:15) + (hash(type)%2?30:25) + (redFix + blueFix)*((hash(type)%2?12:0))*(S/100)|0;
      sheet.insertRule(`a[file-type="${type}"]{color:hsl(${h},${S}%,${L}%)!important}`, sheet.cssRules.length);
    });
  }

  function hash(txt) {
    let h = 0;
    for (let i = 0; i < txt.length; i++) h = ((h << 5) - h) + txt.charCodeAt(i);
    return Math.abs(h * 13 | 0);
  }
})();

/* View Forks button & remove Sponsor */
(function() {
  function refresh() {
    const actions = document.querySelector('#repository-details-container ul.pagehead-actions');
    if (!actions) return;
    actions.querySelectorAll('show-dialog-on-load[data-url-param="sponsor"]').forEach(el => {
      const li = el.closest('li');
      if (li) li.remove();
    });
    if (actions._vfInjected) return;
    actions._vfInjected = true;
    const [, owner, repo] = location.pathname.split('/');
    if (!owner || !repo) return;
    const li = document.createElement('li');
    li.innerHTML = '<button id="viewForksBtn" class="btn btn-sm btn-primary">View Forks</button>';
    li.querySelector('button').addEventListener('click', async () => {
      const api = `https://api.github.com/repos/${owner}/${repo}/forks?per_page=100&sort=stargazers&page=1`;
      try {
        const data = await fetch(api).then(r => r.json());
        const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Forks of ${owner}/${repo}</title>
<style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}th{background:#f6f8fa}</style>
</head><body>
<h1>Forks of ${owner}/${repo}</h1>
<table><thead><tr><th>Fork</th><th>Stars</th><th>Last Updated</th></tr></thead><tbody>
${data.map(f=>`<tr><td><a href="${f.html_url}" target="_blank">${f.full_name}</a></td><td>${f.stargazers_count}</td><td>${new Date(f.updated_at).toLocaleString()}</td></tr>`).join('')}
</tbody></table>
</body></html>`;
        const w = window.open();
        w.document.write(html);
        w.document.close();
      } catch {}
    });
    const watchLi = actions.querySelector('react-partial')?.closest('li');
    if (watchLi) actions.insertBefore(li, watchLi);
    else actions.appendChild(li);
  }
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  refresh();
})();
