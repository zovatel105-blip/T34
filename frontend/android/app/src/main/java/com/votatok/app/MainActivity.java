package com.votatok.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "VotaTok";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // ============================================================
            // MODO NO-OVERLAY: El sistema maneja el espacio de la status bar.
            // El contenido NUNCA se superpone con la barra de estado.
            // La status bar tiene su propio espacio reservado arriba.
            // ============================================================
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

            // Status bar NEGRA por defecto (para el feed oscuro)
            // El plugin Capacitor cambia el color dinámicamente según la página
            getWindow().setStatusBarColor(Color.BLACK);

            // Navigation bar transparente o negra
            getWindow().setNavigationBarColor(Color.BLACK);

            // Iconos claros (blancos) por defecto (para fondo oscuro)
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
            // OCULTAR SCROLLBAR NATIVA DEL WEBVIEW
            // CSS no puede ocultar la scrollbar nativa de Android WebView.
            // Esto DEBE hacerse desde Java.
            // ============================================================
            hideNativeScrollbars();

        } catch (Exception e) {
            Log.e(TAG, "Error en onCreate", e);
        }
    }

    /**
     * Oculta las barras de desplazamiento nativas del WebView de Android.
     * CSS scrollbar-width:none y ::-webkit-scrollbar NO funcionan para
     * la scrollbar nativa del WebView. Solo se puede ocultar desde Java.
     */
    private void hideNativeScrollbars() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
                // También ocultar la barra de scroll cuando se arrastra fuera de límites
                webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
                Log.d(TAG, "Scrollbars nativas del WebView ocultadas");
            } else {
                Log.w(TAG, "WebView no disponible aún para ocultar scrollbars");
                // Reintentar después de un delay
                getWindow().getDecorView().postDelayed(this::hideNativeScrollbars, 500);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error ocultando scrollbars", e);
        }
    }
}
