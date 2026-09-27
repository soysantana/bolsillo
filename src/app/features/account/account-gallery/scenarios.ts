import { PreviewScenario, PreviewState } from '../account-demo';
import { accountPaths } from '../account.routes';
export interface ScenarioGroup {
  title: string;
  path: string;
  scenarios: (PreviewScenario & { label: string })[];
}
function scenarios(
  target: string,
  values: [string, PreviewState, string?, ('verify' | 'resend')?][],
) {
  return values.map(([label, state, error, operation]) => ({
    target,
    label,
    state,
    error,
    operation,
  }));
}
export const scenarioGroups: ScenarioGroup[] = [
  {
    title: 'Mi perfil',
    path: accountPaths.account,
    scenarios: scenarios('account', [
      ['Verificación pendiente', 'initial'],
      ['Correo verificado', 'verified'],
    ]),
  },
  {
    title: 'Seguridad',
    path: accountPaths.security,
    scenarios: scenarios('security', [['Centro de seguridad', 'initial']]),
  },
  {
    title: 'Cambiar contraseña',
    path: accountPaths.password,
    scenarios: scenarios('password', [
      ['Inicial', 'initial'],
      ['Campos inválidos', 'invalid'],
      ['Contraseñas diferentes', 'mismatch'],
      [
        'Contraseña actual incorrecta',
        'error',
        'La contraseña actual no es correcta. Revísala e inténtalo otra vez.',
      ],
      ['Guardando', 'loading'],
      ['Error general', 'error', 'No pudimos guardar la contraseña.'],
      ['Éxito', 'success'],
    ]),
  },
  {
    title: 'Sesiones',
    path: accountPaths.sessions,
    scenarios: scenarios('sessions', [
      ['Lista', 'initial'],
      ['Cargando', 'loading'],
      ['Lista vacía', 'empty'],
      [
        'Error y reintento',
        'error',
        'No pudimos cargar tus sesiones. Revisa tu conexión e inténtalo de nuevo.',
      ],
      ['Sesión cerrada', 'success'],
    ]),
  },
  {
    title: 'Cerrar sesión',
    path: '/perfil',
    scenarios: scenarios('logout', [
      ['Diálogo', 'invalid'],
      ['Cerrando sesión', 'loading'],
      ['Error y reintento', 'error', 'No pudimos cerrar sesión. Inténtalo de nuevo.'],
    ]),
  },
  {
    title: 'Iniciar sesión',
    path: '/login',
    scenarios: scenarios('login', [
      ['Inicial', 'initial'],
      ['Cargando', 'loading'],
      [
        'Credenciales incorrectas',
        'error',
        'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.',
      ],
      [
        'Cuenta desactivada',
        'error',
        'Esta cuenta está desactivada. Usa otro correo para iniciar sesión.',
      ],
      [
        'Demasiados intentos',
        'error',
        'Has hecho demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
      ],
      [
        'Error de conexión',
        'error',
        'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.',
      ],
      ['Sesión vencida', 'expired'],
    ]),
  },
  {
    title: 'Crear cuenta',
    path: '/register',
    scenarios: scenarios('register', [
      ['Inicial', 'initial'],
      ['Validación', 'invalid'],
      ['Creando cuenta', 'loading'],
      [
        'Correo registrado',
        'error',
        'Ya hay una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
      ],
      ['Error general', 'error', 'No pudimos crear tu cuenta. Inténtalo de nuevo.'],
    ]),
  },
  {
    title: 'Recuperar contraseña',
    path: '/forgot-password',
    scenarios: scenarios('forgot-password', [
      ['Inicial', 'initial'],
      ['Enviando', 'loading'],
      ['Solicitud recibida', 'success'],
      ['Error y reintento', 'error', 'No pudimos enviar la solicitud. Inténtalo de nuevo.'],
    ]),
  },
  {
    title: 'Nueva contraseña',
    path: '/reset-password',
    scenarios: scenarios('reset-password', [
      ['Enlace recibido', 'initial'],
      ['Enlace inválido o vencido', 'expired'],
      ['Validación', 'invalid'],
      ['Contraseñas diferentes', 'mismatch'],
      ['Guardando', 'loading'],
      ['Error general', 'error', 'No pudimos guardar tu contraseña. Inténtalo de nuevo.'],
      ['Éxito', 'success'],
    ]),
  },
  {
    title: 'Verificar correo',
    path: '/verify-email',
    scenarios: scenarios('verify-email', [
      ['Pendiente / después de registro', 'initial'],
      ['Verificando', 'loading', undefined, 'verify'],
      ['Verificado', 'verified'],
      ['Enlace inválido o vencido', 'expired'],
      ['Reenviando', 'loading', undefined, 'resend'],
      ['Correo reenviado', 'resent'],
    ]),
  },
  {
    title: 'Eliminar cuenta',
    path: accountPaths.delete,
    scenarios: scenarios('delete', [
      ['Inicial', 'initial'],
      ['Contraseña requerida', 'invalid'],
      [
        'Contraseña incorrecta',
        'error',
        'La contraseña actual no es correcta. Revísala e inténtalo otra vez.',
      ],
      ['Procesando', 'loading'],
      ['Error y reintento', 'error', 'No pudimos eliminar tu cuenta. Inténtalo de nuevo.'],
      ['Cuenta eliminada', 'success'],
    ]),
  },
];
