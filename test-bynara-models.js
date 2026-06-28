import fetch from "node-fetch";

const apiKey = process.env.BYNARA_API_KEY;

async function run() {
  try {
    const response = await fetch("https://router.bynara.id/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      }
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Models:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
