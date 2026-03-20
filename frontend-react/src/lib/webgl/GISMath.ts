/**
 * GIS Mathematical Utilities
 * Pure Matrix-4 operations for GIS-to-ClipSpace projection without Three.js.
 */

export class GISMath {
  /**
   * Creates a projection matrix for a 3D view.
   */
  static perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  /**
   * Creates an orthogonal projection (for flat HUD elements).
   */
  static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    
    return new Float32Array([
      -2 * lr, 0, 0, 0,
      0, -2 * bt, 0, 0,
      0, 0, 2 * nf, 0,
      (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
    ]);
  }

  /**
   * LookAt Matrix implementation.
   */
  static lookAt(eye: number[], target: number[], up: number[]): Float32Array {
    const z = this.normalize(this.subtract(eye, target));
    const x = this.normalize(this.cross(up, z));
    const y = this.normalize(this.cross(z, x));
    
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -this.dot(x, eye), -this.dot(y, eye), -this.dot(z, eye), 1
    ]);
  }

  static multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    return out;
  }

  static subtract(a: number[], b: number[]): number[] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  static add(a: number[], b: number[]): number[] {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  static scale(v: number[], s: number): number[] {
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  static normalize(v: number[]): number[] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
  }

  static cross(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  static dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  /**
   * Computes solar azimuth and elevation for a given geographic location and UTC time.
   * Uses the NOAA simplified solar position algorithm (±0.01° accuracy — sufficient for lighting).
   *
   * @param lat     Decimal degrees latitude
   * @param lon     Decimal degrees longitude
   * @param utcDate JavaScript Date (UTC)
   * @returns [azimuthDeg, elevationDeg]
   *   azimuth: 0=N, 90=E, 180=S, 270=W
   *   elevation: 0=horizon, 90=zenith, negative=below horizon
   */
  static sunPosition(lat: number, lon: number, utcDate: Date): [number, number] {
    // Julian Day Number
    const JD = utcDate.getTime() / 86400000 + 2440587.5;
    const n = JD - 2451545.0; // days since J2000.0

    // Mean longitude and mean anomaly (degrees)
    const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
    const gRad = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * Math.PI / 180;

    // Ecliptic longitude (radians)
    const lambdaRad = (L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad)) * Math.PI / 180;

    // Obliquity of ecliptic (radians)
    const epsilonRad = (23.439 - 0.0000004 * n) * Math.PI / 180;

    // Declination
    const sinDec = Math.sin(epsilonRad) * Math.sin(lambdaRad);
    const dec = Math.asin(sinDec);

    // Greenwich Mean Sidereal Time (hours)
    const GMST = (6.697375 + 0.0657098242 * n +
      (utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600) * 1.00273791
    ) % 24;

    // Local Mean Sidereal Time → Hour Angle
    const LMST = ((GMST + lon / 15) % 24 + 24) % 24;
    const RA = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
    const HA = ((LMST * 15 - RA * 180 / Math.PI) * Math.PI / 180);

    const latRad = lat * Math.PI / 180;
    const sinAlt = Math.sin(latRad) * sinDec + Math.cos(latRad) * Math.cos(dec) * Math.cos(HA);
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;

    const cosAlt = Math.cos(Math.asin(sinAlt));
    const cosAz = cosAlt > 0.0001
      ? (sinDec - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt)
      : 0;
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    if (Math.sin(HA) > 0) azimuth = 360 - azimuth;

    return [azimuth, elevation];
  }

  /**
   * Converts solar azimuth/elevation to a normalized directional light vector.
   * Coordinate system: y=up, x=east, z=north (right-hand).
   * Returns ambient low-angle if elevation ≤ 0 (sun below horizon).
   */
  static sunToLightDir(azimuthDeg: number, elevationDeg: number): [number, number, number] {
    if (elevationDeg <= 0) return [0.3, 0.2, 0.8]; // twilight ambient
    const az = azimuthDeg * Math.PI / 180;
    const el = elevationDeg * Math.PI / 180;
    return [
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    ];
  }

  /** Standard 4×4 matrix inverse using cofactor expansion. Returns m unchanged if singular. */
  static invertMat4(m: Float32Array): Float32Array {
    const out = new Float32Array(16);
    const a00=m[0],  a01=m[1],  a02=m[2],  a03=m[3];
    const a10=m[4],  a11=m[5],  a12=m[6],  a13=m[7];
    const a20=m[8],  a21=m[9],  a22=m[10], a23=m[11];
    const a30=m[12], a31=m[13], a32=m[14], a33=m[15];
    const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10;
    const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
    const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30;
    const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
    let det = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if (Math.abs(det) < 1e-15) return m;
    det = 1.0 / det;
    out[0]  = (a11*b11-a12*b10+a13*b09)*det;
    out[1]  = (a02*b10-a01*b11-a03*b09)*det;
    out[2]  = (a31*b05-a32*b04+a33*b03)*det;
    out[3]  = (a22*b04-a21*b05-a23*b03)*det;
    out[4]  = (a12*b08-a10*b11-a13*b07)*det;
    out[5]  = (a00*b11-a02*b08+a03*b07)*det;
    out[6]  = (a32*b02-a30*b05-a33*b01)*det;
    out[7]  = (a20*b05-a22*b02+a23*b01)*det;
    out[8]  = (a10*b10-a11*b08+a13*b06)*det;
    out[9]  = (a01*b08-a00*b10-a03*b06)*det;
    out[10] = (a30*b04-a31*b02+a33*b00)*det;
    out[11] = (a21*b02-a20*b04-a23*b00)*det;
    out[12] = (a11*b07-a10*b09-a12*b06)*det;
    out[13] = (a00*b09-a01*b07+a02*b06)*det;
    out[14] = (a31*b01-a30*b03-a32*b00)*det;
    out[15] = (a20*b03-a21*b01+a22*b00)*det;
    return out;
  }
}
