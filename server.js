import express from "express";
import fetch from "node-fetch";
import querystring from "querystring";

const app = express();

app.use(express.json()); // très important
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT;
app.post("/auth/spotify/callback", async (req, res) => {
  console.log("[backend spotify callback] req.body:", req.body);
  const { code, redirectUri, code_verifier } = req.body;

  if (!code || !redirectUri || !code_verifier) {
    return res
      .status(400)
      .json({ error: "Missing code, redirectUri, or code_verifier" });
  }

  console.log("[backend CLIENT_ID]:", process.env.SPOTIFY_CLIENT_ID);
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: querystring.stringify({
        client_id: process.env.SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json(data);

    res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Erreur Spotify token exchange :", err);
    res.status(500).json({ error: "Error exchanging token" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend démarré sur port ${PORT}`);
});
