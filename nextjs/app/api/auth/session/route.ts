import { verifySession } from "@/utilities/sessions";
import connectionPool from "@/utilities/db";

export async function GET() {
  try {
    // User authentication
    const payload = await verifySession();
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: 401 }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch user role
    const { rows, rowCount } = await connectionPool.query(
      "SELECT role FROM users WHERE id = $1",
      [payload.userId]
    );
    if (rowCount === 0) {
      return new Response(
        JSON.stringify({ error: "User role not found", code: 404 }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const userRole = rows[0].role;
    if (userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden", code: 403 }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Authorized response
    return new Response(JSON.stringify({ message: "Authorized" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", code: 500 }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
