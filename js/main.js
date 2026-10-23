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
      const accountLink = document.querySelector("#nav-account-link");
      const accountLabel = document.querySelector("#nav-account-label");
      const logoutButton = document.querySelector("#nav-logout");
      const logoutLabel = document.querySelector("#nav-logout-label");
      const authStatus = document.querySelector("#auth-status");
      const supabaseUrl = "https://fzgkaolxngitwlatsusf.supabase.co";
      const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2thb2x4bmdpdHdsYXRzdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTE5MDAsImV4cCI6MjEwODI2NzkwMH0.l_l4MV9Scu7PTZLztGam8DP7HGRCh93fCosA4R3m5P4";

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

      const closeMenu = () => {
        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Abrir menú");
      };

      menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
        navigation.classList.toggle("is-open", !isOpen);
      });

      navigation.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) closeMenu();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
      });

      modalTriggers.forEach((trigger) => {
        trigger.addEventListener("click", () => {
          const modal = document.getElementById(trigger.dataset.modal);
          if (modal instanceof HTMLDialogElement) {
            modal.showModal();
            document.body.classList.add("modal-open");
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
        });
      });

      const setAccountSession = (session) => {
        const isSignedIn = Boolean(session);
        accountLabel.textContent = isSignedIn ? "Mi cuenta" : "Iniciar sesión";
        accountLink.setAttribute(
          "aria-label",
          isSignedIn ? `Cuenta de ${session.user.email}` : "Iniciar sesión o crear una cuenta"
        );
        accountLink.title = isSignedIn ? session.user.email : "";
        logoutButton.hidden = !isSignedIn;
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
              authStatus.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
              authStatus.hidden = false;
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
