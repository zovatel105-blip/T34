// ✅ Configuración automática de entorno para proyectos Emergent.sh
// No requiere .env, ni rebuilds, ni cambios al mover de cuenta.

const hostname = window.location.hostname;

// 📱 Detección de Capacitor/Cordova (app móvil nativa)
// En APK con androidScheme="https", hostname === "localhost" pero NO debemos
// intentar hablar con http://localhost:8001 porque ese es el localhost DEL
// MÓVIL, no del servidor. Debemos usar siempre REACT_APP_BACKEND_URL.
const isCapacitorNative =
  typeof window !== 'undefined' &&
  (
    // @ts-ignore
    !!window.Capacitor?.isNativePlatform?.() ||
    !!window.cordova ||
    // User agent check (Android WebView dentro de Capacitor)
    /\bwv\b/i.test(navigator.userAgent || '') && hostname === 'localhost'
  );

// URL base del backend (se detecta automáticamente)
let API_URL = "";

/**
 * Lógica principal:
 * - App nativa (Capacitor/Cordova) → usa REACT_APP_BACKEND_URL (obligatorio)
 * - Localhost (navegador dev) → usa backend local
 * - Subdominio de Emergent.sh → genera URL del backend automáticamente
 * - Otro dominio → intenta resolver por API central de configuración
 */
async function detectEnvironment() {
  if (isCapacitorNative) {
    // 📱 APK / iOS nativo — SIEMPRE usar la URL embebida en build time.
    // Nunca caer a http://localhost:8001 porque es el localhost del dispositivo.
    API_URL = process.env.REACT_APP_BACKEND_URL || "";
    if (!API_URL) {
      console.error(
        "❌ APP NATIVA sin REACT_APP_BACKEND_URL. Reconstruye con la URL correcta en frontend/.env y ejecuta: yarn build && npx cap sync android"
      );
    } else {
      console.log("📱 Entorno APP NATIVA detectado:", API_URL);
    }
  } else if (hostname.includes("localhost")) {
    // 🧩 Entorno local (navegador dev)
    API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
    console.log("🏠 Entorno LOCAL detectado:", API_URL);
  } else if (hostname.endsWith(".emergent.sh")) {
    // 🧩 Entorno Emergent.sh (cuenta automática)
    const subdomain = hostname.split(".")[0];
    API_URL = `https://api.${subdomain}.emergent.sh`;
    console.log("🚀 Entorno EMERGENT.SH detectado:", API_URL);
  } else if (hostname.endsWith(".emergentagent.com")) {
    // 🧩 Entorno Emergent Agent (preview/producción)
    // Para dominios como user-msg-error-fix.preview.emergentagent.com
    // La API está en el mismo dominio, usando rutas con /api prefix
    API_URL = `https://${hostname}`;
    console.log("🚀 Entorno EMERGENT AGENT detectado:", API_URL);
  } else {
    // 🧩 Dominio personalizado → pedir configuración dinámica
    try {
      const response = await fetch(
        `https://config.emergent.sh/resolve?host=${hostname}`
      );
      const cfg = await response.json();
      if (cfg && cfg.api_url) {
        API_URL = cfg.api_url;
        console.log("🌐 Configuración DINÁMICA obtenida:", API_URL);
      } else {
        console.warn("⚠️ No se pudo resolver configuración remota, usando fallback.");
        API_URL = "https://api.default.emergent.sh";
      }
    } catch (err) {
      console.error("❌ Error resolviendo configuración dinámica:", err);
      API_URL = "https://api.default.emergent.sh";
      console.log("🔄 Usando URL fallback:", API_URL);
    }
  }

  return {
    HOSTNAME: hostname,
    API_URL,
    IS_LOCAL: hostname.includes("localhost") && !isCapacitorNative,
    IS_NATIVE: isCapacitorNative,
    IS_EMERGENT: hostname.endsWith(".emergent.sh") || hostname.endsWith(".emergentagent.com"),
    SUBDOMAIN: hostname.endsWith(".emergent.sh") ? hostname.split(".")[0] : hostname.endsWith(".emergentagent.com") ? hostname.split(".")[0] : null,
  };
}

// Función para obtener configuración de forma síncrona después de inicialización
let envConfig = null;

export const initializeEnvironment = async () => {
  if (!envConfig) {
    envConfig = await detectEnvironment();
  }
  return envConfig;
};

// Getter síncrono para usar después de inicialización
export const getEnvironment = () => {
  if (!envConfig) {
    throw new Error("❌ Entorno no inicializado. Llama a initializeEnvironment() primero.");
  }
  return envConfig;
};

// Para compatibilidad, inicializar inmediatamente (SÍNCRONO) para todos los
// casos conocidos, evitando race conditions donde código llame a
// getEnvironment() antes de que `initializeEnvironment()` async termine.
if (isCapacitorNative) {
  // 📱 APK / iOS — siempre usar REACT_APP_BACKEND_URL embebido
  envConfig = {
    HOSTNAME: hostname,
    API_URL: process.env.REACT_APP_BACKEND_URL || "",
    IS_LOCAL: false,
    IS_NATIVE: true,
    IS_EMERGENT: false,
    SUBDOMAIN: null,
  };
  if (!envConfig.API_URL) {
    console.error(
      "❌ FATAL: APK sin REACT_APP_BACKEND_URL. La app no podrá conectar al backend."
    );
  }
} else if (hostname.includes("localhost")) {
  envConfig = {
    HOSTNAME: hostname,
    API_URL: process.env.REACT_APP_BACKEND_URL || "http://localhost:8001",
    IS_LOCAL: true,
    IS_NATIVE: false,
    IS_EMERGENT: false,
    SUBDOMAIN: null,
  };
} else if (hostname.endsWith(".emergent.sh")) {
  const subdomain = hostname.split(".")[0];
  envConfig = {
    HOSTNAME: hostname,
    API_URL: `https://api.${subdomain}.emergent.sh`,
    IS_LOCAL: false,
    IS_NATIVE: false,
    IS_EMERGENT: true,
    SUBDOMAIN: subdomain,
  };
} else if (hostname.endsWith(".emergentagent.com") || hostname.endsWith(".emergent.host")) {
  // Preview URLs y deploys de Emergent — backend en el mismo dominio
  envConfig = {
    HOSTNAME: hostname,
    API_URL: `https://${hostname}`,
    IS_LOCAL: false,
    IS_NATIVE: false,
    IS_EMERGENT: true,
    SUBDOMAIN: hostname.split(".")[0],
  };
} else if (process.env.REACT_APP_BACKEND_URL) {
  // Dominio personalizado con URL embebida en build time
  envConfig = {
    HOSTNAME: hostname,
    API_URL: process.env.REACT_APP_BACKEND_URL,
    IS_LOCAL: false,
    IS_NATIVE: false,
    IS_EMERGENT: false,
    SUBDOMAIN: null,
  };
}

// Export por defecto como promesa para await top-level
export default initializeEnvironment();