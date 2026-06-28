import "dotenv/config";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  getFirestore,
  updateDoc,
} from "firebase/firestore";

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

const shouldWrite = process.argv.includes("--write");

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
const auth = getAuth(app);
const db = getFirestore(app);

if (shouldWrite && process.env.FIREBASE_ADMIN_EMAIL && process.env.FIREBASE_ADMIN_PASSWORD) {
  await signInWithEmailAndPassword(
    auth,
    process.env.FIREBASE_ADMIN_EMAIL,
    process.env.FIREBASE_ADMIN_PASSWORD
  );
}

const hasValue = (value) => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const normalizeList = (value) =>
  Array.isArray(value) ? value.filter(hasValue) : [];

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const snapshot = await getDocs(collection(db, "projects"));
const changes = [];

for (const projectDoc of snapshot.docs) {
  const project = projectDoc.data();
  const currentActivities = normalizeList(project.activities);
  const legacyResponsibilities = normalizeList(project.responsibilities);
  const legacyResults = normalizeList(project.results);
  const canonicalActivities =
    currentActivities.length > 0
      ? currentActivities
      : [...legacyResponsibilities, ...legacyResults];

  const patch = {};
  if (canonicalActivities.length > 0 && !sameJson(project.activities || [], canonicalActivities)) {
    patch.activities = canonicalActivities;
  }
  if (Object.prototype.hasOwnProperty.call(project, "responsibilities")) {
    patch.responsibilities = deleteField();
  }
  if (Object.prototype.hasOwnProperty.call(project, "results")) {
    patch.results = deleteField();
  }

  if (Object.keys(patch).length === 0) continue;

  changes.push({
    id: projectDoc.id,
    activityCount: canonicalActivities.length,
    removesResponsibilities: Object.prototype.hasOwnProperty.call(project, "responsibilities"),
    removesResults: Object.prototype.hasOwnProperty.call(project, "results"),
    writesActivities: Object.prototype.hasOwnProperty.call(patch, "activities"),
  });

  if (shouldWrite) {
    try {
      await updateDoc(doc(db, "projects", projectDoc.id), patch);
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            error: "Failed to migrate project detail schema.",
            projectId: projectDoc.id,
            code: error.code,
            message: error.message,
            hint:
              "Run with FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD for a Firebase admin user.",
          },
          null,
          2
        )
      );
      process.exit(1);
    }
  }
}

console.log(
  JSON.stringify(
    {
      mode: shouldWrite ? "write" : "dry-run",
      scanned: snapshot.size,
      changed: changes.length,
      changes,
    },
    null,
    2
  )
);
await deleteApp(app);
