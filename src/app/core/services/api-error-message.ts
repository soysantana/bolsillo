import { HttpErrorResponse } from '@angular/common/http';

const AUTH_MESSAGE_MAP = new Map<string, string>([
  [
    'Credenciales inválidas',
    'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.',
  ],
  [
    'Tu cuenta está desactivada. Contacta soporte para recuperar el acceso.',
    'Tu cuenta está desactivada. Contacta soporte para recuperar el acceso.',
  ],
  [
    'Email already registered',
    'Ya hay una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
  ],
  [
    'Contraseña actual inválida',
    'La contraseña actual no es correcta. Revísala e inténtalo otra vez.',
  ],
  ['Token inválido', 'Este enlace no es válido o ya venció. Solicita uno nuevo para continuar.'],
]);

export function authApiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const message = responseMessage(error.error);
  if (!message) return null;
  return AUTH_MESSAGE_MAP.get(message) ?? null;
}

function responseMessage(errorBody: unknown): string | null {
  if (!errorBody || typeof errorBody !== 'object') return null;
  if (!('message' in errorBody)) return null;
  const message = errorBody.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message[0] ?? null;
  }
  return null;
}
