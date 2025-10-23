PASOS DE INSTALACIÓN (Windows):

1) Abrir CMD o PowerShell en la carpeta del proyecto.
2) Ejecutar:
   del /q package-lock.json
   rmdir /s /q node_modules
   npm cache verify
   npm install
   npm run dev

Si aparece 'next no se reconoce...', significa que 'npm install' no completó. Repite los pasos.
