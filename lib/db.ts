/**
 * Poof — IndexedDB Layer
 * Storing your temporary secrets locally since nobody asked us to.
 */

import { openDB, DBSchema, IDBPDatabase } from "idb"
import { encrypt, decrypt } from "./crypto"

export interface DeviceConfig {
  id: string
  email: string
  domain: string
  createdAt: number
  burnAt: number | null // epoch ms, null = never
  burnDuration: "5min" | "1hour" | "24hours" | "never"
}

export interface ArchivedAddress {
  id: string       // same as the email string (used as key)
  email: string
  domain: string
  createdAt: number
  archivedAt: number
}

export interface StoredEmail {
  id: string
  address: string // which poof address received it
  from: string
  subject: string
  htmlContent: string // AES-GCM encrypted
  textContent: string // AES-GCM encrypted
  receivedAt: number
  read: boolean
  hasOtp: boolean
  hasVerifyLink: boolean
  attachments: StoredAttachment[]
}

export interface StoredAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  dataUrl: string // encrypted base64 data URL
}

interface PoofDB extends DBSchema {
  device: {
    key: string
    value: DeviceConfig
  }
  emails: {
    key: string
    value: StoredEmail
    indexes: { "by-address": string; "by-received": number }
  }
  history: {
    key: string
    value: ArchivedAddress
  }
}

const DB_NAME = "flare-db"
const DB_VERSION = 2

let dbInstance: IDBPDatabase<PoofDB> | null = null

async function getDB(): Promise<IDBPDatabase<PoofDB>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<PoofDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("device")) {
        db.createObjectStore("device", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("emails")) {
        const emailStore = db.createObjectStore("emails", { keyPath: "id" })
        emailStore.createIndex("by-address", "address")
        emailStore.createIndex("by-received", "receivedAt")
      }
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "id" })
      }
    },
  })
  return dbInstance
}

/** Get the device config — prefers the "singleton" key, falls back to most recent */
export async function getDeviceConfig(): Promise<DeviceConfig | undefined> {
  const db = await getDB()
  const singleton = await db.get("device", "singleton")
  if (singleton) return singleton
  // Legacy fallback: find most recently created
  const all = await db.getAll("device")
  if (!all.length) return undefined
  return all.sort((a, b) => b.createdAt - a.createdAt)[0]
}

export async function saveDeviceConfig(config: DeviceConfig): Promise<void> {
  const db = await getDB()
  await db.put("device", config)
}

/** Remove any old UUID-keyed device configs (migration cleanup) */
export async function cleanupOldDeviceConfigs(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll("device")
  for (const record of all) {
    if (record.id !== "singleton") await db.delete("device", record.id)
  }
}

/** Archive the current address before rotating to a new one */
export async function archiveAddress(config: DeviceConfig): Promise<void> {
  const db = await getDB()
  const archived: ArchivedAddress = {
    id: config.email.toLowerCase(),
    email: config.email.toLowerCase(),
    domain: config.domain,
    createdAt: config.createdAt,
    archivedAt: Date.now(),
  }
  await db.put("history", archived)
}

export async function getArchivedAddresses(): Promise<ArchivedAddress[]> {
  const db = await getDB()
  const all = await db.getAll("history")
  return all.sort((a, b) => b.archivedAt - a.archivedAt)
}

export async function deleteArchivedAddress(email: string): Promise<void> {
  const db = await getDB()
  await db.delete("history", email.toLowerCase())
}

/** Save a new email (encrypts content before storing) */
export async function saveEmail(email: Omit<StoredEmail, "htmlContent" | "textContent"> & {
  htmlContent: string
  textContent: string
}): Promise<void> {
  const db = await getDB()
  const encryptedHtml = await encrypt(email.htmlContent)
  const encryptedText = await encrypt(email.textContent)
  await db.put("emails", {
    ...email,
    htmlContent: encryptedHtml,
    textContent: encryptedText,
  })
}

/** Get all emails for an address (decrypts content) */
export async function getEmails(address: string): Promise<StoredEmail[]> {
  const db = await getDB()
  const emails = await db.getAllFromIndex("emails", "by-address", address.toLowerCase())
  return Promise.all(
    emails
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .map(async (e) => ({
        ...e,
        htmlContent: await decrypt(e.htmlContent).catch(() => e.textContent),
        textContent: await decrypt(e.textContent).catch(() => ""),
      }))
  )
}

export async function getEmail(id: string): Promise<StoredEmail | undefined> {
  const db = await getDB()
  const email = await db.get("emails", id)
  if (!email) return undefined
  return {
    ...email,
    htmlContent: await decrypt(email.htmlContent).catch(() => email.textContent),
    textContent: await decrypt(email.textContent).catch(() => ""),
  }
}

export async function getEmailCountForAddress(address: string): Promise<number> {
  const db = await getDB()
  const emails = await db.getAllFromIndex("emails", "by-address", address.toLowerCase())
  return emails.length
}

export async function markEmailRead(id: string): Promise<void> {
  const db = await getDB()
  const email = await db.get("emails", id)
  if (email) await db.put("emails", { ...email, read: true })
}

export async function deleteEmail(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("emails", id)
}

export async function deleteAllEmailsForAddress(address: string): Promise<void> {
  const db = await getDB()
  const emails = await db.getAllFromIndex("emails", "by-address", address.toLowerCase())
  await Promise.all(emails.map((e) => db.delete("emails", e.id)))
}

export async function getUnreadCount(address: string): Promise<number> {
  const db = await getDB()
  const emails = await db.getAllFromIndex("emails", "by-address", address.toLowerCase())
  return emails.filter((e) => !e.read).length
}
