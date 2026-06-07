import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { writeFileSync } from "node:fs";

const requiredEnv = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
];

const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snapshot = await getDocs(collection(db, "projects"));
const projects = snapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
}));

const sortLabel = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.en || value.pt || Object.values(value).find((item) => typeof item === "string") || "";
  }
  return String(value);
};

projects.sort((a, b) => sortLabel(a.title).localeCompare(sortLabel(b.title)));

const payload = {
  exportedAt: new Date().toISOString(),
  count: projects.length,
  projects,
};

const outputPath = process.argv[2] || "projects-export.json";
writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf-8");

console.log(`Exported ${projects.length} projects to ${outputPath}`);
