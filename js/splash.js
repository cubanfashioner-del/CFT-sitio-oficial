(() => {
  const splash = document.querySelector("#cft-splash");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  const applySavedTheme = () => {
    try {
      const savedTheme = localStorage.getItem("cft-theme")
        || localStorage.getItem("cuban-fashioner-tech-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch (error) {
      console.warn("No se pudo leer la preferencia de tema para la pantalla de carga.", error);
    }

    if (themeColor) {
      themeColor.content = document.documentElement.dataset.theme === "dark" ? "#0b0f0e" : "#f8f9fa";
    }
  };

  const navigate = (url) => {
    if (!url) return;

    applySavedTheme();
    if (!splash) {
      window.location.assign(url);
      return;
    }

    splash.hidden = false;
    splash.classList.remove("is-leaving");
    document.body.classList.add("splash-active");
    document.body.setAttribute("aria-busy", "true");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          window.location.assign(url);
        }, 180);
      });
    });
  };

  applySavedTheme();
  window.cftNavigate = navigate;

  const redirectUrl = document.body.dataset.splashRedirect;
  if (redirectUrl) navigate(redirectUrl);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-splash-link]");
    if (
      !link
      || event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || link.target === "_blank"
    ) {
      return;
    }

    event.preventDefault();
    navigate(link.href);
  });
})();
