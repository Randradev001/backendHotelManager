# Protocolo de Trabajo en Equipo: Codex & Gemini (Antigravity)

Este documento establece las reglas de colaboración y sincronización entre **OpenAI Codex** y **Gemini (Antigravity)** para la migración del sistema **APERP - Control Bodega**.

---

## 📌 Reglas de Coordinación

1. **Separación de Logs de Trabajo:**
   * **Gemini (Antigravity)** documenta sus avances exclusivamente en [`GEMINI_WORK_LOG.md`](file:///c:/Proyectos2025/aperp%20Bod/backendAperp/backendCOBodega/docs/team/GEMINI_WORK_LOG.md).
   * **Codex** documenta sus avances exclusivamente en [`CODEX_WORK_LOG.md`](file:///c:/Proyectos2025/aperp%20Bod/backendAperp/backendCOBodega/docs/team/CODEX_WORK_LOG.md).

2. **Verificación Previa Antes de Editar:**
   * Antes de iniciar una nueva tarea, la IA (Codex o Gemini) debe leer el log de la otra IA para conocer los últimos cambios realizados y evitar sobreescribir código en progreso.

3. **Formato de Registro:**
   * Cada entrada en los logs debe incluir:
     * **Fecha / Hora**
     * **Objetivo de la sesión**
     * **Archivos creados o modificados** (con enlaces `file:///...`)
     * **Resumen técnico de cambios**
     * **Próximas tareas pendientes**

4. **Multiempresa y Seguridad:**
   * Ambas IAs deben respetar las reglas definidas en [`AGENTS.md`](file:///c:/Proyectos2025/aperp%20Bod/backendAperp/backendCOBodega/AGENTS.md): `EmpCod` siempre proviene de `req.context.empCod`, no se renombran tablas físicas GeneXus y los niveles subordinados no van al menú principal.
