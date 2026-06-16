// ============================================================
//  Airship — interactive "design your own" 3D logo customizer
//  Customers upload a logo → it's projected onto a 3D zeppelin
//  hull with a Decal (wraps the curve), orbit/zoom to view, and
//  tweak size / position / rotation / hull colour. Vanilla + Three.js.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

(function () {
  'use strict';

  var canvas = document.getElementById('lp-canvas');
  var stage  = document.querySelector('.lp__stage');
  if (!canvas || !stage) return;

  // WebGL capability check → graceful fallback message
  try {
    var t = document.createElement('canvas');
    if (!(t.getContext('webgl') || t.getContext('experimental-webgl'))) throw 0;
  } catch (e) {
    var fb = document.getElementById('lp-fallback');
    if (fb) fb.hidden = false;
    return;
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- semi-axes of the hull ellipsoid ----------
  var A = 3.4, B = 1, C = 1;                    // long axis = X

  // ---------- renderer / scene / camera ----------
  var renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true, alpha: true,
    preserveDrawingBuffer: true                // needed for snapshot
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.5, 1.7, 8);

  // ---------- lighting (ambient + key + fill + warm rim) ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(5, 8, 6);  scene.add(key);
  var fill = new THREE.DirectionalLight(0x9fbcff, 0.35); fill.position.set(-6, 2, 5); scene.add(fill);
  var rim = new THREE.DirectionalLight(0xffd6a0, 0.7);  rim.position.set(-5, 3, -6);  scene.add(rim);

  // ---------- the zeppelin (procedural; swap in a .glb later) ----------
  var ship = new THREE.Group();

  // Hull: a sphere whose VERTICES are stretched on X (baked into the
  // geometry, not the mesh scale — so the decal projects without distortion).
  // toNonIndexed(): DecalGeometry reads raw triangle triplets, so the target
  // must be non-indexed. computeVertexNormals(): fix shading after the stretch.
  var hullGeo = new THREE.SphereGeometry(1, 64, 48).toNonIndexed();
  hullGeo.scale(A, B, C);
  hullGeo.computeVertexNormals();
  var hullMat = new THREE.MeshStandardMaterial({ color: 0xe9e7e1, roughness: 0.4, metalness: 0.25 });
  var hull = new THREE.Mesh(hullGeo, hullMat);
  ship.add(hull);

  var goldMat = new THREE.MeshStandardMaterial({ color: 0xc89a3c, roughness: 0.4, metalness: 0.55 });
  var darkMat = new THREE.MeshStandardMaterial({ color: 0x14253a, roughness: 0.6, metalness: 0.3 });

  // Four tail fins
  var finGeo = new THREE.BoxGeometry(0.85, 1.3, 0.07);
  for (var i = 0; i < 4; i++) {
    var fin = new THREE.Mesh(finGeo, goldMat);
    fin.position.x = -3.0;
    fin.rotation.x = (Math.PI / 2) * i;
    ship.add(fin);
  }
  // Gondola under the belly
  var gondola = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.42), darkMat);
  gondola.position.set(0.3, -1.02, 0);
  ship.add(gondola);

  scene.add(ship);
  hull.updateMatrixWorld(true);

  // ---------- logo decal ----------
  var decalMat = new THREE.MeshStandardMaterial({
    transparent: true, roughness: 0.5, metalness: 0.05,
    polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false
  });
  var decalMesh = null;
  var logoTexture = null;

  // live transform state (driven by the sliders)
  var state = { width: 1.8, height: 1.2, fore: 0, vert: 0.12, rot: 0 };

  // Project the decal onto the hull at the current state.
  function buildDecal() {
    if (!logoTexture) return;
    if (decalMesh) { ship.remove(decalMesh); decalMesh.geometry.dispose(); decalMesh = null; }

    // surface point on the +Z front of the ellipsoid for (fore, vert)
    var x = state.fore, y = state.vert;
    var zSq = 1 - (x / A) * (x / A) - (y / B) * (y / B);
    var z = C * Math.sqrt(Math.max(0.04, zSq));
    var pos = new THREE.Vector3(x, y, z);

    // outward surface normal of the ellipsoid (gradient of the implicit eq.)
    var normal = new THREE.Vector3(x / (A * A), y / (B * B), z / (C * C)).normalize();

    // orient a helper to face along the normal, then spin for logo rotation
    var helper = new THREE.Object3D();
    helper.position.copy(pos);
    helper.lookAt(pos.clone().add(normal));
    helper.rotateZ(state.rot);

    var size = new THREE.Vector3(state.width, state.height, 1.4);
    var geo = new DecalGeometry(hull, pos, helper.rotation, size);
    decalMesh = new THREE.Mesh(geo, decalMat);
    ship.add(decalMesh);
  }

  // Build a transparent, square CanvasTexture from any image (PNG/JPG/SVG).
  function textureFromImage(img) {
    var S = 512, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var ctx = cv.getContext('2d');
    var iw = img.naturalWidth || img.width || S;
    var ih = img.naturalHeight || img.height || S;
    var r = Math.min(S / iw, S / ih) * 0.92;       // fit, keep aspect, small pad
    var w = iw * r, h = ih * r;
    ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
    return tex;
  }

  function setLogoFromSrc(src) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      if (logoTexture) logoTexture.dispose();
      logoTexture = textureFromImage(img);
      decalMat.map = logoTexture;
      decalMat.needsUpdate = true;
      buildDecal();
    };
    img.src = src;
  }

  // Pre-load the Airship logo so the stage isn't empty.
  setLogoFromSrc('assets/logo-mark.png');

  // ---------- controls ----------
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5.5;
  controls.maxDistance = 16;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', function () { controls.autoRotate = false; });
  controls.addEventListener('end', function () { if (!reduced) controls.autoRotate = true; });

  // ---------- wire up the UI ----------
  function bindSlider(id, key, after) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      state[key] = parseFloat(el.value);
      buildDecal();
      if (after) after();
    }, { passive: true });
  }
  bindSlider('lp-width', 'width');
  bindSlider('lp-height', 'height');
  bindSlider('lp-fore', 'fore');
  bindSlider('lp-vert', 'vert');
  var rotEl = document.getElementById('lp-rot');
  if (rotEl) rotEl.addEventListener('input', function () {
    state.rot = parseFloat(rotEl.value) * Math.PI / 180;   // slider is in degrees
    buildDecal();
  }, { passive: true });

  // file upload
  var fileEl = document.getElementById('lp-file');
  if (fileEl) fileEl.addEventListener('change', function () {
    var f = fileEl.files && fileEl.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { setLogoFromSrc(reader.result); };
    reader.readAsDataURL(f);
  });

  // hull colour swatches
  var swatches = document.getElementById('lp-swatches');
  if (swatches) swatches.addEventListener('click', function (e) {
    var b = e.target.closest('.lp__swatch');
    if (!b) return;
    hullMat.color.set(b.getAttribute('data-color'));
    swatches.querySelectorAll('.lp__swatch').forEach(function (s) { s.classList.remove('is-active'); });
    b.classList.add('is-active');
  });

  // download snapshot
  var snap = document.getElementById('lp-snap');
  if (snap) snap.addEventListener('click', function () {
    renderer.render(scene, camera);            // ensure the buffer is current
    var url = renderer.domElement.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = url; a.download = 'airship-logo-preview.png';
    document.body.appendChild(a); a.click(); a.remove();
  });

  // ---------- size / render loop ----------
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize, { passive: true });

  // Render only while the section is on/near screen (saves the GPU).
  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '120px' })
      .observe(stage);
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  }
  loop();
})();
