import "dotenv/config";
import { initializeApp } from "firebase/app";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from "firebase/firestore";

const shouldCommit = process.argv.includes("--commit");

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

const LEGACY_FIELDS = [
  "description",
  "finalDescription",
  "placeandyear",
  "mainImageUrl",
  "imageThumbRefs",
  "responsibilities",
  "results",
];

const BATCH_LIMIT = 450;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const chunk = (array, size) => {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
};

const hasNewSchema = (data) =>
  typeof data.context === "string" ||
  Array.isArray(data.activities) ||
  Array.isArray(data.responsibilities) ||
  Array.isArray(data.results) ||
  typeof data.projectOutcome === "string" ||
  (data.media && typeof data.media === "object");

const snapshot = await getDocs(collection(db, "projects"));
const projectDocs = snapshot.docs.map((item) => ({
  id: item.id,
  data: item.data(),
}));

const targets = projectDocs
  .filter((item) => hasNewSchema(item.data))
  .map((item) => {
    const keysToDelete = LEGACY_FIELDS.filter((key) =>
      Object.prototype.hasOwnProperty.call(item.data, key),
    );

    return {
      id: item.id,
      keysToDelete,
    };
  })
  .filter((item) => item.keysToDelete.length > 0);

const summary = {
  totalProjects: projectDocs.length,
  eligibleByNewSchema: projectDocs.filter((item) => hasNewSchema(item.data))
    .length,
  docsWithLegacyFields: targets.length,
  mode: shouldCommit ? "commit" : "dry-run",
};

console.log("Cleanup summary:");
console.log(JSON.stringify(summary, null, 2));

if (targets.length > 0) {
  console.log("Sample docs to clean:");
  targets.slice(0, 10).forEach((item) => {
    console.log(`- ${item.id}: ${item.keysToDelete.join(", ")}`);
  });
}

if (!shouldCommit) {
  console.log("Dry-run only. Re-run with --commit to remove legacy fields.");
  process.exit(0);
}

const groups = chunk(targets, BATCH_LIMIT);

for (let i = 0; i < groups.length; i += 1) {
  const group = groups[i];
  const batch = writeBatch(db);

  for (const item of group) {
    const ref = doc(collection(db, "projects"), item.id);
    const patch = {};

    item.keysToDelete.forEach((key) => {
      patch[key] = deleteField();
    });

    batch.update(ref, patch);
  }

  await batch.commit();
  console.log(
    `Committed cleanup batch ${i + 1}/${groups.length} (${group.length} docs)`,
  );
}

console.log(`Done. Removed legacy fields from ${targets.length} project docs.`);
