'use strict';

const pageStatus = document.getElementById('page-status');
const videos = [...document.querySelectorAll('video')];
const chapterButtons = [...document.querySelectorAll('[data-video][data-time]')];
const mediaLoads = new Map();
let latestChapterRequest = 0;

function waitForMedia(video, event, ready) {
  if (ready()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener('error', failed);
    };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Video could not be prepared.')); };
    const timer = setTimeout(failed, 20000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', failed, { once: true });
  });
}

// A complete, cached Blob keeps chapter seeking independent of a host's
// byte-range behavior. Download only after a chapter is requested.
function prepareChapterMedia(video) {
  if (mediaLoads.has(video)) return mediaLoads.get(video);
  const source = video.querySelector('source').src;
  const promise = (async () => {
    const response = await fetch(source, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Video download failed.');
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith('video/')) throw new Error('Invalid video response.');
    const objectURL = URL.createObjectURL(blob);
    const playbackRate = video.playbackRate;
    video.src = objectURL;
    video.load();
    try {
      await waitForMedia(video, 'loadedmetadata', () => video.readyState >= 1);
      video.playbackRate = playbackRate;
    } catch (error) {
      URL.revokeObjectURL(objectURL);
      video.src = source;
      video.load();
      throw error;
    }
  })().catch(error => { mediaLoads.delete(video); throw error; });
  mediaLoads.set(video, promise);
  return promise;
}

for (const video of videos) {
  video.addEventListener('play', () => videos.forEach(other => { if (other !== video) other.pause(); }));
  video.addEventListener('timeupdate', () => {
    const buttons = chapterButtons.filter(button => button.dataset.video === video.id);
    const current = buttons.findLast(button => video.currentTime >= Number(button.dataset.start));
    buttons.forEach(button => {
      if (button === current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  });
}
for (const button of chapterButtons) {
  button.addEventListener('click', async () => {
    const video = document.getElementById(button.dataset.video);
    const status = video.closest('.demo').querySelector('.video-status');
    const request = ++latestChapterRequest;
    video.dataset.chapterRequest = String(request);
    videos.forEach(other => other.pause());
    const buttons = chapterButtons.filter(chapter => chapter.dataset.video === video.id);
    buttons.forEach(chapter => chapter.removeAttribute('aria-busy'));
    button.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading chapter…';
    try {
      await prepareChapterMedia(video);
      if (request !== latestChapterRequest) return;
      const time = Number(button.dataset.time);
      video.currentTime = time;
      await waitForMedia(video, 'seeked', () => !video.seeking && Math.abs(video.currentTime - time) < 0.1);
      if (request !== latestChapterRequest) return;
      if (Math.abs(video.currentTime - time) > 0.3) throw new Error('Chapter seek did not complete.');
      status.textContent = '';
      try { await video.play(); }
      catch { status.textContent = 'Chapter ready. Press play to watch.'; }
    } catch {
      if (request === latestChapterRequest) status.textContent = 'Could not load this chapter. Try again or use the video controls.';
    } finally {
      if (video.dataset.chapterRequest === String(request)) {
        button.removeAttribute('aria-busy');
        if (request !== latestChapterRequest) status.textContent = '';
      }
    }
  });
}

const dialog = document.getElementById('figure-dialog');
const dialogImage = document.getElementById('dialog-image');
const dialogCaption = document.getElementById('dialog-caption');
document.querySelectorAll('[data-figure]').forEach(link => {
  link.addEventListener('click', event => {
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    dialogImage.src = link.href;
    dialogImage.alt = link.querySelector('img').alt;
    document.getElementById('dialog-title').textContent = link.dataset.title;
    const template = document.getElementById(link.dataset.captionTemplate);
    if (template) dialogCaption.replaceChildren(template.content.cloneNode(true));
    else {
      const caption = (link.dataset.caption || '').split(/\b(Vela)\b/).map(part => {
        if (part !== 'Vela') return document.createTextNode(part);
        const name = document.createElement('span');
        name.className = 'vela-name';
        name.textContent = part;
        return name;
      });
      dialogCaption.replaceChildren(...caption);
    }
    dialog.showModal();
  });
});
document.querySelectorAll('[data-enlarge]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.enlarge).click());
});
document.getElementById('close-figure').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });

const copyButton = document.getElementById('copy-citation');
copyButton.addEventListener('click', async () => {
  const citation = document.getElementById('bibtex').textContent.trim();
  try {
    await navigator.clipboard.writeText(citation);
    copyButton.textContent = 'Copied';
    pageStatus.textContent = 'BibTeX citation copied.';
    setTimeout(() => { copyButton.textContent = 'Copy BibTeX'; }, 1800);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('bibtex'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    copyButton.textContent = 'Select & copy';
    pageStatus.textContent = 'Citation selected. Use your browser’s copy command or download the BibTeX file.';
  }
});
