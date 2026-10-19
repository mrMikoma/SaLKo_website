module.exports = {
  output: "standalone",
  allowedDevOrigins: ["10.10.0.*"],
  // Pin the project root to nextjs/ so a lockfile in a parent directory
  // (the repo root, or the main checkout above a .claude/worktrees/* tree)
  // is not picked as the workspace root.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
};
