# raghavmadan.github.io

Personal website of Raghav Madan — CS & EE undergrad at IIT Kanpur.

## Structure

```
├── index.html          ← Home (hero, about, experience, projects, contact)
├── projects.html       ← All projects
├── blog.html           ← Blog listing
├── blog/
│   ├── template.html   ← Copy this for every new blog post
│   └── *.html          ← Individual posts go here
├── assets/
│   ├── styles.css
│   ├── main.js
│   ├── favicon.svg
│   └── resume/
│       └── Raghav_Madan_Resume.pdf   ← Drop your PDF here
└── .nojekyll
```

---

## Publishing a new blog post (4-step workflow)

### Step 1 — Write on Google Docs, then copy your content
When your post is ready, select all (Ctrl+A) and copy.

### Step 2 — Create the post file
1. Duplicate `blog/template.html`, rename to a short slug e.g. `blog/winui3-migration.html`.
2. Fill in the `<title>`, `<meta>`, eyebrow, h1, read time.
3. Inside `<div class="article-body">` paste your content:
   - Wrap paragraphs in `<p>...</p>`
   - `<h2>` for section headings
   - `<ul><li>` for bullets
   - `<pre><code>` for code blocks

### Step 3 — Add the card to blog.html
Open `blog.html` and paste above the placeholder cards:

```html
<article class="post-card">
  <p class="tag">Engineering · August 2026</p>
  <h2><a href="blog/winui3-migration.html">Your Post Title</a></h2>
  <p>One or two sentence summary.</p>
  <span class="post-meta">8 min read</span>
</article>
```

### Step 4 — Push to GitHub
```bash
git add .
git commit -m "Add post: Your Post Title"
git push
```

---

## Setup

1. Drop your PDF at `assets/resume/Raghav_Madan_Resume.pdf`.
2. Push to a repo named `<yourusername>.github.io`.
3. Settings → Pages → Source: `main` branch, `/ (root)`.
4. Update GitHub/LinkedIn URLs in the HTML files (search `raghavmadan-iitk`).
