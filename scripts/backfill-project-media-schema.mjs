import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
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

const isValidImageRef = (value) => {
  if (typeof value === "string") return value.trim().length > 0;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Boolean(
    value.originalUrl ||
      value.url ||
      value.fullUrl ||
      value.src ||
      value.largeUrl ||
      value.thumbUrl ||
      value.thumbnailUrl
  );
};

const normalizeImageRef = (value) => {
  if (typeof value === "string") return value.trim();
  return value;
};

const normalizeImageRefs = (value) =>
  Array.isArray(value) ? value.filter(isValidImageRef).map(normalizeImageRef) : [];

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const snapshot = await getDocs(collection(db, "projects"));
const changes = [];

for (const projectDoc of snapshot.docs) {
  const project = projectDoc.data();
  const imageRefs = normalizeImageRefs(project.imageRefs);
  const mediaImages = normalizeImageRefs(project.media?.images);
  const canonicalImages = imageRefs.length > 0 ? imageRefs : mediaImages;

  if (canonicalImages.length === 0) continue;

  const nextMedia = {
    ...(project.media || {}),
    images: canonicalImages,
    mainImage: project.media?.mainImage || canonicalImages[0],
  };

  const patch = {};
  if (!sameJson(project.imageRefs || [], canonicalImages)) {
    patch.imageRefs = canonicalImages;
  }
  if (!sameJson(project.media || {}, nextMedia)) {
    patch.media = nextMedia;
  }

  if (Object.keys(patch).length === 0) continue;

  changes.push({
    id: projectDoc.id,
    imageCount: canonicalImages.length,
    updates: Object.keys(patch),
    patch,
  });

  if (shouldWrite) {
    try {
      await updateDoc(doc(db, "projects", projectDoc.id), patch);
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            error: "Failed to update project media schema.",
            projectId: projectDoc.id,
            code: error.code,
            message: error.message,
            hint:
              "Run with FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD for a Firebase admin user, or execute the same patch from an authenticated admin context.",
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
      changes: changes.map(({ id, imageCount, updates }) => ({ id, imageCount, updates })),
    },
    null,
    2
  )
);
