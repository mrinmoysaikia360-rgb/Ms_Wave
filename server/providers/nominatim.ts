import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export const nominatimProvider: SearchProvider = {
  id: 'nominatim',
  name: 'OpenStreetMap',
  supportedCategories: ['maps', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 8, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&extratags=1&limit=${limit}`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0 (contact@mswave.search)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`OpenStreetMap Nominatim returned status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((place: any, index: number) => {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      const name = place.name || place.display_name.split(',')[0];
      const type = place.type ? place.type.replace(/_/g, ' ') : 'Location';
      const categoryType = place.category || 'Geographical Place';

      const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;

      // OpenStreetMap static tile preview URL
      const staticThumb = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=13&l=map&size=450,250&pt=${lon},${lat},pm2rdm`;

      return {
        id: `osm-${place.place_id || index}`,
        title: name,
        url: mapUrl,
        description: place.display_name,
        source: 'OpenStreetMap',
        type: 'map',
        thumbnail: place.icon || undefined,
        score: 40 - index * 3,
        metadata: {
          lat,
          lon,
          placeType: type,
          category: categoryType,
          importance: place.importance,
          boundingBox: place.boundingbox,
          address: place.address,
          osmId: place.osm_id,
          osmType: place.osm_type,
          osmMapUrl: mapUrl,
        },
      };
    });
  },
};
