package com.votatok.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // ============================================================
            // EDGE-TO-EDGE DISPLAY (Android moderno)
            // Permite que la WebView se extienda detrás de las barras
            // del sistema (status bar + navigation bar). El contenido
            // usa env(safe-area-inset-*) en CSS para no quedar cortado.
            // ============================================================
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

            // Hacer la status bar y navigation bar TRANSPARENTES para
            // que se vea el contenido de la app detrás de ellas. Las
            // safe-area-insets del WebView compensan el espacio.
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);

            // Asegurar que los íconos del sistema sean visibles
            // En pantalla oscura (feed) los íconos deben ser blancos.
            // En pantalla clara los íconos deben ser oscuros.
            // El plugin StatusBar de Capacitor controla esto dinámicamente.
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                // Por defecto, íconos claros (para fondos oscuros del feed)
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            }

            // Android 10+: evitar que el sistema dibuje un contraste
            // (scrim) automático detrás de las barras del sistema.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                getWindow().setStatusBarContrastEnforced(false);
                getWindow().setNavigationBarContrastEnforced(false);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
