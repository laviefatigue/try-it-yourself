// GPX file parser and generator

import { parseString, Builder } from 'xml2js';
import { Waypoint, Route } from '../types/sailing';

export interface GPXParseResult {
  waypoints: Waypoint[];
  error?: string;
}

/**
 * Parse GPX file content into waypoints
 */
export function parseGPX(gpxContent: string): Promise<GPXParseResult> {
  return new Promise((resolve) => {
    parseString(gpxContent, (err, result) => {
      if (err) {
        resolve({
          waypoints: [],
          error: `Failed to parse GPX file: ${err.message}`,
        });
        return;
      }

      try {
        const waypoints: Waypoint[] = [];
        let order = 0;

        // Check for waypoints in <wpt> tags
        if (result.gpx?.wpt) {
          for (const wpt of result.gpx.wpt) {
            waypoints.push({
              id: `wpt-${Date.now()}-${order}`,
              name: wpt.name?.[0] || `Waypoint ${order + 1}`,
              latitude: parseFloat(wpt.$.lat),
              longitude: parseFloat(wpt.$.lon),
              order: order++,
            });
          }
        }

        // Check for route waypoints in <rte><rtept> tags
        if (result.gpx?.rte) {
          for (const rte of result.gpx.rte) {
            if (rte.rtept) {
              for (const rtept of rte.rtept) {
                waypoints.push({
                  id: `rtept-${Date.now()}-${order}`,
                  name: rtept.name?.[0] || `Waypoint ${order + 1}`,
                  latitude: parseFloat(rtept.$.lat),
                  longitude: parseFloat(rtept.$.lon),
                  order: order++,
                });
              }
            }
          }
        }

        // Check for track waypoints in <trk><trkseg><trkpt> tags
        if (result.gpx?.trk) {
          for (const trk of result.gpx.trk) {
            if (trk.trkseg) {
              for (const trkseg of trk.trkseg) {
                if (trkseg.trkpt) {
                  for (const trkpt of trkseg.trkpt) {
                    waypoints.push({
                      id: `trkpt-${Date.now()}-${order}`,
                      name: trkpt.name?.[0] || `Waypoint ${order + 1}`,
                      latitude: parseFloat(trkpt.$.lat),
                      longitude: parseFloat(trkpt.$.lon),
                      order: order++,
                    });
                  }
                }
              }
            }
          }
        }

        if (waypoints.length === 0) {
          resolve({
            waypoints: [],
            error: 'No waypoints found in GPX file',
          });
          return;
        }

        resolve({ waypoints });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        resolve({
          waypoints: [],
          error: `Error processing GPX data: ${errorMessage}`,
        });
      }
    });
  });
}

/**
 * Generate GPX file content from route
 */
export function generateGPX(route: Route): string {
  const gpxObject = {
    gpx: {
      $: {
        version: '1.1',
        creator: 'Lagoon 440 Sailing App',
        xmlns: 'http://www.topografix.com/GPX/1/1',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation':
          'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
      },
      metadata: [
        {
          name: [route.name],
          time: [route.updatedAt.toISOString()],
        },
      ],
      rte: [
        {
          name: [route.name],
          rtept: route.waypoints.map((wp) => ({
            $: {
              lat: wp.latitude.toString(),
              lon: wp.longitude.toString(),
            },
            name: [wp.name],
            desc: [wp.arrived ? `Arrived: ${wp.arrivalTime?.toISOString()}` : 'Not visited'],
          })),
        },
      ],
    },
  };

  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
  });

  return builder.buildObject(gpxObject);
}

/**
 * Validate GPX file content
 */
export function validateGPX(gpxContent: string): { valid: boolean; error?: string } {
  try {
    // Basic validation - check if it's valid XML with gpx root element
    if (!gpxContent.includes('<gpx') || !gpxContent.includes('</gpx>')) {
      return {
        valid: false,
        error: 'Invalid GPX format: Missing <gpx> root element',
      };
    }

    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `GPX validation error: ${errorMessage}`,
    };
  }
}

/**
 * Create sample GPX content for testing
 */
export function createSampleGPX(): string {
  const sampleRoute: Route = {
    id: 'sample',
    name: 'Sample Caribbean Route',
    waypoints: [
      {
        id: '1',
        name: 'Marina Fort-de-France',
        latitude: 14.6037,
        longitude: -61.0589,
        order: 0,
      },
      {
        id: '2',
        name: 'St. Anne',
        latitude: 14.4333,
        longitude: -60.8833,
        order: 1,
      },
      {
        id: '3',
        name: 'St. Lucia - Rodney Bay',
        latitude: 14.0833,
        longitude: -60.9667,
        order: 2,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return generateGPX(sampleRoute);
}
