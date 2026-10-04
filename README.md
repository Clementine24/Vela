# Vela project website

This branch contains the static research project page for [Vela](https://github.com/Clementine24/Vela).

- **Website:** https://clementine24.github.io/Vela/
- **`gh-pages`:** website HTML, CSS, JavaScript, figures, and videos.
- **`main`:** project documentation and the forthcoming code release.

## Publishing

GitHub repository **Settings → Pages → Deploy from a branch → gh-pages → / (root)**.

Updating this branch publishes the website. No dependency installation or build step is required. Keep `.nojekyll` in the root. All assets use relative paths so the site works under `/Vela/`.

## Editing

- `index.html`: page content, figures, benchmark tables, and citation.
- `styles.css`: visual styles and responsive layout.
- `app.js`: figure dialogs, video chapters, and citation copying.
- `assets/`: images, videos, logo, and BibTeX file.

Paper and Code links remain marked as forthcoming until their releases are available.
