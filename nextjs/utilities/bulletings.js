"use server";

/*
  * Fetches the five newest bulletins from the JSON file.
*/
export async function fetchLatestFiveBulletings() {
  try {
    console.log("Fetching newest five bulletins..."); // debug

    // Read the data from the JSON file
    let data;
    try {
      const response = await import("../data/bullets.json");
      data = response.default;
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
