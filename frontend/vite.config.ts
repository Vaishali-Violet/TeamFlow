import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

function startBackendPlugin() {
  let backendProcess: ChildProcess | null = null;

  return {
    name: 'start-backend',
    configureServer() {
      const backendDir = path.resolve(process.cwd(), '../backend');
      console.log('\n🚀 [TeamFlow] Auto-starting backend server from frontend dev server...\n');

      backendProcess = spawn('npm', ['start'], {
        cwd: backendDir,
        shell: true,
        stdio: 'inherit',
      });

      backendProcess.on('error', (err) => {
        console.error('❌ [TeamFlow] Failed to auto-start backend:', err);
      });

      const killBackend = () => {
        if (backendProcess) {
          try {
            backendProcess.kill();
          } catch (e) {
            // ignore
          }
          backendProcess = null;
        }
      };

      process.on('exit', killBackend);
      process.on('SIGINT', killBackend);
      process.on('SIGTERM', killBackend);
    },
  };
}

export default defineConfig({
  plugins: [react(), startBackendPlugin()],
});
