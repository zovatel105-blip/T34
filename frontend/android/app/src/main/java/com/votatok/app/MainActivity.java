package com.votatok.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * MainActivity - MÍNIMA
 *
 * NO configurar ventana/status bar aquí. Capacitor maneja todo
 * via capacitor.config.json (overlaysWebView: false).
 * Configurar desde Java causa race conditions con el plugin
 * de StatusBar en Android 15 (API 35+).
 *
 * Solo ocultamos las scrollbars nativas del WebView.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "VotaTok";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ocultar scrollbars nativas del WebView
        // (CSS no puede ocultar la scrollbar nativa de Android WebView)
        hideNativeScrollbars();
    }

    private void hideNativeScrollbars() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
                webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
                Log.d(TAG, "Scrollbars nativas ocultadas");
            } else {
                // Reintentar si el WebView no está listo
                getWindow().getDecorView().postDelayed(this::hideNativeScrollbars, 300);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error ocultando scrollbars", e);
        }
    }
}
