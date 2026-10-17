import { z } from 'zod';
import { normalizeCountry, type ModuleDefinition } from '@schubert/contracts';
import { DomainError } from '@schubert/domain';

export function validatedFields(module: ModuleDefinition, payload: Record<string, unknown>, partial = false) {
  const result: Record<string, unknown> = {};
  for (const field of module.fields) {
    let value = payload[field.key];
    const fail = (code: string, message: string): never => { throw new DomainError(code, `${field.label}: ${message}`, 422, { [field.key]: message }); };
    if (value === undefined) {
      if (field.required && !partial) fail('FIELD_REQUIRED', 'Bitte ausfüllen.');
      continue;
    }
    if (value === null || typeof value === 'string' && !value.trim()) {
      if (field.required) fail('FIELD_REQUIRED', 'Bitte ausfüllen. Leerzeichen allein reichen nicht aus.');
      result[field.key] = null;
      continue;
    }
    if (field.type === 'number' || field.type === 'money') {
      const text = String(value).trim().replace(',', '.');
      if (!/^-?\d+(?:\.\d+)?$/.test(text)) fail('DECIMAL', 'Eine eindeutige Zahl eingeben, zum Beispiel 12,5.');
      value = text;
    } else if (field.type === 'checkbox') {
      if (typeof value !== 'boolean') fail('BOOLEAN', 'Bitte Ja oder Nein auswählen.');
    } else if (field.type === 'reference') {
      if (!z.uuid().safeParse(value).success) fail('REFERENCE', 'Einen Eintrag aus der Auswahl wählen.');
    } else if (field.type === 'email') {
      if (typeof value !== 'string' || !z.email().max(320).safeParse(value.trim()).success) fail('EMAIL', 'Eine vollständige E-Mail-Adresse eingeben, zum Beispiel name@betrieb.de.');
      value = (value as string).trim();
    } else if (field.type === 'select') {
      if (!field.options?.some(option => option.value === value)) fail('OPTION', 'Bitte eine verfügbare Option auswählen.');
    } else if (field.type === 'date') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) fail('DATE', 'Ein gültiges Kalenderdatum eingeben.');
    } else if (field.type === 'datetime-local') {
      const date = new Date(value as string);
      if (!Number.isFinite(date.getTime())) fail('DATE', 'Einen gültigen Zeitpunkt eingeben.');
      value = date.toISOString();
    } else {
      if (typeof value !== 'string' || value.length > 20000) fail('TEXT', 'Text mit höchstens 20.000 Zeichen eingeben.');
      if (field.type !== 'textarea') value = (value as string).trim();
    }
    if (field.key === 'country') {
      const code = typeof value === 'string' ? normalizeCountry(value) : undefined;
      if (!code) fail('COUNTRY', 'Ein Land aus der Liste auswählen.');
      value = code;
    }
    if (field.key === 'currency') {
      value = String(value).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(value as string)) fail('CURRENCY', 'Eine dreistellige Belegwährung wie EUR eintragen.');
    }
    if (field.key === 'payment_days' && (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)))) fail('PAYMENT_DAYS', 'Ganze Kalendertage ab 0 eintragen.');
    result[field.key] = value;
  }
  return result;
}
