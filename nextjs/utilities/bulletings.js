"use server";
import connectionPool from "@/utilities/db";

/*
 * Fetches the five newest bullets from the database
 */
export async function fetchLatestFiveBulletings() {
  try {
    console.log("Fetching newest five bulletins..."); // debug

    let data;
    try {
      // Fetch the five newest bulletins from the database with user names
      const response = await connectionPool.query(
        `SELECT bullets.*, users.name as userName 
         FROM bullets 
         JOIN users ON bullets.user_id = users.id 
         ORDER BY bullets.date DESC 
         LIMIT 5`
      );
      data = response.rows;
    } catch (error) {
      console.error("Error reading data:", error);
      return {
        status: "error",
        result: null,
      };
    }

    // Sort five newest bulletins
    data = data.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    console.log("Data fetched successfully"); // debug
    return {
      status: "success",
      result: data,
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

/*
 * Fetch all bulletings from the database
 */
export async function fetchAllBulletings() {
  try {
    console.log("Fetching all bulletins..."); // debug

    let data;
    try {
      // Fetch all bulletins from the database with user names
      const response = await connectionPool.query(
        `SELECT bullets.*, users.name as userName 
         FROM bullets 
         JOIN users ON bullets.user_id = users.id 
         ORDER BY bullets.date DESC`
      );
      data = response.rows;
    } catch (error) {
      console.error("Error reading data:", error);
      return {
        status: "error",
        result: null,
      };
    }

    console.log("Data fetched successfully"); // debug
    return {
      status: "success",
      result: data,
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
