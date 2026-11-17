(() => {
  const splash = document.querySelector("#cft-splash");

  const navigate = (url) => {
    if (!url) return;

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
