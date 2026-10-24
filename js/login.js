const SUPABASE_URL = "https://fzgkaolxngitwlatsusf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2thb2x4bmdpdHdsYXRzdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTE5MDAsImV4cCI6MjEwODI2NzkwMH0.l_l4MV9Scu7PTZLztGam8DP7HGRCh93fCosA4R3m5P4";
const LOGIN_REDIRECT = new URL("./index.html", window.location.href).href;

const form = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const confirmPasswordInput = document.querySelector("#confirm-password");
const rememberInput = document.querySelector("#remember-me");
const rememberOption = document.querySelector(".remember-option");
const submitButton = document.querySelector("#login-submit");
const submitLabel = submitButton.querySelector(".login-submit-label");
const message = document.querySelector("#login-message");
const passwordToggle = document.querySelector("#password-toggle");
const forgotPasswordLink = document.querySelector("#forgot-password");
const accountPrompt = document.querySelector("#account-prompt");
const accountToggle = document.querySelector("#account-toggle");
const themeButton = document.querySelector("#theme-toggle");
const themeLabel = document.querySelector("#theme-toggle-label");
const themeColor = document.querySelector('meta[name="theme-color"]');
const currentYear = document.querySelector("#current-year");

let supabaseClient = null;
let clientPersistence = null;
let createClientPromise = null;
let isRegisterMode = false;
const accountModeHistoryKey = "cftAccountMode";

currentYear.textContent = String(new Date().getFullYear());

function setMessage(text, state = "info") {
  message.textContent = text;
  message.dataset.state = state;
  message.hidden = !text;
}

function setLoading(isLoading, label = "Iniciar sesión") {
  submitButton.disabled = isLoading;
  submitButton.setAttribute("aria-busy", String(isLoading));
  submitLabel.textContent = isLoading ? "Procesando…" : label;
}

function updateAccountMode(registerMode) {
  isRegisterMode = registerMode;
  document.querySelector("#login-title").textContent = registerMode ? "Crear cuenta" : "Iniciar sesión";
  document.querySelector(".login-card-kicker").textContent = registerMode ? "Únete a CFT" : "Bienvenido de vuelta";
  document.querySelector(".login-card-heading p").textContent = registerMode
    ? "Crea tu cuenta para acceder a tu espacio de cliente."
    : "Ingresa tus datos para acceder a tu cuenta.";
  submitLabel.textContent = registerMode ? "Crear cuenta" : "Iniciar sesión";
  accountPrompt.innerHTML = registerMode
    ? '¿Ya tienes una cuenta? <a href="#iniciar-sesion" id="account-toggle">Inicia sesión</a>'
    : '¿Aún no tienes cuenta? <a href="#registrarse" id="account-toggle">Regístrate</a>';
  confirmPasswordField.hidden = !registerMode;
  confirmPasswordInput.disabled = !registerMode;
  confirmPasswordInput.required = registerMode;
  passwordInput.minLength = registerMode ? 6 : 0;
  passwordInput.autocomplete = registerMode ? "new-password" : "current-password";
  forgotPasswordLink.hidden = registerMode;
  rememberOption.hidden = registerMode;
  setMessage("");
}

function navigateAccountMode(registerMode) {
  const mode = registerMode ? "register" : "login";
  if (history.state?.[accountModeHistoryKey] === mode) return;

  const state = history.state && typeof history.state === "object" ? history.state : {};
  history.pushState({ ...state, [accountModeHistoryKey]: mode }, "", window.location.href);
  updateAccountMode(registerMode);
}

window.addEventListener("popstate", (event) => {
  updateAccountMode(event.state?.[accountModeHistoryKey] === "register");
});

if (history.state?.[accountModeHistoryKey] === "register") {
  updateAccountMode(true);
}

async function getSupabaseClient(rememberSession) {
  if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_ANON_KEY) {
    throw new Error("CONFIGURATION");
  }

  if (!supabaseClient || clientPersistence !== rememberSession) {
    if (!createClientPromise) {
      createClientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
        .then(({ createClient }) => createClient)
        .catch((error) => {
          createClientPromise = null;
          throw error;
        });
    }
    const createClient = await createClientPromise;
    const storage = rememberSession ? window.localStorage : window.sessionStorage;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage
      }
    });
    clientPersistence = rememberSession;
  }

  return supabaseClient;
}

function showAuthError(error) {
  if (error.message === "CONFIGURATION") {
    return "El acceso todavía no está configurado. Añade la URL y la clave pública de tu proyecto Supabase en js/login.js.";
  }

  if (error.status === 400 || error.status === 401) {
    return "El correo electrónico o la contraseña no son correctos.";
  }

  if (!navigator.onLine) {
    return "No hay conexión a Internet. Comprueba tu conexión e inténtalo de nuevo.";
  }

  if (error instanceof TypeError) {
    return "No se pudo conectar con el servicio de autenticación. Comprueba tu conexión e inténtalo de nuevo.";
  }

  return "No se pudo completar la solicitud. Inténtalo de nuevo en unos momentos.";
}

passwordToggle.addEventListener("click", () => {
  const shouldShowPassword = passwordInput.type === "password";
  passwordInput.type = shouldShowPassword ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
  passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Ocultar contraseña" : "Mostrar contraseña");
});

accountPrompt.addEventListener("click", (event) => {
  if (event.target.closest("#account-toggle")) {
    event.preventDefault();
    navigateAccountMode(!isRegisterMode);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  if (!form.reportValidity()) return;

  if (isRegisterMode && passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Las contraseñas no coinciden.");
    confirmPasswordInput.reportValidity();
    confirmPasswordInput.focus();
    return;
  }

  setLoading(true);

  try {
    const supabase = await getSupabaseClient(rememberInput.checked);
    const email = emailInput.value.trim();

    if (isRegisterMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordInput.value,
        options: { emailRedirectTo: LOGIN_REDIRECT }
      });

      if (error) throw error;

      if (data.session) {
        window.location.assign(LOGIN_REDIRECT);
      } else {
        setMessage("Si el registro puede completarse con ese correo, recibirás un mensaje para confirmar la dirección y activar el acceso.", "success");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput.value
      });

      if (error) throw error;
      window.location.assign(LOGIN_REDIRECT);
    }
  } catch (error) {
    console.error(isRegisterMode ? "Error al crear la cuenta:" : "Error al iniciar sesión:", error);
    setMessage(showAuthError(error), "error");
  } finally {
    setLoading(false, isRegisterMode ? "Crear cuenta" : "Iniciar sesión");
  }
});

passwordInput.addEventListener("input", () => {
  confirmPasswordInput.setCustomValidity("");
});

confirmPasswordInput.addEventListener("input", () => {
  confirmPasswordInput.setCustomValidity("");
});

forgotPasswordLink.addEventListener("click", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = emailInput.value.trim();
  if (!email) {
    emailInput.focus();
    setMessage("Escribe tu correo electrónico para enviarte el enlace de recuperación.", "error");
    return;
  }

  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  setLoading(true, "Enviar enlace de recuperación");

  try {
    const supabase = await getSupabaseClient(rememberInput.checked);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("./login.html", window.location.href).href
    });

    if (error) throw error;
    setMessage("Si existe una cuenta asociada, recibirás un correo con los pasos para restablecer la contraseña.", "success");
  } catch (error) {
    console.error("Error al solicitar el restablecimiento de contraseña:", error);
    setMessage(showAuthError(error), "error");
  } finally {
    setLoading(false, "Iniciar sesión");
  }
});

function setTheme(theme, savePreference = false) {
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
}

setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
themeButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme, true);
});
