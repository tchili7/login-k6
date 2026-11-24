import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// usuarios del csv 
const usuarios = new SharedArray('usuarios', function () {
  return open('../data/usuarios.csv')
    .split('\n')
    .slice(1)
    .filter((linea) => linea.trim() !== '')
    .map((linea) => {
      const [user, passwd] = linea.trim().split(',');
      return { user, passwd };
    });
});

export const options = {
  scenarios: {
    login: {
      executor: 'constant-arrival-rate',
      rate: 20, 
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.03'],
    checks: ['rate>0.97'],
    dropped_iterations: ['count==0'], 
  },
};

export default function () {
  const u = usuarios[exec.scenario.iterationInTest % usuarios.length];

  const res = http.post(
    'https://fakestoreapi.com/auth/login',
    JSON.stringify({ username: u.user, password: u.passwd }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '60s',
    }
  );

  check(res, {
    'status 200 o 201': (r) => r.status === 200 || r.status === 201,
    'devuelve token': (r) => r.body && r.body.includes('token'),
    'responde en menos de 1,5 s': (r) => r.timings.duration < 1500,
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'reports/resumen.txt': textSummary(data, { indent: ' ', enableColors: false }),
    'reports/resumen.json': JSON.stringify(data),
  };
}
