import React from 'react';

/**
 * ErrorBoundary — atrapa errores de render/lifecycle en su subárbol
 * para evitar que la aplicación entera quede en blanco.
 *
 * Uso:
 *   <ErrorBoundary fallback={<div>Oops</div>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * Props:
 *   - children: subárbol protegido
 *   - fallback: nodo a mostrar si hay error (opcional)
 *   - onError(error, info): callback opcional para logging
 *   - resetKeys: array; si cambia alguno, se resetea el estado de error
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log sin crashear
    try {
      console.error('🛡️ ErrorBoundary atrapó un error:', error);
      if (info && info.componentStack) {
        console.error(info.componentStack);
      }
      if (typeof this.props.onError === 'function') {
        this.props.onError(error, info);
      }
    } catch {
      // never throw from catcher
    }
  }

  componentDidUpdate(prevProps) {
    const prev = prevProps.resetKeys || [];
    const curr = this.props.resetKeys || [];
    if (this.state.hasError && prev.length === curr.length) {
      for (let i = 0; i < curr.length; i++) {
        if (prev[i] !== curr[i]) {
          this.setState({ hasError: false, error: null });
          break;
        }
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      // Fallback visual mínimo: NO pantalla blanca
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#000',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Ha ocurrido un problema
          </h2>
          <p style={{ opacity: 0.75, marginBottom: 20, maxWidth: 360 }}>
            Algo no se mostró correctamente. Puedes continuar usando la app.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              background: '#fff',
              color: '#000',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
