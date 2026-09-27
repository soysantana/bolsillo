export function passwordChecks(password: string) {
  return [
    { label: '8 caracteres como mínimo', valid: password.length >= 8 },
    { label: 'Mayúscula y minúscula', valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    {
      label: 'Un número y un símbolo',
      valid: /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password),
    },
  ];
}
