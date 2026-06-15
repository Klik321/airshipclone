// ============================================================
//  Airship — 3D zeppelin that flies with you as you scroll
//  Three.js (CDN, ES module). Procedural model — no asset files.
//  Falls back silently to the static SVG on mobile / reduced-motion
//  / no-WebGL so nothing breaks if this can't run.
// ============================================================
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

(function () {
  'use strict';

  var canvas = document.getElementById('bg-zeppelin');
  if (!canvas) return;

  // --- guards: keep the lightweight SVG when 3D isn't a good idea ---
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smallScreen = window.matchMedia('(max-width: 760px)').matches;
  if (reduced || smallScreen) return;

  // quick WebGL capability check
  try {
    var test = document.createElement('canvas');
    if (!(test.getContext('webgl') || test.getContext('experimental-webgl'))) return;
  } catch (e) { return; }

  document.body.classList.add('webgl-active');

  // ---------- scene ----------
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // ---------- lighting (golden-hour to match the palette) ----------
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x6b5a3f, 0.85));
  var sun = new THREE.DirectionalLight(0xfff0d2, 1.15);
  sun.position.set(4, 6, 5);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  // ---------- materials ----------
  var hull   = new THREE.MeshStandardMaterial({ color: 0xf5f4f0, metalness: 0.1,  roughness: 0.55 });
  var gold   = new THREE.MeshStandardMaterial({ color: 0xc89a3c, metalness: 0.55, roughness: 0.4 });
  var belt   = new THREE.MeshStandardMaterial({ color: 0xef5a2a, metalness: 0.2,  roughness: 0.55 });
  var darkM  = new THREE.MeshStandardMaterial({ color: 0x14253a, metalness: 0.3,  roughness: 0.6 });

  // ---------- build the zeppelin ----------
  var ship = new THREE.Group();

  // body: a stretched sphere → ellipsoid, long axis along X
  var body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), hull);
  body.scale.set(2.7, 0.95, 0.95);
  ship.add(body);

  // vermilion accent stripe near the tail (clear of the logo at the centre)
  var beltMesh = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 16, 48), belt);
  beltMesh.rotation.y = Math.PI / 2; // axis along X so it rings the cross-section
  beltMesh.position.x = -1.6;
  ship.add(beltMesh);

  // tail fins (4, cross arrangement) near the back
  var finGeo = new THREE.BoxGeometry(0.7, 1.05, 0.06);
  for (var i = 0; i < 4; i++) {
    var fin = new THREE.Mesh(finGeo, gold);
    fin.position.x = -2.25;
    fin.rotation.x = (Math.PI / 2) * i; // 0, 90, 180, 270 around the X axis
    ship.add(fin);
  }

  // gondola (passenger cabin) slung under the belly
  var gondola = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.36), darkM);
  gondola.position.set(0.25, -0.95, 0);
  ship.add(gondola);

  // propeller at the tail that keeps spinning
  var prop = new THREE.Group();
  var bladeGeo = new THREE.BoxGeometry(0.04, 0.7, 0.07);
  var b1 = new THREE.Mesh(bladeGeo, gold);
  var b2 = new THREE.Mesh(bladeGeo, gold); b2.rotation.x = Math.PI / 2;
  prop.add(b1); prop.add(b2);
  prop.position.set(-2.65, 0, 0);
  ship.add(prop);

  // ---------- Airship logo decals (printed on both flanks) ----------
  var loader = new THREE.TextureLoader();
  loader.load('assets/logo-mark.png', function (tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    var aspect = tex.image.width / tex.image.height; // ~1.45
    var w = 1.85, h = w / aspect;
    var geo = new THREE.PlaneGeometry(w, h);

    // front flank (faces +Z, toward the camera)
    var front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false
    }));
    front.position.set(0.1, 0, 0.97);
    ship.add(front);

    // back flank — mirror the texture so the text still reads correctly
    var texBack = tex.clone();
    texBack.colorSpace = THREE.SRGBColorSpace;
    texBack.wrapS = THREE.RepeatWrapping;
    texBack.repeat.x = -1;
    texBack.needsUpdate = true;
    var back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: texBack, transparent: true, depthWrite: false
    }));
    back.position.set(0.1, 0, -0.97);
    back.rotation.y = Math.PI;
    ship.add(back);
  });

  ship.scale.setScalar(0.62);
  scene.add(ship);

  // ---------- scroll tracking ----------
  // u = 0 at the top, reaching 1 by the time we hit the Services section.
  // The whole flight (the S + the exit) happens within this window, so the
  // zeppelin is gone before "שירותים להשכרה" comes into view.
  var servicesEl = document.getElementById('services');
  var targetU = 0, curU = 0;
  function computeU() {
    var thr = servicesEl ? servicesEl.getBoundingClientRect().top + window.scrollY : 1400;
    if (thr < 1) thr = 1;
    return Math.min(1, Math.max(0, window.scrollY / thr));
  }
  function onScroll() { targetU = computeU(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- resize ----------
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // bail out to the SVG fallback if the viewport shrinks to mobile
    if (window.innerWidth <= 760) { running = false; }
  }
  window.addEventListener('resize', onResize, { passive: true });

  // ---------- helpers ----------
  function smoothstep(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // pause rendering when the tab/section is off-screen (saves battery)
  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) loop();
  });

  // ---------- animation ----------
  var t = 0;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);

    t += 0.016;
    curU += (targetU - curU) * 0.06;            // smooth scroll easing
    var u = curU;

    // One continuous flight: trace an "S" (ending at the left), then sweep
    // down-and-right off the bottom-right corner. The exit segment is built
    // to match the S's velocity at the seam (EXIT), so there is no speed jump
    // — the whole motion reads as a single smooth glide.
    var EXIT = 0.6;
    var x, y, pitch = 0;
    if (u <= EXIT) {
      var s = u / EXIT;                          // 0..1 across the S
      var ang = s * Math.PI * 1.5;               // right hump → centre → left
      x = Math.sin(ang) * 2.6;                   // ends at x = -2.6 (screen-left)
      y = lerp(1.5, -1.0, s);
      ship.rotation.y = Math.cos(ang) * 0.5;     // bank into the curve
    } else {
      var e = (u - EXIT) / (1 - EXIT);           // 0..1 exit sweep
      // x: starts with 0 horizontal speed (== the S's speed at the seam),
      //    then accelerates right → e² gives a seamless ease-out.
      x = -2.6 + 14.6 * e * e;
      // y: first-order term keeps the exact descent speed the S had at EXIT
      //    (continuous velocity), second-order term adds the downward dive.
      y = -1.0 - 1.667 * e - 5.333 * e * e;
      ship.rotation.y = 0;
      pitch = 0.4 * e;                           // nose-down as it dives away
    }
    var z = Math.sin(u * Math.PI * 1.4) * 0.5;

    ship.position.set(x, y + Math.sin(t * 0.8) * 0.1, z);
    ship.rotation.z = Math.sin(t * 0.7) * 0.05;
    ship.rotation.x = -0.06 + Math.sin(t * 0.55) * 0.03 - pitch;

    prop.rotation.x += 0.35;

    renderer.render(scene, camera);
  }
  loop();
})();
