"use server";

/*
  * ...
*/
export async function funcName() {
  try {
    console.log("Start"); // debug

    let data;


    console.log("Success"); // debug
    return {
      status: "success",
      result: data,
    };
  } catch (error) {
    console.error("Error occured:", error);
    throw error;
  }
}
