package com.votatok.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private int statusBarHeightDp = 0;
    private int navBarHeightDp = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // ============================================================
            // EDGE-TO-EDGE DISPLAY - Estilo TikTok
            // La WebView se extiende detrás de las barras del sistema.
            // Los insets reales se inyectan como CSS variables.
            // ============================================================
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

            // Status bar y navigation bar TRANSPARENTES
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);

            // Iconos claros por defecto (fondos oscuros del feed)
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            }

            // Android 10+: sin scrim automático
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                getWindow().setStatusBarContrastEnforced(false);
                getWindow().setNavigationBarContrastEnforced(false);
            }

            // ============================================================
            // INYECTAR SAFE-AREA INSETS REALES EN LA WEBVIEW
            // Esto es 100% confiable porque usa WindowInsetsCompat de
            // Android, que conoce las dimensiones exactas del sistema.
            // ============================================================
            setupSafeAreaInsets();

        } catch (Exception e) {
            Log.e(TAG, "Error en onCreate", e);
        }
    }

    /**
     * Detecta los insets reales del sistema (status bar, nav bar)
     * y los inyecta en la WebView como CSS custom properties.
     */
    private void setupSafeAreaInsets() {
        View decorView = getWindow().getDecorView();

        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            Insets statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets navBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());

            float density = getResources().getDisplayMetrics().density;

            // WindowInsets devuelve valores en px físicos.
            // CSS en WebView usa dp (device-independent pixels).
            // 1 CSS px = 1 dp en Android WebView con viewport width=device-width
            statusBarHeightDp = Math.round(statusBars.top / density);
            navBarHeightDp = Math.round(navBars.bottom / density);

            Log.d(TAG, "Safe-area insets: top=" + statusBarHeightDp + "dp, bottom=" + navBarHeightDp + "dp"
                    + " (raw px: top=" + statusBars.top + ", bottom=" + navBars.bottom + ", density=" + density + ")");

            // Inyectar en la WebView
            injectSafeAreaCSS();

            return windowInsets;
        });

        // Forzar que se dispare el listener
        ViewCompat.requestApplyInsets(decorView);
    }

    /**
     * Inyecta las CSS custom properties en la WebView.
     * Se llama cada vez que cambian los insets y después de cada carga de página.
     */
    private void injectSafeAreaCSS() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView == null) return;

            String js =
                "document.documentElement.style.setProperty('--safe-area-inset-top','" + statusBarHeightDp + "px');" +
                "document.documentElement.style.setProperty('--safe-area-inset-bottom','" + navBarHeightDp + "px');" +
                "window.__NATIVE_SAFE_AREA__={top:" + statusBarHeightDp + ",bottom:" + navBarHeightDp + "};" +
                "console.log('📱 Native safe-area inyectada: top=" + statusBarHeightDp + "px, bottom=" + navBarHeightDp + "px');";

            webView.post(() -> {
                webView.evaluateJavascript(js, null);
            });

            Log.d(TAG, "CSS safe-area inyectada: top=" + statusBarHeightDp + "px, bottom=" + navBarHeightDp + "px");

        } catch (Exception e) {
            Log.e(TAG, "Error inyectando safe-area CSS", e);
        }
    }
}
