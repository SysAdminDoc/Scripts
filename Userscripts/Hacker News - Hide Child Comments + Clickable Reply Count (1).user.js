// ==UserScript==
// @name         Hacker News - Hide Child Comments + Clickable Reply Count
// @namespace    https://news.ycombinator.com/
// @version      1.5
// @description  Hides child comments by default on Hacker News and allows toggling by clicking the reply count or [+]/[–] button like Reddit UX style.
// @author       You
// @match        https://news.ycombinator.com/item?id=*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function getDepth(row) {
    const indentImg = row.querySelector('td.ind img');
    return indentImg ? parseInt(indentImg.getAttribute('width'), 10) || 0 : 0;
  }

  function getChildren(parentRow) {
    const parentDepth = getDepth(parentRow);
    const children = [];
    let row = parentRow.nextElementSibling;

    while (row && row.tagName === 'TR') {
      const depth = getDepth(row);
      if (depth <= parentDepth) break;
      children.push(row);
      row = row.nextElementSibling;
    }

    return children;
  }

  function toggleChildren(parentRow, toggleBtn, replyCountSpan) {
    const children = getChildren(parentRow);
    const hidden = children.length > 0 && children[0].style.display === 'none';

    children.forEach(row => {
      row.style.display = hidden ? '' : 'none';
    });

    toggleBtn.textContent = hidden ? '[–]' : '[+]';
    toggleBtn.dataset.hidden = hidden ? 'false' : 'true';

    if (replyCountSpan) {
      replyCountSpan.textContent = ` ${children.length} repl${children.length === 1 ? 'y' : 'ies'}`;
    }
  }

  function addToggleButtons() {
    const rows = Array.from(document.querySelectorAll('tr.comtr'));
    rows.forEach(row => {
      const commentCell = row.querySelector('td.default');
      if (!commentCell || commentCell.querySelector('.hn-toggle-btn')) return;

      const footer = commentCell.querySelector('.comment > .reply');
      if (!footer) return;

      const children = getChildren(row);
      if (children.length === 0) return;

      // Create toggle button
      const toggleBtn = document.createElement('a');
      toggleBtn.href = 'javascript:void(0)';
      toggleBtn.className = 'hn-toggle-btn';
      toggleBtn.style.marginLeft = '8px';
      toggleBtn.style.fontSize = 'smaller';

      // Create reply count label (clickable)
      const replyCount = document.createElement('span');
      replyCount.style.fontSize = 'smaller';
      replyCount.style.color = '#888';
      replyCount.style.cursor = 'pointer';
      replyCount.title = 'Click to expand/collapse replies';

      // Default to hidden
      children.forEach(child => child.style.display = 'none');
      toggleBtn.textContent = '[+]';
      toggleBtn.dataset.hidden = 'true';
      replyCount.textContent = ` ${children.length} repl${children.length === 1 ? 'y' : 'ies'}`;

      // Shared toggle handler
      const handleToggle = () => toggleChildren(row, toggleBtn, replyCount);

      toggleBtn.addEventListener('click', handleToggle);
      replyCount.addEventListener('click', handleToggle);

      // Append to comment footer
      footer.appendChild(document.createTextNode(' | '));
      footer.appendChild(toggleBtn);
      footer.appendChild(replyCount);
    });
  }

  window.addEventListener('load', addToggleButtons);
})();
