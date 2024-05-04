import * as THREE from './build/three.module.js';
import Stats from './src/jsm/libs/stats.module.js';
import { GUI } from './src/jsm/libs/dat.gui.module.js';
import { OrbitControls } from './src/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './src/jsm/loaders/GLTFLoader.js';
let container, stats, clock, gui, mixer, actions, activeAction, previousAction;
let camera, scene, renderer, model;

const api = { ciclo: 'Caminar' };

init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 100);
    camera.position.set(-5, 3, 10);
    camera.lookAt(new THREE.Vector3(0, 2, 0));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000033); // pone el fondo de la escena de color azul
    scene.fog = new THREE.Fog(0xffffff, 15, 30); // pone una niebla en la escena de color blanco
    // poner lluvia con threejs
    const rainGeo = new THREE.Geometry();
    for (let i = 0; i < 1500; i++) {
        const rainDrop = new THREE.Vector3(
            Math.random() * 400 - 200,
            Math.random() * 500 - 250,
            Math.random() * 400 - 200
        );
        rainDrop.velocity = {};
        rainDrop.velocity = 0;
        rainGeo.vertices.push(rainDrop);
    }

    clock = new THREE.Clock();

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444); //pone una luz en la escena de color blanco
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    const mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(15, 15),
        new THREE.MeshPhongMaterial({ color: 0x969696, depthWrite: false })); //pone un plano en la escena de color verde
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    const grid = new THREE.GridHelper(15, 4, 0xffffff, 0x000000); // pone una cuadricula en la escena de color rojo
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    const loader = new GLTFLoader();
    loader.load('./src/models/gltf/D2.glb', function(gltf) {
        model = gltf.scene;
        scene.add(model);
        createGUI(model, gltf.animations);
    }, undefined, function(e) {
        console.error(e);
    });
    loader.load('./src/models/gltf/BASE.glb', function(gltf) {
        model = gltf.scene;
        scene.add(model);
    }, undefined, function(e) {
        console.error(e);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set(0, 2, 0);
    controls.update();

    stats = new Stats();
    container.appendChild(stats.dom);
}

function createGUI(model, animations) {
    const ciclos = ['Staying Alive', 'Caminar', 'Saltar', 'Rodar', 'Ocioso'];
    const capturas = ['Guardia', 'Mirar atras', 'Baile', 'Arco', 'Huida'];

    gui = new GUI();
    mixer = new THREE.AnimationMixer(model);
    actions = {};

    for (let i = 0; i < animations.length; i++) {
        const clip = animations[i];
        const action = mixer.clipAction(clip);
        actions[clip.name] = action;

        if (capturas.indexOf(clip.name) >= 0 || ciclos.indexOf(clip.name) >= 5) {
            action.clampWhenFinished = true;
            action.loop = THREE.LoopOnce;
        }
    }

    const ciclosFolder = gui.addFolder('Ciclos de Animación');
    const clipCtrl = ciclosFolder.add(api, 'ciclo').options(ciclos);
    
    clipCtrl.onChange(function() {
        fadeToAction(api.ciclo, 0.5);
    });
    ciclosFolder.open();

    const capturaFolder = gui.addFolder('Captura de Movimiento');

    function crearCapturaCallback(name) {
        api[name] = function() {
            fadeToAction(name, 0.2);
            mixer.addEventListener('finished', restoreState);
        };
        capturaFolder.add(api, name);
    }

    function restoreState() {
        mixer.removeEventListener('finished', restoreState);
        fadeToAction(api.ciclo, 0.2);
    }

    for (let i = 0; i < capturas.length; i++) {
        crearCapturaCallback(capturas[i]);
    }
    capturaFolder.open();

    activeAction = actions['Staying Alive'];
    activeAction.play();
}

function fadeToAction(name, duration) {
    previousAction = activeAction;
    activeAction = actions[name];

    if (previousAction !== activeAction) {
        previousAction.fadeOut(duration);
    }

    activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const dt = clock.getDelta();

    if (mixer)
        mixer.update(dt);

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    stats.update();
}