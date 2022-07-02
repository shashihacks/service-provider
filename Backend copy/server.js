const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");

const serviceAccount = require("./key.json");
initializeApp({
  credential: cert(serviceAccount),
});

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

const db = getFirestore();

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    console.log(err);
    if (err) return res.sendStatus(403);

    req.user = user;
    // console.log(req.user, "extracted from token");
    next();
  });
}

let refreshTokens = [];

app.post("/token", (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.post("/api/logout", (req, res) => {
  console.log(req.body);
  refreshTokens = refreshTokens.filter((token) => token !== req.body.token);
  res.sendStatus(204);
});

app.post("/api/login", async (req, res) => {
  // Authenticate User

  const { email, password } = req.body;
  console.log(email, password);
  const user = { name: email, password: password };
  // console.log("user login requested");

  let userExists = await accountExists(user);
  // console.log(userExists, "executed");
  if (userExists) {
    const accessToken = generateAccessToken(user);
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    refreshTokens.push(refreshToken);
    res.status(200).send({
      accessToken: accessToken,
      refreshToken: refreshToken,
      text: "Login Success",
    });
  } else {
    res.send({ text: "Invalid Email or Password" });
  }
});

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "60m" });
}

async function accountExists(user) {
  //check from db
  // console.log(user, "checking user");
  const { name: email, password } = user;
  const userRef = db.collection("users").doc(email.toString());
  const doc = await userRef.get();
  if (!doc.exists) {
    console.log("No such document!");
    return false;
  } else {
    // console.log("Document data:", doc.data());
    const { email: dbEmail, password: dbPassword } = doc.data();
    if (dbEmail == email && dbPassword == password) return true;
    else return false;
  }
}

// PUF Login

app.post("/api/login-with-puf", async (req, res) => {
  // Authenticate User

  const { puf_token } = req.body;
  console.log(puf_token);
  const username = generateUsername();
  console.log(username, "generated for user");
  const user = { name: username, puf_token: puf_token };
  console.log("user login requested with PUF");
  let accountDetails = await getAccount(puf_token);
  if (accountDetails["pufToken"]) {
    const accessToken = generateAccessToken(user);
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    refreshTokens.push(refreshToken);
    res.json({
      accessToken: accessToken,
      refreshToken: refreshToken,
      accountDetails,
    });
  } else {
    let registrationResponse = await registerAccount(puf_token);
    if (registrationResponse) {
      const accessToken = generateAccessToken(user);
      const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
      refreshTokens.push(refreshToken);
      res.json({
        accessToken: accessToken,
        refreshToken: refreshToken,
        accountDetails,
      });
    } else {
      res.send({ text: "Unable to create account" });
    }
  }
});

function generateUsername() {
  let username = "user_" + (Math.random() + 1).toString(36).substring(5);
  return username;
}

async function getAccount(puf_token) {
  const userRef = db.collection("users").doc(puf_token.toString());
  const doc = await userRef.get();
  if (!doc.exists) {
    // console.log("No such document!");
    return false;
  } else {
    // console.log("Document data:", doc.data());

    return doc.data();
  }
}

async function registerAccount(puf_token, response) {
  const data = {
    pufToken: puf_token,
    email: "",
    firstName: generateUsername(),
    phone: "",
  };

  // console.log(puf_token, data);
  const userRef = db.collection("users").doc(puf_token.toString());
  const res = await userRef.set(data);
  console.log(res);
  // setTimeout(() => {
  //   console.log(res, "response from register Account");
  // }, 3000);
  return true;
}

app.post("/api/userdata", authenticateToken, async (req, res) => {
  console.log("userdata requested");
  console.log(req.user);
  const { name } = req.user;
  //get data from firestore
  let userData = {};
  const userRef = db.collection("users").doc(name);
  const doc = await userRef.get();
  if (!doc.exists) {
    return false;
  } else {
    userData = doc.data();
  }
  console.log(userData);
  res.send(userData);
});

//SSO Login or register account

app.post("/api/sso-login", async (req, res) => {
  console.log(req.body.params, "SSO details of users received");
  var params = req.body.params;
  const key = "abcdef";
  const { HMAC, ...clone } = params;
  const reOrderUserObj = {
    firstName: params["firstName"],
    lastName: params["lastName"],
    email: params["email"],
  };
  let HMAC_calculated = crypto
    .createHmac("sha1", key)
    .update(JSON.stringify(reOrderUserObj))
    .digest("hex");

  console.log(HMAC_calculated, HMAC);
  if (HMAC_calculated == HMAC) {
    let response = await createOrLoginAccountSSO(reOrderUserObj);
    console.log(response);
    res.send({ sendStatus: 200, data: response });
  } else {
    res.send({ sendStatus: 401, text: "Tampering detected" });
  }
});

async function createOrLoginAccountSSO(userObject) {
  console.log(userObject);
  if (await accountExistsSSO(userObject)) {
    return await loginUserSSO(userObject);
  } else {
    return await registerAccountAndLoginSSO(userObject);
  }
}

async function accountExistsSSO(userObject) {
  const { email } = userObject;
  const userRef = db.collection("users").doc(email);
  const doc = await userRef.get();
  if (!doc.exists) {
    console.log("No such document!");
    return false;
  } else {
    return true;
  }
}

function loginUserSSO(userObj) {
  const { email, firstName, lastName } = userObj;
  console.log(email);
  const user = { email, firstName };
  const accessToken = generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
  refreshTokens.push(refreshToken);
  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    text: "Login Success",
  };
}

async function registerAccountAndLoginSSO(userObj) {
  console.log("registeringSSO");
  const { email } = userObj;
  console.log(userObj, "in registartion");
  const userRef = db.collection("users").doc(email);
  const res = await userRef.set(userObj);
  if (res) loginUserSSO(userObj);
}
app.listen(3001, () => {
  console.log("server started at 3001");
});
