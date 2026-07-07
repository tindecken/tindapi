
module.exports = {
  name: "tindapi",
  title: "tindapi", // Name of your application
  script: "src/index.ts", // Entry point of your application
  interpreter: "/root/.bun/bin/bun", // Bun interpreter
  env_production: {
	NODE_ENV: "production",
    PORT: 3333
  },

  env: {
    PATH: `${process.env.HOME}//root/.bun/bin/bun:${process.env.PATH}`, // Add "~/.bun/bin/bun" to PATH
  },
  error_file: 'pm2-error.log',
  out_file: 'pm2-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
};
