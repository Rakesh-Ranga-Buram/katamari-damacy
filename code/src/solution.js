import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let renderer, scene, camera, ball, plane, dragon_ball;

const load = (url) => new Promise((resolve, reject) => {
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
});

window.init = async () => {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
  scene.add(directionalLight);

  const geometry = new THREE.PlaneGeometry( 1, 1 );
  const texture = new THREE.TextureLoader().load('./assets/tile.jpg' ); 
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set( 50, 50 );
  const material = new THREE.MeshBasicMaterial({
    map: texture,
  });
  plane = new THREE.Mesh( geometry, material );
  plane.rotateX(-Math.PI / 2);
  plane.scale.set(100, 100, 100);
  scene.add( plane );

  ball = await load('./assets/worn_baseball_ball/scene.gltf');
  const boundingBox = new THREE.Box3().setFromObject(ball);
  const ballSize = new THREE.Vector3();
  boundingBox.getSize(ballSize);
  ball.position.y = ballSize.y / 2; 
  scene.add(ball);

  dragon_ball = await load('./assets/dragon_ball/scene.gltf');
  const dragon_boundingBox = new THREE.Box3().setFromObject(ball);
  const dragon_ballSize = new THREE.Vector3();
  dragon_boundingBox.getSize(dragon_ballSize);
  dragon_ball.position.y = dragon_ballSize.y / 2;
  dragon_ball.scale.set(10,10,10);


  console.log('made a scene', ball);
};

let speed = [0, 0, 0];
let acc = 0.0001;
let drag = 0.98;
let turnSpeed = 0.01;
let velocity = 0;
window.loop = (dt, input) => {
  if (ball){
    //acceleration/decelaration
    if(input.keys.has('ArrowUp')) {
      velocity = Math.min(1, velocity + dt * acc);
    }
    else if (input.keys.has('ArrowDown')) {
      velocity = Math.max(-1, velocity - dt * acc)
    }
    else {
      velocity *= drag;
    }

    //turn
    if(input.keys.has('ArrowLeft')) {
      ball.rotateY(turnSpeed *dt * velocity);
    }
    else if (input.keys.has('ArrowRight')){
      ball.rotateY(-turnSpeed *dt * velocity);
    }

    const forward = new THREE.Vector3();
    ball.getWorldDirection(forward);
    forward.multiplyScalar(velocity);
    ball.position.add(forward);

    // Clamp ball position to the nearest edge of the plane
    const planeBounds = new THREE.Box3().setFromObject(plane);
    const ballSize = new THREE.Vector3();
    const boundingBox = new THREE.Box3().setFromObject(ball);
    boundingBox.getSize(ballSize);
    const ballRadius = ballSize.length() / 2;
    const clampedPosition = new THREE.Vector3().copy(ball.position);
    clampedPosition.x = THREE.MathUtils.clamp(clampedPosition.x, planeBounds.min.x + ballRadius, planeBounds.max.x - ballRadius);
    clampedPosition.z = THREE.MathUtils.clamp(clampedPosition.z, planeBounds.min.z + ballRadius, planeBounds.max.z - ballRadius);
    ball.position.copy(clampedPosition);

    camera.position.set(ball.position.x + 3, ball.position.y + 3, ball.position.z + 3);
    camera.lookAt(ball.position)
  
  }
  renderer.render( scene, camera );
};