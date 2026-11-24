/*
 * Prueba de carga - Servicio de login (FakeStoreAPI)
 * Herramienta: k6
 *
 * Requisitos del ejercicio:
 *   - Datos de entrada parametrizados desde archivo .csv (user, passwd)
 *   - Alcanzar al menos 20 TPS
 *   - Tiempo de respuesta maximo permitido: 1,5 segundos
 *   - Tasa de error aceptable: menor al 3% del total de peticiones
 */

import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// ---------------------------------------------------------------------------
// 1. Configuracion general (se puede sobrescribir con variables de entorno)
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'https://fakestoreapi.com';
const TPS = Number(__ENV.TPS || 20);            // transacciones por segundo objetivo
const DURACION = __ENV.DURACION || '2m';        // tiempo sostenido de carga
const SLA_MS = 1500;                            // tiempo de respuesta maximo (1,5 s)

// ---------------------------------------------------------------------------
// 2. Lectura del archivo CSV
//    SharedArray carga el archivo una sola vez y lo comparte entre todos los
//    usuarios virtuales (ahorra memoria).
// ---------------------------------------------------------------------------
const usuarios = new SharedArray('usuarios', function () {
  const lineas = open('../data/usuarios.csv')
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);

  // Se omite la cabecera (user,passwd)
  return lineas.slice(1).map((linea) => {
    const separador = linea.indexOf(',');
    return {
      username: linea.substring(0, separador),
      password: linea.substring(separador + 1),
    };
  });
});

// ---------------------------------------------------------------------------
// 3. Escenario y criterios de aceptacion (thresholds)
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    login_carga_constante: {
      // Modelo abierto: k6 inicia un numero fijo de iteraciones por segundo,
      // sin importar cuanto tarde el servidor. Cada iteracion = 1 login,
      // por lo tanto rate = TPS.
      executor: 'constant-arrival-rate',
      rate: TPS,
      timeUnit: '1s',
      duration: DURACION,
      preAllocatedVUs: 20,   // usuarios virtuales listos desde el inicio
      maxVUs: 60,            // tope si el servidor responde lento
    },
  },

  thresholds: {
    // Tiempo de respuesta: el 95% de las peticiones debe responder en <= 1,5 s
    http_req_duration: [`p(95)<${SLA_MS}`],
    // Tasa de error: menor al 3%
    http_req_failed: ['rate<0.03'],
    // Al menos el 97% de las validaciones funcionales deben pasar
    checks: ['rate>0.97'],
    // Si k6 no pudo lanzar iteraciones por falta de VUs, no se alcanzo el TPS
    dropped_iterations: ['count==0'],
  },
};

// El servicio puede responder 200 o 201 en un login correcto.
// Cualquier otro codigo se contabiliza como error en http_req_failed.
http.setResponseCallback(http.expectedStatuses(200, 201));

// ---------------------------------------------------------------------------
// 4. Flujo de cada iteracion (equivalente al CURL del enunciado)
// ---------------------------------------------------------------------------
export default function () {
  // Rotacion de usuarios del CSV: 1, 2, 3, 4, 5, 1, 2, ...
  const usuario = usuarios[exec.scenario.iterationInTest % usuarios.length];

  const payload = JSON.stringify({
    username: usuario.username,
    password: usuario.password,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '60s',                           // equivalente a --max-time 60
    tags: { name: 'POST /auth/login' },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  check(res, {
    'status es 200 o 201': (r) => r.status === 200 || r.status === 201,
    'la respuesta contiene token': (r) => {
      try {
        return typeof r.json('token') === 'string' && r.json('token').length > 0;
      } catch (e) {
        return false;
      }
    },
    'tiempo de respuesta <= 1,5 s': (r) => r.timings.duration <= SLA_MS,
  });
}

// ---------------------------------------------------------------------------
// 5. Reportes al finalizar la ejecucion
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'reports/resumen.txt': textSummary(data, { indent: ' ', enableColors: false }),
    'reports/resumen.json': JSON.stringify(data, null, 2),
  };
}
