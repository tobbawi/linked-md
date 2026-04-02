/**
 * Storage abstraction: local filesystem (dev) or Cloudflare R2 (production)
 *
 * Environment-driven:
 *   R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET → R2
 *   Otherwise → local filesystem under /exports/
 */

import fs from 'fs/promises'
import path from 'path'

interface StorageProvider {
  writeFile(filePath: string, content: string): Promise<void>
  readFile(filePath: string): Promise<string | null>
  exists(filePath: string): Promise<boolean>
}

class LocalStorage implements StorageProvider {
  private basePath: string

  constructor(basePath: string = path.join(process.cwd(), 'exports')) {
    this.basePath = basePath
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.basePath, filePath), 'utf-8')
    } catch {
      return null
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.basePath, filePath))
      return true
    } catch {
      return false
    }
  }
}

class R2Storage implements StorageProvider {
  private endpoint: string
  private bucket: string
  private accessKeyId: string
  private secretAccessKey: string

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID!
    this.bucket = process.env.R2_BUCKET || 'linked-md-exports'
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID!
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!
    this.endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${filePath}`
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Authorization': `AWS4-HMAC-SHA256 ${this.accessKeyId}`,
      },
      body: content,
    })
    if (!response.ok) {
      throw new Error(`R2 write failed: ${response.status} ${response.statusText}`)
    }
  }

  async readFile(filePath: string): Promise<string | null> {
    const url = `${this.endpoint}/${this.bucket}/${filePath}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `AWS4-HMAC-SHA256 ${this.accessKeyId}`,
      },
    })
    if (!response.ok) return null
    return response.text()
  }

  async exists(filePath: string): Promise<boolean> {
    const url = `${this.endpoint}/${this.bucket}/${filePath}`
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': `AWS4-HMAC-SHA256 ${this.accessKeyId}`,
      },
    })
    return response.ok
  }
}

function createStorage(): StorageProvider {
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) {
    return new R2Storage()
  }
  return new LocalStorage()
}

export const storage = createStorage()
export type { StorageProvider }
