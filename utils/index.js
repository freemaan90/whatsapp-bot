 export function normalizePhoneNumber(phone) {
  // Si empieza con 549 (Argentina + móvil), lo reemplazamos por 54
  if (phone.startsWith("549")) {
    return "54" + phone.slice(3);
  }
  return phone;
}

