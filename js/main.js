(() => {
      const menuButton = document.querySelector(".menu-toggle");
      const navigation = document.querySelector("#main-navigation");
      const year = document.querySelector("#current-year");
      const modalTriggers = document.querySelectorAll("[data-modal]");
      const optionsModal = document.querySelector("#optionsModal");
      const openModalButton = document.querySelector("#openModalBtn");
      const storesModal = document.querySelector("#storesModal");
      const openStoresModalButton = document.querySelector("#openStoresModalBtn");
      const consultingModal = document.querySelector("#consultingModal");
      const openConsultingModalButton = document.querySelector("#openConsultingModalBtn");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const emailConfirmationParam = "cft_email_confirmation";
      const callbackSearch = new URLSearchParams(window.location.search);
      const callbackHash = new URLSearchParams(window.location.hash.slice(1));
      const callbackType = callbackSearch.get("type") || callbackHash.get("type");
      const isSupabaseEmailCallback = callbackSearch.has("code")
        || ["signup", "email_change"].includes(callbackType)
        || (
          (callbackSearch.has("access_token") || callbackHash.has("access_token"))
          && ["signup", "email_change"].includes(callbackType)
        )
        || (
          (callbackSearch.has("token_hash") || callbackHash.has("token_hash"))
          && ["signup", "email", "email_change"].includes(callbackType)
        );
      const emailConfirmationRedirect = isSupabaseEmailCallback
        || callbackSearch.get(emailConfirmationParam) === "1";
      const verificationOverlay = document.querySelector("#email-verification-overlay");
      const verificationSpinner = document.querySelector("#email-verification-spinner");
      const verificationTitle = document.querySelector("#email-verification-title");
      const verificationCopy = document.querySelector("#email-verification-copy");
      const verificationReload = document.querySelector("#email-verification-reload");
      const verificationMinimumDelay = emailConfirmationRedirect
        ? new Promise((resolve) => {
          const beginVerificationScreen = () => {
            verificationOverlay.hidden = false;
            document.body.classList.add("email-verification-open");
            document.body.setAttribute("aria-busy", "true");
            verificationTitle.focus();
            window.setTimeout(resolve, 2500);
          };

          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", beginVerificationScreen, { once: true });
          } else {
            beginVerificationScreen();
          }
        })
        : Promise.resolve();

      const showVerificationResult = (success) => {
        verificationOverlay.dataset.state = success ? "success" : "error";
        verificationSpinner.hidden = true;
        verificationTitle.textContent = success
          ? "¡Correo verificado con éxito!"
          : "No se pudo verificar el correo";
        verificationCopy.textContent = success
          ? "Tu perfil ya está actualizado. Cierra esta ventana, vuelve a abrir tu navegador e inicia sesión en CFT con tu correo y contraseña."
          : "No se pudo confirmar la actualización del correo. Solicita un nuevo enlace de verificación e inténtalo otra vez.";
        verificationReload.hidden = false;
        verificationReload.focus();
        document.body.removeAttribute("aria-busy");
      };

      const cleanVerificationUrl = () => {
        const cleanUrl = new URL(window.location.href);
        [
          "access_token",
          "refresh_token",
          "expires_at",
          "expires_in",
          "token_type",
          "code",
          "token_hash",
          "type",
          "error",
          "error_code",
          "error_description",
          "provider_token",
          "provider_refresh_token",
          emailConfirmationParam
        ].forEach((key) => cleanUrl.searchParams.delete(key));
        cleanUrl.hash = "";
        window.history.replaceState(null, "", cleanUrl);
      };

      verificationReload.addEventListener("click", () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (error) {
          console.error("No se pudo limpiar el almacenamiento del navegador:", error);
          verificationCopy.textContent = "No se pudo limpiar el almacenamiento. Revisa la configuración del navegador e inténtalo de nuevo.";
          return;
        }

        window.location.reload();
      });

      const heroSlides = document.querySelectorAll(".hero-slide");
      const heroServiceCarousel = document.querySelector(".hero-service-carousel");
      const heroServiceViewport = document.querySelector(".hero-service-slides");
      const heroServiceSlides = document.querySelectorAll(".hero-service-slide");
      const heroServiceDots = document.querySelectorAll(".hero-service-dot");
      const revealElements = document.querySelectorAll("[data-reveal]");
      const newsSection = document.querySelector("#seccion-noticias");
      const newsModal = document.querySelector("#news-modal");
      const newsModalTitle = document.querySelector("#news-modal-title");
      const newsModalBody = document.querySelector("#news-modal-body");
      const newsModalSource = document.querySelector("#news-modal-source");
      const aboutEmblem = document.querySelector(".about-emblem");
      const aboutImage = aboutEmblem?.querySelector(".about-image");

      if (aboutEmblem && aboutImage) {
        let isAboutPressed = false;

        const moveAboutImage = (event) => {
          if (reducedMotion.matches) return;
          if (event.pointerType === "touch" && !isAboutPressed) return;

          const bounds = aboutEmblem.getBoundingClientRect();
          const horizontal = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
          const vertical = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
          const intensity = isAboutPressed ? 1.5 : 1;

          aboutImage.style.setProperty("--about-shift-x", `${horizontal * 8 * intensity}px`);
          aboutImage.style.setProperty("--about-shift-y", `${vertical * 8 * intensity}px`);
          aboutImage.style.setProperty("--about-tilt-x", `${vertical * -7 * intensity}deg`);
          aboutImage.style.setProperty("--about-tilt-y", `${horizontal * 9 * intensity}deg`);
        };

        const resetAboutImage = () => {
          isAboutPressed = false;
          aboutEmblem.classList.remove("is-pressed");
          aboutImage.style.removeProperty("--about-shift-x");
          aboutImage.style.removeProperty("--about-shift-y");
          aboutImage.style.removeProperty("--about-tilt-x");
          aboutImage.style.removeProperty("--about-tilt-y");
          aboutImage.style.removeProperty("--about-scale");
        };

        aboutEmblem.addEventListener("pointermove", moveAboutImage);
        aboutEmblem.addEventListener("pointerdown", (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          isAboutPressed = true;
          aboutEmblem.classList.add("is-pressed");
          aboutImage.style.setProperty("--about-scale", "1.035");
          moveAboutImage(event);
        });
        aboutEmblem.addEventListener("pointerup", (event) => {
          if (event.pointerType === "touch") resetAboutImage();
          else {
            isAboutPressed = false;
            aboutEmblem.classList.remove("is-pressed");
            aboutImage.style.removeProperty("--about-scale");
            moveAboutImage(event);
          }
        });
        aboutEmblem.addEventListener("pointercancel", resetAboutImage);
        aboutEmblem.addEventListener("pointerleave", resetAboutImage);
      }

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
      let heroAutoplayTimer = null;
      let heroPointerId = null;
      let heroPointerStartX = 0;
      let heroPointerStartY = 0;
      let heroPointerDeltaX = 0;
      let heroIsDragging = false;
      let heroSuppressClickUntil = 0;
      const heroAutoplayDelay = 5000;

      const positionHeroSlides = (dragOffset = 0) => {
        const slideGap = Number.parseFloat(
          window.getComputedStyle(heroServiceViewport).getPropertyValue("--hero-slide-gap")
        ) || 16;

        heroServiceSlides.forEach((slide, index) => {
          let offset = index - activeHeroSlide;
          if (offset > heroServiceSlides.length / 2) offset -= heroServiceSlides.length;
          if (offset < -heroServiceSlides.length / 2) offset += heroServiceSlides.length;

          const isActive = offset === 0;
          slide.classList.toggle("is-active", isActive);
          slide.classList.toggle("is-nearby", Math.abs(offset) === 1);
          slide.style.transform = `translateX(calc(${offset * 100}% + ${offset * slideGap + dragOffset}px))`;
          slide.setAttribute("aria-hidden", String(!isActive));
          slide.tabIndex = isActive ? 0 : -1;
        });
      };

      const setHeroSlide = (index) => {
        if (index < 0 || index >= heroSlides.length || index >= heroServiceSlides.length) return;

        activeHeroSlide = index;
        heroSlides.forEach((slide, slideIndex) => {
          slide.classList.toggle("is-active", slideIndex === index);
        });
        positionHeroSlides();
        heroServiceDots.forEach((dot, dotIndex) => {
          const isActive = dotIndex === index;
          dot.classList.toggle("is-active", isActive);
          dot.setAttribute("aria-current", String(isActive));
        });
      };

      const stopHeroAutoplay = () => {
        if (heroAutoplayTimer !== null) {
          window.clearInterval(heroAutoplayTimer);
          heroAutoplayTimer = null;
        }
      };

      const startHeroAutoplay = () => {
        stopHeroAutoplay();
        if (
          reducedMotion.matches
          || heroSlides.length < 2
          || heroServiceCarousel.matches(":hover")
          || heroServiceCarousel.contains(document.activeElement)
        ) return;

        heroAutoplayTimer = window.setInterval(() => {
          setHeroSlide((activeHeroSlide + 1) % heroSlides.length);
        }, heroAutoplayDelay);
      };

      if (heroServiceCarousel && heroSlides.length > 1) {
        setHeroSlide(0);
        startHeroAutoplay();

        heroServiceCarousel.addEventListener("pointerenter", stopHeroAutoplay);
        heroServiceCarousel.addEventListener("pointerleave", startHeroAutoplay);
        heroServiceCarousel.addEventListener("focusin", stopHeroAutoplay);
        heroServiceCarousel.addEventListener("focusout", (event) => {
          if (!heroServiceCarousel.contains(event.relatedTarget)) startHeroAutoplay();
        });

        heroServiceSlides.forEach((slide) => {
          slide.addEventListener("click", () => {
            if (Date.now() < heroSuppressClickUntil) return;
            const slideIndex = [...heroServiceSlides].indexOf(slide);
            if (slideIndex !== activeHeroSlide) setHeroSlide(slideIndex);

            const trigger = document.getElementById(slide.dataset.openTrigger);
            if (!(trigger instanceof HTMLButtonElement)) {
              console.error("No se encontró el botón para abrir el modal del servicio.", slide.dataset.openTrigger);
              return;
            }
            trigger.click();
          });
        });

        heroServiceDots.forEach((dot, index) => {
          dot.addEventListener("click", () => {
            setHeroSlide(index);
            startHeroAutoplay();
          });
        });

        heroServiceViewport.addEventListener("pointerdown", (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          stopHeroAutoplay();
          heroPointerId = event.pointerId;
          heroPointerStartX = event.clientX;
          heroPointerStartY = event.clientY;
          heroPointerDeltaX = 0;
          heroIsDragging = false;
        });

        heroServiceViewport.addEventListener("pointermove", (event) => {
          if (event.pointerId !== heroPointerId) return;

          const deltaX = event.clientX - heroPointerStartX;
          const deltaY = event.clientY - heroPointerStartY;
          if (!heroIsDragging && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
            heroPointerId = null;
            return;
          }
          if (!heroIsDragging && Math.abs(deltaX) > 8) {
            heroIsDragging = true;
            heroServiceViewport.classList.add("is-dragging");
            heroServiceViewport.setPointerCapture(event.pointerId);
          }
          if (!heroIsDragging) return;

          event.preventDefault();
          heroPointerDeltaX = deltaX;
          positionHeroSlides(deltaX);
        });

        const finishHeroPointer = (event) => {
          if (event.pointerId !== heroPointerId) return;

          const wasDragging = heroIsDragging;
          const threshold = Math.max(42, heroServiceViewport.clientWidth * .12);
          heroPointerId = null;
          heroIsDragging = false;
          heroServiceViewport.classList.remove("is-dragging");

          if (wasDragging && Math.abs(heroPointerDeltaX) >= threshold) {
            const direction = heroPointerDeltaX < 0 ? 1 : -1;
            const nextIndex = (activeHeroSlide + direction + heroSlides.length) % heroSlides.length;
            heroSuppressClickUntil = Date.now() + 400;
            setHeroSlide(nextIndex);
          } else {
            positionHeroSlides();
          }

          heroPointerDeltaX = 0;
          startHeroAutoplay();
        };

        heroServiceViewport.addEventListener("pointerup", finishHeroPointer);
        heroServiceViewport.addEventListener("pointercancel", finishHeroPointer);
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

          const validArticles = news.filter((item) => (
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
          const seenTitles = new Set();
          const articles = validArticles.filter((item) => {
            const title = item.titulo
              .normalize("NFKD")
              .replace(/\p{M}/gu, "")
              .toLocaleLowerCase("es")
              .replace(/[^\p{L}\p{N}]+/gu, " ")
              .trim();
            if (!title || seenTitles.has(title)) return false;
            seenTitles.add(title);
            return true;
          });
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
        pushModalHistory(newsModal);
      }

      if (newsSection) loadNews();

      year.textContent = String(new Date().getFullYear());

      const getUiHistoryState = () => (
        history.state && typeof history.state === "object" ? history.state : {}
      );

      const pushModalHistory = (modal) => {
        history.pushState(
          { ...getUiHistoryState(), [uiHistoryKey]: { type: "modal", id: modal.id } },
          "",
          window.location.href
        );
      };

      const closeCustomModal = (modal, opener) => {
        modal.classList.remove("is-open");
        if (!document.querySelector(".modal[open], .options-modal.is-open")) {
          document.body.classList.remove("modal-open");
        }
        opener.focus();

        const ui = getUiHistoryState()[uiHistoryKey];
        if (ui?.type === "modal" && ui.id === modal.id) history.back();
      };

      const showAuthRequiredModal = () => {
        if (authRequiredModal.open) return;

        authRequiredModal.showModal();
        document.body.classList.add("modal-open");
        pushModalHistory(authRequiredModal);
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
        const openModal = document.querySelector(".modal[open]")
          || document.querySelector(".options-modal.is-open");

        if (openModal && (ui?.type !== "modal" || ui.id !== openModal.id)) {
          if (openModal instanceof HTMLDialogElement) {
            openModal.close();
          } else if (openModal === optionsModal) {
            closeCustomModal(optionsModal, openModalButton);
          } else if (openModal === storesModal) {
            closeCustomModal(storesModal, openStoresModalButton);
          } else if (openModal === consultingModal) {
            closeCustomModal(consultingModal, openConsultingModalButton);
          }
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
          } else if (modal instanceof HTMLElement && modal.classList.contains("options-modal")) {
            modal.classList.add("is-open");
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
            pushModalHistory(modal);
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
        closeCustomModal(optionsModal, openModalButton);
      };

      openModalButton.addEventListener("click", () => {
        if (optionsModal.classList.contains("is-open")) return;
        optionsModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        pushModalHistory(optionsModal);
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
        optionButton.addEventListener("click", () => {
          const target = optionButton.dataset.target;
          switch (target) {
            case "menu-digital":
              window.location.assign("https://cubanfashioner-del.github.io/plantilla-restaurant/");
              break;
            case "tienda-online":
            case "landing-page":
            case "portafolio":
            case "corporativo":
              window.alert(`Opción seleccionada: ${target}`);
              closeOptionsModal();
              break;
            default:
              console.error("La opción seleccionada no tiene un destino válido.", target);
              return;
          }
        });
      });

      const closeStoresModal = () => {
        closeCustomModal(storesModal, openStoresModalButton);
      };

      openStoresModalButton.addEventListener("click", () => {
        if (storesModal.classList.contains("is-open")) return;
        storesModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        pushModalHistory(storesModal);
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
        storeButton.addEventListener("click", () => {
          window.location.assign(storeButton.dataset.storeUrl);
        });
      });

      document.querySelector("#whatsapp-contact-button").addEventListener("click", (event) => {
        const whatsappButton = event.currentTarget;
        window.location.assign(whatsappButton.dataset.whatsappUrl);
      });

      const closeConsultingModal = () => {
        closeCustomModal(consultingModal, openConsultingModalButton);
      };

      openConsultingModalButton.addEventListener("click", () => {
        if (consultingModal.classList.contains("is-open")) return;
        consultingModal.classList.add("is-open");
        document.body.classList.add("modal-open");
        pushModalHistory(consultingModal);
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
          pushModalHistory(accountModal);
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
        const phone = accountProfilePhone.value.trim() || null;
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
          accountProfilePhone.value = data.phone || "";
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
        accountLabel.textContent = isSignedIn ? "Mi cuenta" : "Inicia o regístrate";
        accountLink.setAttribute(
          "aria-label",
          isSignedIn ? `Cuenta de ${session.user.email}` : "Inicia o regístrate"
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
          const callbackQuery = new URLSearchParams(window.location.search);
          const callbackFragment = new URLSearchParams(window.location.hash.slice(1));
          const tokenHash = callbackQuery.get("token_hash") || callbackFragment.get("token_hash");
          const verificationType = callbackQuery.get("type") || callbackFragment.get("type");
          let verificationSucceeded = false;
          if (tokenHash) {
            if (!["signup", "email", "email_change"].includes(verificationType)) {
              throw new Error("El enlace de verificación tiene un tipo no admitido.");
            }
            const { error: verificationError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: verificationType
            });
            if (verificationError) throw verificationError;
            verificationSucceeded = true;
          }
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          let session = data.session;
          if (session) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            session = { ...session, user: userData.user };
          }
          if (emailConfirmationRedirect) {
            verificationSucceeded = verificationSucceeded || Boolean(session?.user.email_confirmed_at);
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;
            cleanVerificationUrl();
            session = null;
            setAccountSession(null);
            await verificationMinimumDelay;
            showVerificationResult(verificationSucceeded);
          } else {
            setAccountSession(session);
          }
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
          if (emailConfirmationRedirect) {
            if (supabaseClient) {
              try {
                const { error: signOutError } = await supabaseClient.auth.signOut();
                if (signOutError) throw signOutError;
              } catch (signOutError) {
                console.error("No se pudo cerrar la sesión después de verificar el correo:", signOutError);
              }
            }
            cleanVerificationUrl();
            await verificationMinimumDelay;
            showVerificationResult(false);
          } else {
            authStatus.dataset.state = "error";
            authStatus.textContent = "No se pudo comprobar el estado de la sesión.";
            authStatus.hidden = false;
          }
        }
      }

      authInitializationPromise = initializeAuth();
    })();
