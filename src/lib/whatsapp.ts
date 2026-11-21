export function whatsAppLink(phone: string, message: string): string {
  let digits: string = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = "91" + digits;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
