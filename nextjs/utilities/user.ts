import { verifySession } from "./sessions";
import { UserData } from "./definitions";
import connectionPool from "./db";

export async function getUserData(): Promise<UserData | null> {
  try {
    const session = await verifySession();
    if (!session) {
      return null;
    }

    const { userId } = session;

    const userData = await connectionPool.query(
      "SELECT name, email, role, full_name, phone, address, postal_code, city FROM users WHERE id = $1",
      [userId]
    );

    if (userData.rowCount === 0) {
      return null;
    }
    const user = userData.rows[0];
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      postalCode: user.postal_code,
      city: user.city,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

export async function getUserRole(): Promise<string | null> {
  try {
    const session = await verifySession();
    if (!session) {
      return null;
    }

    const { userId } = session;

    const userData = await connectionPool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (userData.rowCount === 0) {
      return null;
    }
    const user = userData.rows[0];
    return user.role;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

export async function getUserName(): Promise<string | null> {
  try {
    const session = await verifySession();
    if (!session) {
      return null;
    }

    const { userId } = session;

    const userData = await connectionPool.query(
      "SELECT name FROM users WHERE id = $1",
      [userId]
    );
    // Check if the user exists
    // If not, return null
    // If yes, return the user's name

    if (userData.rowCount === 0) {
      return null;
    }
    const user = userData.rows[0];
    return user.name;
  } catch (error) {
    console.error("Error fetching user name:", error);
    return null;
  }
}
