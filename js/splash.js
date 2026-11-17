(() => {
  const splash = document.querySelector("#cft-splash");

  const isAuthCallbackUrl = () => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const type = query.get("type") || fragment.get("type");

    return query.has("code")
      || query.has("token_hash")
      || fragment.has("token_hash")
      || ["signup", "email_change"].includes(type)
      || (
        (query.has("access_token") || fragment.has("access_token"))
        && ["signup", "email_change"].includes(type)
      )
      || query.get("cft_email_confirmation") === "1";
  };

  const withAuthCallback = (url) => {
    const destination = new URL(url, document.baseURI);
    if (
      isAuthCallbackUrl()
      && destination.origin === window.location.origin
      && destination.pathname.endsWith("/html/index.html")
    ) {
      destination.search = window.location.search;
      destination.hash = window.location.hash;
    }

    return destination.href;
  };

  const navigate = (url) => {
    if (!url) return;
    const destination = withAuthCallback(url);

    if (!splash) {
      window.location.assign(destination);
      return;
    }

    splash.hidden = false;
    splash.classList.remove("is-leaving");
    document.body.classList.add("splash-active");
    document.body.setAttribute("aria-busy", "true");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          window.location.assign(destination);
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
