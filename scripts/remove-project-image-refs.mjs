import "dotenv/config";
import { initializeApp } from "firebase/app";
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

const app = initializeApp({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

if (shouldWrite && process.env.FIREBASE_ADMIN_EMAIL && process.env.FIREBASE_ADMIN_PASSWORD) {
  await signInWithEmailAndPassword(
    auth,
    process.env.FIREBASE_ADMIN_EMAIL,
    process.env.FIREBASE_ADMIN_PASSWORD
  );
}

const snapshot = await getDocs(collection(db, "projects"));
const changes = [];

for (const projectDoc of snapshot.docs) {
  const project = projectDoc.data();
  const hasImageRefs = Object.prototype.hasOwnProperty.call(project, "imageRefs");
  const hasCanonicalMediaImages =
    Array.isArray(project.media?.images) && project.media.images.length > 0;

  if (!hasImageRefs) continue;

  changes.push({
    id: projectDoc.id,
    imageRefsCount: Array.isArray(project.imageRefs) ? project.imageRefs.length : null,
    mediaImagesCount: Array.isArray(project.media?.images) ? project.media.images.length : null,
    safeToRemove: hasCanonicalMediaImages,
  });

  if (shouldWrite) {
    if (!hasCanonicalMediaImages) {
      console.error(
        JSON.stringify(
          {
            error: "Refusing to remove imageRefs because media.images is missing or empty.",
            projectId: projectDoc.id,
          },
          null,
          2
        )
      );
      process.exit(1);
    }

    await updateDoc(doc(db, "projects", projectDoc.id), {
      imageRefs: deleteField(),
    });
  }
}

console.log(
  JSON.stringify(
    {
      mode: shouldWrite ? "write" : "dry-run",
      scanned: snapshot.size,
      changed: changes.length,
      unsafe: changes.filter((item) => !item.safeToRemove),
      changes,
    },
    null,
    2
  )
);
