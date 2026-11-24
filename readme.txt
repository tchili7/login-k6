PRUEBA DE CARGA - LOGIN FAKESTOREAPI

Herramienta: k6 v1.4.2
Sistema operativo: Windows 11

Qué hace la prueba
Envía 20 logins por segundo durante 2 minutos al servicio
POST https://fakestoreapi.com/auth/login, usando los usuarios del archivo data/usuarios.csv.

Criterios de aceptación
- El 95% de las peticiones responde en menos de 1,5 segundos.
- Menos del 3% de errores.

Contenido
data/usuarios.csv    usuarios y contraseñas
scripts/login.js     script de la prueba
reports/             resultados (resumen.txt, resumen.json, dashboard.html)

Pasos para ejecutar
1. Instalar k6 v1.4.2
   Windows: winget install k6 --source winget
   Mac: brew install k6
   Otras opciones: https://grafana.com/docs/k6/latest/set-up/install-k6/

2. Verificar la instalación
   k6 version

3. Clonar el repositorio y entrar a la carpeta
   git clone https://github.com/tu-usuario/performance-login-k6.git
   cd performance-login-k6

4. Ejecutar la prueba

   PowerShell:
   $env:K6_WEB_DASHBOARD="true"
   $env:K6_WEB_DASHBOARD_EXPORT="reports/dashboard.html"
   k6 run scripts/login.js

   Mac / Linux:
   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=reports/dashboard.html k6 run scripts/login.js

5. Ver los resultados
   - En la consola al terminar la prueba.
   - En la carpeta reports.
   - Mientras corre la prueba se puede ver el dashboard en http://localhost:5665
