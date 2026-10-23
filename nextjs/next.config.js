module.exports = {
  output: "standalone",
  allowedDevOrigins: ["10.10.0.*"],
  // Pin the project root to nextjs/ so a lockfile in a parent directory
  // (the repo root, or the main checkout above a .claude/worktrees/* tree)
  // is not picked as the workspace root.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  // No "X-Powered-By: Next.js"
  poweredByHeader: false,
  // Basic protection on every page: no framing by other sites (clickjacking),
  // no content-type guessing, and no full URLs sent to other sites (a
  // password reset link carries its token in the URL)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
