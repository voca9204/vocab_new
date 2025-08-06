const { spawn } = require('child_process');

// Kill port first
const killPort = spawn('npx', ['kill-port', '3100'], {
  stdio: 'inherit',
  shell: true
});

killPort.on('close', () => {
  // Start Next.js dev server
  const devServer = spawn('next', ['dev', '-p', '3100'], {
    stdio: 'inherit',
    shell: true
  });

  // Wait a bit for server to start, then open browser
  setTimeout(async () => {
    try {
      const open = await import('open');
      await open.default('http://localhost:3100');
      console.log('✅ Browser opened successfully');
    } catch (error) {
      console.error('Failed to open browser:', error);
    }
  }, 3000); // Wait 3 seconds for server to start

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    devServer.kill('SIGINT');
    process.exit();
  });
});