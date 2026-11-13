// Same check as functions/src/senior.ts findInternalData (a test keeps them equal).
// Runs in the browser first, so internal data is caught before it is sent.

export function findInternalData(text: string): string[] {
  const found: string[] = [];
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text)) found.push('an IP address');
  if (/arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:\d{12}:/i.test(text)) found.push('an ARN with an account id');
  else if (/(?<![\d.])\d{12}(?![\d.])/.test(text)) found.push('a 12-digit account id');
  if (/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/.test(text)) found.push('an access key');
  if (/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|local|corp|lan|intra)\b/i.test(text)) found.push('an internal host name');
  if (/\bip-\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}\b/i.test(text)) found.push('a server host name');
  if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(text)) found.push('an email address');
  return found;
}
