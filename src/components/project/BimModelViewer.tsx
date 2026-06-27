import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as iconsfa from 'react-icons/fa';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from '../../components/ui/ProjectDetails.module.css';

export interface BimModelAsset {
  url: string;
  title?: string;
  format?: string;
  sizeLabel?: string;
  source?: string;
  previewImage?: string;
}

interface BimModelViewerProps {
  asset?: BimModelAsset | null;
  resolveUrl: (assetRef: string) => string;
}

const BimModelViewer: React.FC<BimModelViewerProps> = ({ asset, resolveUrl }) => {
  const { t } = useTranslation();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [modelError, setModelError] = useState<string>('');

  const modelUrl = asset?.url ? resolveUrl(asset.url) : '';
  const previewUrl = asset?.previewImage ? resolveUrl(asset.previewImage) : '';

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) return undefined;

    let disposed = false;
    let frameId = 0;
    const width = mount.clientWidth || 720;
    const height = mount.clientHeight || 360;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4, 3, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8da2c0, 1.8));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
    directionalLight.position.set(4, 8, 6);
    scene.add(directionalLight);
    scene.add(new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0));

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        setModelError('');
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 4 / maxDim;

        model.position.sub(center);
        model.scale.setScalar(scale);
        scene.add(model);

        camera.position.set(4, 3, 6);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (error) => {
        if (!disposed) setModelError(error instanceof Error ? error.message : String(error));
      }
    );

    const resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;
      const nextHeight = entry.contentRect.height;
      if (!nextWidth || !nextHeight) return;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(mount);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else if (material) {
          material.dispose();
        }
      });
      mount.innerHTML = '';
    };
  }, [modelUrl]);

  if (!asset?.url) return null;

  return (
    <section className={styles.modelSection} aria-labelledby="project-model-title">
      <div className={styles.modelHeader}>
        <div>
          <span className={styles.modelEyebrow}>{t("model.ready")}</span>
          <h3 id="project-model-title" className={styles.sectionTitle}>
            {asset.title || t("model.title")}
          </h3>
        </div>
        <Button as="a" href={modelUrl} target="_blank" rel="noreferrer" variant="primary" className={styles.modelButton}>
          <iconsfa.FaExternalLinkAlt aria-hidden="true" />
          <span>{t("model.openModel")}</span>
        </Button>
      </div>

      <div className={styles.modelSurface}>
        <div ref={mountRef} className={styles.modelCanvas} aria-label={asset.title || t("model.title")} />
        {modelError && previewUrl && (
          <img src={previewUrl} alt={asset.title || t("model.title")} className={styles.modelPreviewImage} />
        )}
        {modelError && !previewUrl && (
          <div className={styles.modelWireframe} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {modelError && <p className={styles.modelError}>{modelError}</p>}

      <dl className={styles.modelMeta}>
        {asset.format && (
          <div>
            <dt>{t("model.format")}</dt>
            <dd>{asset.format}</dd>
          </div>
        )}
        {asset.sizeLabel && (
          <div>
            <dt>{t("model.size")}</dt>
            <dd>{asset.sizeLabel}</dd>
          </div>
        )}
        {asset.source && (
          <div>
            <dt>{t("model.source")}</dt>
            <dd>{asset.source}</dd>
          </div>
        )}
      </dl>

      <p className={styles.modelNote}>{t("model.previewNote")}</p>
    </section>
  );
};

export default BimModelViewer;
