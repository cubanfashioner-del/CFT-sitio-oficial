(() => {
      const menuButton = document.querySelector(".menu-toggle");
      const navigation = document.querySelector("#main-navigation");
      const year = document.querySelector("#current-year");
      const themeButton = document.querySelector(".theme-toggle");
      const themeLabel = themeButton.querySelector(".theme-toggle-label");
      const themeColor = document.querySelector('meta[name="theme-color"]');
      const modalTriggers = document.querySelectorAll("[data-modal]");
      const networkBackground = document.querySelector(".global-network svg");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const revealElements = document.querySelectorAll("[data-reveal]");
      const newsSection = document.querySelector("#seccion-noticias");
      const newsModal = document.querySelector("#news-modal");
      const newsModalTitle = document.querySelector("#news-modal-title");
      const newsModalBody = document.querySelector("#news-modal-body");
      const newsOriginalLink = document.querySelector("#news-original-link");
      const uiHistoryKey = "cftUi";
      const accountLink = document.querySelector("#nav-account-link");
      const accountLabel = document.querySelector("#nav-account-label");
      const logoutButton = document.querySelector("#nav-logout");
      const logoutLabel = document.querySelector("#nav-logout-label");
      const authStatus = document.querySelector("#auth-status");
      const accountModal = document.querySelector("#account-modal");
      const accountEmail = document.querySelector("#account-email");
      const accountStatus = document.querySelector("#account-status");
      const changePasswordButton = document.querySelector("#account-change-password");
      const passwordForm = document.querySelector("#account-password-form");
      const newPasswordInput = document.querySelector("#account-new-password");
      const confirmPasswordInput = document.querySelector("#account-confirm-password");
      const passwordSubmitButton = document.querySelector("#account-password-submit");
      let currentAccountSession = null;
      let supabaseClient = null;
      const supabaseUrl = "https://fzgkaolxngitwlatsusf.supabase.co";
      const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2thb2x4bmdpdHdsYXRzdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTE5MDAsImV4cCI6MjEwODI2NzkwMH0.l_l4MV9Scu7PTZLztGam8DP7HGRCh93fCosA4R3m5P4";

      let revealObserver = null;

      if (reducedMotion.matches || !("IntersectionObserver" in window)) {
        revealElements.forEach((element) => element.classList.add("is-visible"));
      } else {
        revealObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, {
          threshold: 0.15,
          rootMargin: "0px 0px -30px 0px",
        });

        revealElements.forEach((element) => revealObserver.observe(element));
      }

      async function loadNews() {
        try {
          const response = await fetch("../data/noticias.json", { cache: "no-cache" });
          if (!response.ok) {
            throw new Error(`La solicitud de noticias respondió con ${response.status}.`);
          }

          const news = await response.json();
          if (!Array.isArray(news)) {
            throw new TypeError("El archivo de noticias debe contener un arreglo JSON.");
          }

          const articles = news.filter((item) => (
            item &&
            typeof item.titulo === "string" &&
            typeof item.url === "string" &&
            toSafeHttpUrl(item.url)
          ));
          newsSection.replaceChildren();

          if (articles.length === 0) {
            newsSection.append(createNewsStatus("Aún no hay noticias publicadas."));
            return;
          }

          articles.forEach((item) => {
            const article = document.createElement("article");
            article.className = "news-card";
            article.dataset.reveal = "";

            const image = document.createElement("img");
            image.className = "news-card-image";
            image.alt = `Imagen de ${item.titulo}`;
            image.loading = "lazy";
            image.src = toSafeHttpUrl(item.imagen) || defaultNewsImage;
            image.addEventListener("error", () => {
              image.src = defaultNewsImage;
            }, { once: true });
            article.append(image);

            const meta = document.createElement("div");
            meta.className = "news-meta";
            const source = document.createElement("span");
            source.className = "tag";
            source.textContent = new URL(item.url).hostname.replace(/^www\./, "");
            meta.append(source);

            const published = document.createElement("time");
            const date = new Date(item.fecha);
            if (item.fecha && !Number.isNaN(date.getTime())) {
              published.dateTime = date.toISOString();
              published.textContent = new Intl.DateTimeFormat("es", {
                dateStyle: "medium",
              }).format(date);
            } else {
              published.textContent = "Fecha no disponible";
            }
            meta.append(published);
            article.append(meta);

            const title = document.createElement("h3");
            title.className = "news-card-title";
            const link = document.createElement("a");
            link.href = toSafeHttpUrl(item.url);
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = item.titulo;
            title.append(link);
            article.append(title);

            const description = document.createElement("p");
            const fullText = typeof item.contenido === "string" && item.contenido.trim()
              ? item.contenido.trim()
              : typeof item.descripcion === "string" && item.descripcion.trim()
                ? item.descripcion.trim()
                : "Contenido no disponible en la fuente RSS.";
            const summary = typeof item.descripcion === "string" && item.descripcion.trim()
              ? item.descripcion.trim()
              : fullText;
            description.className = "news-summary";
            description.textContent = summary.length > 180
              ? `${summary.slice(0, 177).trimEnd()}…`
              : summary;
            article.append(description);

            const readMore = document.createElement("button");
            readMore.className = "button button-outline news-read-more";
            readMore.type = "button";
            readMore.textContent = "Leer más";
            readMore.setAttribute("aria-haspopup", "dialog");
            readMore.addEventListener("click", () => openNewsModal(item, fullText));
            article.append(readMore);
            newsSection.append(article);
          });

          if (revealObserver) {
            newsSection.querySelectorAll("[data-reveal]").forEach((element) => {
              revealObserver.observe(element);
            });
          } else {
            newsSection.querySelectorAll("[data-reveal]").forEach((element) => {
              element.classList.add("is-visible");
            });
          }
        } catch (error) {
          console.error("No se pudieron cargar las noticias:", error);
          newsSection.replaceChildren(createNewsStatus("No se pudieron cargar las noticias. Inténtalo más tarde."));
        } finally {
          newsSection.setAttribute("aria-busy", "false");
        }
      }

      const defaultNewsImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%231b4332'/%3E%3Cpath d='M0 360 220 180l130 110 120-150 330 250v60H0Z' fill='%23b48a3d' fill-opacity='.45'/%3E%3Ctext x='400' y='245' fill='white' font-family='sans-serif' font-size='54' text-anchor='middle'%3ECFT%3C/text%3E%3C/svg%3E";

      function toSafeHttpUrl(value) {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
        } catch {
          return "";
        }
      }

      function createNewsStatus(message) {
        const status = document.createElement("p");
        status.className = "news-status";
        status.textContent = message;
        return status;
      }

      function openNewsModal(item, fullText) {
        if (!(newsModal instanceof HTMLDialogElement) || newsModal.open) return;

        newsModalTitle.textContent = item.titulo;
        newsModalBody.textContent = fullText;
        newsOriginalLink.href = toSafeHttpUrl(item.url);
        newsModalBody.scrollTop = 0;
        newsModal.showModal();
        document.body.classList.add("modal-open");
        history.pushState(
          { ...getUiHistoryState(), [uiHistoryKey]: { type: "modal", id: newsModal.id } },
          "",
          window.location.href
        );
      }

      if (newsSection) loadNews();

      year.textContent = String(new Date().getFullYear());

      let parallaxFrame = 0;
      const updateNetworkParallax = () => {
        if (parallaxFrame) return;

        parallaxFrame = window.requestAnimationFrame(() => {
          const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress = scrollableDistance > 0
            ? Math.min(Math.max(window.scrollY / scrollableDistance, 0), 1)
            : 0;
          const offset = reducedMotion.matches ? 0 : -68 * scrollProgress;

          networkBackground.style.setProperty("--network-parallax-offset", `${offset.toFixed(2)}px`);
          parallaxFrame = 0;
        });
      };

      window.addEventListener("scroll", updateNetworkParallax, { passive: true });
      window.addEventListener("resize", updateNetworkParallax);
      reducedMotion.addEventListener("change", updateNetworkParallax);
      updateNetworkParallax();

      const setTheme = (theme, savePreference = false) => {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = theme;
        themeButton.setAttribute("aria-pressed", String(isDark));
        themeButton.setAttribute("aria-label", `Cambiar a modo ${isDark ? "claro" : "oscuro"}`);
        themeButton.title = `Cambiar a modo ${isDark ? "claro" : "oscuro"}`;
        themeLabel.textContent = isDark ? "Claro" : "Oscuro";
        themeColor.content = isDark ? "#0b0f0e" : "#f8f9fa";

        if (savePreference) {
          try {
            localStorage.setItem("cft-theme", theme);
          } catch (error) {
            console.warn("No se pudo guardar la preferencia de tema.", error);
          }
        }
      };

      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
      themeButton.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        setTheme(nextTheme, true);
      });

      const getUiHistoryState = () => (
        history.state && typeof history.state === "object" ? history.state : {}
      );

      const clearUiHistoryState = () => {
        const state = getUiHistoryState();
        delete state[uiHistoryKey];
        history.replaceState(state, "", window.location.href);
      };

      const closeMenu = (syncHistory = true) => {
        if (!navigation.classList.contains("is-open")) return;

        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Abrir menú");

        if (getUiHistoryState()[uiHistoryKey]?.type === "menu") {
          if (syncHistory) {
            history.back();
          } else {
            clearUiHistoryState();
          }
        }
      };

      menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        if (isOpen) {
          closeMenu();
          return;
        }
        if (!isOpen && getUiHistoryState()[uiHistoryKey]?.type !== "menu") {
          history.pushState({ ...getUiHistoryState(), [uiHistoryKey]: { type: "menu" } }, "", window.location.href);
        }
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Cerrar menú");
        navigation.classList.add("is-open");
      });

      navigation.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) closeMenu(false);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !document.querySelector(".modal[open]")) closeMenu();
      });

      const syncUiWithHistory = (state) => {
        const ui = state?.[uiHistoryKey];
        const openModal = document.querySelector(".modal[open]");

        if (openModal && (ui?.type !== "modal" || ui.id !== openModal.id)) {
          openModal.close();
        }

        if (ui?.type === "menu") {
          navigation.classList.add("is-open");
          menuButton.setAttribute("aria-expanded", "true");
          menuButton.setAttribute("aria-label", "Cerrar menú");
        } else {
          closeMenu(false);
        }

        if (ui?.type === "modal") {
          const modal = document.getElementById(ui.id);
          if (modal instanceof HTMLDialogElement && !modal.open) {
            modal.showModal();
            document.body.classList.add("modal-open");
          }
        }
      };

      window.addEventListener("popstate", (event) => syncUiWithHistory(event.state));
      syncUiWithHistory(history.state);

      modalTriggers.forEach((trigger) => {
        trigger.addEventListener("click", () => {
          const modal = document.getElementById(trigger.dataset.modal);
          if (modal instanceof HTMLDialogElement) {
            if (modal.open) return;
            modal.showModal();
            document.body.classList.add("modal-open");
            history.pushState(
              { ...getUiHistoryState(), [uiHistoryKey]: { type: "modal", id: modal.id } },
              "",
              window.location.href
            );
          }
        });
      });

      document.querySelectorAll(".modal").forEach((modal) => {
        const closeButton = modal.querySelector(".modal-close");

        closeButton.addEventListener("click", () => modal.close());
        modal.addEventListener("click", (event) => {
          if (event.target === modal) modal.close();
        });
        modal.addEventListener("close", () => {
          if (!document.querySelector(".modal[open]")) {
            document.body.classList.remove("modal-open");
          }
          const ui = getUiHistoryState()[uiHistoryKey];
          if (ui?.type === "modal" && ui.id === modal.id) history.back();
        });
      });

      accountLink.addEventListener("click", (event) => {
        if (!currentAccountSession) return;

        event.preventDefault();
        closeMenu(false);
        accountStatus.textContent = "";
        accountStatus.hidden = true;
        passwordForm.reset();
        passwordForm.hidden = true;
        changePasswordButton.setAttribute("aria-expanded", "false");

        if (!accountModal.open) {
          accountModal.showModal();
          document.body.classList.add("modal-open");
          history.pushState(
            { ...getUiHistoryState(), [uiHistoryKey]: { type: "modal", id: accountModal.id } },
            "",
            window.location.href
          );
        }
      });

      changePasswordButton.addEventListener("click", () => {
        const isExpanded = changePasswordButton.getAttribute("aria-expanded") === "true";
        changePasswordButton.setAttribute("aria-expanded", String(!isExpanded));
        passwordForm.hidden = isExpanded;
        accountStatus.textContent = "";
        accountStatus.hidden = true;
        if (!isExpanded) newPasswordInput.focus();
      });

      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        accountStatus.textContent = "";
        accountStatus.hidden = true;

        if (!passwordForm.reportValidity()) return;
        if (newPasswordInput.value !== confirmPasswordInput.value) {
          confirmPasswordInput.setCustomValidity("Las contraseñas no coinciden.");
          confirmPasswordInput.reportValidity();
          confirmPasswordInput.focus();
          return;
        }

        passwordSubmitButton.disabled = true;
        passwordSubmitButton.setAttribute("aria-busy", "true");
        passwordSubmitButton.textContent = "Actualizando…";

        try {
          const { error } = await supabaseClient.auth.updateUser({ password: newPasswordInput.value });
          if (error) throw error;

          passwordForm.reset();
          passwordForm.hidden = true;
          changePasswordButton.setAttribute("aria-expanded", "false");
          accountStatus.textContent = "Tu contraseña se actualizó correctamente.";
          accountStatus.dataset.state = "success";
          accountStatus.hidden = false;
        } catch (error) {
          console.error("No se pudo actualizar la contraseña de la cuenta:", error);
          accountStatus.textContent = "No se pudo actualizar la contraseña. Inténtalo de nuevo.";
          accountStatus.dataset.state = "error";
          accountStatus.hidden = false;
        } finally {
          passwordSubmitButton.disabled = false;
          passwordSubmitButton.removeAttribute("aria-busy");
          passwordSubmitButton.textContent = "Guardar contraseña";
        }
      });

      newPasswordInput.addEventListener("input", () => confirmPasswordInput.setCustomValidity(""));
      confirmPasswordInput.addEventListener("input", () => confirmPasswordInput.setCustomValidity(""));

      const setAccountSession = (session) => {
        const isSignedIn = Boolean(session);
        currentAccountSession = session;
        accountLabel.textContent = isSignedIn ? "Mi cuenta" : "Iniciar sesión";
        accountLink.setAttribute(
          "aria-label",
          isSignedIn ? `Cuenta de ${session.user.email}` : "Iniciar sesión o crear una cuenta"
        );
        accountLink.title = isSignedIn ? session.user.email : "";
        if (isSignedIn) {
          accountEmail.textContent = session.user.email;
        } else if (accountModal.open) {
          accountModal.close();
        }
      };

      async function initializeAuth() {
        try {
          const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
          const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
          const storage = localStorage.getItem(storageKey)
            ? localStorage
            : sessionStorage.getItem(storageKey)
              ? sessionStorage
              : localStorage;
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: true,
              detectSessionInUrl: true,
              persistSession: true,
              storage
            }
          });
          supabaseClient = supabase;
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          setAccountSession(data.session);
          supabase.auth.onAuthStateChange((_event, session) => setAccountSession(session));

          logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutLabel.textContent = "Cerrando sesión…";
            authStatus.hidden = true;
            authStatus.textContent = "";

            try {
              const { error: signOutError } = await supabase.auth.signOut();
              if (signOutError) throw signOutError;
            } catch (error) {
              console.error("No se pudo cerrar la sesión de Supabase:", error);
              accountStatus.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
              accountStatus.dataset.state = "error";
              accountStatus.hidden = false;
            } finally {
              logoutButton.disabled = false;
              logoutLabel.textContent = "Cerrar sesión";
            }
          });
        } catch (error) {
          console.error("No se pudo comprobar la sesión de Supabase:", error);
          authStatus.textContent = "No se pudo comprobar el estado de la sesión.";
          authStatus.hidden = false;
        }
      }

      initializeAuth();
    })();
