export const getConfiguredAssetBaseUrl = () =>
  process.env.REACT_APP_CDN_BASE_URL ||
  process.env.REACT_APP_BASE_URL ||
  process.env.REACT_APP_FIREBASE_STORAGE_BASE_URL ||
  "";

export const resolveAssetUrl = (assetRef, baseUrl = getConfiguredAssetBaseUrl()) => {
  if (!assetRef || typeof assetRef !== "string") return "";

  const ref = assetRef.trim();
  if (!ref) return "";
  if (/^(https?:)?\/\//i.test(ref)) return ref;

  const base = typeof baseUrl === "string" ? baseUrl.trim() : "";
  if (!base) return ref;

  return `${base.replace(/\/+$/, "")}/${ref.replace(/^\/+/, "")}`;
};
