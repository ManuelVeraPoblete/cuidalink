export function stripChilePrefix(phone: string): string {
  return phone.startsWith('+56') ? phone.slice(3) : phone;
}

export function toChilePhone(subscriberNumber: string): string {
  return `+56${subscriberNumber}`;
}

export function isValidChileSubscriberNumber(subscriberNumber: string): boolean {
  return /^\d{9}$/.test(subscriberNumber);
}
