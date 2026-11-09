(() => {
      const menuButton = document.querySelector(".menu-toggle");
      const navigation = document.querySelector("#main-navigation");
      const year = document.querySelector("#current-year");
      const themeButton = document.querySelector(".theme-toggle");
      const themeLabel = themeButton.querySelector(".theme-toggle-label");
      const themeColor = document.querySelector('meta[name="theme-color"]');
      const modalTriggers = document.querySelectorAll("[data-modal]");
      const optionsModal = document.querySelector("#optionsModal");
      const openModalButton = document.querySelector("#openModalBtn");
      const storesModal = document.querySelector("#storesModal");
      const openStoresModalButton = document.querySelector("#openStoresModalBtn");
      const consultingModal = document.querySelector("#consultingModal");
      const openConsultingModalButton = document.querySelector("#openConsultingModalBtn");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const heroSlides = document.querySelectorAll(".hero-slide");
      const revealElements = document.querySelectorAll("[data-reveal]");
      const newsSection = document.querySelector("#seccion-noticias");
      const newsModal = document.querySelector("#news-modal");
      const newsModalTitle = document.querySelector("#news-modal-title");
      const newsModalBody = document.querySelector("#news-modal-body");
      const newsModalSource = document.querySelector("#news-modal-source");
      const uiHistoryKey = "cftUi";
      const accountLink = document.querySelector("#nav-account-link");
      const accountLabel = document.querySelector("#nav-account-label");
      const logoutButton = document.querySelector("#nav-logout");
      const logoutLabel = document.querySelector("#nav-logout-label");
      const authStatus = document.querySelector("#auth-status");
      const accountModal = document.querySelector("#account-modal");
      const authRequiredModal = document.querySelector("#auth-required-modal");
      const accountEmail = document.querySelector("#account-email");
      const accountProfileForm = document.querySelector("#account-profile-form");
      const accountProfileUsername = document.querySelector("#account-profile-username");
      const accountProfilePhone = document.querySelector("#account-profile-phone");
      const accountProfileEmail = document.querySelector("#account-profile-email");
      const accountProfileSubmit = document.querySelector("#account-profile-submit");
      const accountStatus = document.querySelector("#account-status");
      const accountDeleteTrigger = document.querySelector("#account-delete-trigger");
      const accountDeleteForm = document.querySelector("#account-delete-form");
      const accountDeleteConfirmation = document.querySelector("#account-delete-confirmation");
      const accountDeleteSubmit = document.querySelector("#account-delete-submit");
      const accountDeleteCancel = document.querySelector("#account-delete-cancel");
      const changePasswordButton = document.querySelector("#account-change-password");
      const passwordForm = document.querySelector("#account-password-form");
      const newPasswordInput = document.querySelector("#account-new-password");
      const confirmPasswordInput = document.querySelector("#account-confirm-password");
      const passwordSubmitButton = document.querySelector("#account-password-submit");
      let currentAccountSession = null;
      let supabaseClient = null;
      let authInitializationPromise = null;
      let loadedProfileUserId = null;
      const supabaseUrl = "https://fzgkaolxngitwlatsusf.supabase.co";
      const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2thb2x4bmdpdHdsYXRzdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTE5MDAsImV4cCI6MjEwODI2NzkwMH0.l_l4MV9Scu7PTZLztGam8DP7HGRCh93fCosA4R3m5P4";

      let activeHeroSlide = 0;
      if (heroSlides.length > 1) {
        window.setInterval(() => {
          heroSlides[activeHeroSlide].classList.remove("is-active");
          activeHeroSlide = (activeHeroSlide + 1) % heroSlides.length;
          heroSlides[activeHeroSlide].classList.add("is-active");
        }, 5000);
      }

      const prepareRevealWords = (element) => {
        if (element.matches("h1")) return;

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const textNodes = [];

        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          if (!textNode.nodeValue.trim()) continue;
          if (textNode.parentElement.closest("[data-reveal]") !== element) continue;
          textNodes.push(textNode);
        }

        let wordIndex = 0;
        textNodes.forEach((textNode) => {
          const fragment = document.createDocumentFragment();
          const parts = textNode.nodeValue.match(/\s+|[^\s]+/g) || [];

          parts.forEach((part) => {
            if (/^\s+$/.test(part)) {
              fragment.append(document.createTextNode(part));
              return;
            }

            const word = document.createElement("span");
            word.className = "reveal-word";
            word.style.setProperty("--word-delay", `${wordIndex * 55}ms`);
            word.textContent = part;
            fragment.append(word);
            wordIndex += 1;
          });

          textNode.replaceWith(fragment);
        });
      };

      revealElements.forEach(prepareRevealWords);

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
            Object.keys(item).length === 7 &&
            typeof item.id === "string" &&
            typeof item.titulo === "string" &&
            typeof item.resumen === "string" &&
            typeof item.contenido === "string" &&
            typeof item.fuente === "string" &&
            typeof item.fecha === "string" &&
            typeof item.imagen === "string" &&
            (!item.imagen || toSafeImageUrl(item.imagen))
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
            image.alt = "";
            image.setAttribute("aria-hidden", "true");
            image.loading = "lazy";
            image.decoding = "async";
            image.referrerPolicy = "no-referrer";
            image.src = toSafeImageUrl(item.imagen) || defaultNewsImage;
            image.addEventListener("error", () => {
              image.src = defaultNewsImage;
            }, { once: true });
            article.append(image);

            const meta = document.createElement("div");
            meta.className = "news-meta";
            const source = document.createElement("span");
            source.className = "tag";
            source.textContent = item.fuente;
            meta.append(source);

            const published = document.createElement("time");
            published.textContent = item.fecha;
            meta.append(published);
            article.append(meta);

            const title = document.createElement("h3");
            title.className = "news-card-title";
            title.textContent = item.titulo;
            article.append(title);

            const description = document.createElement("p");
            description.className = "news-summary";
            description.textContent = item.resumen;
            article.append(description);

            const readMore = document.createElement("button");
            readMore.className = "button button-outline news-read-more";
            readMore.type = "button";
            readMore.textContent = "Leer más";
            readMore.setAttribute("aria-haspopup", "dialog");
            readMore.addEventListener("click", () => openNewsModal(item));
            article.append(readMore);
            prepareRevealWords(article);
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

      function toSafeImageUrl(value) {
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

      function openNewsModal(item) {
        if (!(newsModal instanceof HTMLDialogElement) || newsModal.open) return;

        newsModalTitle.textContent = item.titulo;
        newsModalBody.textContent = item.contenido;
        if (item.contenido.trim() === item.resumen.trim()) {
          const excerptNotice = document.createElement("p");
          excerptNotice.className = "news-excerpt-notice";
          excerptNotice.textContent = "La fuente solo publica este extracto en su feed RSS.";
          newsModalBody.append(excerptNotice);
        }
        newsModalSource.textContent = `${item.fuente} · ${item.fecha}`;
        newsModal.scrollTop = 0;
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

      const showAuthRequiredModal = () => {
        if (authRequiredModal.open) return;

        authRequiredModal.showModal();
        document.body.classList.add("modal-open");
        history.pushState(
          { ...getUiHistoryState(), [uiHistoryKey]: { type: "modal", id: authRequiredModal.id } },
          "",
          window.location.href
        );
      };

      const runWhenAuthenticated = async (action) => {
        if (authInitializationPromise) await authInitializationPromise;

        if (!supabaseClient) {
          authStatus.textContent = "No se pudo comprobar tu sesión. Recarga la página e inténtalo de nuevo.";
          authStatus.hidden = false;
          return false;
        }

        try {
          const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
          if (sessionError) throw sessionError;
          if (!sessionData.session) {
            setAccountSession(null);
            showAuthRequiredModal();
            return false;
          }

          const { data, error } = await supabaseClient.auth.getUser();
          if (error) throw error;

          if (!data.user) {
            setAccountSession(null);
            showAuthRequiredModal();
            return false;
          }

          setAccountSession({ ...sessionData.session, user: data.user });
          action();
          return true;
        } catch (error) {
          console.error("No se pudo verificar la sesión antes de continuar:", error);
          authStatus.textContent = "No se pudo comprobar tu sesión. Comprueba tu conexión e inténtalo de nuevo.";
          authStatus.hidden = false;
          return false;
        }
      };

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
          if (!document.querySelector(".modal[open], .options-modal.is-open")) {
            document.body.classList.remove("modal-open");
          }
          const ui = getUiHistoryState()[uiHistoryKey];
          if (ui?.type === "modal" && ui.id === modal.id) history.back();
        });
      });

      const closeOptionsModal = () => {
        optionsModal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
        openModalButton.focus();
      };

      openModalButton.addEventListener("click", () => {
        optionsModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        optionsModal.querySelector(".modal-close").focus();
      });

      optionsModal.querySelector(".modal-close").addEventListener("click", closeOptionsModal);
      optionsModal.addEventListener("click", (event) => {
        if (event.target === optionsModal) closeOptionsModal();
      });
      optionsModal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeOptionsModal();
      });
      optionsModal.querySelectorAll(".option-link").forEach((optionButton) => {
        optionButton.addEventListener("click", async () => {
          const target = optionButton.dataset.target;
          switch (target) {
            case "menu-digital":
            case "tienda-online":
            case "landing-page":
            case "portafolio":
            case "corporativo":
              await runWhenAuthenticated(() => {
                window.alert(`Opción seleccionada: ${target}`);
                closeOptionsModal();
              });
              break;
            default:
              console.error("La opción seleccionada no tiene un destino válido.", target);
              return;
          }
        });
      });

      const closeStoresModal = () => {
        storesModal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
        openStoresModalButton.focus();
      };

      openStoresModalButton.addEventListener("click", () => {
        storesModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        storesModal.querySelector(".modal-close").focus();
      });

      storesModal.querySelector(".modal-close").addEventListener("click", closeStoresModal);
      storesModal.addEventListener("click", (event) => {
        if (event.target === storesModal) closeStoresModal();
      });
      storesModal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeStoresModal();
      });
      storesModal.querySelectorAll("button.option-link[data-store-url]").forEach((storeButton) => {
        storeButton.addEventListener("click", async () => {
          await runWhenAuthenticated(() => window.location.assign(storeButton.dataset.storeUrl));
        });
      });

      document.querySelector("#whatsapp-contact-button").addEventListener("click", async (event) => {
        const whatsappButton = event.currentTarget;
        await runWhenAuthenticated(() => window.location.assign(whatsappButton.dataset.whatsappUrl));
      });

      const closeConsultingModal = () => {
        consultingModal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
        openConsultingModalButton.focus();
      };

      openConsultingModalButton.addEventListener("click", () => {
        consultingModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        consultingModal.querySelector(".modal-close").focus();
      });

      consultingModal.querySelector(".modal-close").addEventListener("click", closeConsultingModal);
      consultingModal.addEventListener("click", (event) => {
        if (event.target === consultingModal) closeConsultingModal();
      });
      consultingModal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeConsultingModal();
      });

      const setAccountStatus = (message, state = "info") => {
        accountStatus.textContent = message;
        accountStatus.dataset.state = state;
        accountStatus.hidden = !message;
      };

      const loadAccountProfile = async (user) => {
        accountProfileSubmit.disabled = true;
        accountEmail.textContent = user.email || "";
        accountProfileEmail.value = user.new_email || user.email || "";
        setAccountStatus("Cargando tus datos personales…");

        try {
          const { data, error } = await supabaseClient
            .from("profiles")
            .select("username, phone")
            .eq("id", user.id)
            .maybeSingle();
          if (error) throw error;
          if (!data) {
            throw new Error("No existe el perfil. Aplica la migración de perfiles de Supabase.");
          }

          accountProfileUsername.value = data.username;
          accountProfilePhone.value = data.phone || "";
          loadedProfileUserId = user.id;
          accountProfileSubmit.disabled = false;
          setAccountStatus("");
        } catch (error) {
          console.error("No se pudo cargar el perfil de Supabase:", error);
          setAccountStatus("No se pudieron cargar tus datos. Verifica que la migración de perfiles esté aplicada e inténtalo de nuevo.", "error");
        }
      };

      accountLink.addEventListener("click", async (event) => {
        if (!currentAccountSession) return;

        event.preventDefault();
        closeMenu(false);
        setAccountStatus("");
        passwordForm.reset();
        passwordForm.hidden = true;
        changePasswordButton.setAttribute("aria-expanded", "false");
        accountDeleteForm.hidden = true;
        accountDeleteTrigger.setAttribute("aria-expanded", "false");
        accountDeleteConfirmation.value = "";
        accountDeleteSubmit.disabled = true;

        if (!accountModal.open) {
          accountModal.showModal();
          document.body.classList.add("modal-open");
          history.pushState(
            { ...getUiHistoryState(), [uiHistoryKey]: { type: "modal", id: accountModal.id } },
            "",
            window.location.href
          );
        }
        if (loadedProfileUserId !== currentAccountSession.user.id) {
          await loadAccountProfile(currentAccountSession.user);
        }
      });

      accountProfileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setAccountStatus("");
        if (!accountProfileForm.reportValidity() || !currentAccountSession || !supabaseClient) return;

        const user = currentAccountSession.user;
        const username = accountProfileUsername.value.trim().toLowerCase();
        const phone = accountProfilePhone.value.trim();
        const email = accountProfileEmail.value.trim();
        let profileSaved = false;
        accountProfileSubmit.disabled = true;
        accountProfileSubmit.setAttribute("aria-busy", "true");
        accountProfileSubmit.textContent = "Guardando…";

        try {
          const { data, error } = await supabaseClient
            .from("profiles")
            .update({ username, phone })
            .eq("id", user.id)
            .select("username, phone")
            .single();
          if (error) throw error;

          accountProfileUsername.value = data.username;
          accountProfilePhone.value = data.phone;
          profileSaved = true;

          if (email.toLowerCase() !== (user.new_email || user.email || "").toLowerCase()) {
            const { error: emailError } = await supabaseClient.auth.updateUser({ email });
            if (emailError) throw emailError;
            accountProfileEmail.value = email;
            setAccountStatus("Nombre de usuario y teléfono guardados. Revisa el correo nuevo para confirmar el cambio de dirección.", "success");
          } else {
            setAccountStatus("Tus datos personales se guardaron correctamente.", "success");
          }
          loadedProfileUserId = user.id;
        } catch (error) {
          console.error("No se pudieron guardar los datos de la cuenta:", error);
          if (error.code === "23505") {
            setAccountStatus("Ese nombre de usuario ya está en uso. Elige otro.", "error");
          } else if (profileSaved) {
            setAccountStatus("El nombre de usuario y el teléfono se guardaron, pero no se pudo iniciar el cambio de correo. Verifica el correo y vuelve a intentarlo.", "error");
          } else {
            setAccountStatus("No se pudieron guardar los datos. Comprueba tu conexión e inténtalo de nuevo.", "error");
          }
        } finally {
          accountProfileSubmit.disabled = false;
          accountProfileSubmit.removeAttribute("aria-busy");
          accountProfileSubmit.textContent = "Guardar datos personales";
        }
      });

      accountDeleteTrigger.addEventListener("click", () => {
        accountDeleteForm.hidden = false;
        accountDeleteTrigger.setAttribute("aria-expanded", "true");
        accountDeleteConfirmation.focus();
      });

      accountDeleteConfirmation.addEventListener("input", () => {
        accountDeleteSubmit.disabled = accountDeleteConfirmation.value !== "ELIMINAR";
      });

      accountDeleteCancel.addEventListener("click", () => {
        accountDeleteForm.reset();
        accountDeleteForm.hidden = true;
        accountDeleteTrigger.setAttribute("aria-expanded", "false");
        accountDeleteSubmit.disabled = true;
        accountDeleteTrigger.focus();
      });

      accountDeleteForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (
          accountDeleteConfirmation.value !== "ELIMINAR"
          || !currentAccountSession
          || !supabaseClient
        ) return;

        accountDeleteSubmit.disabled = true;
        accountDeleteSubmit.setAttribute("aria-busy", "true");
        accountDeleteSubmit.textContent = "Eliminando…";
        setAccountStatus("");

        try {
          const { error } = await supabaseClient.functions.invoke("delete-account", {
            body: { confirmation: "ELIMINAR" },
          });
          if (error) throw error;

          const { error: signOutError } = await supabaseClient.auth.signOut({ scope: "local" });
          if (signOutError) {
            console.error("La cuenta fue eliminada, pero no se pudo limpiar la sesión local:", signOutError);
          }
          window.location.assign("./index.html");
        } catch (error) {
          console.error("No se pudo eliminar la cuenta:", error);
          const status = error.context?.status;
          if (status === 404) {
            setAccountStatus("La eliminación aún no está habilitada. Despliega la función segura delete-account de Supabase.", "error");
          } else if (status === 401) {
            setAccountStatus("Tu sesión expiró. Inicia sesión de nuevo antes de eliminar la cuenta.", "error");
          } else {
            setAccountStatus("No se pudo eliminar la cuenta. Inténtalo de nuevo o contacta con soporte.", "error");
          }
        } finally {
          accountDeleteSubmit.disabled = accountDeleteConfirmation.value !== "ELIMINAR";
          accountDeleteSubmit.removeAttribute("aria-busy");
          accountDeleteSubmit.textContent = "Confirmar eliminación";
        }
      });

      changePasswordButton.addEventListener("click", () => {
        const isExpanded = changePasswordButton.getAttribute("aria-expanded") === "true";
        changePasswordButton.setAttribute("aria-expanded", String(!isExpanded));
        passwordForm.hidden = isExpanded;
        setAccountStatus("");
        if (!isExpanded) newPasswordInput.focus();
      });

      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setAccountStatus("");

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
          setAccountStatus("Tu contraseña se actualizó correctamente.", "success");
        } catch (error) {
          console.error("No se pudo actualizar la contraseña de la cuenta:", error);
          setAccountStatus("No se pudo actualizar la contraseña. Inténtalo de nuevo.", "error");
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
          accountProfileEmail.value = session.user.new_email || session.user.email || "";
        } else if (accountModal.open) {
          loadedProfileUserId = null;
          accountModal.close();
        }
      };

      async function initializeAuth() {
        try {
          const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
          const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
          try {
            localStorage.removeItem(storageKey);
          } catch (storageError) {
            console.warn("No se pudo limpiar una sesión persistente anterior.", storageError);
          }
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: true,
              detectSessionInUrl: true,
              persistSession: true,
              storage: sessionStorage
            }
          });
          supabaseClient = supabase;
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          let session = data.session;
          if (session) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            session = { ...session, user: userData.user };
          }
          setAccountSession(session);
          if (session) await loadAccountProfile(session.user);
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
              setAccountStatus("No se pudo cerrar la sesión. Inténtalo de nuevo.", "error");
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

      authInitializationPromise = initializeAuth();
    })();
