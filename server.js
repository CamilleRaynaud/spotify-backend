// // // server.js
// // require("dotenv").config();
// // const express = require("express");
// // const axios = require("axios");
// // const querystring = require("querystring");

// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // // 1️⃣ Route pour démarrer l'auth Spotify
// // app.get("/login", (req, res) => {
// //   const scope = [
// //     "user-read-playback-state",
// //     "user-modify-playback-state",
// //     "user-read-currently-playing",
// //     "playlist-read-private",
// //   ].join(" ");

// //   const params = querystring.stringify({
// //     client_id: process.env.SPOTIFY_CLIENT_ID,
// //     response_type: "code",
// //     redirect_uri: `${process.env.BACKEND_URL}/callback`,
// //     scope,
// //   });

// //   res.redirect(`https://accounts.spotify.com/authorize?${params}`);
// // });

// // // 2️⃣ Callback appelé par Spotify après connexion
// // app.get("/callback", async (req, res) => {
// //   const code = req.query.code || null;

// //   try {
// //     // On échange le code contre un token
// //     const tokenResponse = await axios.post(
// //       "https://accounts.spotify.com/api/token",
// //       querystring.stringify({
// //         grant_type: "authorization_code",
// //         code: code,
// //         redirect_uri: `${process.env.BACKEND_URL}/callback`,
// //         client_id: process.env.SPOTIFY_CLIENT_ID,
// //         client_secret: process.env.SPOTIFY_CLIENT_SECRET,
// //       }),
// //       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
// //     );

// //     const { access_token, refresh_token } = tokenResponse.data;

// //     // On redirige vers l'app mobile avec les tokens dans l'URL
// //     res.redirect(
// //       `${process.env.APP_SCHEME}?access_token=${access_token}&refresh_token=${refresh_token}`
// //     );
// //   } catch (error) {
// //     console.error(error.response?.data || error.message);
// //     res.status(500).send("Erreur lors de l'échange du code Spotify");
// //   }
// // });

// // app.listen(PORT, () => {
// //   console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
// // });

// //==================== server.js version plus générique pour le flow Expo Go et les applications natives
// require("dotenv").config();
// const express = require("express");
// const axios = require("axios");
// const cors = require("cors");
// const { v4: uuidv4 } = require("uuid");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = process.env.PORT;
// const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
// const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// const BACKEND_URL = process.env.BACKEND_URL; // ex: https://my-backend.onrender.com
// const EXPO_USERNAME = process.env.EXPO_USERNAME || "";
// const EXPO_SLUG = process.env.EXPO_SLUG || "";
// const APP_SCHEME = process.env.APP_SCHEME || "myapp://auth";

// if (!CLIENT_ID || !CLIENT_SECRET || !BACKEND_URL) {
//   console.error(
//     "Missing required env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, BACKEND_URL"
//   );
//   process.exit(1);
// }

// // Stores: state -> { target, createdAt }, sessionId -> { access_token, refresh_token, expiresAt }
// const STATE_STORE = new Map();
// const SESSION_STORE = new Map();

// const STATE_TTL_MS = 1000 * 60 * 5; // 5 minutes
// const SESSION_TTL_MS = 1000 * 60 * 60; // 1 hour for the temporary session store (adjust as you want)

// // 1) Start auth: redirect user to Spotify authorize
// app.get("/auth/login", (req, res) => {
//   const target = req.query.target === "expo" ? "expo" : "app"; // expo or app (default)
//   const state = uuidv4();
//   STATE_STORE.set(state, { target, createdAt: Date.now() });
//   // auto-clean
//   setTimeout(() => STATE_STORE.delete(state), STATE_TTL_MS);

//   const scopes = [
//     "user-read-email",
//     "user-read-private",
//     "playlist-read-private",
//     "playlist-modify-private",
//     "streaming",
//     "user-modify-playback-state",
//     "user-read-playback-state",
//   ].join(" ");

//   const redirect_uri = `${BACKEND_URL}/auth/callback`;
//   const authUrl =
//     "https://accounts.spotify.com/authorize" +
//     "?response_type=code" +
//     `&client_id=${encodeURIComponent(CLIENT_ID)}` +
//     `&scope=${encodeURIComponent(scopes)}` +
//     `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
//     `&state=${encodeURIComponent(state)}` +
//     "&show_dialog=true";

//   return res.redirect(authUrl);
// });

// // 2) Callback: Spotify redirects back here with code -> exchange token, create session -> redirect to app
// app.get("/auth/callback", async (req, res) => {
//   const code = req.query.code;
//   const state = req.query.state;

//   if (!code) return res.status(400).send("Missing code");

//   const saved = STATE_STORE.get(state);
//   if (!saved) return res.status(400).send("Invalid or expired state");

//   try {
//     // Exchange code -> tokens
//     const tokenResp = await axios({
//       method: "post",
//       url: "https://accounts.spotify.com/api/token",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//         Authorization:
//           "Basic " +
//           Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
//       },
//       data:
//         `grant_type=authorization_code` +
//         `&code=${encodeURIComponent(code)}` +
//         `&redirect_uri=${encodeURIComponent(BACKEND_URL + "/auth/callback")}`,
//     });

