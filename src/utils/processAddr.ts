import { CHINA_PROVINCES, COUNTRIES, COUNTY_LEVEL_CITIES } from '../const/geo'
import type { ShopifyOrderExportItem } from '../types'

export function normalizeCity(cityName: string) {
  const parts = cityName.split('市')

  if (parts.length > 1 && parts[1] !== '') {
    return cityName
  }

  return `${parts[0]}市${parts[1] || ''}`
}

export function generateRouzaoPhone(phone: string | number) {
  if (typeof phone === 'string') {
    return phone.replaceAll('+86', '').replaceAll(' ', '')
  } else {
    if (phone.toString().startsWith('86')) {
      return phone.toString().replace('86', '')
    } else {
      return phone
    }
  }
}

export function processAddr(row: ShopifyOrderExportItem) {
  const country = COUNTRIES[row['Shipping Country'] || ''] || ''
  const prov = CHINA_PROVINCES[row['Shipping Province'] || ''] || ''
  const street = String(row['Shipping Street'] || '')
  const zip = row['Shipping Zip'] || ''
  const phone = row['Shipping Phone']
  let city = normalizeCity(String(row['Shipping City'] || ''))

  if (COUNTY_LEVEL_CITIES[city]) {
    city = `${COUNTY_LEVEL_CITIES[city]}${city}`
  }

  const rouzaoAddr = `${prov}${city}${street}`
  const rouzaoPhone = generateRouzaoPhone(row['Shipping Phone'] || '')

  return { country, prov, city, street, zip, phone, rouzaoAddr, rouzaoPhone }
}
