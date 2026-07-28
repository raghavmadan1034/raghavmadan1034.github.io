(function () {
  const STORAGE_KEY = "blogsite-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const button = document.querySelector(".theme-toggle");
    if (button) {
      button.textContent = theme === "dark" ? "Light mode" : "Dark mode";
      button.setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " mode");
    }
  }

  function initTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored || (prefersDark ? "dark" : "light"));

    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    button.addEventListener("click", function () {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    });
  }

  function formatDate(iso) {
    const date = new Date(iso + "T00:00:00");
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function renderPosts(posts) {
    const list = document.getElementById("post-list");
    const empty = document.getElementById("empty-state");
    if (!list) return;

    list.innerHTML = posts
      .map(function (post) {
        const tags = post.tags
          .map(function (tag) {
            return '<li class="tag">' + escapeHtml(tag) + "</li>";
          })
          .join("");

        return (
          '<li class="post-card">' +
          '<h2><a href="' + escapeHtml(post.url) + '">' + escapeHtml(post.title) + "</a></h2>" +
          '<div class="post-meta">' + escapeHtml(formatDate(post.date)) + " &middot; " + escapeHtml(post.author) + "</div>" +
          "<p>" + escapeHtml(post.excerpt) + "</p>" +
          '<ul class="tags">' + tags + "</ul>" +
          "</li>"
        );
      })
      .join("");

    if (empty) {
      empty.hidden = posts.length > 0;
    }
  }

  function initBlogIndex() {
    if (typeof POSTS === "undefined" || !document.getElementById("post-list")) return;

    const sorted = POSTS.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    renderPosts(sorted);

    const search = document.getElementById("search");
    if (!search) return;
    search.addEventListener("input", function () {
      const query = search.value.trim().toLowerCase();
      const filtered = sorted.filter(function (post) {
        return (
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.tags.some(function (tag) {
            return tag.toLowerCase().includes(query);
          })
        );
      });
      renderPosts(filtered);
    });
  }

  function initYear() {
    const target = document.getElementById("year");
    if (target) target.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initBlogIndex();
    initYear();
  });
})();