//     const { access_token, refresh_token, expires_in } = tokenResp.data;

//     // create server-side session
//     const sessionId = uuidv4();
//     const expiresAt = Date.now() + (expires_in || 3600) * 1000;
//     SESSION_STORE.set(sessionId, { access_token, refresh_token, expiresAt });

//     // cleanup after TTL
//     setTimeout(() => SESSION_STORE.delete(sessionId), SESSION_TTL_MS);

//     // redirect to the appropriate final redirect (expo proxy or native scheme)
//     if (saved.target === "expo" && EXPO_USERNAME && EXPO_SLUG) {
//       const redirectTo = `https://auth.expo.io/@${EXPO_USERNAME}/${EXPO_SLUG}?session_id=${sessionId}`;
//       return res.redirect(redirectTo);
//     } else {
//       // native scheme
//       const redirectTo = `${APP_SCHEME}?session_id=${sessionId}`;
//       return res.redirect(redirectTo);
//     }
//   } catch (err) {
//     console.error("Token exchange error:", err.response?.data || err.message);
//     return res.status(500).send("Token exchange failed");
//   }
// });

// // 3) App fetches tokens with session_id
// app.get("/auth/session/:id", (req, res) => {
//   const id = req.params.id;
//   const s = SESSION_STORE.get(id);
//   if (!s) return res.status(404).json({ error: "session_not_found" });

//   // send minimal necessary info (do not send client secret)
//   return res.json({
//     access_token: s.access_token,
//     refresh_token: s.refresh_token,
//     expires_at: s.expiresAt,
//   });
// });

// // 4) Refresh endpoint: refresh access token server-side using stored refresh_token
// app.post("/auth/refresh", async (req, res) => {
//   const { session_id } = req.body;
//   if (!session_id)
//     return res.status(400).json({ error: "session_id required" });
//   const s = SESSION_STORE.get(session_id);
//   if (!s) return res.status(404).json({ error: "session_not_found" });

//   try {
//     const resp = await axios({
//       method: "post",
//       url: "https://accounts.spotify.com/api/token",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//         Authorization:
//           "Basic " +
//           Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
//       },
//       data: `grant_type=refresh_token&refresh_token=${encodeURIComponent(
//         s.refresh_token
//       )}`,
//     });
//     const { access_token, expires_in } = resp.data;
//     s.access_token = access_token;
//     s.expiresAt = Date.now() + (expires_in || 3600) * 1000;
//     SESSION_STORE.set(session_id, s);
//     return res.json({ access_token, expires_in });
//   } catch (err) {
//     console.error("Refresh error:", err.response?.data || err.message);
//     return res.status(500).json({ error: "refresh_failed" });
//   }
// });

// app.get("/", (req, res) => res.send("Spotify auth backend OK"));

// app.listen(PORT, "0.0.0.0", () =>
//   console.log(`Server running on port ${PORT}`)
// );
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import querystring from "querystring";

const app = express();

// ⚡️ Middlewares
app.use(
  cors({
    origin: "*", // à restreindre en prod
  })
);
app.use(express.json()); // pour lire les corps JSON envoyés par l'app mobile

// Variables d'environnement
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.APP_SCHEME + "/callback"; // ex: myapp://auth/callback

/**
 * Fonction utilitaire pour échanger un code contre des tokens Spotify
 */
async function exchangeCodeForTokens(code, redirectUri) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
    },
    body: querystring.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  return data;
}

// 1️⃣ Route Web pour lancer le login Spotify
app.get("/login", (req, res) => {
  const scope =
    "user-read-private user-read-email streaming user-modify-playback-state";
  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: CLIENT_ID,
      scope,
      redirect_uri: REDIRECT_URI,
    });
  res.redirect(authUrl);
});

// 2️⃣ Callback Web Spotify
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send("No code provided");

  try {
    const data = await exchangeCodeForTokens(code, REDIRECT_URI);

    if (data.error) {
      console.error("Spotify error:", data);
      return res.status(400).send(data.error_description || "Error");
    }

    // Redirection vers l'app mobile après succès (version web)
    res.redirect(
      `${process.env.APP_SCHEME}/selectPlaylists?access_token=${data.access_token}&refresh_token=${data.refresh_token}`
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exchanging token");
  }
});

// 3️⃣ Callback Mobile Spotify (utilisé par ton fetch React Native)
app.post("/auth/spotify/callback", async (req, res) => {
  const { code, redirectUri } = req.body;
  if (!code || !redirectUri) {
    return res.status(400).json({ error: "Missing code or redirectUri" });
  }

  try {
    const data = await exchangeCodeForTokens(code, redirectUri);

    if (data.error) {
      return res.status(400).json(data);
    }

    // Réponse JSON directe pour ton app mobile
    return res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Erreur Spotify token exchange :", err);
    return res.status(500).json({ error: "Error exchanging token" });
  }
});

// 4️⃣ Route test simple
app.get("/", (req, res) => {
  res.send("Spotify auth backend OK");
});

// 🚀 Lancement serveur
app.listen(PORT, () => {
  console.log(`Backend démarré sur port ${PORT}`);
});
