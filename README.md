# BlogSite

A sample static blog website — plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```powershell
python -m http.server 8000
# then browse to http://localhost:8000
```

## Structure

```
index.html            Post listing with live search
about.html            About page
posts/                Individual article pages
assets/css/style.css  Design tokens, layout, light + dark theme
assets/js/posts.js    Post metadata consumed by the listing
assets/js/main.js     Rendering, search, theme toggle
```

## Features

- Responsive layout
- Light/dark theme toggle persisted in `localStorage`, defaulting to the OS preference
- Client-side search over post titles, excerpts and tags
- Posts sorted newest first

## Add a post

1. Copy a file in `posts/` and edit its content.
2. Add a matching entry to the `POSTS` array in `assets/js/posts.js`:

```js
{
  title: "My New Post",
  url: "posts/my-new-post.html",
  date: "2026-08-01",
  author: "Raghav",
  excerpt: "One or two sentences shown on the home page.",
  tags: ["tag-one", "tag-two"]
}
```
